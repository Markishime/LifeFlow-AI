from datetime import datetime
from decimal import Decimal
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Zoned(Input):
    timezone: str = "Asia/Manila"

    @field_validator("timezone")
    @classmethod
    def valid_zone(cls, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Unknown IANA timezone") from None
        return value


Recurrence = Literal["daily", "weekly", "monthly", "yearly"]
TaskStatus = Literal["pending", "in_progress", "waiting", "completed", "cancelled"]


class TaskCreate(Zoned):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=10000)
    category: str = Field(default="personal", max_length=50)
    priority: Literal["low", "medium", "high"] = "medium"
    due_at: AwareDatetime | None = None
    recurrence: Recurrence | None = None
    reminder_at: AwareDatetime | None = None
    document_ids: list[str] = Field(default_factory=list, max_length=20)
    household_id: str | None = None
    assigned_to: str | None = None


class TaskPatch(Input):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10000)
    priority: Literal["low", "medium", "high"] | None = None
    status: TaskStatus | None = None
    due_at: AwareDatetime | None = None
    recurrence: Recurrence | None = None


class ReminderCreate(Zoned):
    title: str = Field(min_length=1, max_length=200)
    fire_at: AwareDatetime
    recurrence: Recurrence | None = None
    task_id: str | None = None
    document_id: str | None = None
    obligation_id: str | None = None


class ReminderPatch(Input):
    fire_at: AwareDatetime | None = None
    status: Literal["scheduled", "dismissed", "completed"] | None = None


class ObligationCreate(Zoned):
    title: str = Field(min_length=1, max_length=200)
    category: str = Field(default="bill", max_length=50)
    amount: Decimal | None = Field(default=None, ge=0, max_digits=14, decimal_places=2)
    currency: str = Field(default="PHP", pattern=r"^[A-Z]{3}$")
    due_at: AwareDatetime
    recurrence: Recurrence | None = None
    reminder_offsets: list[int] = Field(default_factory=lambda: [1440], max_length=8)
    notes: str = Field(default="", max_length=5000)

    @field_validator("reminder_offsets")
    @classmethod
    def valid_offsets(cls, value):
        if any(v < 0 or v > 525600 for v in value):
            raise ValueError("Offsets must be between zero and one year in minutes")
        return sorted(set(value))


class ObligationPatch(Input):
    status: Literal["pending", "confirmed", "cancelled"]


class ProfilePatch(Zoned):
    name: str = Field(default="", max_length=100)
    language: Literal["en", "fil"] = "en"
    notifications: bool = False
    consent: dict[str, bool] = Field(default_factory=dict)


class DeviceCreate(Input):
    token: str = Field(pattern=r"^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$", max_length=300)
    platform: Literal["android", "ios"]


class WorkflowCreate(Input):
    template_id: str
    title: str | None = Field(default=None, min_length=1, max_length=200)


class WorkflowPatch(Input):
    status: Literal["draft", "active", "waiting_for_user", "waiting_for_external_response", "cancelled"]


class StepComplete(Input):
    evidence: str = Field(min_length=1, max_length=5000)


class ProposalCreate(Input):
    tool: Literal[
        "CreateTaskProposal", "UpdateTaskProposal", "CreateReminderProposal", "GenerateWorkflowProposal"
    ]
    arguments: dict


class Chat(Input):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: str | None = None


class AIOutput(Input):
    reply: str
    tool: Literal["none", "CreateTaskProposal", "CreateReminderProposal", "GenerateWorkflowProposal"]
    # JSON string keeps the provider schema closed; content is then validated by the tool schema.
    arguments_json: str


class DocumentConfirm(Zoned):
    title: str = Field(min_length=1, max_length=200)
    category: str = Field(default="miscellaneous", max_length=50)
    candidate_index: int | None = Field(default=None, ge=0)
    reminder_at: AwareDatetime | None = None


class HouseholdCreate(Input):
    name: str = Field(min_length=1, max_length=100)


class Invite(Input):
    email: str = Field(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$", max_length=320)
    role: Literal["member", "admin"] = "member"


class FollowUpCreate(Input):
    title: str = Field(min_length=1, max_length=200)
    contact: str = Field(default="", max_length=200)
    follow_up_at: AwareDatetime


class FollowUpPatch(Input):
    status: Literal["waiting", "resolved", "cancelled"]


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    owner_id: str
    title: str
    description: str
    category: str
    priority: str
    status: str
    due_at: datetime | None
    timezone: str
    recurrence: str | None
    document_ids: list[str]
    household_id: str | None
    workflow_id: str | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None

    @field_validator("due_at", "created_at", "updated_at", "completed_at", mode="before")
    @classmethod
    def aware_output(cls, value):
        from app.core import utc

        return utc(value) if isinstance(value, datetime) else value


class ConfigurationPatch(Input):
    value: dict
    expected_version: int = Field(ge=0)
