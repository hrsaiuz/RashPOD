# RashPOD Product Requirements Document

**Version:** 0.1  
**Date:** 2026-05-04  
**Product:** RashPOD  
**Primary market:** Uzbekistan  
**Infrastructure:** Google Cloud  
**Email provider:** ZeptoMail  
**AI provider:** OpenAI  
**Payment provider:** Click  
**Local delivery:** Yandex Delivery inside Tashkent, UzPost nationwide  
**Local production:** RashPOD in-house printing workshop  
**Global production:** International POD partners such as Printify / Printful later  

---

## 1. Product Vision

RashPOD is a Uzbekistan-first print-on-demand and design-commerce platform that helps designers turn their creative work into sellable products, DTF/UV-DTF transfer films, marketplace listings, and corporate merchandise opportunities.

The platform should not be designed as a simple e-commerce shop. RashPOD should become a **POD operating system** for:

- Designers who want to monetize their work.
- Customers who want to buy finished products or print films.
- Corporate clients who need branded merchandise.
- RashPOD's in-house workshop that fulfills local orders.
- Admin and operations teams managing moderation, production, commercial offers, pricing, royalties, and marketplace distribution.

The main landing page should primarily focus on **designer onboarding**, while the shop page should support both:

1. Finished product sales.
2. Design film sales: DTF / UV-DTF.

---

## 2. Business Goals

### 2.1 Primary Goals

1. Build a strong designer acquisition funnel in Uzbekistan.
2. Allow designers to upload designs and turn them into product listings after moderation.
3. Preserve the RashPOD visual identity from current Figma/screenshots.
4. Allow explicit designer consent for selling designs as DTF/UV-DTF films.
5. Build a shop that sells finished products and design films.
6. Build admin-configurable royalty, commission, product, pricing, and delivery settings.
7. Support RashPOD's in-house workshop for local production.
8. Prepare future global marketplace and global POD partner distribution.

### 2.2 Revenue Lines

| Revenue Line | Description |
|---|---|
| Finished Product Sales | T-shirts, mugs, hoodies, posters, caps, etc. |
| DTF / UV-DTF Film Sales | Transfer films sold to small businesses, workshops, and customers |
| Corporate Orders | Bulk branded merchandise orders with designer bidding |
| Marketplace Sales | Future global distribution through POD partners |
| Premium Designer Services | Future paid features, promotion, analytics, or marketplace support |

---

## 3. Product Scope

### 3.1 In Scope for MVP

- Designer-focused landing page.
- Designer registration and onboarding.
- Design upload.
- File validation.
- Admin moderation.
- Admin-configurable product types.
- Admin-configurable royalties and film commission rules.
- Product template and mockup template management.
- Template-based mockup pipeline.
- Designer mockup placement editor.
- Generation of 3 product images per approved product mockup.
- Product listing creation.
- Shop page for finished products.
- Shop page/catalog support for DTF/UV-DTF film listings.
- Designer film-sale consent.
- Click payment integration.
- Basic order management.
- Yandex Delivery / UzPost delivery configuration.
- In-house production queue.
- ZeptoMail transactional emails.
- OpenAI-powered assistive content generation.

### 3.2 Out of Scope for MVP

- Full global marketplace automation.
- Full Printify/Printful order sync.
- AI-generated final product mockups as the main mockup source.
- Complex warehouse/inventory system.
- Advanced accounting system.
- Full CRM.
- Native mobile apps.
- Advanced gang sheet builder, unless included in a later film-sales phase.
- Automated trademark/copyright detection beyond basic AI-assisted/manual moderation.

---

## 4. User Types

| User Type | Description | Dashboard |
|---|---|---|
| Guest / Visitor | Browses landing page, shop, designer pages | Public website |
| Customer | Buys products or films | Customer Dashboard |
| Designer | Uploads designs, creates mockups, manages royalties and bids | Designer Dashboard |
| Corporate Client | Requests bulk branded merchandise | Corporate Dashboard |
| Production Staff | Handles in-house printing and fulfillment | Production Dashboard |
| Moderator | Reviews designs and listings | Moderator Dashboard |
| Operations/Admin | Manages catalog, pricing, royalties, orders, production, offers | Admin Dashboard |
| Super Admin | Full platform control and system settings | Super Admin Dashboard |

