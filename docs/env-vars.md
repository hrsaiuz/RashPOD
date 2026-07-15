# RashPOD Environment Variables

## General
```env
NODE_ENV=development
APP_ENV=local
APP_URL=http://localhost:3000
DASHBOARD_URL=http://localhost:3001
API_URL=http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3002
```

## Database
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rashpod
```

For local development, `docker-compose.yml` starts PostgreSQL with `POSTGRES_USER=postgres`,
`POSTGRES_PASSWORD=postgres`, `POSTGRES_DB=rashpod`, and host port `5432`.

## Auth
```env
JWT_SECRET=
JWT_EXPIRES_IN=7d
PASSWORD_RESET_SECRET=
EMAIL_VERIFICATION_SECRET=
DESIGNER_INVITATION_TTL_HOURS=168
```

## Google Cloud
```env
GCP_PROJECT_ID=
GCS_PROJECT_ID=
GCP_REGION=
GCS_BUCKET_NAME=
GCS_BUCKET_ASSETS=
GCS_BUCKET_PUBLIC=
GCS_BUCKET_PRIVATE=
GCS_SIGNED_URL_EXPIRES_SECONDS=900
```

`GCS_BUCKET_PUBLIC` and `GCS_BUCKET_PRIVATE` may point to the same bucket when using path prefixes. Production must set
`GCP_PROJECT_ID` and at least `GCS_BUCKET_ASSETS` so signed upload URLs are minted against Google Cloud Storage, not local
development fallbacks.

Leave GCS project and bucket values empty in local development unless you are testing real Google Cloud Storage. The API
uses signed local placeholder URLs and the worker writes local artifacts when `NODE_ENV` is not `production`.

## Queue / Worker
```env
QUEUE_PROVIDER=local
GCP_TASKS_QUEUE=
GCP_TASKS_LOCATION=
WORKER_SECRET=
```

The current local worker polls the database-backed `WorkerJob` table. Cloud Tasks variables are for deployed environments.

## ZeptoMail
```env
ZEPTOMAIL_API_KEY=
ZEPTOMAIL_FROM_EMAIL=
ZEPTOMAIL_FROM_NAME=RashPOD
ZEPTOMAIL_API_URL=
```

## Telegram Notifications
```env
TELEGRAM_BOT_TOKEN=
```

The worker also accepts the legacy local `Telegram_BOT_TOKEN` spelling. Production should source the token from Google
Secret Manager secret `telegram-bot-token` in project `rashpod-production`.

## OpenAI
```env
OPENAI_API_KEY=
OPENAI_LISTING_MODEL=
OPENAI_TRANSLATION_MODEL=
OPENAI_MODERATION_ASSIST_MODEL=
OPENAI_CORPORATE_MODEL=
OPENAI_MONTHLY_BUDGET_USD=
```

## Click
```env
CLICK_MERCHANT_ID=
CLICK_SERVICE_ID=
CLICK_SECRET_KEY=
CLICK_MERCHANT_USER_ID=
CLICK_RETURN_URL=
CLICK_WEBHOOK_SECRET=
CLICK_TEST_MODE=true
```

## Delivery
```env
YANDEX_DELIVERY_API_KEY=
YANDEX_DELIVERY_CLIENT_ID=
YANDEX_DELIVERY_TEST_MODE=true
UZPOST_API_KEY=
UZPOST_TEST_MODE=true
```

## Global POD Providers
```env
FEATURE_GLOBAL_POD=false
PRINTFUL_ENABLED=false
PRINTFUL_API_TOKEN=
PRINTFUL_API_BASE_URL=https://api.printful.com
PRINTFUL_STORE_ID=
PRINTFUL_WEBHOOK_SECRET=
PRINTIFY_ENABLED=false
PRINTIFY_API_TOKEN=
PRINTIFY_API_BASE_URL=https://api.printify.com/v1
PRINTIFY_WEBHOOK_SECRET=
```

Provider settings should reference environment variable names or Secret Manager resource names only. Raw Printful/Printify
tokens must not be returned by API responses or displayed in the dashboard.

Configure the curated Printful catalog allowlist in admin Pipeline Config (`integrations.printful.catalogAllowlist`).
Each entry needs a Printful catalog product ID and RashPOD product type before running **Sync Catalog**.

## Feature Flags
```env
FEATURE_FILM_SALES=true
FEATURE_CORPORATE_ORDERS=false
FEATURE_MARKETPLACE_EXPORT=false
FEATURE_GLOBAL_POD=false
FEATURE_AI_LISTING_COPY=true
FEATURE_AI_MODERATION_ASSIST=true
FEATURE_YANDEX_DELIVERY=false
FEATURE_UZPOST=false
```

## Security and Observability
```env
CORS_ORIGINS=
COOKIE_DOMAIN=
RATE_LIMIT_MAX=
RATE_LIMIT_WINDOW_SECONDS=
LOG_LEVEL=info
SENTRY_DSN=
ENABLE_STRUCTURED_LOGS=true
ALLOW_PRODUCTION_SEED=false
```

Production startup fails when required critical API/worker values are missing. Use `docs/launch-readiness-runbook.md` for
Secret Manager names and Cloud Run injection examples. Do not store raw secrets in `.env.example`, docs, images, build args,
or dashboard settings responses.
