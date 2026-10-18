import json
import logging
import time
import uuid
from collections import defaultdict, deque
from contextlib import asynccontextmanager

import redis
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api import router
from app.core import SessionLocal, settings
from app.upload_limit import UploadLimit

logger = logging.getLogger("lifeflow")
logging.basicConfig(level=logging.INFO, format="%(message)s")


@asynccontextmanager
async def lifespan(app):
    settings()
    yield


app = FastAPI(title="LifeFlow AI", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings().cors_origins.split(","),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
)
app.include_router(router)
app.add_middleware(UploadLimit)
local_rates = defaultdict(deque)


@app.middleware("http")
async def boundary(request: Request, call_next):
    identity = request.client.host if request.client else "unknown"
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    if (
        settings().environment == "production"
        and request.url.scheme != "https"
        and request.url.path.startswith("/api/")
    ):
        return JSONResponse(
            {"error": {"code": "https_required", "message": "HTTPS is required"}}, status_code=400
        )
    if request.url.path.startswith("/api/"):
        if settings().environment == "production":
            try:
                client = redis.Redis.from_url(settings().redis_url, socket_timeout=2)
                key = f"rate:{identity}:{int(time.time() // 60)}"
                with client.pipeline() as pipeline:
                    pipeline.incr(key)
                    pipeline.expire(key, 65)
                    count = pipeline.execute()[0]
                limited = count > settings().rate_limit_per_minute
            except redis.RedisError:
                return JSONResponse(
                    {"error": {"code": "503", "message": "Rate limiter unavailable"}}, status_code=503
                )
        else:
            stamp = time.monotonic()
            window = local_rates[identity]
            while window and window[0] < stamp - 60:
                window.popleft()
            limited = len(window) >= settings().rate_limit_per_minute
            window.append(stamp)
        if limited:
            return JSONResponse(
                {"error": {"code": "429", "message": "Too many requests"}},
                status_code=429,
                headers={"Retry-After": "60"},
            )
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    logger.info(
        json.dumps(
            {
                "event": "request",
                "method": request.method,
                "status": response.status_code,
                "request_id": request_id,
            }
        )
    )
    return response


@app.exception_handler(StarletteHTTPException)
async def api_error(request, error):
    return JSONResponse(
        {
            "error": {
                "code": str(error.status_code),
                "message": str(error.detail),
                "request_id": getattr(request.state, "request_id", None),
            }
        },
        status_code=error.status_code,
        headers=error.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request, error):
    return JSONResponse(
        {
            "error": {
                "code": "validation_error",
                "message": "Check the submitted fields",
                "fields": [
                    {"field": ".".join(map(str, e["loc"])), "message": e["msg"]} for e in error.errors()
                ],
            }
        },
        status_code=422,
    )


@app.exception_handler(Exception)
async def unexpected_error(request, error):
    logger.error(
        json.dumps(
            {
                "event": "unhandled_error",
                "type": type(error).__name__,
                "request_id": getattr(request.state, "request_id", None),
            }
        )
    )
    return JSONResponse(
        {
            "error": {
                "code": "internal_error",
                "message": "Request failed. Please try again.",
                "request_id": getattr(request.state, "request_id", None),
            }
        },
        status_code=500,
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "lifeflow-api"}


@app.get("/ready")
def ready():
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(503, "Database unavailable") from None
    return {"status": "ready"}
