from datetime import timedelta

import httpx
from fastapi.testclient import TestClient
from sqlalchemy import select

from app import models as m
from app.core import now, settings


def test_recurring_task_has_only_one_child_after_reopening(client, users):
    task = client.post(
        "/api/v1/tasks",
        headers=users[0],
        json={"title": "Monthly review", "recurrence": "monthly", "due_at": "2026-12-01T09:00:00+08:00"},
    ).json()
    for status in ["completed", "pending", "completed"]:
        assert (
            client.patch(f"/api/v1/tasks/{task['id']}", headers=users[0], json={"status": status}).status_code
            == 200
        )
    assert len(client.get("/api/v1/tasks", headers=users[0]).json()["items"]) == 2


def test_read_tools_cannot_mutate_or_cross_accounts(client, users):
    client.post("/api/v1/tasks", headers=users[0], json={"title": "Private secret task"})
    assert (
        client.post("/api/v1/ai/tools/SearchTasks", headers=users[1], json={"query": "secret"}).json()[
            "items"
        ]
        == []
    )
    assert (
        client.post("/api/v1/ai/tools/CreateTaskProposal", headers=users[0], json={"title": "X"}).status_code
        == 422
    )
    assert (
        client.post("/api/v1/ai/tools/SearchTasks", headers=users[0], json={"owner_id": "other"}).status_code
        == 422
    )


def test_unverified_billing_never_grants_a_plan(client, users):
    assert client.post("/api/v1/subscriptions/sync", headers=users[0]).status_code == 503
    assert client.post("/api/v1/households", headers=users[0], json={"name": "Family"}).status_code == 403
    assert client.get("/api/v1/users/me", headers=users[0]).json()["plan"] == "free"


def test_configuration_rbac_and_optimistic_version(client, users, database):
    path = "/api/v1/admin/configuration/ai_enabled"
    payload = {"value": {"enabled": False}, "expected_version": 0}
    assert client.patch(path, headers=users[0], json=payload).status_code == 403
    identity = client.get("/api/v1/users/me", headers=users[0]).json()["id"]
    with database.begin() as db:
        db.get(m.User, identity).role = "admin"
    assert client.patch(path, headers=users[0], json=payload).status_code == 200
    assert client.patch(path, headers=users[0], json=payload).status_code == 409
    assert client.post("/api/v1/ai/chat", headers=users[1], json={"message": "Hello"}).status_code == 503
    assert (
        client.post("/api/v1/tasks", headers=users[1], json={"title": "Manual remains usable"}).status_code
        == 201
    )


def test_live_auth_verification_ignores_editable_role_metadata(client, database, monkeypatch):
    monkeypatch.setenv("AUTH_MODE", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://auth.example.test")
    settings.cache_clear()
    original_get = httpx.Client.get

    def get(_client, url, **kwargs):
        if isinstance(_client, TestClient):
            return original_get(_client, url, **kwargs)
        return httpx.Response(
            200,
            request=httpx.Request("GET", url),
            json={
                "id": "00000000-0000-4000-8000-000000000099",
                "email": "verified@example.test",
                "email_confirmed_at": now().isoformat(),
                "user_metadata": {"role": "admin"},
            },
        )

    monkeypatch.setattr(httpx.Client, "get", get)
    assert (
        client.get("/api/v1/users/me", headers={"Authorization": "Bearer managed-provider-token"}).json()[
            "role"
        ]
        == "user"
    )


def test_revenuecat_sync_accepts_only_server_verified_active_entitlement(client, users, monkeypatch):
    monkeypatch.setenv("REVENUECAT_SECRET_KEY", "test-server-key")
    settings.cache_clear()
    original_get = httpx.Client.get

    def get(_client, url, **kwargs):
        if isinstance(_client, TestClient):
            return original_get(_client, url, **kwargs)
        assert "test-server-key" in kwargs["headers"]["Authorization"]
        return httpx.Response(
            200,
            request=httpx.Request("GET", url),
            json={
                "subscriber": {
                    "entitlements": {"family": {"expires_date": (now() + timedelta(days=1)).isoformat()}}
                }
            },
        )

    monkeypatch.setattr(httpx.Client, "get", get)
    result = client.post("/api/v1/subscriptions/sync", headers=users[0])
    assert result.status_code == 200, result.text
    assert client.get("/api/v1/users/me", headers=users[0]).json()["plan"] == "family"


def test_reinvite_revoked_member(client, users, database):
    owner = client.get("/api/v1/users/me", headers=users[0]).json()["id"]
    with database.begin() as db:
        ent = db.scalar(select(m.Entitlement).where(m.Entitlement.owner_id == owner))
        ent.plan, ent.provider, ent.verified_until = "family", "development", now() + timedelta(days=1)
    home = client.post("/api/v1/households", headers=users[0], json={"name": "Home"}).json()
    path = f"/api/v1/households/{home['id']}"
    invite = client.post(f"{path}/invitations", headers=users[0], json={"email": "user1@example.test"}).json()
    assert (
        client.post(f"/api/v1/households/invitations/{invite['id']}/accept", headers=users[1]).status_code
        == 200
    )
    assert client.delete(f"{path}/members/{invite['id']}", headers=users[0]).status_code == 204
    reinvite = client.post(
        f"{path}/invitations", headers=users[0], json={"email": "user1@example.test"}
    ).json()
    assert (
        client.post(f"/api/v1/households/invitations/{reinvite['id']}/accept", headers=users[1]).status_code
        == 200
    )
