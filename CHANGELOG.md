# Changelog

## 0.1.0 development, 2026-10-18

Initialized the previously empty repository as an Expo/FastAPI/Next.js monorepo. Added architecture/plan/design documentation before implementation; SQLAlchemy ownership models and Alembic migrations; managed-auth boundaries and isolated local adapters; tasks, reminders, obligations, private document review, AI proposals, workflow execution, household permissions, follow-up drafts, entitlement verification, scoped search and operational APIs.

Connected mobile screens to the API and added permission-at-use behavior, recovery routes, explicit AI consent, two themes, a localization foundation and notification history. Added the separate restricted admin console, Docker Compose, CI, EAS configuration, generated icons/splash and operator/release/privacy documentation.

Verification has included 31 passing backend tests with the PostgreSQL integration test skipped, five passing mobile tests, strict client type checks, ESLint, Ruff, SQLite migration upgrade/schema comparison, admin production build, Expo dependency alignment and Expo web export. The browser authenticated against the local API, created and persisted a task, completed it and found it through the Completed filter. Evidence: `docs/evidence/task-completed.png`.

Browser testing found and fixed a NativeWind theme setting, a Metro development-server incompatibility and empty-string rendering in React Native views. Replaced raw timestamp inputs with native/web date pickers. Added tests for recurring-instance duplication, read-tool scope, database configuration versions, managed-auth role metadata, verified billing and revoked-member re-invitation. Updated maintained backend dependencies and retested them before pinning.

This is a development implementation. Provider/native/container/PostgreSQL checks, complete localization, full billing UI, observability integration, richer OCR/AI extraction and remaining dependency advisories prevent a production-ready claim. No deployments, purchases or store submissions occurred.

Final checks: 31 backend tests passed, one PostgreSQL-only test skipped, five mobile tests passed; TypeScript, ESLint, Ruff, migration comparison, admin production build and Expo web export passed. Python dependency consistency passed and pip-audit found no known vulnerabilities. The final npm audit reported 66 findings (34 high, 32 moderate, zero critical), including transitive build/test dependencies; these remain an explicit release gate. No forced/incompatible dependency downgrades were applied to silence the audit.
