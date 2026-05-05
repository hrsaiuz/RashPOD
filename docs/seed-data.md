# RashPOD Seed Data

## Product Types
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

## Product Categories
```text
Clothes
Ceramics
Prints
Accessories
Films
Corporate
```

## Delivery Providers
| Provider | Type | Active |
|---|---|---|
| Yandex Delivery | Tashkent | true |
| UzPost | Nationwide | true |
| Workshop Pickup | Pickup | true |
| Manual Delivery | Fallback | true |

## Roles
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

## Design Statuses
```text
DRAFT
SUBMITTED
NEEDS_FIX
APPROVED
REJECTED
SUSPENDED
READY_FOR_MOCKUP
READY_TO_PUBLISH
PUBLISHED
```

## Listing Statuses
```text
DRAFT
READY_FOR_REVIEW
PUBLISHED
ARCHIVED
REJECTED
SUSPENDED
```

## Production Statuses
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

## Initial Royalty Rule Placeholders
Exact values should be configured by admin.

```text
Default Product Royalty: NET_PROFIT_PERCENT, configurable value
Default Film Royalty: NET_PROFIT_PERCENT, configurable value
Corporate Designer Fee: designer bid amount
```

## Initial Email Template Keys
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

## Initial AI Prompt Keys
```text
listing_copy
listing_tags
listing_translation
moderation_assist
film_readiness
corporate_offer_draft
email_copy
```
