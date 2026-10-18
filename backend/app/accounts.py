import httpx
from sqlalchemy import delete, select

from app import models as m
from app.core import settings
from app.documents import Storage


def execute_deletion(db, user_id):
    user = db.get(m.User, user_id)
    if not user or not user.deleted_at:
        return
    for document in db.scalars(select(m.Document).where(m.Document.owner_id == user_id)):
        Storage().delete(document.storage_key)
    if settings().auth_mode == "supabase":
        if not settings().supabase_service_role_key:
            raise RuntimeError("Auth deletion requires the server-only service role key")
        with httpx.Client(timeout=20) as client:
            response = client.delete(
                f"{settings().supabase_url}/auth/v1/admin/users/{user_id}",
                headers={
                    "apikey": settings().supabase_service_role_key,
                    "Authorization": f"Bearer {settings().supabase_service_role_key}",
                },
            )
            if response.status_code != 404:
                response.raise_for_status()
    # Keep only an identity tombstone to prevent a still-valid JWT from resurrecting application data.
    # Cascade children through foreign keys. Job is retained with no personal content for operator confirmation.
    for model in [
        m.Task,
        m.Household,
        m.Document,
        m.Obligation,
        m.Reminder,
        m.Device,
        m.Delivery,
        m.Workflow,
        m.Conversation,
        m.Proposal,
        m.Execution,
        m.FollowUp,
        m.Entitlement,
        m.Audit,
        m.Preference,
        m.Idempotency,
        m.Embedding,
        m.Usage,
    ]:
        db.execute(delete(model).where(model.owner_id == user_id))
    db.execute(delete(m.Member).where(m.Member.user_id == user_id))
    db.execute(delete(m.Assignment).where(m.Assignment.user_id == user_id))
    db.execute(delete(m.Job).where(m.Job.owner_id == user_id, m.Job.kind != "account_deletion"))
    user.email, user.name, user.role = "", "", "deleted"
