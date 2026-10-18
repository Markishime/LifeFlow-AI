# AI and workflow design

## Proposal lifecycle

The LangGraph graph has `propose` and `validate` nodes. Authorized task records, document excerpts, templates and timezone are gathered before inference. OpenAI Responses structured output uses a closed Pydantic schema. The model ID and optional embedding model are environment settings. No model version is assumed. Requests disable provider response storage, cap output tokens, use a 30-second timeout and bounded retries.

The graph returns either a read-only reply or a validated action proposal. Supported mutations are task creation/update, reminder creation and starting a template workflow. Creating a proposal has no effect on these resources. Approval reloads the proposal using its owner, locks it, validates arguments again, invokes a narrow application service and records the resource ID in the same database transaction. Repeated approval returns the original result. Rejected proposals cannot execute. Tool inputs cannot name arbitrary URLs, SQL, shell commands or another owner.

The read/draft registry exposes task/document lookup, deterministic document excerpts, deadline candidates, upcoming obligations, deterministic daily briefings and follow-up drafts. The `SummarizeDocument` local tool explicitly labels its output as a deterministic excerpt; it does not pretend to be an AI summary. Chat uses bounded authorized context rather than an unbounded autonomous tool loop. Conversation text is persisted but is not the authoritative workflow state.

## Document intelligence

PDF text is parsed by PyMuPDF; scanned pages and images use PyMuPDF's Tesseract OCR interface. Files are never interpreted as instructions. A deterministic classifier suggests a broad category. ISO dates are explicit candidates; ambiguous numeric dates remain unknown until user review. Non-ISO natural-language date extraction, calibrated OCR confidence, learned field schemas and country-specific regulatory interpretation remain extensions.

Date candidates never create reminders automatically. The user confirms the document title/category and supplies an explicit reminder timestamp/timezone. Confirmation locks the document and is idempotent. Embeddings are generated only after document confirmation and AI processing consent. Chunks carry ownership and model metadata. Search filters owner before cosine-distance ranking, and refuses semantic search when configuration is unavailable.

## Prompt injection and privacy

System instructions label all excerpts/context as untrusted data. Pydantic forbids unknown arguments. No code/HTTP/SQL execution capability is available. The owner is supplied by verified server context, never by the model. A model producing instructions cannot bypass the approval route or ownership checks. These controls reduce injection risk; they do not establish that every generated answer is accurate. Test adversarial documents and unsupported claims before release.

AI consent is explicit and recorded. The assistant currently sends bounded owned task/document context to the configured provider after consent, which must be disclosed in privacy copy. Cost estimates use configured rates and recorded token counts. Configure real prices, review provider retention terms and compare estimates to invoices. Failed-provider usage reconciliation and separate small/large model routing remain work.

## Stateful workflows

Seven general planning templates cover new jobs, moving, school, applications, business preparation, renewals and travel. Requirements are explicitly unverified. Templates have jurisdiction/source/verification fields but contain no fabricated official requirements. Steps reference earlier step positions, require evidence and cannot complete before their prerequisites. Instances and events are persisted independently of AI history. The system does not submit forms or send follow-up communications.

Official implementation references: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Supabase token verification](https://supabase.com/docs/guides/auth/jwts), [Expo push sending and receipts](https://docs.expo.dev/push-notifications/sending-notifications/). Reviewed during initial implementation on 2026-10-18; recheck provider behavior before release.
