# Security model and release review

## Implemented controls

- Every private route verifies a bearer token independently. Managed sessions are verified with Supabase; development JWTs require issuer, audience, expiry, signature and a random local secret.
- Authorization uses database-owned identities and roles. Private objects are selected by owner; foreign objects return 404. Household tasks use active membership and assignment/manager checks. Private document IDs are rejected on shared tasks.
- AI changes require a persisted reviewed proposal and execute only through validated allowlisted services. Uploaded text cannot invoke tools. No arbitrary SQL, Python, shell or HTTP tool exists.
- File MIME is derived from bytes, not the filename. Files are bounded to 10 MB, images to 25 megapixels, PDFs to 100 pages, and encrypted/embedded-attachment PDFs are rejected. Multipart input is bounded while streaming. Production requires the ClamAV adapter.
- S3 buckets are private; original downloads use owner authorization and 120-second attachment URLs. Server credentials are never sent to clients. Native auth sessions use SecureStore; no sensitive document/task content is persisted in the SQLite summary cache.
- Production configuration rejects local auth/storage/notification adapters, non-Postgres storage, plaintext Redis and non-HTTPS provider/origin settings. Production API traffic requires HTTPS behind a trusted reverse proxy.
- Rate limiting uses Redis in production and a local per-IP window in development. Responses/logs include request IDs; logs exclude bearer tokens, document text, AI inputs and contact details. Push payloads are generic.
- Approval/document confirmation/delivery occurrence uniqueness prevent common duplicate actions. Generic task/reminder request keys detect mismatched retries. Workers record claims before external sends and quarantine ambiguous results.
- Account deletion immediately blocks access, then removes original files, provider identity and owned application records through a durable job. A minimal tombstone prevents unexpired tokens recreating data.

## Operator controls

Use separate least-privilege runtime, migration, object-store and authentication administration credentials. Keep the Supabase service role key server-only. Configure verified email, secure SMTP, strong password policies and approved redirect URLs. Issue admin roles through the server CLI after reviewing the operator's identity; user metadata never grants admin access. Admin metrics do not expose file contents. No privileged support-document access mechanism is implemented.

Use private network access to Postgres/Redis/S3, TLS termination with correct trusted-proxy settings, encrypted volumes/backups, restricted egress and centralized secret rotation. The Compose credentials are local examples. Do not deploy them publicly. Bind local services only to loopback; mobile physical-device testing requires a deliberate trusted LAN/tunnel setup.

## Required before release

Resolve or formally review remaining dependency advisories; run fresh npm and Python audits. Verify migrations and concurrency on PostgreSQL, provider token rejection/session revocation, bucket ACLs and signed URLs, ClamAV availability/fail-closed behavior, OCR isolation/resource limits, notification receipts and deletion retries. Test no sensitive content reaches logs/Sentry. Configure backup retention and object-store orphan cleanup. Add a separate support-access policy before allowing support staff access to personal documents.

The app has a translation foundation but incomplete secondary-screen localization, and does not yet offer full offline task editing. Subscription checkout/restore UI, refunds/webhook reconciliation, provider deletion verification, production observability integrations and regulatory workflow source validation require more work. No legal compliance, penetration-test certification or app-store approval is claimed.

Philippine privacy policy and retention requirements must be assessed by the operator's qualified privacy/legal reviewer. [National Privacy Commission](https://privacy.gov.ph/) is the official starting point; this document is an engineering description, not legal advice or a compliance declaration.
