# RashPOD Launch Readiness Runbook

This runbook covers production hardening, deployment, rollback, monitoring, backup/restore, and launch checks for the four MVP services: `rashpod-api`, `rashpod-worker`, `rashpod-dashboard`, and `rashpod-web`.

## Local Development

1. Copy local-only environment values into `.env`. Do not commit `.env`.
2. Start Postgres with `npm run db:up` when Docker is available.
3. Run migrations with `npm run prisma:migrate -w @rashpod/api`.
4. Seed local/demo data with `npm run prisma:seed -w @rashpod/api`.
5. Start services with `npm run dev:api`, `npm run dev:worker`, `npm run dev:dashboard`, and `npm run dev:web`.

Local fallbacks are allowed only outside production: local storage URLs, mock payments, missing Telegram, and missing email provider configuration.

## Environment And Secret Manager Mapping

Production secrets must be injected from Secret Manager or the existing Cloud Run secret pattern. Do not place raw secrets in repo files, build args, dashboard responses, logs, screenshots, or docs.

| Runtime variable | Secret Manager name | Services | Notes |
|---|---|---|---|
| `DATABASE_URL` | `DATABASE_URL` | API, worker, migrate job | Cloud SQL connection string. |
| `JWT_SECRET` | `JWT_SECRET` | API | Required in production. Never use `rashpod-dev-secret`. |
| `CLICK_SECRET_KEY` | `CLICK_SECRET_KEY` | API | Payment provider credential. |
| `CLICK_WEBHOOK_SECRET` | `CLICK_WEBHOOK_SECRET` | API | Required for webhook signature validation. |
| `TELEGRAM_BOT_TOKEN` | `telegram-bot-token` | worker | `Telegram_BOT_TOKEN` is accepted only for legacy local envs. |
| `ZEPTOMAIL_API_KEY` or `ZEPTO_SMTP_PASSWORD` | provider-specific secret | API, worker | Transactional email. |
| `OPENAI_API_KEY` | `OPENAI_API_KEY` | API, worker | Required only when AI is enabled. |
| `PRINTFUL_API_TOKEN` | `PRINTFUL_API_TOKEN` | API, worker | Required only when global POD is enabled. |
| `PRINTIFY_API_TOKEN` | `PRINTIFY_API_TOKEN` | API, worker | Required only when global POD is enabled. |
| `PRINTFUL_WEBHOOK_SECRET` | `PRINTFUL_WEBHOOK_SECRET` | API | Required before enabling live webhooks. |
| `PRINTIFY_WEBHOOK_SECRET` | `PRINTIFY_WEBHOOK_SECRET` | API | Required before enabling live webhooks. |
| `WORKER_SECRET` | `WORKER_SECRET` | API, worker | Required when moving from DB polling to authenticated task dispatch. |

Non-secret runtime config should be injected as environment variables: `NODE_ENV=production`, `APP_ENV=production`, `WEB_URL`, `DASHBOARD_URL`, `API_URL`, `NEXT_PUBLIC_API_URL`, `GCP_PROJECT_ID`, `GCS_BUCKET_ASSETS`, `GCS_BUCKET_PUBLIC`, `GCS_BUCKET_PRIVATE`, `GCS_SIGNED_URL_EXPIRES_SECONDS`, feature flags, and provider test-mode flags.

## Staging Setup

Use separate Cloud SQL databases, GCS buckets, payment test credentials, email sender, and secrets. Staging should use `APP_ENV=staging`, production-like CORS origins, production build images, and `prisma migrate deploy`. Provider integration tests must be mocked by default and live tests must be manual/opt-in.

## Production Setup

Production startup fails fast when critical API/worker configuration is missing. Before first launch:

1. Create Artifact Registry repository.
2. Create Cloud SQL PostgreSQL instance and database.
3. Enable automated Cloud SQL backups and point-in-time recovery where available.
4. Create public and private GCS buckets.
5. Configure bucket CORS from `gcs-cors.json`.
6. Grant Cloud Run service accounts least-privilege bucket access.
7. Create required Secret Manager secrets.
8. Deploy migrate job and run `npx prisma migrate deploy` before deploying services.
9. Deploy API, worker, dashboard, and web services.
10. Open `/dashboard/admin/launch-readiness` as an admin and resolve FAIL checks.

## Cloud Run Services

| Service | Exposure | Suggested resources | Notes |
|---|---|---|---|
| `rashpod-api` | Public | 1 CPU, 512Mi, concurrency 40, timeout 60s | Uses `/health/live` and `/health/ready`. |
| `rashpod-worker` | Private | 1 CPU, 1Gi, concurrency 1-5, timeout 300s | Uses `/health/live` and `/health/ready`; handles SIGTERM gracefully. |
| `rashpod-dashboard` | Public or restricted | 1 CPU, 512Mi, concurrency 40 | Must set `API_URL` and `NEXT_PUBLIC_API_URL` to API service. |
| `rashpod-web` | Public | 1 CPU, 512Mi, concurrency 80 | Storefront service. |

Do not bake secrets into Docker images. Use `--set-secrets` for secrets and `--set-env-vars` for non-secret config.

## Migration Workflow

Local:

```bash
npm run prisma:migrate -w @rashpod/api
npm run prisma:seed -w @rashpod/api
```

Staging/production:

```bash
npx prisma migrate status --schema apps/rashpod-api/prisma/schema.prisma
npx prisma migrate deploy --schema apps/rashpod-api/prisma/schema.prisma
```

Rules:

