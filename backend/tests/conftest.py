import os
import uuid
from datetime import timedelta

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

os.environ["AUTH_MODE"] = "development"
os.environ["DEV_JWT_SECRET"] = "test-only-secret-which-is-at-least-32-characters"
os.environ["RATE_LIMIT_PER_MINUTE"] = "100000"

from app.core import get_db, make_engine, now, settings  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402
from app.services import seed_templates  # noqa: E402


@pytest.fixture
def database(tmp_path, monkeypatch):
    settings.cache_clear()
    monkeypatch.setenv("STORAGE_PATH", str(tmp_path / "storage"))
    engine = make_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(engine, expire_on_commit=False)
    with sessions.begin() as db:
        seed_templates(db)
    yield sessions
    engine.dispose()
    settings.cache_clear()


@pytest.fixture
def client(database):
    def db_override():
        with database() as db:
            try:
                yield db
                db.commit()
            except Exception:
                db.rollback()
                raise

    app.dependency_overrides[get_db] = db_override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def users(client):
    headers = []
    for index in range(3):
        token = jwt.encode(
            {
                "sub": str(uuid.uuid4()),
                "email": f"user{index}@example.test",
                "exp": now() + timedelta(hours=1),
                "iss": "lifeflow-development",
                "aud": "lifeflow-development",
            },
            settings().dev_jwt_secret,
            algorithm="HS256",
        )
        header = {"Authorization": f"Bearer {token}"}
        assert client.get("/api/v1/users/me", headers=header).status_code == 200
        headers.append(header)
    return headers
