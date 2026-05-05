# RashPOD Production Hardening Plan (Post-Scaffold)

## 1) Storage and Rendering Pipeline
- Replace placeholder signed URL logic with Google Cloud Storage V4 signed URLs.
- Add file metadata verification on upload completion (size, mime, checksum).
- Implement worker Sharp rendering for:
  - preview image (`GENERATE_PRODUCT_MOCKUPS`)
  - 3-image listing pack (`GENERATE_LISTING_IMAGE_PACK`)
- Persist output `fileKey`, dimensions, and terminal status on `GeneratedAsset`.

## 2) External Integrations
- Click: payment intent/create + verified webhook + idempotency store.
- ZeptoMail: provider client + template rendering + retry-safe send.
- OpenAI: feature-specific clients with usage logging and budget guard.
- Delivery providers (Yandex/UzPost): config + adapter interfaces + staged rollout flags.

## 3) Queue and Worker Operations
- Add delayed retry semantics (`nextRunAt`) and failure bookkeeping (`lastErrorAt`).
- Exponential backoff for retriable failures; terminal `FAILED` after max attempts.
- Admin operations endpoints:
  - list/filter jobs
  - manual retry
  - future: cancel job / dead-letter inspection.
- Structured logs on enqueue/claim/complete/fail.

## 4) Dashboard Auth and Admin UX
- Replace pasted token with authenticated dashboard session and API client middleware.
- Restrict admin pages by role/permission and handle `401/403` centrally.
- Enhance worker-jobs page with pagination and job detail drawer.

## 5) Test Expansion
- DB-backed integration tests with Postgres + Prisma:
  - worker job lifecycle
  - generated asset transitions
  - retry and dead-letter behavior.
- Contract tests for admin job filters and retry endpoint.

## 6) Security and Runtime
- Secret Manager wiring by environment.
- Rate limiting + request validation tightening.
- Audit log coverage review for all sensitive operational actions.
- Monitoring alerts on queue lag, failed-job rate, and retry saturation.

## Start Order
1. Queue/worker operational hardening (in progress).
2. GCS signed URL + upload completion validation.
3. Sharp rendering pipeline for preview/listing pack.
4. Dashboard session auth for admin pages.
5. External providers in staged rollout.
