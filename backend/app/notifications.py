from datetime import timedelta
from zoneinfo import ZoneInfo

import httpx
from dateutil.relativedelta import relativedelta
from sqlalchemy import select

from app import models as m
from app.core import now, settings, utc


def next_occurrence(value, recurrence, timezone):
    local = utc(value).astimezone(ZoneInfo(timezone))
    delta = {
        "daily": relativedelta(days=1),
        "weekly": relativedelta(weeks=1),
        "monthly": relativedelta(months=1),
        "yearly": relativedelta(years=1),
    }[recurrence]
    following = local + delta
    # Roundtrip normalizes nonexistent DST wall times forward into the valid interval.
    return utc(following).astimezone(ZoneInfo(timezone)).astimezone(ZoneInfo("UTC"))


def schedule_due(db):
    reminders = db.scalars(
        select(m.Reminder)
        .where(m.Reminder.status == "scheduled", m.Reminder.fire_at <= now())
        .order_by(m.Reminder.fire_at)
        .limit(100)
        .with_for_update(skip_locked=True)
    ).all()
    for reminder in reminders:
        devices = db.scalars(
            select(m.Device).where(m.Device.owner_id == reminder.owner_id, m.Device.active.is_(True))
        ).all()
        preference = db.scalar(select(m.Preference).where(m.Preference.owner_id == reminder.owner_id))
        if not preference or not preference.notifications:
            devices = []
        for device in devices:
            existing = db.scalar(
                select(m.Delivery).where(
                    m.Delivery.reminder_id == reminder.id,
                    m.Delivery.device_id == device.id,
                    m.Delivery.scheduled_for == reminder.fire_at,
                )
            )
            if not existing:
                delivery = m.Delivery(
                    owner_id=reminder.owner_id,
                    reminder_id=reminder.id,
                    device_id=device.id,
                    scheduled_for=reminder.fire_at,
                )
                db.add(delivery)
                db.flush()
                db.add(m.Job(owner_id=reminder.owner_id, kind="notification", resource_id=delivery.id))
        if not devices:
            db.add(
                m.Delivery(
                    owner_id=reminder.owner_id,
                    reminder_id=reminder.id,
                    scheduled_for=reminder.fire_at,
                    status="no_device",
                )
            )
        if reminder.recurrence:
            next_at = next_occurrence(reminder.fire_at, reminder.recurrence, reminder.timezone)
            while next_at <= now():
                next_at = next_occurrence(next_at, reminder.recurrence, reminder.timezone)
            reminder.fire_at = next_at
        else:
            reminder.status = "dispatched"
    db.flush()
    return len(reminders)


def deliver(db, delivery):
    if delivery.status != "pending":
        return
    device = db.get(m.Device, delivery.device_id) if delivery.device_id else None
    pref = db.scalar(select(m.Preference).where(m.Preference.owner_id == delivery.owner_id))
    if not device or not device.active or not pref or not pref.notifications:
        delivery.status = "cancelled"
        return
    delivery.attempts += 1
    if settings().notification_provider == "local":
        delivery.status = "local_recorded"
        delivery.provider_id = f"local:{delivery.id}"
        return
    headers = (
        {"Authorization": f"Bearer {settings().expo_access_token}"} if settings().expo_access_token else {}
    )
    try:
        with httpx.Client(timeout=15) as client:
            response = client.post(
                "https://exp.host/--/api/v2/push/send",
                headers=headers,
                json={
                    "to": device.token,
                    "title": "LifeFlow reminder",
                    "body": "You have a responsibility to review. Open LifeFlow for details.",
                    "data": {"screen": "reminders"},
                    "sound": "default",
                },
            )
        if response.status_code == 429:
            delivery.status = "pending" if delivery.attempts < 4 else "failed"
            delivery.error_code = "rate_limited"
            return
        response.raise_for_status()
        ticket = response.json()["data"]
        if ticket["status"] == "ok":
            delivery.status = "accepted"
            delivery.provider_id = ticket["id"]
        else:
            delivery.status = "failed"
            delivery.error_code = ticket.get("details", {}).get("error", "provider_rejected")
            if delivery.error_code == "DeviceNotRegistered":
                device.active = False
    except httpx.ConnectError:
        delivery.status = "pending" if delivery.attempts < 4 else "failed"
        delivery.error_code = "connection_failed"
    except (httpx.HTTPError, ValueError, KeyError):
        # The provider might have accepted the message. Never automatically resend an ambiguous request.
        delivery.status = "unknown"
        delivery.error_code = "ambiguous_provider_outcome"


def check_receipts(db):
    deliveries = db.scalars(
        select(m.Delivery)
        .where(m.Delivery.status == "accepted", m.Delivery.created_at < now() - timedelta(minutes=15))
        .limit(100)
    ).all()
    if not deliveries or settings().notification_provider != "expo":
        return
    headers = (
        {"Authorization": f"Bearer {settings().expo_access_token}"} if settings().expo_access_token else {}
    )
    with httpx.Client(timeout=15) as client:
        response = client.post(
            "https://exp.host/--/api/v2/push/getReceipts",
            headers=headers,
            json={"ids": [d.provider_id for d in deliveries]},
        )
        response.raise_for_status()
        receipts = response.json()["data"]
    for delivery in deliveries:
        receipt = receipts.get(delivery.provider_id)
        if receipt:
            delivery.status = "provider_delivered" if receipt["status"] == "ok" else "failed"
            delivery.error_code = receipt.get("details", {}).get("error")
            if delivery.error_code == "DeviceNotRegistered" and delivery.device_id:
                device = db.get(m.Device, delivery.device_id)
                if device:
                    device.active = False
