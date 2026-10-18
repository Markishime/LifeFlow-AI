# API contracts

Run FastAPI and visit `/docs` for interactive OpenAPI and `/openapi.json` for the complete generated contract. Private endpoints are under `/api/v1` and require `Authorization: Bearer <access token>`. No client-supplied owner ID is accepted. Missing/invalid sessions produce 401, unauthorized object identities produce 404, role/plan failures produce 403, invalid input produces 422, and invalid transitions produce 409.

Errors use `{"error":{"code":"...","message":"...","request_id":"..."}}`; validation errors include sanitized field names/messages and exclude input values. `X-Request-ID` correlates failures. List endpoints accept bounded `limit` and nonnegative `offset` where implemented. Dates in write requests require an explicit timezone offset. All future pagination extensions should retain response envelopes.

| Resource | Methods |
| --- | --- |
| /users/me | GET, PATCH preferences/profile, DELETE deletion request (202) |
| /dashboard | GET actual task/priorities/obligation/document/activity data |
| /tasks | GET q/status/sort/limit/offset, POST |
| /tasks/{id} | GET, PATCH, DELETE |
| /documents/upload | POST multipart `file`, 202 processing job |
| /documents | GET |
| /documents/{id} | GET, DELETE |
| /documents/{id}/file | GET authorized attachment or signed URL |
| /documents/{id}/extraction | GET status and extraction |
| /documents/{id}/confirm | POST reviewed metadata and optional explicit reminder time |
| /ai/chat | POST message and optional conversation_id |
| /ai/action-proposals | GET, POST allowlisted tool and arguments |
| /ai/action-proposals/{id}/approve | POST locked, idempotent approval |
| /ai/action-proposals/{id}/reject | POST rejection; approved actions cannot be rejected retroactively |
| /ai/tools/{tool} | POST validated owner-scoped read/draft tool; state changes rejected |
| /workflow-templates | GET seven seed checklists |
| /workflows | GET, POST template_id and optional title |
| /workflows/{id} | GET state/steps/events, PATCH nonterminal status |
| /workflows/{id}/steps/{step_id}/complete | POST completion evidence, requires dependencies |
| /reminders | GET, POST |
| /reminders/{id} | PATCH time/status (snooze cancels old queued deliveries), DELETE |
| /obligations | GET, POST with offsets in minutes |
| /obligations/{id} | PATCH explicit user confirmation/status, DELETE |
| /notifications/devices | POST Expo token and platform |
| /notifications/devices/{id} | DELETE |
| /notifications/history | GET actual delivery states |
| /households | GET, POST (verified Family plan) |
| /households/{id} | GET active-member view |
| /households/{id}/invitations | POST manager invitation; in-app delivery only |
| /households/invitations | GET invitations for authenticated email |
| /households/invitations/{id}/accept or /reject | POST |
| /households/{id}/members/{member_id} | DELETE revoke |
| /follow-ups | GET, POST follow-up and copy/share draft |
| /follow-ups/{id} | PATCH status/history |
| /search | GET q and optional semantic=true; semantic requires consent/provider/Postgres |
| /subscriptions/sync | POST server-to-server RevenueCat verification; no client plan override |
| /admin/metrics, /admin/audit | GET database-admin-only aggregates and audit metadata |
| /admin/jobs/{id}/retry | POST safe failed non-notification job only |
| /admin/configuration | GET allowlisted flag/prompt settings |
| /admin/configuration/{key} | PATCH value and expected_version; keys ai_enabled and assistant_tone |

Task and reminder creation support `Idempotency-Key`. Identical retries replay the stored response; reusing the key with different input returns 409. AI approval and document confirmation are independently idempotent. Other create routes currently do not implement generic idempotency keys; clients must not retry mutations automatically.

Example task: `{"title":"Call the school","timezone":"Asia/Manila","due_at":"2026-11-02T09:00:00+08:00","reminder_at":"2026-11-02T08:00:00+08:00"}`.

Shared TypeScript contracts live in `packages/api-contracts/index.ts`. OpenAPI is authoritative; regenerate/check clients when schemas change. Response models are strongest for tasks; several operational responses currently use serialized model dictionaries and need fuller response-schema coverage before public API version commitments.
