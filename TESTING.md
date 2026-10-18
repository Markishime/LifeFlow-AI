# Verification and remaining checks

## Automated commands

From `backend`: `python -m pytest -q`, `ruff check .`, `ruff format --check .`, `alembic upgrade head`, and `alembic check`. On restricted Windows environments, pytest temporary directories/HTTP-client threads may require an approved unsandboxed run; `--basetemp=.pytest-verify` keeps disposable test databases in the workspace.

From the root: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build:admin`. From the mobile workspace: `expo install --check` and `expo export --platform web`. CI repeats these on Linux and runs a dedicated PostgreSQL integration test against a pgvector service.

## Recorded local results

The core backend suite has verified authentication rejection/expiry, persistent CRUD, cross-user isolation, bounded inputs, idempotent creation, actual scheduler-to-local-delivery history, snooze/cancellation, timezone/DST calculations, action approval/rejection, document parsing/review, workflow dependencies, household revocation, explicit bill confirmation, admin authorization and account deletion. Worker tests cover duplicate broker messages, privacy-preserving push payloads, stale queued-alert cancellation, invalid device tokens and ambiguous provider outcomes.

The current run results are finalized in CHANGELOG.md. Do not treat a skipped PostgreSQL test as proof of row-lock correctness. Local tests use fresh SQLite databases and real application routes with signed test tokens. External calls are mocked when testing provider failure behavior; no paid key is needed. The completed browser task flow is captured in `docs/evidence/task-completed.png`.

Five mobile tests verify pending-button behavior, accessible task completion, readable errors, bearer-token attachment and backend-error handling. Strict TypeScript and ESLint cover both applications. The admin production build and Expo web bundle have been exercised. A browser flow is used to check runtime behavior; it does not replace Android/iOS device QA.

## PostgreSQL integration

Set TEST_POSTGRES_URL to a dedicated migrated test database, then run `pytest tests/test_postgres.py -q`. It checks the vector extension and concurrent scheduler claims. Never point this at production. CI provisions its own `lifeflow_test` database. Docker/PostgreSQL server was not available on the initial host, so this test is skipped locally.

## Provider/device acceptance matrix

| Area | Required real-environment evidence |
| --- | --- |
| Supabase | Registration email, verified sign-in, expired/revoked session, PKCE callback, password reset, logout/restoration and deletion |
| PostgreSQL | Fresh migration, upgrade/check, concurrent reminders/approvals, cascades and scope-filtered vector retrieval |
| S3 + malware | Private ACL, unauthorized access, expiring attachment URL, corrupt/oversized/infected files, scanner downtime |
| OCR | Real phone photos, rotated/scanned PDFs, Tesseract language data, unreadable files and worker timeouts |
| OpenAI | Valid output, refusal, invalid schema, timeout/rate limit, injection, consent revocation and cost recording |
| Expo | Android/iOS registration, permission denial/revocation, token turnover, provider receipts, offline delivery and DST |
| Billing | Sandbox purchase/restore/cancel/refund/expiry, correct app-user ID, verified backend downgrade and store disclosures |
| Household | Wrong-email invitation, revoked/reinvited member, role changes, explicit assignment and private-document separation |
| Accessibility | Screen reader, large type, touch targets, contrast, keyboard, reduced motion and both themes |
| Release | Native development/preview/production builds, signed install, store metadata, deletion and privacy review |

## Known limits

On the final 2026-10-18 run, 31 backend tests passed and one PostgreSQL test was skipped; all five mobile tests passed. Python audit: no known vulnerabilities in the tested environment. JavaScript audit: 66 findings, 34 high and 32 moderate, zero critical. Audit results are time-dependent and do not replace a deployment-specific review.

Registration/recovery tests require a configured auth provider. The full Docker stack, native artifacts, real push receipts, live AI/RAG, RevenueCat transactions and complete Filipino translations are not verified by the local core suite. Dependency advisories remain; rerun `npm audit` and a Python audit before release. No successful external integration, deployment or store review is inferred from compilation.
