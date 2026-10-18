"""Start a loopback-only backend with explicit development authentication and local adapters."""

import json
import os
import secrets
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if os.getenv("ENVIRONMENT") == "production":
    raise SystemExit("This command is disabled in production")
state_file = ROOT / ".local-session.json"
state = (
    json.loads(state_file.read_text())
    if state_file.exists()
    else {"secret": secrets.token_urlsafe(48)}
)
os.environ.update(
    ENVIRONMENT="development",
    AUTH_MODE="development",
    DEV_JWT_SECRET=state["secret"],
    DATABASE_URL=f"sqlite:///{(ROOT / 'backend' / 'lifeflow.db').as_posix()}",
    STORAGE_MODE="local",
    STORAGE_PATH=str(ROOT / "backend" / ".local-storage"),
    NOTIFICATION_PROVIDER="local",
    MALWARE_SCANNER="disabled",
)
os.chdir(ROOT / "backend")
sys.path.insert(0, str(ROOT / "backend"))
import jwt  # noqa: E402
import uvicorn  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from app.core import SessionLocal  # noqa: E402
from app.services import seed_templates  # noqa: E402

command.upgrade(Config("alembic.ini"), "head")
with SessionLocal.begin() as db:
    seed_templates(db)
state["token"] = jwt.encode(
    {
        "sub": "00000000-0000-4000-8000-000000000001",
        "email": "local@example.test",
        "iss": "lifeflow-development",
        "aud": "lifeflow-development",
        "exp": datetime.now(UTC) + timedelta(hours=2),
    },
    state["secret"],
    algorithm="HS256",
)
state_file.write_text(json.dumps(state), encoding="utf-8")
print(
    "DEVELOPMENT ONLY: local adapters enabled. Short-lived token saved in .local-session.json."
)
uvicorn.run("app.main:app", host="127.0.0.1", port=8000, access_log=False)
