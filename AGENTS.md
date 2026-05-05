# AGENTS.md — RashPOD Build Instructions

**Product:** RashPOD  
**Date:** 2026-05-04

## Core Rule
Build RashPOD as a configurable POD operating platform, not a hardcoded e-commerce shop.

Admin-configurable business rules:
- Designer royalties.
- Film-sale royalties / commissions.
- Supported product types.
- Product templates.
- Mockup templates.
- Print areas and safe zones.
- Delivery providers and prices.
- Payment settings.
- Email templates.
- AI prompt settings.
- Publishing rules.

## MVP Service Boundaries
Start with 4 deployable services:

```text
rashpod-web
rashpod-dashboard
rashpod-api
rashpod-worker
```

Do not create many microservices in MVP.

### rashpod-web
- Designer onboarding landing page.
- Public shop.
- Product detail pages.
- Film listing pages.
- Checkout UI.
- Designer profile pages.

### rashpod-dashboard
- Designer dashboard.
- Customer dashboard.
- Admin dashboard.
- Moderator dashboard.
- Production dashboard.
- Corporate dashboard.
- Super admin dashboard.

### rashpod-api
- Auth / RBAC.
- Designs.
- Moderation.
- Product types/templates.
- Mockup templates.
- Listings.
- Film sales.
- Orders.
- Click payments.
- Yandex / UzPost delivery settings.
- Royalties.
- Corporate requests/offers.
- ZeptoMail.
- OpenAI.
- Admin settings.
- Audit logs.

### rashpod-worker
- Sharp mockup rendering.
- 3-image listing generation.
- Film preview generation.
- Production file preparation.
- AI jobs.
- Email jobs.
- Future marketplace export jobs.

## Technology Direction
| Layer | Technology |
|---|---|
| Frontend | Next.js + React |
| Styling | Tailwind CSS |
| Motion | Framer Motion |
| Mockup editor | Konva.js |
| Backend | NestJS or equivalent modular API |
| Database | PostgreSQL / Cloud SQL |
| ORM | Prisma recommended |
| Storage | Google Cloud Storage |
| Image processing | Sharp |
| Queue | Cloud Tasks / Pub/Sub / worker |
| Email | ZeptoMail |
| AI | OpenAI |
| Payment | Click |
| Hosting | Google Cloud Run |

## Visual Identity Rules
Preserve RashPOD visual identity:
- Main blue `#788AE0`.
- Secondary blue `#A3AFE5`.
- Light blue `#CFD6FA`.
- Main peach `#F39E7C`.
- Secondary peach `#EBB7A2`.
- Light peach `#FFD6C6`.
- Background `#F0F2FA`.
- Rounded cards.
- Pill buttons.
- Soft shadows.
- Thin outline icons.
- Playful geometric decorative assets.

## Framer Motion Rules
Allowed:
- Page fades/slides.
- Card hover lift.
- Button tap feedback.
- Upload progress/success states.
- Drawer/modal transitions.
- Mockup editor selection/drag feedback.

Avoid:
- Heavy layout animations in admin tables.
- Decorative motion in production queue.
- Infinite animations that distract.
- Animating expensive layout properties.

Respect `prefers-reduced-motion`.

## AI Governance
AI suggests. Human approves.

AI must not automatically:
- Approve designs.
- Reject designs permanently.
- Publish listings.
- Enable film sales.
- Select corporate bid winners.
- Send commercial offers.
- Change royalty/payment settings.

MVP AI roles:
1. Generate listing title/description/tags.
2. Translate Uzbek/Russian/English.
3. Assist moderation with hints.
4. Check film-sale readiness.
5. Draft corporate offer text.

## Designer Rights Rule
Product approval does not grant film-sale rights.

```text
Design approved for product sales ≠ Design approved for DTF/UV-DTF film sales
```

Each design/version needs explicit commercial rights:
- `allowProductSales`
- `allowMarketplacePublishing`
- `allowFilmSales`
- `allowCorporateBidding`
- `filmConsentGrantedAt`
- `filmConsentRevokedAt`
- `filmConsentVersionId`
- `filmRoyaltyRate`

## Mockup Pipeline Rule
Use a template-based mockup engine.

- Frontend: React + Konva.js.
- Backend/worker: Sharp.

Do not use AI-generated images as the source of truth for product mockups in MVP.

Each approved product listing must generate 3 images:
1. Main product image.
2. Lifestyle/mockup image.
3. Detail/close-up image.

## Code Quality Rules
- Keep modules isolated.
- Avoid hardcoded business logic.
- Use typed DTOs/schemas.
- Validate ownership and RBAC on every sensitive endpoint.
- Add audit logs for settings, royalties, rights, moderation, payments, publishing.
- Prefer background jobs for slow tasks.
- Store files in Google Cloud Storage, not local disk.
- Use signed URLs for private assets.
- Write tests for pricing, royalty, rights, and generation logic.

## Implementation Discipline
Before implementation:
1. Read `rashpod-prd.md`.
2. Read `rashpod-ui-tokens.md`.
3. Read all files in `docs/`.
4. Plan changes by module.
5. Avoid scope creep beyond the phase being implemented.
