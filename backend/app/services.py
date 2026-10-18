import hashlib
import json
from datetime import datetime

from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, or_, select

from app import models as m
from app.core import now, settings, utc
from app.schemas import ReminderCreate, TaskCreate, TaskPatch, WorkflowCreate


def serialize(obj):
    if isinstance(obj, list):
        return [serialize(v) for v in obj]
    return jsonable_encoder(
        {
            col.name: utc(value) if isinstance(value := getattr(obj, col.name), datetime) else value
            for col in obj.__table__.columns
        }
    )


def owned(db, model, identity, owner, lock=False):
    query = select(model).where(model.id == identity, model.owner_id == owner)
    if lock:
        query = query.with_for_update()
    item = db.scalar(query)
    if item is None:
        raise HTTPException(404, "Resource not found")
    return item


def audit(db, actor, action, resource=None):
    db.add(m.Audit(owner_id=actor, action=action, resource_id=resource))


def membership(db, household, actor, manager=False):
    member = db.scalar(
        select(m.Member).where(
            m.Member.household_id == household, m.Member.user_id == actor, m.Member.status == "active"
        )
    )
    if not member or (manager and member.role not in {"owner", "admin"}):
        raise HTTPException(404, "Household not found")
    return member


def task_scope(db, actor):
    homes = select(m.Member.household_id).where(m.Member.user_id == actor, m.Member.status == "active")
    return or_(m.Task.owner_id == actor, m.Task.household_id.in_(homes))


def task_for_actor(db, identity, actor, write=False):
    query = select(m.Task).where(m.Task.id == identity, task_scope(db, actor))
    task = db.scalar(query.with_for_update() if write else query)
    if not task:
        raise HTTPException(404, "Task not found")
    if write and task.owner_id != actor:
        member = membership(db, task.household_id, actor)
        assigned = db.scalar(
            select(m.Assignment).where(m.Assignment.task_id == task.id, m.Assignment.user_id == actor)
        )
        if member.role not in {"owner", "admin"} and not assigned:
            raise HTTPException(
                403, "Only the owner, household managers or assigned member may update this task"
            )
    return task


def entitlement(db, owner):
    ent = db.scalar(select(m.Entitlement).where(m.Entitlement.owner_id == owner))
    if (
        ent
        and ent.verified_until
        and utc(ent.verified_until) > now()
        and (
            ent.provider == "revenuecat"
            or (ent.provider == "development" and settings().environment != "production")
        )
    ):
        return ent.plan
    return "free"


def quota(db, owner, resource):
    # Serialize concurrent quota checks for this user, including across worker processes.
    db.scalar(select(m.User).where(m.User.id == owner).with_for_update())
    plan = entitlement(db, owner)
    limits = {
        "documents": {"free": 10, "pro": 500, "family": 1000},
        "ai": {"free": 20, "pro": 1000, "family": 2000},
    }
    model = m.Usage
    count = db.scalar(
        select(func.count())
        .select_from(model)
        .where(
            model.owner_id == owner,
            model.resource == resource,
            model.created_at >= now().replace(day=1, hour=0, minute=0, second=0, microsecond=0),
        )
    )
    if count >= limits[resource].get(plan, limits[resource]["free"]):
        raise HTTPException(403, f"Monthly {resource} allowance reached")
    db.add(m.Usage(owner_id=owner, resource=resource))
    db.flush()


def create_reminder(db, owner, data: ReminderCreate):
    for model, identity in [
        (m.Task, data.task_id),
        (m.Document, data.document_id),
        (m.Obligation, data.obligation_id),
    ]:
        if identity:
            owned(db, model, identity, owner)
    reminder = m.Reminder(owner_id=owner, **data.model_dump())
    db.add(reminder)
    db.flush()
    audit(db, owner, "reminder.created", reminder.id)
    return reminder


