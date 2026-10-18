from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    environment: str = "development"
    database_url: str = "sqlite:///./lifeflow.db"
    redis_url: str = "redis://localhost:6379/0"
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_service_role_key: str = ""
    auth_mode: str = "supabase"
    dev_jwt_secret: str = ""
    storage_mode: str = "local"
    storage_path: Path = Path(".local-storage")
    s3_endpoint: str | None = None
    s3_public_endpoint: str | None = None
    s3_bucket: str = "lifeflow-private"
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_region: str = "us-east-1"
    notification_provider: str = "local"
    expo_access_token: str = ""
    openai_api_key: str = ""
    ai_model: str = ""
    embedding_model: str = ""
    ai_input_price_per_million: float = 0
    ai_output_price_per_million: float = 0
    cors_origins: str = "http://localhost:3000,http://localhost:8081"
    max_upload_bytes: int = 10 * 1024 * 1024
    malware_scanner: str = "disabled"
    clamav_host: str = "clamav"
    clamav_port: int = 3310
    rate_limit_per_minute: int = 120
    revenuecat_secret_key: str = ""

    @model_validator(mode="after")
    def secure_production(self):
        if self.auth_mode not in {"supabase", "development"}:
            raise ValueError("Unsupported auth mode")
        if self.auth_mode == "development" and len(self.dev_jwt_secret) < 32:
            raise ValueError("Development authentication requires a random secret of at least 32 characters")
        if self.environment == "production":
            if self.auth_mode != "supabase" or not self.supabase_url.startswith("https://"):
                raise ValueError("Production requires HTTPS Supabase authentication")
            if not self.database_url.startswith("postgresql") or self.storage_mode != "s3":
                raise ValueError("Production requires PostgreSQL and private S3 storage")
            if self.notification_provider != "expo" or self.malware_scanner != "clamav":
                raise ValueError("Production requires Expo push and malware scanning")
            if not self.redis_url.startswith("rediss://"):
                raise ValueError("Production requires TLS Redis")
            if not self.supabase_service_role_key or not self.s3_secret_key:
                raise ValueError("Production provider secrets are missing")
            if any(not x.startswith("https://") for x in self.cors_origins.split(",")):
                raise ValueError("Production CORS origins must use HTTPS")
        return self


@lru_cache
def settings():
    return Settings()


def now():
    return datetime.now(UTC)


def utc(value: datetime):
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def make_engine(url):
    engine = create_engine(
        url,
        pool_pre_ping=True,
        **({"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {}),
    )
    if url.startswith("sqlite"):

        @event.listens_for(engine, "connect")
        def foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")

    return engine


engine = make_engine(settings().database_url)
SessionLocal = sessionmaker(engine, expire_on_commit=False)


def get_db():
    with SessionLocal() as db:
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
