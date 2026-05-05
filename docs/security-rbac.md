# RashPOD Security and RBAC Spec

## Principles
- Every action must be authorized.
- Designers can only manage their own designs.
- Film-sale consent can only be granted by the design owner.
- Admin overrides must be audit logged.
- Production files and corporate attachments are private.
- Payment webhooks must be verified and idempotent.
- Store sensitive credentials in Secret Manager.

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

## Permission Groups
Design:
```text
design:create, design:read-own, design:update-own, design:submit-own, design:delete-draft-own, design:moderate, design:suspend
```

Rights:
```text
rights:read-own, rights:update-own, rights:enable-film-own, rights:disable-film-own, rights:admin-override
```

Listings:
```text
listing:create-own, listing:update-own, listing:publish, listing:archive, listing:admin-manage
```

Admin config:
```text
product-type:manage, mockup-template:manage, royalty-rule:manage, film-settings:manage, delivery-settings:manage, payment-settings:manage, email-template:manage, ai-settings:manage
```

Orders/production:
```text
order:read-own, order:manage, production:read, production:update-status, production:assign, production:qc
```

Corporate:
```text
corporate-request:create, corporate-request:read-own, corporate-request:manage, designer-bid:create, designer-bid:manage, commercial-offer:create, commercial-offer:send, commercial-offer:accept-own
```

Finance:
```text
royalty:read-own, royalty:manage, payout:manage, report:finance
```

## Ownership Rules
Designers can create/manage own designs, rights, placements, bids, royalties. They cannot approve moderation, change royalty rules, or modify another designer's rights.

Customers can view/buy own orders only.

Production staff can view job files and update statuses, but cannot change royalties, payments, or film consent.

Moderators can review and decide moderation, but cannot override designer film consent.

Admins manage operations/settings. Sensitive actions require audit logs.

## Audit Required
Audit moderation decisions, design suspension, listing publication/archive, commercial rights changes, film consent changes, admin overrides, royalty changes, payment/delivery/email/AI settings, commercial offer sending, and payout marking.

## File Security
| File Type | Visibility |
|---|---|
| Original design | Private |
| Design preview | Private until approved |
| Listing image | Public when published |
| Film production file | Private |
| Corporate attachment | Private |
| Commercial offer PDF | Private |
| Marketplace export package | Private |

Use signed URLs for private access.

## Payment Security
- Verify Click callbacks.
- Store raw payload.
- Use idempotency keys.
- Never trust frontend payment status.
- Update order after verified payment only.

## AI Security
- Do not send unnecessary private data to AI.
- Log AI usage.
- AI cannot approve/reject/publish/send automatically.
