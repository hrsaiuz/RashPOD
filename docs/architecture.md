# RashPOD Technical Architecture

## Architecture Goal
Launch as a modular monolith-style platform with 4 deployable services, not many microservices.

```text
RashPOD
├── rashpod-web
├── rashpod-dashboard
├── rashpod-api
└── rashpod-worker
```

## rashpod-web
Public-facing app.

Routes:
```text
/
/designers
/shop
/shop/products
/shop/films
/product/[slug]
/film/[slug]
/designer/[handle]
/corporate
/checkout
```

## rashpod-dashboard
Authenticated role-based dashboard app.

Route groups:
```text
/dashboard/customer
/dashboard/designer
/dashboard/corporate
/dashboard/moderator
/dashboard/production
/dashboard/admin
/dashboard/super-admin
```

## rashpod-api Modules
```text
AuthModule
UsersModule
RbacModule
DesignsModule
ModerationModule
CommercialRightsModule
ProductTypesModule
ProductTemplatesModule
MockupTemplatesModule
ListingsModule
FilmSalesModule
OrdersModule
PaymentsModule
DeliveryModule
ProductionModule
RoyaltyModule
PayoutModule
CorporateModule
CommercialOffersModule
NotificationsModule
AiModule
FilesModule
AdminSettingsModule
AuditLogModule
ReportsModule
```

## rashpod-worker Jobs
```text
GENERATE_PRODUCT_MOCKUPS
GENERATE_LISTING_IMAGE_PACK
GENERATE_FILM_PREVIEW
GENERATE_PRODUCTION_FILE
GENERATE_AI_LISTING_COPY
GENERATE_AI_TRANSLATION
SEND_EMAIL
EXPORT_MARKETPLACE_PACKAGE
GENERATE_COMMERCIAL_OFFER_PDF
```

## Google Cloud Resources
| Resource | Purpose |
|---|---|
| Cloud Run | Host web, dashboard, API, worker |
| Cloud SQL PostgreSQL | Main database |
| Google Cloud Storage | Designs, mockups, product images, film files, PDFs |
| Pub/Sub or Cloud Tasks | Background job dispatch |
| Secret Manager | Credentials |
| Cloud Logging/Monitoring | Observability |
| Cloud Build | CI/CD |

## Storage Layout
```text
rashpod-assets/
├── design-originals/
├── design-versions/
├── generated-mockups/
├── listing-images/
├── film-previews/
├── production-files/
├── corporate-attachments/
├── commercial-offers/
└── exports/
```

## Worker Flow
```text
API receives approved placement
↓
API writes DesignPlacement + GeneratedAsset records
↓
API queues GENERATE_LISTING_IMAGE_PACK
↓
Worker fetches source files from GCS
↓
Worker uses Sharp to render images
↓
Worker uploads outputs to GCS
↓
Worker updates GeneratedAsset statuses
```

## External Integrations
- Click: product/film payments.
- ZeptoMail: transactional email.
- OpenAI: controlled AI assist.
- Yandex Delivery / UzPost: local delivery settings and later API integration.
- Printify/Printful: future global POD.

## Environments
```text
local
staging
production
```

Each environment needs separate DB, storage, API keys, webhook endpoints, and admin accounts.
