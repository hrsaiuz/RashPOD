# RashPOD

Monorepo scaffold for MVP Wave 1 (Phases 0-2).

## Services
- `apps/rashpod-web`
- `apps/rashpod-dashboard`
- `apps/rashpod-api`
- `apps/rashpod-worker`

## Shared
- `packages/ui` (exports RashPOD design tokens)

## Quick start
1. `npm install`
2. Copy `.env.example` to `.env` and keep local-only values out of commits.
3. Start local PostgreSQL: `npm run db:up`
4. Verify the local database URL: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rashpod`
5. Generate Prisma Client: `npm run prisma:generate -w @rashpod/api`
6. Apply development migrations: `npm run prisma:migrate -w @rashpod/api`
7. Seed minimum local data: `npm run prisma:seed -w @rashpod/api`
8. Start services in separate terminals:
   - `npm run dev:api` (API on `http://localhost:3002`)
   - `npm run dev:dashboard` (dashboard on `http://localhost:3001`)
   - `npm run dev:web` (public web on `http://localhost:3000`)
   - `npm run dev:worker`

## Local Database

This repo includes a Postgres-only `docker-compose.yml` for local development. It intentionally does not start app services.

```bash
npm run db:up
npm run db:status
npm run db:logs
```

Safe local defaults:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=rashpod
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rashpod
```

To stop the local database container:

```bash
npm run db:down
```

## Local Environment

Use these service URLs for local development:

```env
WEB_URL=http://localhost:3000
DASHBOARD_URL=http://localhost:3001
API_URL=http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3002
```

Leave GCS project and bucket variables empty locally unless you are explicitly testing Google Cloud Storage. In non-production mode the API and worker fall back to local placeholder URLs/artifacts. Use `QUEUE_PROVIDER=local` for the current database-backed worker polling flow.

Seeded local users all use `ChangeMe123!` for development only, including `admin@rashpod.local`, `moderator@rashpod.local`, and `designer@rashpod.local`.
