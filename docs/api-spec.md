# RashPOD API Spec

High-level route contract. Adapt to REST, tRPC, or Nest controllers.

## Auth
```text
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/verify-email
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/me
```

## Designer
```text
GET  /designer/profile
PATCH /designer/profile
GET  /designer/overview
GET  /designer/royalties
GET  /designer/payouts
```

## Designs
```text
POST /designs
GET  /designs
GET  /designs/:id
PATCH /designs/:id
POST /designs/:id/submit
POST /designs/:id/versions
GET  /designs/:id/versions
```

## Files
```text
POST /files/upload-url
POST /files/complete-upload
GET  /files/:id/signed-url
```

## Moderation
```text
GET  /moderation/designs
GET  /moderation/designs/:id
POST /moderation/designs/:id/approve
POST /moderation/designs/:id/reject
POST /moderation/designs/:id/request-changes
POST /moderation/designs/:id/suspend
```

## Commercial Rights
```text
GET   /designs/:id/commercial-rights
PATCH /designs/:id/commercial-rights
POST  /designs/:id/enable-film-sales
POST  /designs/:id/disable-film-sales
```

Rules:
- Only designer can enable film sales for own design.
- Admin override requires audit log.
- Product approval does not enable film sales automatically.

## Product Types and Templates
```text
GET    /admin/product-types
POST   /admin/product-types
GET    /admin/product-types/:id
PATCH  /admin/product-types/:id
DELETE /admin/product-types/:id
GET    /admin/base-products
POST   /admin/base-products
PATCH  /admin/base-products/:id
GET    /admin/mockup-templates
POST   /admin/mockup-templates
PATCH  /admin/mockup-templates/:id
POST   /admin/mockup-templates/:id/print-area
PATCH  /admin/print-areas/:id
```

## Mockup Studio
```text
GET  /mockup/product-types
GET  /mockup/templates?productTypeId=
POST /mockup/placements
GET  /mockup/placements/:id
PATCH /mockup/placements/:id
POST /mockup/placements/:id/approve
POST /mockup/placements/:id/generate-preview
POST /mockup/placements/:id/generate-listing-images
```

## Generated Assets
```text
GET /generated-assets/:id
GET /generated-assets?designId=
POST /generated-assets/:id/retry
```

## Listings
Public:
```text
GET /shop/listings
GET /shop/listings/:slug
GET /shop/designers/:handle
```

Designer/admin:
```text
GET  /listings
POST /listings
GET  /listings/:id
PATCH /listings/:id
POST /listings/:id/publish
POST /listings/:id/archive
POST /listings/film
PATCH /listings/film/:id
```

## Cart and Orders
```text
POST /cart
GET  /cart
PATCH /cart/items/:id
DELETE /cart/items/:id
POST /orders
GET  /orders
GET  /orders/:id
POST /orders/:id/cancel
```

## Click Payments
```text
POST /payments/click/create
POST /payments/click/webhook
GET  /payments/:id
```

Webhooks must be idempotent.

## Delivery
```text
GET  /delivery/options
POST /delivery/quote
POST /delivery/create-shipment
GET  /delivery/shipments/:id
PATCH /admin/delivery/providers/:id
```

## Production
```text
GET  /production/jobs
GET  /production/jobs/:id
PATCH /production/jobs/:id/status
POST /production/jobs/:id/assign
POST /production/jobs/:id/qc
```

## Royalties and Payouts
```text
GET /royalties
GET /royalties/ledger
GET /payouts
GET   /admin/royalty-rules
POST  /admin/royalty-rules
PATCH /admin/royalty-rules/:id
GET   /admin/payouts
POST  /admin/payouts/:id/mark-paid
```

## Corporate and Offers
```text
POST /corporate/requests
GET  /corporate/requests
GET  /corporate/requests/:id
PATCH /corporate/requests/:id
GET  /designer/corporate-requests
POST /corporate/requests/:id/bids
GET  /corporate/requests/:id/bids
POST /admin/corporate/bids/:id/select
POST /admin/commercial-offers
GET  /admin/commercial-offers/:id
PATCH /admin/commercial-offers/:id
POST /admin/commercial-offers/:id/generate-pdf
POST /admin/commercial-offers/:id/send
POST /corporate/commercial-offers/:id/accept
POST /corporate/commercial-offers/:id/reject
```

## AI
```text
POST /ai/listing-copy
POST /ai/translate
POST /ai/moderation-assist
POST /ai/film-readiness
POST /ai/corporate-offer-draft
```

## Admin Settings and Audit
```text
GET   /admin/settings
PATCH /admin/settings
GET   /admin/email-templates
POST  /admin/email-templates
PATCH /admin/email-templates/:id
POST  /admin/email-templates/:id/test
GET   /admin/ai-settings
PATCH /admin/ai-settings
GET   /admin/audit-logs
GET   /admin/audit-logs/:id
```
