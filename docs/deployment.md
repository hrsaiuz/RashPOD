# RashPOD Deployment Plan

## Platform
Google Cloud.

## Services on Cloud Run
```text
rashpod-web
rashpod-dashboard
rashpod-api
rashpod-worker
```

## Domains
Suggested:
```text
rashpod.uz
rashpod.uz/shop
dashboard.rashpod.uz
api.rashpod.uz
```

## Cloud SQL
Use PostgreSQL. Separate dev/staging/production databases.

## Storage Buckets
```text
rashpod-assets-dev
rashpod-assets-staging
rashpod-assets-production
rashpod-private-dev
rashpod-private-staging
rashpod-private-production
```

Current production uses `gs://rashpod-assets` for public branding/media assets and `gs://rashpod-private-production` for
designer originals and private generated files. Configure bucket CORS from `gcs-cors.json` on both buckets so the dashboard
can PUT directly to signed URLs. Only the public assets bucket should grant public object read access because branding/media
database records store `https://storage.googleapis.com/...` public URLs.

## Secrets
Store in Secret Manager:
- Database URL.
- JWT secret.
- ZeptoMail API key.
- OpenAI API key.
- Click credentials.
- Yandex credentials.
- UzPost credentials.
- Printful API token and webhook secret.
- Printify API token and webhook secret.
- Worker secret.

## CI/CD
```text
Install dependencies
Run lint
Run typecheck
Run tests
Build Docker image
Push to Artifact Registry
Deploy to Cloud Run
Run migrations with `prisma migrate deploy`
```

Seed jobs must use `prisma migrate deploy` before `tsx prisma/seed.ts`. Do not use
`prisma db push --accept-data-loss` in production.

## Worker
Separate deployable service for mockups, film previews, AI jobs, emails, PDFs.

## Webhook Endpoints
```text
/api/payments/click/webhook
```

Future:
```text
/api/delivery/yandex/webhook
/api/delivery/uzpost/webhook
/api/webhooks/pod/printify
/api/webhooks/pod/printful
```

## Production Checklist
- Backups enabled.
- GCS lifecycle rules defined.
- Logging and alerts enabled.
- Secrets not committed.
- Payment webhook verified.
- Admin account seeded securely.
- CORS configured.
- Rate limits enabled.
- API `/health/live` and `/health/ready` configured as Cloud Run probes.
- Worker `/health/live` and `/health/ready` configured and SIGTERM shutdown verified.
- `/dashboard/admin/launch-readiness` has no FAIL checks.

## Rollback
- Roll back Cloud Run to the last healthy revision for application regressions.
- Do not delete applied production migrations. Prefer a forward fix or restore to a new Cloud SQL instance from backup.
- Disable risky feature flags first for payments, AI, marketplace export, global POD, and film sales.
- Keep failed revision logs, request IDs, and worker job IDs for post-incident review.

See `docs/launch-readiness-runbook.md` for environment setup, Secret Manager mapping, backup/restore, monitoring alerts, and incident response.
