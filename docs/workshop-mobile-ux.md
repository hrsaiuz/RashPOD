# Workshop Mobile UX

Slice 17 adds a mobile-first workshop surface inside the existing dashboard. It is not a separate native app.

## Dashboard Routes

- `/dashboard/production/mobile` - mobile workshop queue and overview.
- `/dashboard/production/scan` - QR/barcode scan and manual code lookup.
- `/dashboard/production/items/:id/mobile` - operator item detail and sticky actions.
- `/dashboard/production/qc` - QC queue.
- `/dashboard/production/packing` - packing queue.
- `/dashboard/production/pickup` - pickup handoff queue.
- `/dashboard/production/delivery` - delivery handoff queue.
- `/dashboard/production/issues` - open workshop issues.

## API Surface

All endpoints are under `/workshop` and require JWT auth plus focused `workshop:*` permissions.

Core endpoints:

- `GET /workshop/overview`
- `GET /workshop/queue`
- `GET /workshop/items/:id`
- `GET /workshop/items/by-code/:code`
- `POST /workshop/scan`
- `GET /workshop/labels/order/:orderId`
- `GET /workshop/labels/production-item/:id`
- `GET /workshop/labels/package/:id`
- `POST /workshop/items/:id/assign-to-me`
- `POST /workshop/items/:id/status`
- `POST /workshop/items/:id/block`
- `POST /workshop/items/:id/request-file`
- `POST /workshop/items/:id/retry-file`
- `GET /workshop/items/:id/download-production-file`
- `POST /workshop/items/:id/qc/pass`
- `POST /workshop/items/:id/qc/fail`
- `POST /workshop/items/:id/qc/evidence/sign-upload`
- `POST /workshop/items/:id/qc/evidence/:assetId/complete`
- `GET /workshop/packing`
- `POST /workshop/orders/:orderId/pack-item`
- `POST /workshop/orders/:orderId/mark-packed`
- `GET /workshop/orders/:orderId/packing-slip`
- `GET /workshop/pickup`
- `POST /workshop/orders/:orderId/picked-up`
- `GET /workshop/delivery`
- `POST /workshop/orders/:orderId/out-for-delivery`
- `POST /workshop/orders/:orderId/delivered`
- `POST /workshop/orders/:orderId/delivery-failed`
- `POST /workshop/items/:id/issues`
- `GET /workshop/issues`
- `POST /workshop/issues/:id/resolve`

## Operational Notes

- Workshop codes are opaque stable codes (`ORD-*`, `WPI-*`, `PKG-*`) and do not encode customer data.
- Status transitions reuse `ProductionService` so production lifecycle rules remain centralized.
- Mobile mutation endpoints accept `idempotencyKey` for scanner retries and double taps.
- QC photos use `AssetPurpose.WORKSHOP_QC_EVIDENCE`, stored privately with `INTERNAL_ONLY` access.
- Workshop issues are internal production exceptions and can optionally block production.
