# LifeFlow AI implementation plan

The starting repository contains only a README. No existing application or credentials are present.

## Architecture and boundaries

Expo Router mobile client and a separate Next.js operational console call a versioned FastAPI API. Supabase Auth owns credentials, verification and recovery; FastAPI independently validates bearer tokens with the managed provider. Application data belongs to a dedicated PostgreSQL database, inaccessible through the Supabase Data API. SQLAlchemy and Alembic own schema changes. Celery beat polls durable schedules in PostgreSQL; Redis transports jobs. A private S3 bucket stores documents. Local adapters are explicitly development-only.

## Credentials and configuration

Supabase URL, publishable key and server-only service role key (account removal); PostgreSQL URL; Redis URL; private S3 endpoint, bucket and credentials; optional OpenAI key/model and per-token prices; Expo push access token, EAS project ID and platform signing credentials; optional Sentry DSNs. No deployment or paid services are provisioned automatically.

## Data and contracts

UUID identities, UTC timestamps, indexed ownership foreign keys and cascading deletion. The API authenticates every private route and selects resources by both identity and owner. Household sharing is explicit. AI proposals and document date candidates are inert until approved. API contracts derive from FastAPI OpenAPI; shared TypeScript interfaces cover client-facing objects. See DATABASE_SCHEMA.md and API_DOCUMENTATION.md as implementation progresses.

## Risks and controls

Cross-account disclosure: object authorization and regression tests. Untrusted document/LLM content: validated schemas and an allowlisted tool registry. Duplicate notifications: unique delivery keys and row claims; ambiguous provider outcomes require inspection instead of blind retries. Provider downtime: bounded timeouts and manual task functionality. Sensitive storage: private bucket, expiring signed URLs and no document content in logs. Development adapters fail startup in production. Authentication deletion is a multi-stage process with local access tombstones.

## Phases and acceptance criteria

1. Foundation: reproducible workspace installs, configuration, schema migrations, authentication boundaries, UI tokens, Compose and CI. Acceptance: API rejects anonymous/foreign users; migration and type checks pass where tools are available.
2. Tasks/reminders: persistent task CRUD, obligations, devices, schedules and notification history in mobile. Acceptance: task survives a new session; due job creates one delivery per device; unauthorized reads and writes fail; snooze and completion update state.
3. Documents: bounded validated uploads, private storage, PDF/image extraction, candidate dates and confirmation. Acceptance: invalid/oversized files fail; extraction cannot create reminders before confirmation; another user cannot obtain file access.
4. AI/workflows: structured proposals, approval/rejection, persisted workflows and dependency checks. Acceptance: repeated approval cannot execute twice; invalid tool arguments fail; steps cannot bypass dependencies.
5. Advanced: household invites/assignment, follow-ups, entitlement limits, authorized search and admin metrics. Acceptance: revoked members lose access; private files remain private; non-admin cannot read monitoring data; inactive subscriptions never grant paid features.
6. Hardening/release: security regression suite, build/type/lint checks, setup and release guides. Acceptance: check results and unverified provider/device/production paths recorded accurately. Store submission and compliance review remain external release gates.

## Verification strategy

Core tests run without paid providers, using an isolated SQLite database and explicit test authentication overrides. PostgreSQL integration runs separately against a dedicated database. Document parser and scheduling logic run in core tests. Mobile and admin use strict TypeScript and ESLint; client components receive focused tests. External provider and device delivery checks require real configuration and must never be reported as verified by local adapter tests.

## Progress

- Repository inspected; architecture, sequence, risks and acceptance criteria established before application code.
- Implementation and verification results are tracked in CHANGELOG.md and TESTING.md.
