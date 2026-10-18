from typing import Annotated
from uuid import UUID

import httpx
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core import get_db, settings
from app.models import Entitlement, Preference, User

bearer = HTTPBearer(auto_error=False)
DB = Annotated[Session, Depends(get_db)]


def current_user(db: DB, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
    if not credentials:
        raise HTTPException(401, "Authentication required")
    cfg = settings()
    try:
        if cfg.auth_mode == "development":
            claims = jwt.decode(
                credentials.credentials,
                cfg.dev_jwt_secret,
                algorithms=["HS256"],
                audience="lifeflow-development",
                issuer="lifeflow-development",
                options={"require": ["exp", "sub", "iss", "aud"]},
            )
            identity = {"id": claims["sub"], "email": claims.get("email", "local@example.test")}
        else:
            # Managed verification also checks the session with the provider, rather than trusting user metadata.
            with httpx.Client(timeout=10) as client:
                response = client.get(
                    f"{cfg.supabase_url}/auth/v1/user",
                    headers={
                        "Authorization": f"Bearer {credentials.credentials}",
                        "apikey": cfg.supabase_publishable_key,
                    },
                )
                response.raise_for_status()
                identity = response.json()
            if not identity.get("email_confirmed_at"):
                raise HTTPException(403, "Verify your email before using LifeFlow")
        subject = str(UUID(identity["id"]))
    except HTTPException:
        raise
    except httpx.RequestError:
        raise HTTPException(503, "Authentication provider unavailable") from None
    except (jwt.PyJWTError, ValueError, KeyError, httpx.HTTPStatusError):
        raise HTTPException(401, "Invalid or expired session") from None
    user = db.get(User, subject)
    if user and user.deleted_at:
        raise HTTPException(403, "Account deletion is in progress")
    if not user:
        user = User(id=subject, email=identity.get("email", "").lower())
        db.add(user)
        db.flush()
        db.add_all([Preference(owner_id=user.id), Entitlement(owner_id=user.id)])
        db.flush()
    return user


Actor = Annotated[User, Depends(current_user)]


def admin_user(user: Actor):
    if user.role != "admin":
        raise HTTPException(403, "Administrator access required")
    return user