---

## 5. Public Website Requirements

### 5.1 Main Landing Page

The main landing page should focus on onboarding designers.

#### Primary Message

```text
Upload your designs. Sell products. Earn royalties.
```

#### Secondary Message

```text
Turn your artwork into RashPOD products, DTF/UV-DTF films, and corporate merchandise opportunities.
```

#### Primary CTA

```text
Start selling your designs
```

#### Secondary CTA

```text
Open RashPOD Shop
```

#### Landing Page Sections

| Section | Purpose |
|---|---|
| Hero | Explain designer opportunity |
| How It Works | Upload → Moderation → Mockup → Publish → Earn |
| Supported Products | T-shirt, hoodie, mug, cap, tote, poster, etc. |
| Film Sales Opportunity | Explain optional DTF/UV-DTF film monetization |
| Corporate Orders | Explain bidding opportunities |
| Royalties | Explain earning model; exact rates configurable |
| Designer Trust | Explain consent, moderation, and rights control |
| FAQ | Common designer questions |
| CTA Footer | Registration CTA |

### 5.2 Shop Page

The shop page should support two listing types:

| Listing Type | Customer Buys |
|---|---|
| Finished Product Listing | Physical product printed by RashPOD |
| Film Listing | DTF/UV-DTF transfer film for a design |

The shop should allow filtering by:

- Product type.
- Designer.
- Category.
- Product listing vs film listing.
- Price.
- New/trending/popular.
- Delivery availability.

---

## 6. Dashboard Requirements

## 6.1 Designer Dashboard

### Purpose

Allow designers to upload designs, manage commercial rights, generate mockups, create listings, participate in corporate bids, and track earnings.

### Main Sections

| Section | Requirements |
|---|---|
| Overview | Total designs, approved designs, live products, film-enabled designs, sales, royalties |
| My Designs | Upload, drafts, submitted, approved, rejected, needs-fix |
| Mockup Studio | Select product type, select mockup, place design, preview, approve |
| My Products | Draft listings, published listings, performance |
| Film Rights | Enable/disable DTF/UV-DTF film sales per design |
| Corporate Bids | View requests, submit bids, track won/lost |
| Royalties | Product royalty, film royalty, payout status |
| Settings | Profile, portfolio, payout details, notifications |

### Designer Film-Sale Permission Rule

A design approved for product sales must **not** automatically become available for film sales.

```text
Product sales approval ≠ Film sales approval
```

The designer must explicitly approve whether each design can be sold as DTF/UV-DTF film.

---

## 6.2 Customer Dashboard

| Section | Requirements |
|---|---|
| Orders | Active orders, order history, order tracking |
| Film Orders | Film transfer orders and print specs |
| Wishlist | Saved products/designs |
| Addresses | Delivery addresses |
| Support | Contact support / issue reporting |
| Account | Profile and settings |

---

## 6.3 Corporate Dashboard

| Section | Requirements |
|---|---|
| New Request | Product type, quantity, design brief, logo, deadline, budget |
| My Requests | Open, in review, bidding, offer pending, accepted |
| Commercial Offers | View, download, approve/reject, request revision |
| Orders | Production status and delivery tracking |
| Account / Billing | Company details, contact info |

---

## 6.4 Production Dashboard

Production is primarily for RashPOD's in-house workshop.

| Section | Requirements |
|---|---|
| Overview | Today’s jobs, urgent jobs, delayed jobs, completed jobs |
| POD Queue | Product orders |
| DTF Queue | DTF film orders |
| UV-DTF Queue | UV-DTF film orders |
| Corporate Queue | Bulk corporate jobs |
| Job Detail | Files, quantity, product specs, production method, notes |
| QC Checklist | Print quality, size, placement, packaging |
| Status Updates | Move jobs through production lifecycle |

### Production Statuses

```text
ORDERED
FILE_CHECK
READY_FOR_PRINT
PRINTING
QC
PACKING
READY_FOR_PICKUP
DELIVERED
```

---

## 6.5 Moderator Dashboard

| Section | Requirements |
|---|---|
| Review Queue | New designs, flagged designs, revised designs |
| Design Review | Preview, quality, policy, ownership/risk |
| Listing Review | Title, description, images, category |
| Decision Actions | Approve, reject, request changes, suspend |
| Logs | Review history and moderator notes |

