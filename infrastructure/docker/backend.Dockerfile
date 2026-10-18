FROM python:3.12.10-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv/lifeflow
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt ./requirements.txt
COPY backend/constraints.txt ./constraints.txt
RUN pip install --no-cache-dir -c constraints.txt -r requirements.txt
COPY backend/ .
RUN useradd --create-home --uid 10001 lifeflow && chown -R lifeflow:lifeflow /srv/lifeflow
USER lifeflow
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
