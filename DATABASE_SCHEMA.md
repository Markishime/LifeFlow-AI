# Database schema and retention

SQLAlchemy models are in `backend/app/models.py`; versioned Alembic migrations are in `backend/alembic/versions`. IDs are UUID strings. All persistent timestamps are UTC; timezone names are IANA identifiers used to calculate recurrence.

| Entity | Relationship and purpose |
| --- | --- |
| users | Supabase subject, email, display name, database role and deletion tombstone |
| user_preferences | One per user; language, timezone, notification and AI consent |
| households / household_members | Owner, permissioned membership and invitation state; unique household/user pair |
| tasks / task_assignments | Owner, explicit household, due date, status, associated document IDs, workflow and assignee |
| tasks.parent_task_id | Unique link to the previous recurring instance; repeated completion cannot create two children |
| documents | Owner, private key, SHA-256 checksum, MIME, original name, status and approved metadata |
| document_extractions | One extraction per document, text, candidate dates and uncertainty |
| document_embeddings | Owner and document foreign keys, model, chunk and 1536-dimensional vector |
| obligations | Amount as fixed-precision decimal, currency, due date, recurrence, status and user confirmation |
| reminders | Indexed status/fire_at, timezone, recurrence and optional source foreign keys |
| notification_devices | Unique Expo push token and owner; registration/revocation lifecycle |
| notification_deliveries | Unique reminder/device/scheduled occurrence, attempts, ticket and error code |
| workflow_templates | Versioned seed catalog, ordered step definitions, jurisdiction and unverified source metadata |
| workflow_instances / workflow_steps / workflow_events | Database state, dependency positions, evidence and event history |
| ai_conversations / ai_messages | Owner-scoped conversation and persisted messages |
| ai_action_proposals | Tool, validated arguments, pending/approved/rejected state and result identity |
| ai_execution_logs | Model, input/output tokens, estimated cost and outcome |
| follow_ups | Contact, draft, follow-up date, state and history; no outbound sending |
| subscription_entitlements | One per user; plan, provider and verified expiry |
| audit_logs | Actor-owned action and resource ID; no document text or credentials |
| background_jobs | Owner, resource ID, kind, attempts, status, error type and heartbeat timestamp |
| idempotency_keys | Unique owner/key/path, request digest and response snapshot |
| usage_reservations | Monthly resource consumption; deleting a document does not restore allowance |
| system_configuration | Allowlisted value, unique key and optimistic version |

Ownership and foreign keys are indexed. Task owner/due and reminder status/fire indexes support common requests. Vectors initially use exact cosine distance over owner-filtered rows; an ANN index and permission-aware recall benchmarking are future scaling work.

Deleting a task cascades its assignments and source reminders. Deleting a document cascades its extraction, embeddings and source reminders. Deleting a workflow cascades its steps/events and nulls task workflow links. Deleting a household removes memberships and nulls the household ID on tasks, making those tasks private to their original owners. No document is household-shared implicitly.

Account deletion immediately tombstones the user, preventing every subsequent API request. A durable worker deletes original objects, removes the managed account, and deletes owned application records. The user ID, deletion timestamp and empty identity fields remain as a minimal anti-resurrection tombstone. Deletion job metadata is retained for operator confirmation; non-deletion jobs are scrubbed during deletion. Define a justified tombstone expiry, operational retention and backup retention with the privacy owner before release. Backups require independent expiry; application deletion does not erase historical backups instantly.

The application database must be reachable only by backend/migration credentials. PostgreSQL encryption at rest, backups and restricted roles are deployment responsibilities. If using Supabase-hosted Postgres, use a private schema or revoke Data API access and add reviewed RLS; application ownership predicates alone do not protect an independently exposed Data API.
