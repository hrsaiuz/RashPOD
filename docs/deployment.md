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

## Secrets
Store in Secret Manager:
- Database URL.
- JWT secret.
- ZeptoMail API key.
- OpenAI API key.
- Click credentials.
- Yandex credentials.
- UzPost credentials.
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
/api/marketplace/printify/webhook
/api/marketplace/printful/webhook
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
