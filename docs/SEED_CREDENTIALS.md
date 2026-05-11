# RashPOD Seed Credentials

Run `npm run prisma:seed -w @rashpod/api` (or `npx prisma db seed` inside `apps/rashpod-api`) to insert these users. All accounts share the same password — **change them before any non-local deployment**.

## Default password
`ChangeMe123!`

## Accounts

| Email | Role | Dashboard |
|---|---|---|
| `superadmin@rashpod.local` | `SUPER_ADMIN` | `/dashboard/super-admin` |
| `admin@rashpod.local` | `ADMIN` | `/dashboard/admin` |
| `ops@rashpod.local` | `OPERATIONS_MANAGER` | `/dashboard/admin` |
| `moderator@rashpod.local` | `MODERATOR` | `/dashboard/moderator` |
| `production@rashpod.local` | `PRODUCTION_STAFF` | `/dashboard/production` |
| `finance@rashpod.local` | `FINANCE_STAFF` | `/dashboard/admin` |
| `support@rashpod.local` | `SUPPORT_STAFF` | `/dashboard/admin` |
| `designer@rashpod.local` | `DESIGNER` | `/dashboard/designer` |
| `designer2@rashpod.local` | `DESIGNER` | `/dashboard/designer` |
| `designer3@rashpod.local` | `DESIGNER` | `/dashboard/designer` |
| `customer@rashpod.local` | `CUSTOMER` | `/dashboard/customer` |
| `corporate@rashpod.local` | `CORPORATE_CLIENT` | `/dashboard/corporate` |

## What else the seed creates

- 6 default product types (T-shirt, Hoodie, Mug, Poster, DTF Film, UV-DTF Film).
- Default royalty rule (`NET_PROFIT_PERCENT` at 15%).
- Default film-sale settings (sales globally disabled, DTF + UV-DTF enabled per provider).
- Default delivery providers (Yandex, UzPost, Pickup, Manual).
- 6 sample published `CommerceListing` rows so the storefront has products to render once `/shop/listings` is wired up.

## Resetting the database
```bash
cd apps/rashpod-api
npx prisma migrate reset --force   # drops + re-runs migrations + seed
```
