# LifeFlow AI

**Organize Life. Automate the Important.**

An Expo Android/iOS application, FastAPI backend and separate Next.js operations console. This repository contains a functional development implementation, not a certified production release. Live providers, native devices and PostgreSQL concurrency still need environment-specific verification. See [TESTING.md](TESTING.md) and [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md).

## Run locally

Requires Python 3.12+ and Node 22.16+.

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r backend/requirements-dev.txt
npm ci
.venv\Scripts\python scripts/local-api.py
```

In another terminal, run `npm run mobile:local`. Open the displayed localhost URL. The login screen exposes an explicitly labeled development token field. Copy only the `token` value from the ignored `.local-session.json` file. The token expires after two hours. Restart the local API to issue a fresh one. Local mode uses SQLite, a private local directory, deterministic extraction and recorded notification attempts; it does not send push notifications. It is unavailable in release builds.

For the actual PostgreSQL/Redis/S3/Celery environment, copy `.env.example` to `.env`, configure Supabase Auth, and run `docker compose up --build`. Docker is required. Copy the app-specific environment examples, set the backend URL and Supabase public settings, then run `npm run mobile` and `npm run admin`. Never copy server secrets into either client. See [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md).

## Implemented paths

- Managed email authentication UI with verification/recovery links, native SecureStore persistence, preferences, consent and deletion requests.
- Tasks, filtering, search, status changes, recurring task instances, calendar agenda and audit events.
- Durable reminders, obligations, follow-up drafts, device registration and notification history.
- Validated PDF/image upload, private storage, extraction jobs, OCR adapter, candidate dates and explicit review.
- LangGraph proposal/validation flow, configurable OpenAI structured output, explicit approval/rejection, read-tool allowlist and manual fallback.
- Seven persisted life-event checklists, ordered steps, dependencies, evidence and event history.
- Permissioned households, invitations, explicit task sharing/assignment and revocation; private vaults remain separate.
- Scoped keyword/vector search, consent-controlled embedding jobs, monthly usage reservations and verified entitlement adapter.
- Database-backed admin authorization, aggregate metrics, failed jobs and audited operational access.
- Alembic migrations, Compose services, CI, EAS profiles and release documentation.

## Verification commands

```powershell
npm run typecheck
npm run lint
npm test
npm run build:admin
npm exec --workspace @lifeflow/mobile -- expo export --platform web
cd backend
..\.venv\Scripts\python -m pytest -q
..\.venv\Scripts\python -m ruff check .
..\.venv\Scripts\python -m alembic upgrade head
```

## Release gaps

Device builds, managed-auth email delivery/deep links, OCR language packs, live AI/vector retrieval, push delivery/receipts, private S3 permissions, RevenueCat purchases and container deployment need real integration testing. Native screens have an English/Filipino translation foundation; most secondary-screen copy is still English. RevenueCat checkout/restore UI, OAuth sign-in, full offline editing, richer document extraction, template editing UI, Sentry and OpenTelemetry wiring are not complete. Dependency audit findings remain and must be addressed or reviewed before release. No deployment or store submission has occurred.

## Layout

`apps/mobile` is the primary Expo application; `apps/admin` is the restricted operational console; `backend/app` contains API, authentication, models, document processing, AI, workers and services; `packages/api-contracts` contains shared client types; `infrastructure` and `.github` contain deployment and CI configuration.

Read [ARCHITECTURE.md](ARCHITECTURE.md), [SECURITY.md](SECURITY.md), [API_DOCUMENTATION.md](API_DOCUMENTATION.md), and [MOBILE_RELEASE_GUIDE.md](MOBILE_RELEASE_GUIDE.md) before operating the system with real data.
