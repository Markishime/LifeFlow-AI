from datetime import timedelta

import httpx
from sqlalchemy import select

from app import models as m
from app.core import now
from app.notifications import deliver, schedule_due
from app.workers import run_job


def ready_delivery(client, users, database):
    client.patch("/api/v1/users/me", headers=users[0], json={"notifications": True})
    client.post(
        "/api/v1/notifications/devices",
        headers=users[0],
        json={"token": "ExpoPushToken[provider-test]", "platform": "ios"},
    )
    client.post(
        "/api/v1/reminders",
        headers=users[0],
        json={"title": "Private renewal", "fire_at": (now() - timedelta(seconds=1)).isoformat()},
    )
    with database.begin() as db:
        schedule_due(db)
        return db.scalar(select(m.Delivery)).id, db.scalar(select(m.Job)).id


def test_worker_duplicate_messages_do_not_repeat_delivery(client, users, database, monkeypatch):
    delivery_id, job_id = ready_delivery(client, users, database)
    monkeypatch.setattr("app.workers.SessionLocal", database)
    run_job.run(job_id)
    run_job.run(job_id)
    with database() as db:
        assert db.get(m.Delivery, delivery_id).attempts == 1
        assert db.get(m.Job, job_id).status == "completed"


def test_snooze_cancels_old_queued_delivery(client, users, database):
    delivery_id, _ = ready_delivery(client, users, database)
    reminder_id = client.get("/api/v1/reminders", headers=users[0]).json()["items"][0]["id"]
    client.patch(
        f"/api/v1/reminders/{reminder_id}",
        headers=users[0],
        json={"fire_at": (now() + timedelta(hours=1)).isoformat()},
    )
    with database.begin() as db:
        delivery = db.get(m.Delivery, delivery_id)
        deliver(db, delivery)
        assert delivery.status == "cancelled"
        assert delivery.attempts == 0


def test_push_payload_redacted_and_invalid_device_disabled(client, users, database, monkeypatch):
    delivery_id, _ = ready_delivery(client, users, database)
    monkeypatch.setenv("NOTIFICATION_PROVIDER", "expo")
    from app.core import settings

    settings.cache_clear()
    sent = []

    def post(_self, url, **kwargs):
        sent.append(kwargs["json"])
        return httpx.Response(
            200,
            request=httpx.Request("POST", url),
            json={"data": {"status": "error", "details": {"error": "DeviceNotRegistered"}}},
        )

    monkeypatch.setattr(httpx.Client, "post", post)
    with database.begin() as db:
        delivery = db.get(m.Delivery, delivery_id)
        deliver(db, delivery)
        assert not db.get(m.Device, delivery.device_id).active
        assert delivery.status == "failed"
    assert "Private renewal" not in str(sent)


def test_ambiguous_provider_failure_is_not_retried(client, users, database, monkeypatch):
    delivery_id, _ = ready_delivery(client, users, database)
    monkeypatch.setenv("NOTIFICATION_PROVIDER", "expo")
    from app.core import settings

    settings.cache_clear()

    def timeout(*args, **kwargs):
        raise httpx.ReadTimeout("Ambiguous")

    monkeypatch.setattr(httpx.Client, "post", timeout)
    with database.begin() as db:
        delivery = db.get(m.Delivery, delivery_id)
        deliver(db, delivery)
        deliver(db, delivery)
        assert delivery.status == "unknown"
        assert delivery.attempts == 1
