# Deployment guide

No remote environment has been deployed by this implementation.

## Local container topology

Copy `.env.example`, configure providers, then run `docker compose up --build`. The one-shot migration service upgrades the schema and seeds templates before API/worker/beat start. Redis and Postgres have readiness checks. MinIO initialization creates a private bucket. ClamAV requires usable signatures before uploads succeed. The optional `web` profile builds the admin console. Verify images and lock their digests in the deployment repository before production; current Compose uses explicit version tags where available.

## Production preparation

Use managed PostgreSQL with pgvector, TLS Redis, private S3-compatible storage and a trusted HTTPS reverse proxy. Create separate migration/runtime credentials. Configure object encryption, TLS verification, private networking, bucket policy, backup/PITR and tested recovery. Replace all local example credentials and identifiers. Supply secrets through the deployment platform's secret manager. Client public environment variables are baked into JS bundles; they must never contain privileged credentials.

Run migrations as a controlled release job. Back up before upgrades; prefer forward fixes rather than destructive downgrades on user data. Run only one beat scheduler initially; PostgreSQL row claims/unique keys defend duplicate polling, but leadership and failover should be tested for the selected environment. Scale workers separately from the API. OCR workers need bounded CPU/memory and Tesseract language packs. Set queue depth/failure alerts and a dead-letter review procedure. Unknown push outcomes require operator review, not replay.

Terminate HTTPS at the proxy and configure Uvicorn trusted proxy IPs explicitly. Production private routes reject plaintext requests. Make `/health` available for liveness and `/ready` for database readiness. Extend readiness for the selected broker/scanner/storage topology. Protect provider keys, configure Supabase SMTP and verify exact allowed redirect URLs. S3_PUBLIC_ENDPOINT must be publicly reachable over HTTPS while preserving private objects.

The backend image runs as UID 10001; the admin image runs as the node user. The admin standalone output is enabled only with CONTAINER_BUILD=true to avoid Windows symlink restrictions in ordinary local builds. Validate the Docker images in Linux CI before production use; they were not executed on the initial host.

## Release gates

Passing core tests is necessary but insufficient. Complete TESTING.md's provider/device matrix, review dependency advisories, configure monitoring, establish retention/incident-response/support policies and obtain privacy review. Add Sentry/OpenTelemetry without personal payload capture. Billing checkout/restore and store subscriptions must be configured and tested before offering paid access. Do not enable government form submission or outbound communications without reviewed official integrations and explicit authorization.
