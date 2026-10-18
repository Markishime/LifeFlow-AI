import hashlib
import io
import re
import socket
import struct
from datetime import date

import boto3
import httpx
import pymupdf
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select

from app import models as m
from app.core import settings


class Storage:
    def __init__(self):
        self.cfg = settings()

    def client(self):
        return boto3.client(
            "s3",
            endpoint_url=self.cfg.s3_endpoint,
            aws_access_key_id=self.cfg.s3_access_key,
            aws_secret_access_key=self.cfg.s3_secret_key,
            region_name=self.cfg.s3_region,
        )

    def put(self, key, content, mime):
        if self.cfg.storage_mode == "local":
            path = self.cfg.storage_path / key
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
        else:
            self.client().put_object(
                Bucket=self.cfg.s3_bucket,
                Key=key,
                Body=content,
                ContentType=mime,
                ServerSideEncryption="AES256",
            )

    def get(self, key):
        if self.cfg.storage_mode == "local":
            return (self.cfg.storage_path / key).read_bytes()
        return self.client().get_object(Bucket=self.cfg.s3_bucket, Key=key)["Body"].read()

    def delete(self, key):
        if self.cfg.storage_mode == "local":
            (self.cfg.storage_path / key).unlink(missing_ok=True)
        else:
            self.client().delete_object(Bucket=self.cfg.s3_bucket, Key=key)

    def signed_url(self, key):
        client = (
            self.client()
            if not self.cfg.s3_public_endpoint
            else boto3.client(
                "s3",
                endpoint_url=self.cfg.s3_public_endpoint,
                aws_access_key_id=self.cfg.s3_access_key,
                aws_secret_access_key=self.cfg.s3_secret_key,
                region_name=self.cfg.s3_region,
            )
        )
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.cfg.s3_bucket, "Key": key, "ResponseContentDisposition": "attachment"},
            ExpiresIn=120,
        )


def validate_file(content):
    if not content or len(content) > settings().max_upload_bytes:
        raise ValueError("File must be nonempty and at most 10 MB")
    if content.startswith(b"%PDF-"):
        try:
            with pymupdf.open(stream=content, filetype="pdf") as pdf:
                if pdf.is_encrypted or len(pdf) > 100:
                    raise ValueError("Encrypted PDFs and files over 100 pages are unsupported")
                if any(pdf.embfile_names()):
                    raise ValueError("PDF attachments are unsupported")
        except pymupdf.FileDataError:
            raise ValueError("Invalid PDF") from None
        return "application/pdf"
    try:
        with Image.open(io.BytesIO(content)) as image:
            if image.format not in {"JPEG", "PNG"} or image.width * image.height > 25_000_000:
                raise ValueError("Use JPG or PNG images under 25 megapixels")
            mime = Image.MIME[image.format]
            image.verify()
            return mime
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError):
        raise ValueError("Unsupported or damaged file. Use PDF, JPG or PNG") from None


def scan_malware(content):
    if settings().malware_scanner == "disabled":
        return
    with socket.create_connection((settings().clamav_host, settings().clamav_port), timeout=30) as stream:
        stream.sendall(b"zINSTREAM\0")
        for start in range(0, len(content), 65536):
            chunk = content[start : start + 65536]
            stream.sendall(struct.pack("!I", len(chunk)) + chunk)
        stream.sendall(struct.pack("!I", 0))
        result = stream.recv(4096)
        if b"OK" not in result or b"FOUND" in result:
            raise ValueError("File rejected by malware scanner")


def detect_dates(text):
    candidates = []
    for match in re.finditer(r"\b(\d{4}-\d{2}-\d{2})\b", text):
        try:
            value = date.fromisoformat(match.group(1))
        except ValueError:
            continue
        excerpt = text[max(0, match.start() - 60) : match.end() + 40].strip()
        candidates.append(
            {
                "date": value.isoformat(),
                "kind": "explicit",
                "explanation": excerpt,
                "confirmation_status": "requires_confirmation",
            }
        )
    for match in re.finditer(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", text):
        candidates.append(
            {
                "date": None,
                "kind": "uncertain",
                "explanation": match.group(0),
                "confirmation_status": "requires_confirmation",
            }
        )
    return candidates[:30]


def classify(text):
    lowered = text.lower()
    for category, words in {
        "bills": ["amount due", "payment due", "billing"],
        "contracts": ["agreement", "contract"],
        "receipts": ["receipt", "total paid"],
        "certificates": ["certificate"],
        "employment": ["employment", "job offer"],
    }.items():
        if any(word in lowered for word in words):
            return category
    return "miscellaneous"


def embedding(text):
    cfg = settings()
    if not cfg.openai_api_key or not cfg.embedding_model:
        return None
    with httpx.Client(timeout=30) as client:
        response = client.post(
            "https://api.openai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {cfg.openai_api_key}"},
            json={"model": cfg.embedding_model, "input": text[:12000], "dimensions": 1536},
        )
        response.raise_for_status()
        return response.json()["data"][0]["embedding"]


def process_document(db, document):
    content = Storage().get(document.storage_key)
    chunks = []
    if document.mime_type == "application/pdf":
        with pymupdf.open(stream=content, filetype="pdf") as pdf:
            for page in pdf:
                text = page.get_text()
                if not text.strip():
                    text = page.get_text(textpage=page.get_textpage_ocr(language="eng", dpi=150))
                chunks.append(text)
    else:
        with pymupdf.open(stream=content) as image:
            as_pdf = image.convert_to_pdf()
        with pymupdf.open(stream=as_pdf, filetype="pdf") as pdf:
            for page in pdf:
                chunks.append(page.get_text(textpage=page.get_textpage_ocr(language="eng", dpi=150)))
    text = "\n".join(chunks)[:200000]
    prior = db.scalar(select(m.Extraction).where(m.Extraction.document_id == document.id))
    if not prior:
        db.add(
            m.Extraction(
                document_id=document.id,
                text=text,
                fields={"suggested_category": classify(text)},
                dates=detect_dates(text),
            )
        )
    document.status = "needs_review"
    db.flush()


def index_document(db, document):
    extraction = db.scalar(select(m.Extraction).where(m.Extraction.document_id == document.id))
    if not extraction:
        return
    if db.scalar(select(m.Embedding).where(m.Embedding.document_id == document.id)):
        return
    for start in range(0, min(len(extraction.text), 24000), 3000):
        text = extraction.text[start : start + 3000]
        vector = embedding(text)
        if vector:
            db.add(
                m.Embedding(
                    owner_id=document.owner_id,
                    document_id=document.id,
                    text=text,
                    model=settings().embedding_model,
                    vector=vector,
                )
            )


def checksum(content):
    return hashlib.sha256(content).hexdigest()
