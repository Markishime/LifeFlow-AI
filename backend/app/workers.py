import logging
from datetime import timedelta

from celery import Celery
from sqlalchemy import select

from app import models as m
from app.accounts import execute_deletion
from app.core import SessionLocal, now, settings
from app.documents import index_document, process_document
from app.notifications import check_receipts, deliver, schedule_due

celery = Celery("lifeflow", broker=settings().redis_url)
celery.conf.update(
    timezone="UTC",
    task_ignore_result=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_time_limit=180,
    beat_schedule={"durable-schedules": {"task": "lifeflow.tick", "schedule": 30.0}},
)


@celery.task(name="lifeflow.tick")
def tick():
    with SessionLocal.begin() as db:
        schedule_due(db)
        jobs = db.scalars(select(m.Job).where(m.Job.status == "queued").limit(50)).all()
        identities = [job.id for job in jobs]
        # A recovered document job is safe to repeat. Ambiguous push sends require manual inspection.
        stale = db.scalars(
            select(m.Job).where(m.Job.status == "running", m.Job.updated_at < now() - timedelta(minutes=10))
        ).all()
        for job in stale:
            job.status = (
                "queued" if job.kind in {"document", "embedding", "account_deletion"} else "needs_review"
            )
    for identity in identities:
        run_job.delay(identity)
    with SessionLocal.begin() as db:
        try:
            check_receipts(db)
        except Exception:
            logging.getLogger("lifeflow").warning("push_receipt_check_failed")


@celery.task(name="lifeflow.run_job", max_retries=4)
def run_job(identity):
    # Commit the claim before external effects. A crash leaves a durable running job for inspection.
    with SessionLocal.begin() as db:
        job = db.scalar(select(m.Job).where(m.Job.id == identity).with_for_update(skip_locked=True))
        if not job or job.status != "queued":
            return
        job.status = "running"
        job.attempts += 1
        job.updated_at = now()
    with SessionLocal.begin() as db:
        job = db.scalar(select(m.Job).where(m.Job.id == identity).with_for_update())
        if not job or job.status != "running":
            return
        try:
            with db.begin_nested():
                if job.kind == "notification":
                    delivery = db.get(m.Delivery, job.resource_id)
                    if delivery and delivery.status == "pending":
                        deliver(db, delivery)
                    if delivery and delivery.status == "pending":
                        job.status = "queued" if job.attempts < 4 else "failed"
                    elif delivery and delivery.status in {"failed", "unknown"}:
                        job.status = "needs_review"
                    else:
                        job.status = "completed"
                elif job.kind == "account_deletion":
                    execute_deletion(db, job.resource_id)
                    job.status = "completed"
                elif job.kind in {"document", "embedding"}:
                    document = db.get(m.Document, job.resource_id)
                    if document:
                        if job.kind == "document":
                            process_document(db, document)
                        else:
                            index_document(db, document)
                    job.status = "completed"
        except Exception as error:
            job.status = "queued" if job.attempts < 4 else "failed"
            job.error_code = type(error).__name__
            if job.kind == "document" and job.status == "failed":
                document = db.get(m.Document, job.resource_id)
                if document:
                    document.status = "failed"
        job.updated_at = now()
