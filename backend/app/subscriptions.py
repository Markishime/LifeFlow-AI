from datetime import datetime

import httpx
from fastapi import HTTPException
from sqlalchemy import select

from app.core import now, settings, utc
from app.models import Entitlement
from app.services import audit


def sync_entitlements(db, owner):
    key = settings().revenuecat_secret_key
    if not key:
        raise HTTPException(503, "Billing is not configured; no subscription was activated")
    try:
        with httpx.Client(timeout=15) as client:
            response = client.get(
                f"https://api.revenuecat.com/v1/subscribers/{owner}",
                headers={"Authorization": f"Bearer {key}"},
            )
            response.raise_for_status()
            entitlements = response.json()["subscriber"]["entitlements"]
    except (httpx.HTTPError, ValueError, KeyError):
        raise HTTPException(503, "Subscription verification unavailable") from None
    record = db.scalar(select(Entitlement).where(Entitlement.owner_id == owner).with_for_update())
    record.plan, record.provider, record.verified_until = "free", "revenuecat", None
    for plan in ["family", "pro"]:
        item = entitlements.get(plan)
        # Indefinite/lifetime grants require a separate explicitly supported policy.
        if item and item.get("expires_date"):
            until = datetime.fromisoformat(item["expires_date"].replace("Z", "+00:00"))
            if utc(until) > now():
                record.plan, record.verified_until = plan, until
                break
    audit(db, owner, "subscription.provider_verified")
    return {"plan": record.plan, "verified_until": record.verified_until, "provider": record.provider}
