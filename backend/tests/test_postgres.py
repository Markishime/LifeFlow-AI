"""Dedicated PostgreSQL integration checks; CI supplies an isolated database."""

import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import sessionmaker

from app.core import make_engine, now
from app.models import Delivery, Device, Preference, Reminder, User
from app.notifications import schedule_due

URL = os.getenv("TEST_POSTGRES_URL")
pytestmark = pytest.mark.skipif(not URL, reason="TEST_POSTGRES_URL is not configured")


def test_postgres_vector_and_concurrent_schedule_claims():
    engine = make_engine(URL)
    sessions = sessionmaker(engine, expire_on_commit=False)
    owner = str(uuid.uuid4())
    with sessions.begin() as db:
        assert db.scalar(text("SELECT extname FROM pg_extension WHERE extname = 'vector'")) == "vector"
        db.add(User(id=owner, email="integration@example.test"))
        db.flush()
        db.add(Preference(owner_id=owner, notifications=True))
        db.add(Device(owner_id=owner, token=f"ExpoPushToken[{uuid.uuid4().hex}]", platform="android"))
        db.add(Reminder(owner_id=owner, title="Concurrent reminder", fire_at=now() - timedelta(seconds=2)))

    def run():
        with sessions.begin() as db:
            return schedule_due(db)

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            counts = list(pool.map(lambda _: run(), range(2)))
        assert sum(counts) == 1
        with sessions() as db:
            assert len(db.scalars(select(Delivery).where(Delivery.owner_id == owner)).all()) == 1
    finally:
        with sessions.begin() as db:
            db.delete(db.get(User, owner))
        engine.dispose()