def create_task(db, owner, data: TaskCreate):
    values = data.model_dump(exclude={"reminder_at", "assigned_to"})
    if data.household_id:
        membership(db, data.household_id, owner)
    if data.assigned_to:
        if not data.household_id:
            raise HTTPException(422, "Assignment requires an explicitly shared household task")
        membership(db, data.household_id, data.assigned_to)
    if data.household_id and data.document_ids:
        raise HTTPException(422, "Private document links cannot be attached to shared tasks")
    for identity in data.document_ids:
        owned(db, m.Document, identity, owner)
    task = m.Task(owner_id=owner, **values)
    db.add(task)
    db.flush()
    if data.assigned_to:
        db.add(m.Assignment(task_id=task.id, user_id=data.assigned_to))
    if data.reminder_at:
        create_reminder(
            db,
            owner,
            ReminderCreate(
                title=data.title,
                fire_at=data.reminder_at,
                timezone=data.timezone,
                recurrence=data.recurrence,
                task_id=task.id,
            ),
        )
    audit(db, owner, "task.created", task.id)
    return task


def update_task(db, task, data: TaskPatch, actor):
    values = data.model_dump(exclude_unset=True)
    if any(values.get(key, "ok") is None for key in ["title", "description", "priority", "status"]):
        raise HTTPException(422, "This field cannot be null")
    old_status = task.status
    for key, value in values.items():
        setattr(task, key, value)
    if task.status in {"completed", "cancelled"}:
        for reminder in db.scalars(select(m.Reminder).where(m.Reminder.task_id == task.id)):
            reminder.status = "completed" if task.status == "completed" else "dismissed"
            for delivery in db.scalars(
                select(m.Delivery).where(
                    m.Delivery.reminder_id == reminder.id, m.Delivery.status == "pending"
                )
            ):
                delivery.status = "cancelled"
    if task.status == "completed" and old_status != "completed":
        task.completed_at = now()
        if (
            task.recurrence
            and task.due_at
            and not db.scalar(select(m.Task.id).where(m.Task.parent_task_id == task.id))
        ):
            from app.notifications import next_occurrence

            following = next_occurrence(task.due_at, task.recurrence, task.timezone)
            child = create_task(
                db,
                task.owner_id,
                TaskCreate(
                    title=task.title,
                    description=task.description,
                    category=task.category,
                    priority=task.priority,
                    due_at=following,
                    timezone=task.timezone,
                    recurrence=task.recurrence,
                    household_id=task.household_id,
                ),
            )
            child.parent_task_id = task.id
    elif task.status != "completed":
        task.completed_at = None
    audit(db, actor, "task.updated", task.id)
    db.flush()
    return task


def create_workflow(db, owner, data: WorkflowCreate):
    template = db.get(m.Template, data.template_id)
    if not template:
        raise HTTPException(404, "Workflow template not found")
    flow = m.Workflow(
        owner_id=owner,
        template_id=template.id,
        title=data.title or template.title,
        description=template.description,
        status="active",
    )
    db.add(flow)
    db.flush()
    for index, step in enumerate(template.steps):
        db.add(
            m.Step(
                workflow_id=flow.id,
                title=step["title"],
                position=index,
                dependencies=step.get("dependencies", []),
            )
        )
    db.add(m.WorkflowEvent(workflow_id=flow.id, actor_id=owner, action="started"))
    audit(db, owner, "workflow.started", flow.id)
    db.flush()
    return flow


TOOL_SCHEMAS = {
    "CreateTaskProposal": TaskCreate,
    "CreateReminderProposal": ReminderCreate,
    "GenerateWorkflowProposal": WorkflowCreate,
}


def validate_proposal(tool, arguments):
    if tool == "UpdateTaskProposal":
        identity = arguments.get("task_id")
        if not isinstance(identity, str):
            raise HTTPException(422, "task_id required")
        data = TaskPatch.model_validate({key: value for key, value in arguments.items() if key != "task_id"})
        return {"task_id": identity, **data.model_dump(mode="json", exclude_unset=True)}
    schema = TOOL_SCHEMAS.get(tool)
    if not schema:
        raise HTTPException(422, "Tool is not in the allowlist")
    return schema.model_validate(arguments).model_dump(mode="json")


