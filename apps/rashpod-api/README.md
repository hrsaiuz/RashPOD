# rashpod-api

NestJS + Prisma API scaffold for RashPOD Phase 0-2.

## Implemented in this wave
- Auth: `register`, `login`, `me`
- Designs: create/list/submit
- Moderation: queue + approve/reject/request-changes/suspend
- Commercial rights: get/update/enable-film/disable-film
- Admin config: product types + royalty rules
- Audit logging for sensitive mutations

## Run
1. Set `DATABASE_URL` and `JWT_SECRET`.
2. `npm install`
3. `npm run prisma:generate -w @rashpod/api`
4. `npm run prisma:migrate -w @rashpod/api`
5. `npm run prisma:seed -w @rashpod/api`
6. `npm run dev:api`

## Seeded defaults
- Users: `superadmin@rashpod.local`, `admin@rashpod.local`, `moderator@rashpod.local`, `designer@rashpod.local`
- Password (all): `ChangeMe123!` (change immediately outside local dev)
- Product types: core MVP items including DTF/UV-DTF films
- Royalty: default NET_PROFIT_PERCENT placeholder
- Film sale settings: baseline, globally disabled by default
- Delivery settings: Yandex, UzPost, Pickup, Manual fallback
