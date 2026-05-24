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
/dashboard/designer/listings
/dashboard/designer/listings/[id]
/dashboard/designer/film-rights
/dashboard/designer/film-sales
/dashboard/designer/corporate-bids
/dashboard/designer/earnings
/dashboard/designer/royalties          → redirects to /dashboard/designer/earnings
/dashboard/designer/analytics
/dashboard/designer/support
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
/dashboard/moderator/designs/[id]       → pipeline approval, mockup status, listing wizard
/dashboard/moderator/listings
/dashboard/moderator/listings/[id]     → full listing wizard (AI copy, variations, publish)
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

## Admin Dashboard (Super Admin uses the same grouped sidebar)
```text
/dashboard/admin
/dashboard/super-admin/tenants         → Platform group in admin sidebar
/dashboard/super-admin/plans
/dashboard/super-admin/roles
/dashboard/super-admin/permissions
/dashboard/super-admin/secrets
/dashboard/super-admin/system
/dashboard/super-admin/audit-logs
/dashboard/admin/users
/dashboard/admin/designers
/dashboard/admin/customers
/dashboard/admin/corporate-clients
/dashboard/admin/product-types
/dashboard/admin/base-products
/dashboard/admin/mockup-templates
/dashboard/admin/print-areas
/dashboard/admin/pipeline-config
/dashboard/admin/pod
/dashboard/admin/listings
/dashboard/admin/media-library
/dashboard/admin/branding
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

## Super Admin legacy overview
```text
/dashboard/super-admin
```

## Page Rules
- Public storefront: playful, product-first, soft, brand-heavy.
- Dashboards: calm, operational, structured.
- Use same UI tokens across apps.
- Use Framer Motion only where it improves UX.
- Mockup generation is moderator-driven after design approval; designers do not use Mockup Studio.
- Pipeline-generated listings are edited and published by moderators until published.