---

## 6.6 Admin Dashboard

| Section | Requirements |
|---|---|
| Platform Overview | Users, listings, sales, production health |
| User Management | Designers, customers, corporate accounts, staff |
| Product Type Manager | Configure supported product types |
| Product Template Manager | Base products, mockup templates, print areas |
| Royalty Settings | Product royalty and designer-specific rules |
| Film Sale Settings | Film pricing, film commission, film royalty |
| Orders | Product and film orders |
| Production | Workshop queues |
| Corporate Orders | Requests, bids, commercial offers |
| Marketplace Hub | Export and future integration state |
| Delivery Settings | Yandex, UzPost, pickup/manual fallback |
| Payment Settings | Click integration |
| Email Templates | ZeptoMail templates |
| AI Settings | OpenAI prompt/configuration settings |
| Reports | Sales, royalties, production, listings |
| Audit Logs | Admin actions and sensitive changes |

---

## 7. Admin Configuration Requirements

RashPOD must avoid hardcoded commercial rules. Admin should configure key business rules.

### 7.1 Royalty Settings

Admin must configure designer royalty rules.

#### Required Fields

| Field | Description |
|---|---|
| Default product royalty type | Percentage of sale, percentage of profit, fixed amount |
| Default product royalty value | Numeric value |
| Product-type-specific royalty | Optional override |
| Designer-specific royalty | Optional override |
| Marketplace/channel-specific royalty | Optional override |
| Effective date | When rule starts |
| Status | Active/inactive |
| History | Preserve old rules for audit |

#### Rule Priority

```text
Designer-specific rule
↓
Product-type-specific rule
↓
Channel-specific rule
↓
Default platform rule
```

---

### 7.2 Film Sale Settings

Film sales must have separate commercial settings.

#### Required Fields

| Field | Description |
|---|---|
| Enable film sales globally | On/off |
| Supported film methods | DTF, UV-DTF |
| Default film royalty type | % of sale, % of net profit, fixed amount |
| Default film royalty value | Numeric |
| Price per cm² | Optional |
| Price per sheet | Optional |
| Minimum order price | Optional |
| Rush order fee | Optional |
| Gang sheet pricing | Future |
| Revocation policy | Defines behavior after designer disables film sales |

Designer film royalty should support at least:

```text
Percentage of net profit
Percentage of sale price
Fixed amount per successful film order
```

---

### 7.3 Product Type Manager

Admin must configure supported product types.

#### Example Product Types

```text
T-shirt
Hoodie
Mug
Cap
Tote Bag
Poster
Sticker
DTF Film
UV-DTF Film
```

#### Required Fields

| Field | Description |
|---|---|
| Name | Product type name |
| Category | Clothes, ceramics, prints, accessories, films |
| Is active | Whether available |
| Available for designers | Can designers use it? |
| Available in shop | Can be sold in shop? |
| Available for corporate | Can be used in corporate orders? |
| Available for marketplace | Future global/local publishing |
| Requires mockup | Whether mockup generation is required |
| Supports film sale | Usually false except film listing types |
| Production method | DTF, UV-DTF, sublimation, etc. |
| Base cost | Internal cost |
| Default margin | Platform margin |
| Size options | S/M/L/etc. if applicable |
| Color options | Product colors |

---

### 7.4 Delivery Settings

| Delivery Model | Provider |
|---|---|
| Inside Tashkent | Yandex Delivery |
| Nationwide Uzbekistan | UzPost |
| Pickup | RashPOD workshop pickup |
| Fallback | Manual delivery |

Admin must configure:

- Delivery zones.
- Provider availability.
- Delivery price logic.
- Estimated delivery time.
- Pickup address.
- Pickup working hours.
- Manual override.

---

### 7.5 Payment Settings

Provider: **Click**

Payment should support:

- Finished product orders.
- Film orders.
- Future corporate deposits or invoices.

For MVP corporate orders can use manual payment tracking after commercial offer acceptance.

---

## 8. Mockup Pipeline

### 8.1 Recommendation

RashPOD should build its own **template-based mockup pipeline**.

Recommended stack:

