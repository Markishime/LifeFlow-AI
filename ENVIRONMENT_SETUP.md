# Environment setup

## Prerequisites

Python 3.12+, Node 22.16+ (the development host also verified Node 24), npm and Git. Docker Engine/Compose is needed for the full stack. Android Studio or an Android development device is needed for Android; iOS native builds require macOS/Xcode or EAS. Tesseract with English language data is needed for image/scanned-page OCR outside Docker.

Install dependencies with `python -m venv .venv`, `.venv\Scripts\python -m pip install -r backend/requirements-dev.txt`, and `npm ci`. If Windows venv bootstrap fails, `python -m pip --python .venv install -r backend/requirements-dev.txt` can populate the virtual environment from the host pip. Dependency versions are pinned; the npm lockfile is committed.

## Managed-auth full environment

1. Copy root `.env.example` to `.env`; keep it out of source control.
2. Create/configure a Supabase project for Auth. Enable email verification, configure SMTP, password recovery and redirect allowlist `lifeflow://auth/callback`. For web preview, allow the exact local callback URL. Verify PKCE callbacks on real development builds. The application database may remain separate from Supabase's database.
3. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY on the backend. Set SUPABASE_SERVICE_ROLE_KEY only on the backend for account deletion. Client `.env` files receive only their public URL/key and the application API URL.
4. Use `docker compose up --build`. Postgres, Redis, MinIO, ClamAV, migration/seed, API, worker and beat services are defined. ClamAV signatures may take time to initialize; uploads should fail while the scanner is unavailable. Verify this explicitly.
5. Set app environment files from their examples. Run `npm run mobile` and `npm run admin`. Use `docker compose --profile web up --build` to include the containerized console.
6. Sign in normally once, then grant a specific console operator using `python -m app.manage admin --user <verified-user-uuid>` from the backend environment. There is no public role-elevation endpoint.

The API URL in an Android emulator is normally `http://10.0.2.2:8000`; iOS simulator/web can use localhost. Physical devices need a reachable development host and explicit CORS/redirect configuration. Compose loopback bindings are intentional. S3_PUBLIC_ENDPOINT must be reachable from the user's device because it becomes the signed URL host; the API's internal S3_ENDPOINT can remain `http://minio:9000`.

## No-provider development

`python scripts/local-api.py` migrates an SQLite database and creates an ignored random secret plus a two-hour test token in `.local-session.json`. `npm run mobile:local` exposes a development-only token field. Paste the token there; the backend validates it before opening the session. No real email, AI, push or payment provider is simulated as successful. Local document processing still runs the actual parser; images need Tesseract.

For a local worker tick without Redis, run the worker functions directly from a backend Python shell: call `tick` only with a configured broker, or use `schedule_due` inside `SessionLocal.begin()` and then call `run_job.run(job_id)` for queued jobs. Automated tests exercise these functions without a broker. The normal full environment uses Celery beat/worker with Redis.

For CLI-only development authentication, set AUTH_MODE=development and a random DEV_JWT_SECRET, then use `python -m app.manage dev-token`. For explicit local plan testing use `python -m app.manage dev-plan --user <id> --plan family`; it expires in seven days and is prohibited in production.

## Optional providers

Set OPENAI_API_KEY and AI_MODEL to enable chat after user consent. Set EMBEDDING_MODEL to a model supporting 1536 output dimensions for vector indexing. Configure per-million-token rates for meaningful estimates; zero defaults mean estimates are not configured. Set NOTIFICATION_PROVIDER=expo and an optional EXPO_ACCESS_TOKEN to send push. Configure EAS project/APNs/FCM credentials and enable notifications in Profile. Set REVENUECAT_SECRET_KEY to enable server-side verification; mobile checkout/restore is still to be implemented and tested.

Production validation requires ENVIRONMENT=production, managed HTTPS auth, PostgreSQL, TLS Redis, private S3, Expo and ClamAV. Do not use the local helper in production. Keep local development token UI disabled in shared builds.