- Schema changes require a migration file.
- Destructive migration patterns require explicit manual approval and a backup taken first.
- Do not use `prisma db push --accept-data-loss` outside local throwaway databases.
- Seed production only when the seed is explicitly designed for production. Demo users and `ChangeMe123!` passwords are local/staging only.
- Prisma 6.7 warns about the generator output path becoming required in Prisma 7. Track this before upgrading Prisma.

## Backup And Restore

Backups:

1. Enable automated Cloud SQL backups.
2. Enable point-in-time recovery where budget allows.
3. Take a manual backup before risky migrations:

```bash
gcloud sql backups create --instance=rashpod-db --project=PROJECT_ID
```

Restore drill:

1. Restore backup to a new Cloud SQL instance or database.
2. Point a staging API revision at the restored database.
3. Run `prisma migrate status`.
4. Smoke test login, orders, payments, files, worker jobs, and launch readiness.
5. Document elapsed time and recovery issues.

Rollback policy:

- Prefer rolling back Cloud Run revision for application bugs.
- Database rollbacks are restore-forward operations unless a migration includes a tested compensating migration.
- Disable risky feature flags before rollback when payments, AI, marketplace export, or global POD are affected.

## Monitoring And Alerts

Use Cloud Logging and Cloud Monitoring dashboards/alerts for:

| Signal | Severity | Owner | First action |
|---|---|---|---|
| API 5xx rate above baseline | High | Engineering | Check request logs by `requestId`, deploy revision, and DB errors. |
| API p95 latency high | Medium | Engineering | Check DB connections, slow queries, and Cloud Run CPU. |
| Worker failed jobs or dead letters | High | Operations | Inspect `worker.queue.failed`, retry idempotent jobs, pause broken provider. |
| Queue lag over threshold | High | Operations | Scale worker, check DB connectivity, inspect stuck job type. |
| Click webhook failures | Critical | Finance/Engineering | Verify `CLICK_WEBHOOK_SECRET`, replay safe events, reconcile payments. |
| Payment reconciliation mismatches | High | Finance | Hold payouts, reconcile provider reports. |
| Mockup/render failures | Medium | Production | Check source assets, Sharp errors, GCS write permissions. |
| Production file failures | High | Production | Move jobs to blocked state, notify support, retry after fix. |
| Upload verification failures | Medium | Support/Engineering | Check signed URL expiry, MIME/size mismatch, GCS metadata, and private-bucket CORS for the dashboard origin. |
| Email/Telegram delivery failures | Medium | Support | Check provider credentials, disabled channels, delivery logs. |
| AI job failures or budget exhausted | Low/Medium | Ops | Disable AI workflows if noisy; AI suggestions must remain human-approved. |
| Database connection errors | Critical | Engineering | Check Cloud SQL, connection limits, VPC connector. |
| Storage errors | High | Engineering | Check bucket permissions, object lifecycle, service account roles. |
| High 401/403 anomaly | Medium | Security | Check auth failures, suspicious IPs, session invalidation. |
| Urgent support ticket count | Medium | Support | Triage urgent queue. |
| Production blocked/overdue count | High | Production | Assign owner and update customers. |

Structured logs include request IDs for API errors and job IDs for worker logs. Audit logs are for business/security actions and should not contain raw secrets or private file payloads.

## Incident Response

Payment webhook outage:

1. Disable payment retry or Click feature flag if needed.
2. Verify webhook secret and Cloud Run logs.
3. Reconcile Click provider records with `PaymentTransaction`.
4. Replay only idempotent events.
5. Hold payouts until reconciliation is clean.

Storage outage:

1. Disable uploads and publication actions if writes fail.
2. Check GCS service account permissions and bucket availability.
3. Keep production jobs blocked until source assets are readable.
4. Do not mark assets READY without completion verification.

Designer upload failures (browser PUT to GCS):

1. Confirm the **private** assets bucket has CORS applied from [`gcs-cors.json`](../gcs-cors.json), including `https://dashboard.rashpod.uz`.
2. Re-apply CORS if the dashboard origin was added after the last deploy:

   ```bash
   gcloud storage buckets update gs://YOUR_PRIVATE_BUCKET --cors-file=gcs-cors.json
   ```

3. In browser DevTools, check whether the failure is on the direct GCS `PUT` (status 0 or 403) vs `POST /files/complete-upload` (MIME/size mismatch).
4. Verify `GCP_PROJECT_ID` and bucket env vars are set on `rashpod-api` so signed URLs target GCS, not local fallbacks.

Worker queue stuck:

1. Check `/health/ready` on worker.
2. Inspect failed and pending `WorkerJob` rows.
3. Scale worker if lag is capacity-related.
4. Pause provider-specific jobs if one integration is failing.
5. Retry only idempotent jobs.

Production file generation failing:

1. Block affected production jobs.
2. Check source asset access and Sharp logs.
3. Retry `GENERATE_PRODUCTION_FILE` after fixing root cause.
4. Notify support if customer SLA is affected.

Bad deployment rollback:

1. Roll back Cloud Run service to the previous healthy revision.
2. Disable risky feature flags.
3. Do not roll back database by deleting migrations; restore forward if needed.
4. Keep the failed revision logs and request IDs for review.

DB migration issue:

1. Stop deploying dependent services.
2. Check `prisma migrate status`.
3. Restore backup to staging and rehearse recovery.
4. Apply a tested forward fix or restore to a new production instance according to incident severity.

## Launch Checklist

The admin page `/dashboard/admin/launch-readiness` shows PASS/WARN/FAIL for environment, operational, security, and data checks. WARN checks can be acceptable during staging; FAIL checks must be resolved before production traffic.