| Layer | Tool |
|---|---|
| Frontend editor | React + Konva.js |
| Server image rendering | Sharp |
| Asset storage | Google Cloud Storage |
| Job processing | Cloud Tasks / Pub/Sub / worker service |
| Database | PostgreSQL |
| AI assistance | OpenAI |
| Email notification | ZeptoMail |

### 8.2 Why Template-Based Mockups

The core commercial mockups should not rely on AI image generation because:

- AI may distort the design.
- AI may change product shape.
- Text inside designs may become unreadable.
- Print position may be inaccurate.
- Marketplace images may become inconsistent.
- Production team needs exact, repeatable placement.

AI-generated images may be added later for marketing/lifestyle content, but not as the MVP source of truth for product mockups.

### 8.3 Mockup Flow

```text
Designer Upload
↓
File Validation
↓
Admin Moderation
↓
Designer Selects Product Types
↓
System Shows Available Mockup Templates
↓
Designer Places Design Inside Safe Print Area
↓
System Generates Preview Mockups
↓
Designer Approves Product Usage + Optional Film Rights
↓
System Generates 3 Listing Images
↓
Product Listing Created
↓
Publish to RashPOD Shop
```

### 8.4 Product Template Requirements

Each template must include:

| Field | Description |
|---|---|
| Product type | T-shirt, mug, hoodie, etc. |
| Base product image | Main product image |
| Mockup image | Lifestyle or product mockup image |
| Print area | Coordinates for allowed design placement |
| Safe area | Inner safe margin |
| Allowed transforms | Move, resize, rotate |
| Min DPI | Required quality |
| Max print size | Production limit |
| Supported colors | Product color variants |
| Supported sizes | Product size variants |
| Production method | DTF, UV-DTF, sublimation, etc. |

### 8.5 Print Area Example

```json
{
  "templateId": "white-tshirt-front-001",
  "printArea": {
    "x": 420,
    "y": 310,
    "width": 360,
    "height": 280
  },
  "safeArea": {
    "x": 450,
    "y": 335,
    "width": 300,
    "height": 230
  },
  "allowedTransforms": {
    "move": true,
    "resize": true,
    "rotate": false
  }
}
```

### 8.6 Designer Mockup Studio UI

The editor should feel like a simplified Canva/Figma placement tool.

#### Left Panel

- Uploaded design preview.
- Product selector.
- Mockup template selector.
- Product color selector.
- Variant selector.

#### Center Canvas

- Product mockup canvas.
- Design overlay.
- Safe zone overlay.
- Drag/resize handles.
- Zoom controls.

#### Right Panel

- Position controls.
- Scale controls.
- Center design button.
- Reset button.
- Preview generated images.
- Product sale permission.
- Film-sale permission.
- Approve button.

### 8.7 Listing Image Outputs

Each approved product listing should generate 3 images:

| Image | Description |
|---|---|
| Main product image | Clean product-focused image |
| Lifestyle/mockup image | Styled/model/environment image |
| Detail/close-up image | Zoomed view of design/print area |

---

## 9. DTF / UV-DTF Film Sales

### 9.1 Film-Sale Consent

A designer must explicitly enable film sales per design/version.

Required fields:

| Field | Type |
|---|---|
| `allowFilmSales` | boolean |
| `filmConsentGrantedAt` | Date/null |
| `filmConsentRevokedAt` | Date/null |
| `filmConsentVersionId` | string/null |
| `filmRoyaltyRate` | number/null |

### 9.2 Film Order Flow

```text
Designer enables film sales
↓
System validates design transparency/resolution
↓
System creates film listing
↓
Customer chooses DTF or UV-DTF
↓
Customer chooses size/quantity
↓
System calculates price
↓
Customer pays with Click
↓
Production receives print-ready file
↓
RashPOD workshop prints film
↓
Delivery via Yandex / UzPost / pickup
```

### 9.3 Film Output Requirements

For each film listing/order:

| Output | Description |
|---|---|
| Film preview image | Customer-facing preview |
| Technical print-size preview | Shows actual dimensions |
| Production file | Print-ready asset |
| Order ticket | Production job detail |

### 9.4 Future Feature

- Gang sheet builder.

---

## 10. Product Listing Engine

### 10.1 Listing Model

The shop should use a generalized listing model:

```text
CommerceListing
├── PRODUCT
└── FILM
```

This allows RashPOD shop to sell both finished products and transfer films.

