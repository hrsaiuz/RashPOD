# RashPOD ZeptoMail Email Templates

## Provider
ZeptoMail.

## Template Rules
Each template needs key, locale, subject, HTML body, plain text body, variables, active status, and preview/test send.

## Required Templates
| Key | Trigger | Variables |
|---|---|---|
| account_verification | User registers | userName, verificationUrl, expiresAt |
| designer_design_submitted | Designer submits design | designerName, designTitle, dashboardUrl |
| design_approved | Moderator approves | designerName, designTitle, mockupStudioUrl |
| design_rejected | Moderator rejects | designerName, designTitle, reason, supportUrl |
| mockups_ready | Worker finishes images | designerName, designTitle, listingUrl, dashboardUrl |
| film_sale_enabled | Designer enables film sales | designerName, designTitle, filmRoyaltyRate, filmSettingsUrl |
| film_sale_disabled | Designer disables film sales | designerName, designTitle, effectiveAt |
| order_confirmation | Customer order paid | customerName, orderNumber, orderTotal, orderUrl, deliveryMethod |
| payment_success | Click payment verified | customerName, orderNumber, amount |
| payment_failed | Payment failed/cancelled | customerName, orderNumber, retryUrl |
| production_status_update | Production status changes | customerName, orderNumber, status, trackingUrl |
| corporate_request_received | Corporate request submitted | companyName, requestTitle, requestUrl |
| designer_bid_received | Designer submits bid | adminName, designerName, requestTitle, bidUrl |
| commercial_offer_sent | Admin sends offer | companyName, offerNumber, offerUrl, pdfUrl, expiresAt |
| payout_processed | Admin marks payout paid | designerName, amount, currency, payoutDate |

## Localization
MVP: `en`, `ru`, `uz-Latn`. Later: `uz-Cyrl`.

## Email Style
Blue/peach CTA buttons, rounded cards, clean white background, simple copy, clear action.

## Delivery Rules
- Avoid duplicate emails.
- Use idempotency keys.
- Log provider message IDs.
- Log failures.
- Retry transient failures.
