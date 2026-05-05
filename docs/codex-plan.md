# RashPOD Codex Implementation Plan

## Strategy
Build in phases:
```text
Phase 0: Foundation
Phase 1: Designer onboarding + design upload + moderation
Phase 2: Admin configuration + product/mockup templates
Phase 3: Mockup studio + asset generation
Phase 4: Product listings + shop + Click checkout
Phase 5: Film sales
Phase 6: Production dashboard
Phase 7: Corporate orders
Phase 8: AI + emails polish
Phase 9: Marketplace export readiness
```

## Phase 0 — Foundation
Tasks:
- App/service structure.
- UI token mapping.
- Tailwind config.
- Framer Motion variants.
- DB/ORM.
- Auth/RBAC.
- FileAsset model.
- AuditLog.
- GCS abstraction.
- Dashboard shell.

Acceptance:
- App runs locally.
- DB migrates.
- User can register/login.
- Role routes exist.
- UI uses RashPOD tokens.

## Phase 1 — Designer Upload + Moderation
Tasks:
- Designer profile.
- DesignAsset/DesignVersion.
- Upload signed URL flow.
- File validation.
- Moderation queue.
- Approve/reject/request changes.
- Email stubs.
- Audit logs.

Acceptance:
- Designer uploads design.
- Moderator approves/rejects.
- Designer sees status.
- Audit log created.

## Phase 2 — Admin Configuration
Tasks:
- ProductType CRUD.
- BaseProduct CRUD.
- MockupTemplate CRUD.
- PrintArea CRUD.
- RoyaltyRule CRUD.
- FilmSaleSettings.
- DeliveryProvider settings.
- Payment settings placeholder.

Acceptance:
- Admin can create product type/mockup template/print area.
- No commercial rules are hardcoded.

## Phase 3 — Mockup Studio + Asset Generation
Tasks:
- Konva editor.
- Print/safe area overlays.
- Placement saving.
- Worker queue.
- Sharp renderer.
- 3 listing images.
- GCS outputs.
- Retry failed jobs.

Acceptance:
- Placement constraints work.
- 3 images generated server-side.
- Assets stored and linked.

## Phase 4 — Product Listings + Shop + Click
Tasks:
- CommerceListing PRODUCT.
- ProductListingDetails.
- Publish flow.
- Shop/product pages.
- Cart/order.
- Click payment.
- Order confirmation.
- Basic delivery.

Acceptance:
- Listing appears in shop.
- Customer pays with Click.
- Paid order creates production job.

## Phase 5 — Film Sales
Tasks:
- CommercialRights UI.
- Film consent audit.
- CommerceListing FILM.
- FilmListingDetails.
- Film pricing.
- Film checkout.
- Film preview.
- Film production job.
- Film royalty ledger.

Acceptance:
- Film listing requires consent.
- Product approval does not enable film sales.
- Customer can buy film.

## Phase 6 — Production Dashboard
Tasks:
- Job queue.
- Job detail.
- Status updates.
- QC checklist.
- Delivery method display.
- Status emails.

Acceptance:
- Staff updates status.
- Customer receives updates.
- Status log stored.

## Phase 7 — Corporate Orders
Tasks:
- Corporate request form.
- Corporate dashboard.
- Designer bid flow.
- Admin bid review.
- Commercial offer builder.
- PDF generation.
- ZeptoMail send.
- Accept/reject.
- Convert to production job.

Acceptance:
- Request submitted.
- Designer bids.
- Admin sends offer.
- Accepted offer converts to job.

## Phase 8 — AI + Email Polish
Tasks:
- Listing copy.
- Translation.
- Moderation assistant.
- Film readiness.
- Corporate offer draft.
- AI usage logs.
- ZeptoMail templates.

Acceptance:
- AI output editable.
- AI cannot auto-approve/publish/send.

## Phase 9 — Marketplace Export Readiness
Tasks:
- Marketplace image package.
- Export fields.
- CSV/XLSX export.
- Channel status.
- Printify/Printful placeholders.

Acceptance:
- Admin exports marketplace-ready package.

## Codex Prompt Template
```text
Read:
- rashpod-prd.md
- rashpod-ui-tokens.md
- AGENTS.md
- docs/[relevant spec]

Implement Phase [X]: [name].

Constraints:
- Preserve RashPOD UI tokens.
- Do not hardcode configurable business rules.
- Add RBAC and audit logs for sensitive actions.
- Add tests for business logic.
- Use GCS abstraction for files.
- Use worker jobs for slow image/AI/email tasks.

Deliver:
- Implementation
- Migrations
- Tests
- Short implementation report
- Remaining issues
```
