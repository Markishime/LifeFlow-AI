from datetime import timedelta

from fastapi import HTTPException
from pydantic import Field
from sqlalchemy import select

from app import models as m
from app.core import now
from app.documents import detect_dates
from app.schemas import Input
from app.services import owned, serialize


class ReadArguments(Input):
    query: str = Field(default="", max_length=200)
    document_id: str | None = None
    text: str = Field(default="", max_length=4000)


def execute_read(db, owner, tool, arguments):
    args = ReadArguments.model_validate(arguments)
    if tool == "SearchTasks":
        return {
            "items": serialize(
                db.scalars(
                    select(m.Task)
                    .where(m.Task.owner_id == owner, m.Task.title.icontains(args.query, autoescape=True))
                    .limit(20)
                ).all()
            )
        }
    if tool == "SearchDocuments":
        return {
            "items": [
                {"id": d.id, "title": d.title}
                for d in db.scalars(
                    select(m.Document)
                    .where(
                        m.Document.owner_id == owner, m.Document.title.icontains(args.query, autoescape=True)
                    )
                    .limit(20)
                )
            ]
        }
    if tool == "SummarizeDocument":
        document = owned(db, m.Document, args.document_id, owner)
        extraction = db.scalar(select(m.Extraction).where(m.Extraction.document_id == document.id))
        return {
            "source": {"id": document.id, "title": document.title},
            "excerpt": extraction.text[:3000] if extraction else "No extracted text is available.",
            "mode": "deterministic_excerpt",
        }
    if tool == "ExtractDeadline":
        return {"candidates": detect_dates(args.text), "requires_approval": True}
    if tool == "GetUpcomingObligations":
        return {
            "items": serialize(
                db.scalars(
                    select(m.Obligation)
                    .where(
                        m.Obligation.owner_id == owner,
                        m.Obligation.status == "pending",
                        m.Obligation.due_at <= now() + timedelta(days=7),
                    )
                    .order_by(m.Obligation.due_at)
                    .limit(30)
                ).all()
            )
        }
    if tool == "GenerateDailyBriefing":
        tasks = db.scalars(
            select(m.Task)
            .where(m.Task.owner_id == owner, m.Task.status.not_in(["completed", "cancelled"]))
            .limit(100)
        ).all()
        return {"briefing": f"You have {len(tasks)} active tasks.", "source_ids": [task.id for task in tasks]}
    if tool == "DraftFollowUpMessage":
        return {
            "draft": f"Hello, I am following up regarding {args.text or args.query}. Could you please share an update? Thank you.",
            "sent": False,
        }
    raise HTTPException(422, "Read tool is not allowlisted")