def approve(db, owner, identity):
    proposal = owned(db, m.Proposal, identity, owner, lock=True)
    if proposal.status == "approved":
        return proposal
    if proposal.status != "pending":
        raise HTTPException(409, "Proposal is no longer pending")
    args = validate_proposal(proposal.tool, proposal.arguments)
    if proposal.tool == "CreateTaskProposal":
        result = create_task(db, owner, TaskCreate.model_validate(args))
    elif proposal.tool == "CreateReminderProposal":
        result = create_reminder(db, owner, ReminderCreate.model_validate(args))
    elif proposal.tool == "GenerateWorkflowProposal":
        result = create_workflow(db, owner, WorkflowCreate.model_validate(args))
    else:
        identity = args.pop("task_id")
        result = update_task(
            db, owned(db, m.Task, identity, owner, lock=True), TaskPatch.model_validate(args), owner
        )
    proposal.status = "approved"
    proposal.result = {"id": result.id}
    audit(db, owner, "proposal.approved", proposal.id)
    return proposal


def idempotent(db, owner, key, path, payload, operation):
    if not key:
        return operation()
    if len(key) > 100:
        raise HTTPException(422, "Idempotency key too long")
    db.scalar(select(m.User).where(m.User.id == owner).with_for_update())
    digest = hashlib.sha256(json.dumps(jsonable_encoder(payload), sort_keys=True).encode()).hexdigest()
    prior = db.scalar(
        select(m.Idempotency).where(
            m.Idempotency.owner_id == owner, m.Idempotency.key == key, m.Idempotency.path == path
        )
    )
    if prior:
        if prior.checksum != digest:
            raise HTTPException(409, "Idempotency key was used with different input")
        return prior.response
    response = operation()
    db.add(m.Idempotency(owner_id=owner, key=key, path=path, checksum=digest, response=response))
    db.flush()
    return response


def seed_templates(db):
    templates = {
        "new-job": (
            "Starting a new job",
            [
                "Review the offer and start date",
                "Gather requested documents",
                "Confirm onboarding arrangements",
            ],
        ),
        "moving": (
            "Moving to a new residence",
            [
                "Confirm the move date and budget",
                "Arrange utilities and address updates",
                "Prepare a moving-day checklist",
            ],
        ),
        "school": (
            "Preparing school enrollment",
            [
                "Check the school's current requirements",
                "Gather enrollment documents",
                "Confirm submission and keep evidence",
            ],
        ),
        "application": (
            "Organizing a job application",
            [
                "Review the role and deadline",
                "Prepare your CV and supporting documents",
                "Record submission and plan a follow-up",
            ],
        ),
        "business": (
            "Registering a small business",
            [
                "Verify requirements for your jurisdiction",
                "Gather required information",
                "Review official submission instructions",
            ],
        ),
        "renewals": (
            "Managing document renewals",
            [
                "Verify expiration and renewal requirements",
                "Gather supporting documents",
                "Plan the appointment or submission",
            ],
        ),
        "travel": (
            "Preparing for travel",
            [
                "Check destination entry requirements",
                "Review documents and bookings",
                "Prepare departure essentials",
            ],
        ),
    }
    for slug, (title, steps) in templates.items():
        if not db.scalar(select(m.Template).where(m.Template.slug == slug)):
            db.add(
                m.Template(
                    slug=slug,
                    title=title,
                    description="Planning checklist only. Requirements are unverified; confirm current official requirements for your situation.",
                    steps=[
                        {"title": title, "dependencies": [] if i == 0 else [i - 1]}
                        for i, title in enumerate(steps)
                    ],
                )
            )