### 10.2 Product Listing Fields

| Field | Description |
|---|---|
| Listing type | PRODUCT / FILM |
| Title | Product title |
| Description | Product description |
| Designer | Designer attribution |
| Product type | T-shirt, mug, film, etc. |
| Images | Generated images |
| Price | Calculated/configured |
| Variants | Size, color, method |
| Status | Draft/published/archived |
| SEO data | Slug, meta title, meta description |
| Tags | Search and categorization |
| Royalty rule | Applied designer royalty |
| Delivery eligibility | Delivery options |

### 10.3 OpenAI Support

OpenAI can assist with:

- Product titles.
- Product descriptions.
- Tags.
- SEO metadata.
- Uzbek/Russian/English translations.
- Marketplace-safe content suggestions.

All AI-generated content must be reviewed by designer/admin before publishing.

---

## 11. Corporate Orders

### 11.1 Corporate Request Flow

```text
Corporate client submits request
↓
Admin reviews request
↓
Designers submit bids/proposals
↓
Admin shortlists/selects proposal
↓
Admin adds production/logistics/other costs
↓
System generates commercial offer
↓
Admin sends offer via ZeptoMail
↓
Corporate client accepts/rejects
↓
Accepted offer becomes production order
```

### 11.2 Corporate Request Fields

| Field | Description |
|---|---|
| Company name | Corporate client |
| Contact person | Name |
| Phone/email | Contact info |
| Product types | Desired products |
| Quantity | Units |
| Logo/design files | Attachments |
| Deadline | Required date |
| Budget | Optional |
| Notes | Requirements |
| Delivery location | Address |

### 11.3 Designer Bid Fields

| Field | Description |
|---|---|
| Designer | Bid owner |
| Proposed design | File/mockup |
| Design fee | Designer price |
| Timeline | Expected design time |
| Notes | Proposal text |
| Status | Submitted, shortlisted, selected, rejected |

### 11.4 Commercial Offer Builder

Admin must be able to add:

- Designer fee.
- Product blanks cost.
- Printing cost.
- Packaging.
- Delivery.
- Extra services.
- Rush fee.
- Discount.
- Admin margin.
- Taxes if applicable.
- Terms and timeline.

Offer should export to PDF and be sendable via ZeptoMail.

---

## 12. Marketplace Distribution

### 12.1 MVP Approach

Marketplace automation is not MVP-critical. First build export-ready product data.

MVP should support:

- Marketplace-ready image package.
- CSV/XLSX export later.
- Channel-specific listing fields.
- Admin status tracking.

### 12.2 Future Global POD

RashPOD will use international POD partners for global fulfillment.

Potential partners:

- Printify.
- Printful.

Future integration should support:

- Product template mapping.
- Listing push.
- Order sync.
- Fulfillment status.
- Marketplace-ready imagery.

---

## 13. Payments

### 13.1 Provider

Local payment provider:

```text
Click
```

### 13.2 Payment Use Cases

| Use Case | Required in MVP |
|---|---|
| Finished product order | Yes |
| Film order | Yes |
| Corporate offer payment | Manual MVP / automated later |
| Designer payout | Admin-managed MVP |

### 13.3 Payment Statuses

