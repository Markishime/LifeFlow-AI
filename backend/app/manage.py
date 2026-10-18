import argparse
from datetime import timedelta

import jwt
from sqlalchemy import select

from app.core import SessionLocal, now, settings
from app.models import Entitlement, User
from app.services import seed_templates


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["seed", "dev-token", "admin", "dev-plan"])
    parser.add_argument("--user", default="00000000-0000-4000-8000-000000000001")
    parser.add_argument("--email", default="local@example.test")
    parser.add_argument("--plan", choices=["free", "pro", "family"], default="free")
    args = parser.parse_args()
    if args.command == "seed":
        with SessionLocal.begin() as db:
            seed_templates(db)
    elif args.command == "dev-token":
        if settings().environment == "production" or settings().auth_mode != "development":
            raise SystemExit("Development tokens are disabled")
        print(
            jwt.encode(
                {
                    "sub": args.user,
                    "email": args.email,
                    "aud": "lifeflow-development",
                    "iss": "lifeflow-development",
                    "exp": now() + timedelta(hours=2),
                },
                settings().dev_jwt_secret,
                algorithm="HS256",
            )
        )
    elif args.command == "dev-plan":
        if settings().environment == "production":
            raise SystemExit("Development plans are disabled")
        with SessionLocal.begin() as db:
            entitlement = db.scalar(select(Entitlement).where(Entitlement.owner_id == args.user))
            if not entitlement:
                raise SystemExit("Sign in first")
            entitlement.plan, entitlement.provider = args.plan, "development"
            entitlement.verified_until = now() + timedelta(days=7)
    else:
        with SessionLocal.begin() as db:
            user = db.get(User, args.user)
            if not user or user.deleted_at:
                raise SystemExit("Existing active user required")
            user.role = "admin"


if __name__ == "__main__":
    main()
