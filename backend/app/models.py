import uuid
from datetime import datetime
from decimal import Decimal

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core import now


class Base(DeclarativeBase):
    pass


class Record:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Owned(Record):
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)


class User(Record, Base):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String(320))
    name: Mapped[str] = mapped_column(String(100), default="")
    role: Mapped[str] = mapped_column(String(20), default="user")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Preference(Owned, Base):
    __tablename__ = "user_preferences"
    __table_args__ = (UniqueConstraint("owner_id"),)
    language: Mapped[str] = mapped_column(String(2), default="en")
    timezone: Mapped[str] = mapped_column(String(80), default="Asia/Manila")
    notifications: Mapped[bool] = mapped_column(Boolean, default=False)
    consent: Mapped[dict] = mapped_column(JSON, default=dict)


class Household(Owned, Base):
    __tablename__ = "households"
    name: Mapped[str] = mapped_column(String(100))


class Member(Record, Base):
    __tablename__ = "household_members"
    __table_args__ = (UniqueConstraint("household_id", "user_id"),)
    household_id: Mapped[str] = mapped_column(ForeignKey("households.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(320))
    role: Mapped[str] = mapped_column(String(20), default="member")
    status: Mapped[str] = mapped_column(String(20), default="invited")


class Task(Owned, Base):
    __tablename__ = "tasks"
    __table_args__ = (Index("ix_tasks_owner_due", "owner_id", "due_at"),)
    title: Mapped[str] = mapped_column(String(200))
    parent_task_id: Mapped[str | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="SET NULL"), unique=True, index=True
    )
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(50), default="personal")
    priority: Mapped[str] = mapped_column(String(10), default="medium")
    status: Mapped[str] = mapped_column(String(20), default="pending")
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    timezone: Mapped[str] = mapped_column(String(80), default="Asia/Manila")
    recurrence: Mapped[str | None] = mapped_column(String(20))
    document_ids: Mapped[list] = mapped_column(JSON, default=list)
    workflow_id: Mapped[str | None] = mapped_column(
        ForeignKey("workflow_instances.id", ondelete="SET NULL"), index=True
    )
    household_id: Mapped[str | None] = mapped_column(
        ForeignKey("households.id", ondelete="SET NULL"), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Assignment(Record, Base):
    __tablename__ = "task_assignments"
    __table_args__ = (UniqueConstraint("task_id", "user_id"),)
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)


class Document(Owned, Base):
    __tablename__ = "documents"
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(50), default="miscellaneous")
    filename: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(100))
    storage_key: Mapped[str] = mapped_column(String(500), unique=True)
    checksum: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(30), default="queued")
    approved_metadata: Mapped[dict] = mapped_column(JSON, default=dict)


class Extraction(Record, Base):
    __tablename__ = "document_extractions"
    document_id: Mapped[str] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), unique=True, index=True
    )
    text: Mapped[str] = mapped_column(Text, default="")
    fields: Mapped[dict] = mapped_column(JSON, default=dict)
    dates: Mapped[list] = mapped_column(JSON, default=list)
    uncertainty: Mapped[str] = mapped_column(
        Text, default="Review all extracted fields against the original."
    )


class Embedding(Owned, Base):
    __tablename__ = "document_embeddings"
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text)
    model: Mapped[str] = mapped_column(String(100))
    vector: Mapped[list] = mapped_column(Vector(1536).with_variant(JSON, "sqlite"))


class Obligation(Owned, Base):
    __tablename__ = "obligations"
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(50), default="bill")
    amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3), default="PHP")
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    timezone: Mapped[str] = mapped_column(String(80), default="Asia/Manila")
    recurrence: Mapped[str | None] = mapped_column(String(20))
    reminder_offsets: Mapped[list] = mapped_column(JSON, default=lambda: [1440])
    status: Mapped[str] = mapped_column(String(20), default="pending")
    notes: Mapped[str] = mapped_column(Text, default="")
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Reminder(Owned, Base):
    __tablename__ = "reminders"
    __table_args__ = (Index("ix_reminders_status_fire", "status", "fire_at"),)
    title: Mapped[str] = mapped_column(String(200))
    fire_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    timezone: Mapped[str] = mapped_column(String(80), default="Asia/Manila")
    recurrence: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="scheduled")
    task_id: Mapped[str | None] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    document_id: Mapped[str | None] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    obligation_id: Mapped[str | None] = mapped_column(
        ForeignKey("obligations.id", ondelete="CASCADE"), index=True
    )


