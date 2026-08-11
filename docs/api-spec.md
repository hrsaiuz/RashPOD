# RashPOD API Spec

High-level route contract. Adapt to REST, tRPC, or Nest controllers.

## Auth
```text
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/verify-email
POST /auth/verify-email/confirm
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/me
```

General registration creates customer or corporate accounts and requires email verification. Designer access is
invitation-only.

## Designer Application and Activation
```text
POST  /intake/files/upload-url
POST  /intake/files/complete-upload
POST  /intake/designer-applications
GET   /admin/intake/designer-applications
PATCH /admin/intake/designer-applications/:id
GET   /admin/intake/designer-applications/files/:fileId
POST  /admin/designer-invitations
GET   /designer-invitations/:token
POST  /designer-invitations/:token/accept
POST  /designer-invitations/:token/accept-existing
```

Application approval creates an invitation but does not directly create an authenticated account. Evidence assets are
private and only available to users with `intake:manage`.

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
PATCH /designs/commercial-rights/bulk
POST  /designs/:id/enable-film-sales
POST  /designs/:id/disable-film-sales
```

Rules:
- Only designer can enable film sales for own design.
- Admin override requires audit log.
- Product approval does not enable film sales automatically.
- Bulk updates are atomic, accept at most 100 unique owned design IDs, and leave unspecified rights unchanged.
- Bulk film enable/disable actions create the same version-bound consent history and audit records as single-design actions.

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
GET    /admin/mockup-templates/:id/views
POST   /admin/mockup-templates/:id/views
GET    /admin/mockup-views/:id
PATCH  /admin/mockup-views/:id
DELETE /admin/mockup-views/:id
GET    /admin/mockup-templates/:id/gallery-assets
POST   /admin/mockup-templates/:id/gallery-assets
PATCH  /admin/mockup-gallery-assets/:id
DELETE /admin/mockup-gallery-assets/:id
POST   /admin/mockup-templates/:id/print-area
PATCH  /admin/print-areas/:id
```

Multi-view templates use repeatable `MockupView` records for rendering canvases such as front, back, sleeves, and labels.
Lifestyle and detail images are repeatable gallery assets rather than product-view definitions. Legacy template image fields
remain readable while existing templates are migrated.
Editor previews and local render jobs resolve the blank image from the print area's linked view, with `baseImageKey` retained
only as a fallback for legacy records.
For the MVP three-image listing contract, lifestyle and detail rendering select the first active asset for the linked view,
then the first template-wide asset by admin sort order, then the corresponding legacy image column.
Placement creation rejects mismatched design versions, templates, print areas, or inactive linked views and records the
resolved identifiers in the audit log.
Placement create/update validates positive dimensions, safe-zone bounds (including scaled/rotated bounds), allowed rotation,
and per-area scale limits. Placement reads enforce design ownership.
An active template always retains an active primary view. Promoting or editing that view synchronizes the legacy
`baseImageKey`; deleting a primary view promotes the next active view or rejects the operation when none exists. Primary
views remain active while their parent template is inactive so an administrator can safely reactivate the template later.
Gallery create/update/delete operations similarly synchronize legacy lifestyle and close-up keys using the primary-view,
template-wide, and sorted fallback priority.
Multi-view print areas require an active linked view. Their print/safe rectangles must have positive dimensions, the safe
zone must remain inside the print rectangle, and minimum scale cannot exceed maximum scale. Custom view codes such as
`inside_label` and `outside_label` use the legacy `OTHER` placement category while preserving their precise view code.
Reactivating a V2 template requires an active primary view. Legacy `baseImageKey` edits on a V2 template update that
primary view in the same transaction. V2 lifestyle and detail edits must use gallery-asset endpoints so normalized assets
and legacy fallback columns cannot diverge.
Legacy `/mockup/placements` preview and listing jobs load a normalized render snapshot from the linked view and gallery
assets before Sharp compositing, with legacy image fallbacks for unlinked records.
Print-area responses include linked view identity and status. Moderator selection excludes inactive views, and both editor
context and approval validation reject print areas whose linked view has been deactivated.

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