```text
PENDING
PAID
FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

---

## 14. Delivery

### 14.1 Delivery Providers

| Region / Method | Provider |
|---|---|
| Inside Tashkent | Yandex Delivery |
| Nationwide Uzbekistan | UzPost |
| Pickup | RashPOD workshop |
| Fallback | Manual |

### 14.2 Delivery Requirements

- Customer chooses delivery method at checkout.
- Admin can override delivery method.
- Production team sees delivery method in job ticket.
- Tracking number/status should be stored when available.
- Delivery cost should be configurable.
- Pickup address and hours should be configurable.

---

## 15. Notifications

Provider: **ZeptoMail**

### Required Email Templates

```text
account_verification
designer_design_submitted
design_approved
design_rejected
mockups_ready
film_sale_enabled
film_sale_disabled
order_confirmation
payment_success
payment_failed
production_status_update
corporate_request_received
designer_bid_received
commercial_offer_sent
payout_processed
```

### Future Notification Channels

- Telegram.
- SMS.
- WhatsApp.

---

## 16. AI Capabilities

Provider: **OpenAI**

AI should be assistive and controlled.

| Area | AI Action | Approval |
|---|---|---|
| Listing | Generate title, description, tags | Designer/Admin |
| Translation | Uzbek, Russian, English | Designer/Admin |
| Moderation | Policy/quality hints | Moderator |
| Corporate | Draft offer text, summarize bids | Admin |
| SEO | Generate meta title/description | Admin |

Rules:

- AI must not publish listings automatically.
- AI must not approve moderation automatically in MVP.
- AI should always preserve designer ownership and consent rules.
- AI outputs must be editable.

---

## 17. Technical Architecture

### 17.1 Recommended Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + React |
| UI Styling | Tailwind CSS |
| Motion | Framer Motion |
| Mockup Editor | Konva.js |
| Backend | NestJS or equivalent API service |
| Database | PostgreSQL / Cloud SQL |
| Storage | Google Cloud Storage |
| Image Processing | Sharp |
| Background Jobs | Cloud Tasks / Pub/Sub / worker service |
| Email | ZeptoMail |
| AI | OpenAI |
| Payments | Click |
| Hosting | Google Cloud Run |

### 17.2 High-Level Architecture

```text
Public Website / Shop
Designer Dashboard
Admin Dashboard
Corporate Dashboard
Production Dashboard
        ↓
Main API Service
        ↓
PostgreSQL / Cloud SQL
Google Cloud Storage
Background Workers
        ↓
Sharp Mockup Generator
ZeptoMail
OpenAI
Click
Yandex Delivery / UzPost
```

---

## 18. Suggested Data Model

### Core Entities

```text
User
Organization
Role
Permission

DesignerProfile
CustomerProfile
CorporateProfile

DesignAsset
DesignVersion
DesignModerationCase
CommercialRights

ProductType
BaseProduct
ProductVariant
MockupTemplate
PrintArea
DesignPlacement
GeneratedAsset

CommerceListing
ProductListingDetails
FilmListingDetails

Order
OrderItem
PaymentTransaction
DeliveryProvider
DeliveryQuote
Shipment

ProductionJob
ProductionJobStatusLog

RoyaltyRule
RoyaltyLedger
Payout

CorporateRequest
DesignerBid
CommercialOffer
CommercialOfferLineItem

EmailTemplate
NotificationLog
AuditLog
```

### Critical Entity: CommercialRights

```text
CommercialRights
├── designVersionId
├── allowProductSales
├── allowMarketplacePublishing
├── allowFilmSales
├── allowCorporateBidding
├── filmConsentGrantedAt
├── filmConsentRevokedAt
├── filmConsentVersionId
└── filmRoyaltyRate
```

### Critical Entity: CommerceListing

```text
CommerceListing
├── id
├── type: PRODUCT | FILM
├── designerId
├── designAssetId
├── title
├── description
├── images
├── price
├── status
├── royaltyRuleId
├── seo
└── metadata
```

---

## 19. RBAC and Permissions

### Required Roles

```text
SUPER_ADMIN
ADMIN
OPERATIONS_MANAGER
MODERATOR
PRODUCTION_STAFF
FINANCE_STAFF
SUPPORT_STAFF
DESIGNER
CUSTOMER
CORPORATE_CLIENT
```

### Permission Examples

| Permission | Role |
|---|---|
| Manage product types | Admin/Super Admin |
| Manage royalty rules | Admin/Super Admin |
| Approve designs | Moderator/Admin |
| Publish listings | Admin/Designer depending rules |
| Enable film sales | Designer only for own design |
| Override film sales | Admin/Super Admin only with audit |
| Manage production jobs | Production/Admin |
| Send commercial offer | Admin |
| View payouts | Designer/Finance/Admin |
| Manage email templates | Admin/Super Admin |

---

## 20. Visual and UI Requirements

RashPOD must preserve the visual identity from current screenshots.

### Required Visual System

- Main blue: `#788AE0`.
- Peach action color: `#F39E7C`.
- Light background: `#F0F2FA`.
- Rounded cards and category tiles.
- Product-focused imagery.
- Soft gradients.
- Thin outline icons.
- Playful geometric decorative assets.
- Pill-shaped buttons.
- Soft shadows.
- Clean, minimal, friendly interface.

