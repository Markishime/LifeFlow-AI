import uuid
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import ValidationError
from sqlalchemy import func, or_, select

from app import ai
from app import models as m
from app import schemas as s
from app.auth import DB, Actor, admin_user
from app.core import now, settings, utc
from app.documents import Storage, checksum, embedding, scan_malware, validate_file
from app.services import (
    approve,
    audit,
    create_reminder,
    create_task,
    create_workflow,
    entitlement,
    idempotent,
    membership,
    owned,
    quota,
    serialize,
    task_for_actor,
    task_scope,
    update_task,
    validate_proposal,
)
from app.subscriptions import sync_entitlements
from app.tools import execute_read

router = APIRouter(prefix="/api/v1")


def page(db, model, owner, limit=50, offset=0):
    rows = db.scalars(
        select(model)
        .where(model.owner_id == owner)
        .order_by(model.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return {"items": serialize(rows), "limit": limit, "offset": offset}


@router.get("/users/me")
def profile(db: DB, user: Actor):
    prefs = db.scalar(select(m.Preference).where(m.Preference.owner_id == user.id))
    return {
        **serialize(user),
        "preferences": serialize(prefs),
        "plan": entitlement(db, user.id),
        "development": settings().environment != "production",
    }


@router.patch("/users/me")
def patch_profile(data: s.ProfilePatch, db: DB, user: Actor):
    user.name = data.name
    prefs = db.scalar(select(m.Preference).where(m.Preference.owner_id == user.id))
    for key, value in data.model_dump(exclude={"name"}).items():
        setattr(prefs, key, value)
    audit(db, user.id, "profile.updated")
    return profile(db, user)


@router.delete("/users/me", status_code=202)
def delete_account(db: DB, user: Actor):
    user.deleted_at = now()
    db.add(m.Job(owner_id=user.id, kind="account_deletion", resource_id=user.id))
    audit(db, user.id, "account.deletion_requested")
    return {
        "status": "deletion_requested",
        "detail": "Access blocked immediately. Provider and stored data removal runs in the worker.",
    }


@router.get("/tasks")
def tasks(
    db: DB,
    user: Actor,
    q: str = Query(default="", max_length=200),
    status: s.TaskStatus | None = None,
    sort: str = Query(default="due", pattern="^(due|created|priority)$"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    query = select(m.Task).where(task_scope(db, user.id))
    if q:
        query = query.where(m.Task.title.icontains(q, autoescape=True))
    if status:
        query = query.where(m.Task.status == status)
    ordering = {
        "due": m.Task.due_at.asc().nulls_last(),
        "created": m.Task.created_at.desc(),
        "priority": m.Task.priority,
    }
    return {
        "items": serialize(
            db.scalars(query.order_by(ordering[sort], m.Task.id).offset(offset).limit(limit)).all()
        ),
        "limit": limit,
        "offset": offset,
    }


@router.post("/tasks", status_code=201, response_model=s.TaskOut)
def add_task(
    data: s.TaskCreate, db: DB, user: Actor, idempotency_key: Annotated[str | None, Header()] = None
):
    return idempotent(
        db,
        user.id,
        idempotency_key,
        "/tasks",
        data.model_dump(mode="json"),
        lambda: serialize(create_task(db, user.id, data)),
    )


@router.get("/tasks/{identity}", response_model=s.TaskOut)
def get_task(identity: str, db: DB, user: Actor):
    return task_for_actor(db, identity, user.id)


@router.patch("/tasks/{identity}", response_model=s.TaskOut)
def patch_task(identity: str, data: s.TaskPatch, db: DB, user: Actor):
    return update_task(db, task_for_actor(db, identity, user.id, write=True), data, user.id)


@router.delete("/tasks/{identity}", status_code=204)
def remove_task(identity: str, db: DB, user: Actor):
    db.delete(owned(db, m.Task, identity, user.id))
    audit(db, user.id, "task.deleted", identity)


@router.get("/dashboard")
def dashboard(db: DB, user: Actor):
    active = db.scalars(
        select(m.Task)
        .where(task_scope(db, user.id), m.Task.status.not_in(["completed", "cancelled"]))
        .order_by(m.Task.due_at.asc().nulls_last())
        .limit(100)
    ).all()
    pending = db.scalar(
        select(func.count())
        .select_from(m.Proposal)
        .where(m.Proposal.owner_id == user.id, m.Proposal.status == "pending")
    )
    overdue = sum(1 for t in active if t.due_at and utc(t.due_at) < now())
    return {
        "priorities": serialize(active[:5]),
        "overdue": overdue,
        "pending_approvals": pending,
        "active_tasks": len(active),
        "briefing": f"You have {len(active)} active tasks, {overdue} overdue and {pending} actions awaiting review.",
        "documents": page(db, m.Document, user.id, 3)["items"],
        "obligations": page(db, m.Obligation, user.id, 5)["items"],
        "activity": page(db, m.Audit, user.id, 8)["items"],
        "workflows": page(db, m.Workflow, user.id, 5)["items"],
    }


@router.get("/reminders")
def reminders(
    db: DB, user: Actor, limit: int = Query(default=50, ge=1, le=100), offset: int = Query(default=0, ge=0)
):
    return page(db, m.Reminder, user.id, limit, offset)


@router.post("/reminders", status_code=201)
def add_reminder(
    data: s.ReminderCreate, db: DB, user: Actor, idempotency_key: Annotated[str | None, Header()] = None
):
    return idempotent(
        db,
        user.id,
        idempotency_key,
        "/reminders",
        data.model_dump(mode="json"),
        lambda: serialize(create_reminder(db, user.id, data)),
    )


@router.patch("/reminders/{identity}")
def patch_reminder(identity: str, data: s.ReminderPatch, db: DB, user: Actor):
    item = owned(db, m.Reminder, identity, user.id, lock=True)
    for key, value in data.model_dump(exclude_unset=True).items():
        if value is None:
            raise HTTPException(422, "Reminder fields cannot be null")
        setattr(item, key, value)
    if data.fire_at and data.status is None:
        item.status = "scheduled"
    for delivery in db.scalars(
        select(m.Delivery).where(m.Delivery.reminder_id == item.id, m.Delivery.status == "pending")
    ):
        delivery.status = "cancelled"
    audit(db, user.id, "reminder.updated", item.id)
    return serialize(item)


@router.delete("/reminders/{identity}", status_code=204)
def remove_reminder(identity: str, db: DB, user: Actor):
    db.delete(owned(db, m.Reminder, identity, user.id))


@router.get("/obligations")
def obligations(
    db: DB, user: Actor, limit: int = Query(default=50, ge=1, le=100), offset: int = Query(default=0, ge=0)
):
    return page(db, m.Obligation, user.id, limit, offset)


@router.post("/obligations", status_code=201)
def add_obligation(data: s.ObligationCreate, db: DB, user: Actor):
    item = m.Obligation(owner_id=user.id, **data.model_dump())
    db.add(item)
    db.flush()
    for minutes in data.reminder_offsets:
        create_reminder(
            db,
            user.id,
            s.ReminderCreate(
                title=data.title,
                fire_at=data.due_at - timedelta(minutes=minutes),
                timezone=data.timezone,
                recurrence=data.recurrence,
                obligation_id=item.id,
            ),
        )
    audit(db, user.id, "obligation.created", item.id)
    return serialize(item)


@router.patch("/obligations/{identity}")
def patch_obligation(identity: str, data: s.ObligationPatch, db: DB, user: Actor):
    item = owned(db, m.Obligation, identity, user.id)
    item.status = data.status
    item.confirmed_at = now() if data.status == "confirmed" else None
    if data.status in {"confirmed", "cancelled"}:
        for reminder in db.scalars(select(m.Reminder).where(m.Reminder.obligation_id == item.id)):
            reminder.status = "completed" if data.status == "confirmed" else "dismissed"
            for delivery in db.scalars(
                select(m.Delivery).where(
                    m.Delivery.reminder_id == reminder.id, m.Delivery.status == "pending"
                )
            ):
                delivery.status = "cancelled"
    audit(
        db,
        user.id,
        "obligation.user_confirmed" if data.status == "confirmed" else "obligation.updated",
        item.id,
    )
    return serialize(item)


@router.delete("/obligations/{identity}", status_code=204)
def remove_obligation(identity: str, db: DB, user: Actor):
    db.delete(owned(db, m.Obligation, identity, user.id))


@router.post("/notifications/devices", status_code=201)
def register_device(data: s.DeviceCreate, db: DB, user: Actor):
    item = db.scalar(select(m.Device).where(m.Device.token == data.token))
    if item and item.owner_id != user.id:
        raise HTTPException(409, "Device is registered to another account; sign out there first")
    if not item:
        item = m.Device(owner_id=user.id, **data.model_dump())
        db.add(item)
    item.active = True
    db.flush()
    return {"id": item.id, "active": item.active}


@router.delete("/notifications/devices/{identity}", status_code=204)
def remove_device(identity: str, db: DB, user: Actor):
    db.delete(owned(db, m.Device, identity, user.id))


@router.get("/notifications/history")
def notification_history(
    db: DB, user: Actor, limit: int = Query(default=50, ge=1, le=100), offset: int = Query(default=0, ge=0)
):
    return page(db, m.Delivery, user.id, limit, offset)


@router.post("/documents/upload", status_code=202)
def upload(file: UploadFile, db: DB, user: Actor):
    quota(db, user.id, "documents")
    content = file.file.read(settings().max_upload_bytes + 1)
    try:
        mime = validate_file(content)
        scan_malware(content)
    except ValueError as error:
        raise HTTPException(422, str(error)) from None
    identity = str(uuid.uuid4())
    key = f"{user.id}/{identity}"
    Storage().put(key, content, mime)
    item = m.Document(
        id=identity,
        owner_id=user.id,
        title=(file.filename or "Document")[:200],
        filename=(file.filename or "Document")[:255],
        mime_type=mime,
        storage_key=key,
        checksum=checksum(content),
    )
    db.add(item)
    db.flush()
    db.add(m.Job(owner_id=user.id, kind="document", resource_id=item.id))
    audit(db, user.id, "document.uploaded", item.id)
    return {"id": item.id, "title": item.title, "status": item.status}


@router.get("/documents")
def documents(
    db: DB, user: Actor, limit: int = Query(default=50, ge=1, le=100), offset: int = Query(default=0, ge=0)
):
    rows = page(db, m.Document, user.id, limit, offset)
    for item in rows["items"]:
        item.pop("storage_key")
    return rows


@router.get("/documents/{identity}")
def document(identity: str, db: DB, user: Actor):
    item = serialize(owned(db, m.Document, identity, user.id))
    item.pop("storage_key")
    return item


@router.get("/documents/{identity}/file")
def document_file(identity: str, db: DB, user: Actor):
    item = owned(db, m.Document, identity, user.id)
    audit(db, user.id, "document.accessed", item.id)
    if settings().storage_mode == "s3":
        return {"url": Storage().signed_url(item.storage_key), "expires_in": 120}
    return StreamingResponse(
        iter([Storage().get(item.storage_key)]),
        media_type=item.mime_type,
        headers={
            "Content-Disposition": "attachment",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/documents/{identity}/extraction")
def extraction(identity: str, db: DB, user: Actor):
    item = owned(db, m.Document, identity, user.id)
    result = db.scalar(select(m.Extraction).where(m.Extraction.document_id == item.id))
    return {"status": item.status, "extraction": serialize(result) if result else None}


@router.post("/documents/{identity}/confirm")
def confirm_document(identity: str, data: s.DocumentConfirm, db: DB, user: Actor):
    item = owned(db, m.Document, identity, user.id, lock=True)
    if item.status == "confirmed":
        return document(identity, db, user)
    if item.status != "needs_review":
        raise HTTPException(409, "Extraction is not ready for review")
    result = db.scalar(select(m.Extraction).where(m.Extraction.document_id == item.id))
    if data.candidate_index is not None and (not result or data.candidate_index >= len(result.dates)):
        raise HTTPException(422, "Date candidate not found")
    if data.candidate_index is not None and not data.reminder_at:
        raise HTTPException(422, "Choose an explicit reminder date and timezone")
    item.title, item.category, item.status = data.title, data.category, "confirmed"
    item.approved_metadata = data.model_dump(mode="json")
    if data.reminder_at:
        create_reminder(
            db,
            user.id,
            s.ReminderCreate(
                title=data.title, fire_at=data.reminder_at, timezone=data.timezone, document_id=item.id
            ),
        )
    # Embeddings send content to the configured AI provider only after explicit AI consent.
    prefs = db.scalar(select(m.Preference).where(m.Preference.owner_id == user.id))
    if prefs.consent.get("ai_processing") and settings().embedding_model:
        db.add(m.Job(owner_id=user.id, kind="embedding", resource_id=item.id))
    audit(db, user.id, "document.confirmed", item.id)
    return document(identity, db, user)


@router.delete("/documents/{identity}", status_code=204)
def remove_document(identity: str, db: DB, user: Actor):
    item = owned(db, m.Document, identity, user.id)
    Storage().delete(item.storage_key)
    db.delete(item)
    audit(db, user.id, "document.deleted", identity)


@router.get("/workflow-templates")
def templates(db: DB, user: Actor):
    return {"items": serialize(db.scalars(select(m.Template).order_by(m.Template.title)).all())}


@router.post("/workflows", status_code=201)
def add_workflow(data: s.WorkflowCreate, db: DB, user: Actor):
    return serialize(create_workflow(db, user.id, data))


@router.get("/workflows")
def workflows(
    db: DB, user: Actor, limit: int = Query(default=50, ge=1, le=100), offset: int = Query(default=0, ge=0)
):
    return page(db, m.Workflow, user.id, limit, offset)


@router.get("/workflows/{identity}")
def workflow(identity: str, db: DB, user: Actor):
    item = owned(db, m.Workflow, identity, user.id)
    return {
        **serialize(item),
        "steps": serialize(
            db.scalars(select(m.Step).where(m.Step.workflow_id == item.id).order_by(m.Step.position)).all()
        ),
        "events": serialize(
            db.scalars(
                select(m.WorkflowEvent)
                .where(m.WorkflowEvent.workflow_id == item.id)
                .order_by(m.WorkflowEvent.created_at)
            ).all()
        ),
    }


@router.patch("/workflows/{identity}")
def patch_workflow(identity: str, data: s.WorkflowPatch, db: DB, user: Actor):
    item = owned(db, m.Workflow, identity, user.id, lock=True)
    if item.status in {"completed", "cancelled"}:
        raise HTTPException(409, "Workflow is terminal")
    item.status = data.status
    db.add(m.WorkflowEvent(workflow_id=item.id, actor_id=user.id, action=f"status:{item.status}"))
    return serialize(item)


@router.post("/workflows/{identity}/steps/{step_id}/complete")
def complete_step(identity: str, step_id: str, data: s.StepComplete, db: DB, user: Actor):
    item = owned(db, m.Workflow, identity, user.id, lock=True)
    if item.status != "active":
        raise HTTPException(409, "Activate this workflow before completing steps")
    steps = db.scalars(select(m.Step).where(m.Step.workflow_id == item.id)).all()
    step = next((step for step in steps if step.id == step_id), None)
    if not step:
        raise HTTPException(404, "Step not found")
    by_position = {step.position: step for step in steps}
    if any(dep not in by_position or by_position[dep].status != "completed" for dep in step.dependencies):
        raise HTTPException(409, "Complete prerequisite steps first")
    if step.status != "completed":
        step.status, step.evidence = "completed", data.evidence
        db.add(
            m.WorkflowEvent(workflow_id=item.id, actor_id=user.id, action=f"step_completed:{step.position}")
        )
    if all(step.status == "completed" for step in steps):
        item.status = "completed"
    db.flush()
    return workflow(identity, db, user)


@router.post("/ai/chat")
def chat(data: s.Chat, db: DB, user: Actor):
    prefs = db.scalar(select(m.Preference).where(m.Preference.owner_id == user.id))
    if settings().openai_api_key and not prefs.consent.get("ai_processing"):
        raise HTTPException(403, "Enable AI processing consent in settings first")
    return ai.chat(db, user, data)


@router.get("/ai/action-proposals")
def proposals(db: DB, user: Actor):
    return page(db, m.Proposal, user.id)


@router.post("/ai/action-proposals", status_code=201)
def proposal(data: s.ProposalCreate, db: DB, user: Actor):
    try:
        arguments = validate_proposal(data.tool, data.arguments)
    except ValidationError:
        raise HTTPException(422, "Invalid tool arguments") from None
    item = m.Proposal(owner_id=user.id, tool=data.tool, arguments=arguments)
    db.add(item)
    db.flush()
    return serialize(item)


@router.post("/ai/action-proposals/{identity}/approve")
def approve_proposal(identity: str, db: DB, user: Actor):
    return serialize(approve(db, user.id, identity))


@router.post("/ai/action-proposals/{identity}/reject")
def reject_proposal(identity: str, db: DB, user: Actor):
    item = owned(db, m.Proposal, identity, user.id, lock=True)
    if item.status == "approved":
        raise HTTPException(409, "Already approved")
    item.status = "rejected"
    audit(db, user.id, "proposal.rejected", item.id)
    return serialize(item)


@router.get("/search")
def search(db: DB, user: Actor, q: str = Query(min_length=1, max_length=200), semantic: bool = False):
    if semantic:
        pref = db.scalar(select(m.Preference).where(m.Preference.owner_id == user.id))
        if not pref.consent.get("ai_processing"):
            raise HTTPException(403, "AI processing consent required")
        vector = embedding(q)
        if vector is None or db.bind.dialect.name != "postgresql":
            raise HTTPException(
                503, "Semantic search requires PostgreSQL and a configured embedding provider"
            )
        result = db.scalars(
            select(m.Embedding)
            .where(m.Embedding.owner_id == user.id, m.Embedding.model == settings().embedding_model)
            .order_by(m.Embedding.vector.cosine_distance(vector))
            .limit(10)
        ).all()
        return {"sources": [{"document_id": row.document_id, "excerpt": row.text} for row in result]}
    docs = db.scalars(
        select(m.Document)
        .outerjoin(m.Extraction, m.Extraction.document_id == m.Document.id)
        .where(
            m.Document.owner_id == user.id,
            or_(
                m.Document.title.icontains(q, autoescape=True),
                m.Extraction.text.icontains(q, autoescape=True),
            ),
        )
        .limit(20)
    ).all()
    flows = db.scalars(
        select(m.Workflow)
        .where(m.Workflow.owner_id == user.id, m.Workflow.title.icontains(q, autoescape=True))
        .limit(20)
    ).all()
    return {
        "tasks": tasks(db, user, q=q, status=None, sort="due", limit=20, offset=0)["items"],
        "documents": [{"id": d.id, "title": d.title} for d in docs],
        "workflows": serialize(flows),
    }


@router.post("/households", status_code=201)
def add_household(data: s.HouseholdCreate, db: DB, user: Actor):
    if entitlement(db, user.id) != "family":
        raise HTTPException(403, "A verified Family entitlement is required to create a household")
    item = m.Household(owner_id=user.id, name=data.name)
    db.add(item)
    db.flush()
    db.add(m.Member(household_id=item.id, user_id=user.id, email=user.email, role="owner", status="active"))
    audit(db, user.id, "household.created", item.id)
    return serialize(item)


@router.get("/households")
def households(db: DB, user: Actor):
    ids = select(m.Member.household_id).where(m.Member.user_id == user.id, m.Member.status == "active")
    return {"items": serialize(db.scalars(select(m.Household).where(m.Household.id.in_(ids))).all())}


@router.get("/households/invitations")
def invitations(db: DB, user: Actor):
    return {
        "items": serialize(
            db.scalars(
                select(m.Member).where(m.Member.email == user.email.lower(), m.Member.status == "invited")
            ).all()
        )
    }


@router.get("/households/{identity}")
def household(identity: str, db: DB, user: Actor):
    membership(db, identity, user.id)
    item = db.get(m.Household, identity)
    return {
        **serialize(item),
        "members": serialize(db.scalars(select(m.Member).where(m.Member.household_id == identity)).all()),
    }


@router.post("/households/{identity}/invitations", status_code=201)
def invite(identity: str, data: s.Invite, db: DB, user: Actor):
    membership(db, identity, user.id, manager=True)
    home = db.get(m.Household, identity)
    if entitlement(db, home.owner_id) != "family":
        raise HTTPException(403, "The household owner needs a verified Family entitlement")
    prior = db.scalar(
        select(m.Member).where(
            m.Member.household_id == identity,
            m.Member.email == data.email.lower(),
        )
    )
    if prior and prior.status in {"invited", "active"}:
        raise HTTPException(409, "Member is already invited or active")
    item = prior or m.Member(household_id=identity, email=data.email.lower(), role=data.role)
    if prior:
        item.status, item.user_id, item.role = "invited", None, data.role
    else:
        db.add(item)
    db.flush()
    audit(db, user.id, "household.invited", identity)
    return {**serialize(item), "delivery": "in_app_only"}


@router.post("/households/invitations/{identity}/accept")
def accept(identity: str, db: DB, user: Actor):
    item = db.scalar(
        select(m.Member)
        .where(m.Member.id == identity, m.Member.email == user.email.lower(), m.Member.status == "invited")
        .with_for_update()
    )
    if not item:
        raise HTTPException(404, "Invitation not found")
    item.user_id, item.status = user.id, "active"
    audit(db, user.id, "household.joined", item.household_id)
    return serialize(item)


@router.post("/households/invitations/{identity}/reject")
def reject_invitation(identity: str, db: DB, user: Actor):
    item = db.scalar(
        select(m.Member).where(
            m.Member.id == identity, m.Member.email == user.email.lower(), m.Member.status == "invited"
        )
    )
    if not item:
        raise HTTPException(404, "Invitation not found")
    item.status = "rejected"
    return serialize(item)


@router.delete("/households/{identity}/members/{member_id}", status_code=204)
def revoke(identity: str, member_id: str, db: DB, user: Actor):
    manager = membership(db, identity, user.id, manager=True)
    item = db.scalar(select(m.Member).where(m.Member.id == member_id, m.Member.household_id == identity))
    if not item:
        raise HTTPException(404, "Member not found")
    if item.role == "owner" or (item.role == "admin" and manager.role != "owner"):
        raise HTTPException(
            403, "Only the owner can revoke administrators; owner removal requires household deletion"
        )
    item.status = "revoked"
    audit(db, user.id, "household.revoked", identity)


@router.get("/follow-ups")
def follow_ups(db: DB, user: Actor):
    return page(db, m.FollowUp, user.id)


@router.post("/follow-ups", status_code=201)
def follow_up(data: s.FollowUpCreate, db: DB, user: Actor):
    item = m.FollowUp(
        owner_id=user.id,
        **data.model_dump(),
        draft=f"Hello {data.contact or 'there'}, I am following up regarding {data.title}. Could you please share an update? Thank you.",
    )
    db.add(item)
    db.flush()
    create_reminder(
        db, user.id, s.ReminderCreate(title=f"Follow up: {data.title}"[:200], fire_at=data.follow_up_at)
    )
    return serialize(item)


@router.patch("/follow-ups/{identity}")
def patch_follow_up(identity: str, data: s.FollowUpPatch, db: DB, user: Actor):
    item = owned(db, m.FollowUp, identity, user.id)
    item.status = data.status
    item.history = [*item.history, {"status": data.status, "at": now().isoformat()}]
    return serialize(item)


@router.get("/admin/metrics", dependencies=[Depends(admin_user)])
def metrics(db: DB, user: Actor):
    audit(db, user.id, "admin.metrics_viewed")
    totals = {
        model.__tablename__: db.scalar(select(func.count()).select_from(model))
        for model in [m.User, m.Task, m.Document, m.Workflow, m.Delivery]
    }
    cost = db.scalar(select(func.sum(m.Execution.estimated_cost))) or 0
    usage = db.scalar(select(func.sum(m.Execution.input_tokens + m.Execution.output_tokens))) or 0
    failures = db.scalars(select(m.Job).where(m.Job.status.in_(["failed", "needs_review"])).limit(30)).all()
    return {
        "totals": totals,
        "ai_estimated_cost": float(cost),
        "ai_tokens": usage,
        "active_subscriptions": db.scalar(
            select(func.count())
            .select_from(m.Entitlement)
            .where(m.Entitlement.verified_until > now(), m.Entitlement.provider == "revenuecat")
        ),
        "job_failures": [
            {
                "id": j.id,
                "kind": j.kind,
                "status": j.status,
                "attempts": j.attempts,
                "error_code": j.error_code,
            }
            for j in failures
        ],
        "environment": settings().environment,
    }


@router.get("/admin/audit", dependencies=[Depends(admin_user)])
def admin_audit(db: DB, user: Actor):
    audit(db, user.id, "admin.audit_viewed")
    return {
        "items": serialize(db.scalars(select(m.Audit).order_by(m.Audit.created_at.desc()).limit(100)).all())
    }


@router.post("/admin/jobs/{identity}/retry", dependencies=[Depends(admin_user)])
def retry_job(identity: str, db: DB, user: Actor):
    job = db.get(m.Job, identity)
    if not job or job.status != "failed" or job.kind == "notification":
        raise HTTPException(409, "Only failed non-notification jobs can be retried automatically")
    job.status, job.attempts = "queued", 0
    audit(db, user.id, "admin.job_retried", identity)
    return {"status": job.status}


@router.post("/subscriptions/sync")
def sync_subscription(db: DB, user: Actor):
    return sync_entitlements(db, user.id)


@router.post("/ai/tools/{tool}")
def read_tool(tool: str, arguments: dict, db: DB, user: Actor):
    if ai.TOOL_REGISTRY.get(tool) not in {"read", "draft"}:
        raise HTTPException(422, "Changes must go through an action proposal")
    try:
        return execute_read(db, user.id, tool, arguments)
    except ValidationError:
        raise HTTPException(422, "Invalid read tool arguments") from None


@router.get("/admin/configuration", dependencies=[Depends(admin_user)])
def configuration(db: DB, user: Actor):
    return {
        "items": serialize(db.scalars(select(m.Configuration)).all()),
        "allowed_keys": ["ai_enabled", "assistant_tone"],
    }


@router.patch("/admin/configuration/{key}", dependencies=[Depends(admin_user)])
def update_configuration(key: str, data: s.ConfigurationPatch, db: DB, user: Actor):
    if key not in {"ai_enabled", "assistant_tone"}:
        raise HTTPException(422, "Configuration key is not allowlisted")
    if key == "ai_enabled" and (
        set(data.value) != {"enabled"} or not isinstance(data.value["enabled"], bool)
    ):
        raise HTTPException(422, "Expected {enabled: boolean}")
    if key == "assistant_tone" and (
        set(data.value) != {"text"}
        or not isinstance(data.value["text"], str)
        or len(data.value["text"]) > 2000
    ):
        raise HTTPException(422, "Expected {text: string} with at most 2000 characters")
    db.scalar(select(m.User).where(m.User.id == user.id).with_for_update())
    item = db.scalar(select(m.Configuration).where(m.Configuration.key == key).with_for_update())
    if (item.version if item else 0) != data.expected_version:
        raise HTTPException(409, "Configuration changed; refresh before editing")
    if not item:
        item = m.Configuration(key=key, value=data.value, version=1)
        db.add(item)
    else:
        item.value, item.version = data.value, item.version + 1
    audit(db, user.id, f"admin.configuration_changed:{key}")
    db.flush()
    return serialize(item)
