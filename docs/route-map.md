# RashPOD Route Map

## Public Web
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
/auth/login
/auth/register
/auth/verify-email
```

## Designer Dashboard
```text
/dashboard/designer
/dashboard/designer/designs
/dashboard/designer/designs/new
/dashboard/designer/designs/[id]
/dashboard/designer/designs/[id]/rights
/dashboard/designer/mockup-studio
/dashboard/designer/mockup-studio/[placementId]
/dashboard/designer/products
/dashboard/designer/film-rights
/dashboard/designer/corporate-bids
/dashboard/designer/royalties
/dashboard/designer/settings
```

## Customer Dashboard
```text
/dashboard/customer
/dashboard/customer/orders
/dashboard/customer/orders/[id]
/dashboard/customer/film-orders
/dashboard/customer/wishlist
/dashboard/customer/addresses
/dashboard/customer/support
/dashboard/customer/settings
```

## Corporate Dashboard
```text
/dashboard/corporate
/dashboard/corporate/requests
/dashboard/corporate/requests/new
/dashboard/corporate/requests/[id]
/dashboard/corporate/offers
/dashboard/corporate/offers/[id]
/dashboard/corporate/orders
/dashboard/corporate/settings
```

## Moderator Dashboard
```text
/dashboard/moderator
/dashboard/moderator/designs
/dashboard/moderator/designs/[id]
/dashboard/moderator/listings
/dashboard/moderator/listings/[id]
/dashboard/moderator/logs
```

## Production Dashboard
```text
/dashboard/production
/dashboard/production/jobs
/dashboard/production/jobs/[id]
/dashboard/production/pod
/dashboard/production/dtf
/dashboard/production/uv-dtf
/dashboard/production/corporate
/dashboard/production/qc
```

## Admin Dashboard
```text
/dashboard/admin
/dashboard/admin/users
/dashboard/admin/designers
/dashboard/admin/customers
/dashboard/admin/corporate-clients
/dashboard/admin/product-types
/dashboard/admin/base-products
/dashboard/admin/mockup-templates
/dashboard/admin/print-areas
/dashboard/admin/listings
/dashboard/admin/orders
/dashboard/admin/production
/dashboard/admin/royalty-rules
/dashboard/admin/film-sale-settings
/dashboard/admin/delivery-settings
/dashboard/admin/payment-settings
/dashboard/admin/corporate-requests
/dashboard/admin/commercial-offers
/dashboard/admin/marketplace
/dashboard/admin/email-templates
/dashboard/admin/ai-settings
/dashboard/admin/reports
/dashboard/admin/audit-logs
```

## Super Admin
```text
/dashboard/super-admin
/dashboard/super-admin/system
/dashboard/super-admin/roles
/dashboard/super-admin/permissions
/dashboard/super-admin/secrets
/dashboard/super-admin/audit-logs
```

## Page Rules
- Public storefront: playful, product-first, soft, brand-heavy.
- Dashboards: calm, operational, structured.
- Use same UI tokens across apps.
- Use Framer Motion only where it improves UX.