### Framer Motion Rules

- Use motion for premium feel, not distraction.
- Use hover lift for cards.
- Use smooth transitions for modals/drawers.
- Use upload progress and success animations.
- Use drag-safe feedback in mockup editor.
- Respect reduced motion.
- Avoid heavy animations in production/admin dense tables.

---

## 21. MVP Phases

## Phase 1 — Designer Onboarding + Product Listings

Build:

- Designer landing page.
- Designer registration.
- Design upload.
- File validation.
- Admin moderation.
- Product type manager.
- Mockup template manager.
- Konva placement editor.
- Sharp image generation.
- Product listing creation.
- Shop page for product sales.
- Click payment.
- Basic order management.
- Production queue for product orders.

## Phase 2 — Film Sales

Build:

- Designer film-sale consent.
- DTF / UV-DTF film listing type.
- Film pricing rules.
- Film order checkout.
- Production queue for film orders.
- Delivery selection: Yandex / UzPost / pickup.
- Royalty ledger for film sales.

## Phase 3 — Corporate Orders

Build:

- Corporate request page.
- Designer bidding.
- Admin bid review.
- Commercial offer builder.
- PDF export.
- Send offer via ZeptoMail.
- Convert accepted offer to production job.

## Phase 4 — Marketplace Distribution

Build:

- Marketplace export package.
- Printify/Printful integration.
- Etsy integration.
- Local marketplace export tools.
- Marketplace sync dashboard.

---

## 22. Acceptance Criteria

### Designer Upload and Moderation

- Designer can upload a design.
- System validates file type, size, transparency, and resolution.
- Moderator can approve/reject/request changes.
- Designer receives ZeptoMail notification.
- Design status updates correctly.

### Mockup Pipeline

- Admin can create product type and mockup template.
- Admin can define print area and safe area.
- Designer can place design inside print area.
- Designer cannot place design outside allowed area.
- System can generate 3 listing images.
- Generated images are stored in Google Cloud Storage.
- Product listing can be created from generated mockup.

### Film-Sale Consent

- Designer can enable film sales per design.
- Designer can disable film sales for future orders.
- Product approval does not automatically enable film sales.
- Film listing is only created if film consent is active.
- Film consent history is stored.
- Existing paid film orders are not cancelled automatically after revocation.

### Shop

- Shop displays product listings.
- Shop displays film listings.
- Customer can filter listing types.
- Customer can buy product/film via Click.
- Customer receives order confirmation email.

### Production

- Product orders create production jobs.
- Film orders create production jobs.
- Production staff can update job status.
- Customer receives production status updates.
- Admin can view production queue.

### Delivery

- Customer can choose Tashkent delivery, nationwide delivery, or pickup.
- Tashkent uses Yandex Delivery setting.
- Nationwide uses UzPost setting.
- Admin can manually override provider.
- Delivery method appears on production job ticket.

### Admin Configuration

- Admin can configure product types.
- Admin can configure royalty rules.
- Admin can configure film sale rules.
- Admin can configure delivery settings.
- Admin can configure email templates.
- Admin changes are audit logged.

### Corporate Orders

- Corporate client can submit request.
- Designer can submit bid.
- Admin can select bid and create offer.
- Admin can add extra cost items.
- Admin can export/send commercial offer.
- Accepted offer can become production job.

---

## 23. Open Questions

These can be decided during detailed implementation planning.

1. Should designer approval be required before every product type listing, or can designer bulk-approve selected mockups?
2. Should admin have final publish control after designer mockup approval?
3. Should royalty be calculated from sale price or net profit by default?
4. Should film sales be hidden from public shop unless design has minimum quality score?
5. Should corporate clients see designer bids directly or only admin-curated offers?
6. Should designer payouts be manual in MVP or automated later?
7. Should Click payment settlement data be reconciled inside admin from day one?
8. What are exact file limits for designer uploads?
9. Should vector files be required/preferred for film sales?
10. Should Uzbek, Russian, and English be required for all listings from MVP?

---

## 24. Recommended Next Documents

After this PRD, create:

1. Technical architecture document.
2. Database schema plan.
3. Mockup pipeline technical spec.
4. Admin configuration spec.
5. Codex implementation plan prompt.
6. UI route map.
7. API endpoint plan.
8. QA checklist.
