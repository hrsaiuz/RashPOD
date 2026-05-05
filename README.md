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
2. Configure API env vars (`DATABASE_URL`, `JWT_SECRET`)
3. `npm run prisma:generate -w @rashpod/api`
4. `npm run prisma:migrate -w @rashpod/api`
5. `npm run dev:api`
6. `npm run dev:web`
7. `npm run dev:dashboard`
