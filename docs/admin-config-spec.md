# RashPOD Admin Configuration Spec

## Goal
Admins must configure business rules without code changes.

Configurable areas:
- Product types.
- Base products.
- Mockup templates.
- Royalty rules.
- Film-sale rules.
- Delivery providers.
- Payment settings.
- AI settings.
- Email templates.
- Publishing rules.

## Product Type Manager
Fields:
- Name, slug, category.
- Active/inactive.
- Available for designers/shop/corporate/marketplace.
- Requires mockup.
- Supports film sale.
- Production method.
- Base cost.
- Default margin.
- Sizes/colors metadata.

Actions:
- Create/edit/deactivate product type.
- Configure variants.
- Configure costs/margins.
- Configure channel availability.

## Product Template Manager
Fields:
- Product type.
- Base product name.
- SKU prefix.
- Product images.
- Supported colors/sizes.
- Base cost.
- Default price.
- Active/inactive.

## Mockup Template Manager
Fields:
- Base product.
- Template name.
- Template image.
- Lifestyle image.
- Close-up image.
- Print area.
- Safe area.
- Transform rules.
- Output dimensions.
- Sort order.
- Active/inactive.

## Royalty Settings
Basis options:
```text
SALE_PRICE_PERCENT
NET_PROFIT_PERCENT
FIXED_AMOUNT
```

Scopes:
```text
DEFAULT
PRODUCT_TYPE
DESIGNER
CHANNEL
CAMPAIGN
```

Priority:
```text
Designer-specific
↓
Product-type-specific
↓
Channel-specific
↓
Default
```

## Film-Sale Settings
Global fields:
- Enable film sales globally.
- Enable DTF.
- Enable UV-DTF.
- Default film royalty basis/value.
- Minimum order price.
- Rush order fee.
- Revocation policy.

Pricing options:
- Price per cm².
- Price per sheet.
- Fixed product-size pricing.
- Future gang sheet pricing.

Consent rule: designer must explicitly approve film sales. Admin override must be audit logged.

## Delivery Settings
Providers:
| Provider | Scope |
|---|---|
| Yandex Delivery | Tashkent |
| UzPost | Nationwide |
| Pickup | Workshop |
| Manual | Fallback |

Fields:
- Active/inactive.
- Delivery zone.
- Price.
- Free delivery threshold.
- Estimated delivery time.
- Pickup address/hours.
- API credentials later.

## Payment Settings
Provider: Click.

Configure merchant ID, service ID, secrets via Secret Manager, return URLs, webhook endpoint, test/production mode, and allowed use cases.

## Email Template Settings
Provider: ZeptoMail.

Templates should support subject, body HTML, body text, locale, active status, preview, and test send.

## AI Settings
Provider: OpenAI.

Configure model, max tokens, temperature, prompt templates, enabled features, and budget guardrails.

AI must never auto-publish or auto-approve in MVP.

## Publishing Settings
Configurable rules:
- Auto-publish after designer approval.
- Require admin listing review.
- Allow designer to edit generated copy.
- Require admin approval for film listing.
- Require minimum image quality score.

Recommended MVP: admin moderates designs; designer approves mockups/rights; admin/system publishes based on rule.

## Audit Requirements
Audit royalties, film settings, product types, payment settings, delivery settings, AI settings, email template changes, moderation decisions, and listing publication/suspension.