class Device(Owned, Base):
    __tablename__ = "notification_devices"
    token: Mapped[str] = mapped_column(String(300), unique=True)
    platform: Mapped[str] = mapped_column(String(10))
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Delivery(Owned, Base):
    __tablename__ = "notification_deliveries"
    __table_args__ = (UniqueConstraint("reminder_id", "device_id", "scheduled_for"),)
    reminder_id: Mapped[str] = mapped_column(ForeignKey("reminders.id", ondelete="CASCADE"), index=True)
    device_id: Mapped[str | None] = mapped_column(
        ForeignKey("notification_devices.id", ondelete="SET NULL"), index=True
    )
    scheduled_for: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(30), default="pending")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    provider_id: Mapped[str | None] = mapped_column(String(200))
    error_code: Mapped[str | None] = mapped_column(String(100))


class Template(Record, Base):
    __tablename__ = "workflow_templates"
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    steps: Mapped[list] = mapped_column(JSON)
    sources: Mapped[list] = mapped_column(JSON, default=list)
    jurisdiction: Mapped[str] = mapped_column(String(80), default="PH")
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Workflow(Owned, Base):
    __tablename__ = "workflow_instances"
    template_id: Mapped[str | None] = mapped_column(
        ForeignKey("workflow_templates.id", ondelete="SET NULL"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(40), default="draft")


class Step(Record, Base):
    __tablename__ = "workflow_steps"
    workflow_id: Mapped[str] = mapped_column(
        ForeignKey("workflow_instances.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(200))
    dependencies: Mapped[list] = mapped_column(JSON, default=list)
    required_documents: Mapped[list] = mapped_column(JSON, default=list)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    responsible_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    status: Mapped[str] = mapped_column(String(20), default="pending")
    evidence: Mapped[str] = mapped_column(Text, default="")


class WorkflowEvent(Record, Base):
    __tablename__ = "workflow_events"
    workflow_id: Mapped[str] = mapped_column(
        ForeignKey("workflow_instances.id", ondelete="CASCADE"), index=True
    )
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action: Mapped[str] = mapped_column(String(100))


class Conversation(Owned, Base):
    __tablename__ = "ai_conversations"
    title: Mapped[str] = mapped_column(String(200), default="LifeFlow conversation")


class Message(Record, Base):
    __tablename__ = "ai_messages"
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("ai_conversations.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)


class Proposal(Owned, Base):
    __tablename__ = "ai_action_proposals"
    tool: Mapped[str] = mapped_column(String(80))
    arguments: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    result: Mapped[dict] = mapped_column(JSON, default=dict)


class Execution(Owned, Base):
    __tablename__ = "ai_execution_logs"
    model: Mapped[str] = mapped_column(String(100))
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    estimated_cost: Mapped[Decimal] = mapped_column(Numeric(14, 8), default=0)
    status: Mapped[str] = mapped_column(String(20))


class FollowUp(Owned, Base):
    __tablename__ = "follow_ups"
    title: Mapped[str] = mapped_column(String(200))
    contact: Mapped[str] = mapped_column(String(200), default="")
    follow_up_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="waiting")
    draft: Mapped[str] = mapped_column(Text, default="")
    history: Mapped[list] = mapped_column(JSON, default=list)


class Entitlement(Owned, Base):
    __tablename__ = "subscription_entitlements"
    __table_args__ = (UniqueConstraint("owner_id"),)
    plan: Mapped[str] = mapped_column(String(20), default="free")
    provider: Mapped[str] = mapped_column(String(30), default="none")
    verified_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Audit(Owned, Base):
    __tablename__ = "audit_logs"
    action: Mapped[str] = mapped_column(String(100))
    resource_id: Mapped[str | None] = mapped_column(String(36))


class Job(Owned, Base):
    __tablename__ = "background_jobs"
    kind: Mapped[str] = mapped_column(String(50))
    resource_id: Mapped[str] = mapped_column(String(36), index=True)
    status: Mapped[str] = mapped_column(String(30), default="queued", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    error_code: Mapped[str | None] = mapped_column(String(100))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class Idempotency(Owned, Base):
    __tablename__ = "idempotency_keys"
    __table_args__ = (UniqueConstraint("owner_id", "key", "path"),)
    key: Mapped[str] = mapped_column(String(100))
    path: Mapped[str] = mapped_column(String(100))
    checksum: Mapped[str] = mapped_column(String(64))
    response: Mapped[dict] = mapped_column(JSON)


class Usage(Owned, Base):
    __tablename__ = "usage_reservations"
    resource: Mapped[str] = mapped_column(String(30), index=True)


class Configuration(Record, Base):
    __tablename__ = "system_configuration"
    key: Mapped[str] = mapped_column(String(80), unique=True)
    value: Mapped[dict] = mapped_column(JSON)
    version: Mapped[int] = mapped_column(Integer, default=1)
