# Printful Integration Runbook

This runbook covers the production path from moderator catalog selection through connected-store publishing, RashPOD checkout, live shipping, Printful order submission, and signed status webhooks.

## 1. Create and scope the Printful token

1. Create an account-level Printful private token with catalog, stores, products/templates, files, orders, and webhooks access.
2. Connect every intended store in Printful first.
3. Store the token in Secret Manager and inject it into both `rashpod-api` and `rashpod-worker` as `PRINTFUL_API_TOKEN`.
4. Set `PRINTFUL_ENABLED=true` and `FEATURE_GLOBAL_POD=true` in both services.
5. Set `PRINTFUL_STORE_ID` to the native/manual Printful store RashPOD uses for orders placed in the RashPOD storefront. Moderators can still publish to multiple connected stores.

Do not put a real token in `.env`, source control, build arguments, logs, or dashboard settings.

### Store publishing capability

Printful's Products API can create and update products only in native/custom Printful stores. It does not create the upstream product in Shopify, WooCommerce, Etsy, or other ecommerce platforms.

- Stores whose Printful API `type` is `native` (the Manual orders/API store) are available for direct moderator publishing.
- External-platform stores remain visible but disabled in the wizard with `EXTERNAL_PLATFORM_CONNECTOR_REQUIRED`.
- To enable one of those stores, implement that platform's product-creation API, wait for/import the product into Printful, then attach files and catalog variants with Printful's Ecommerce Platform Sync API.
- Do not route an external-platform store through `/store/products`; Printful explicitly does not support that workflow.

## 2. Apply the database migrations

Run the normal production migration deployment before rolling out API, dashboard, storefront, or worker revisions:

```bash
npx prisma migrate deploy --schema apps/rashpod-api/prisma/schema.prisma
```

The Printful integration migrations add independently tracked store publications and structured fulfillment address fields.

## 3. Configure the signed webhook

1. Deploy the API at its final HTTPS origin.
2. Configure Printful v2 webhooks with `https://<api-origin>/webhooks/printful` as `default_url`.
3. Enable at least order created/updated/failed/hold/remove-hold, shipment sent/returned, and delivery events supported by the connected Printful account.
4. Printful returns `public_key` and `secret_key`. For one configuration, store the hexadecimal `secret_key` as `PRINTFUL_WEBHOOK_SECRET`. For multiple stores/configurations, store a JSON object mapping each `public_key` to its hexadecimal `secret_key` as `PRINTFUL_WEBHOOK_SECRETS_JSON`.
5. Restart the API revision after injecting the secret.
6. Use Printful's webhook simulator and confirm the endpoint returns 2xx. Invalid or unsigned payloads must return 403.

The endpoint verifies the raw request body with HMAC-SHA256 and the `x-pf-webhook-signature` header. Do not proxy or middleware-transform the body before verification.

## 4. Verify moderator publishing

1. Sign in as moderator and open an approved product listing using the `GLOBAL_PRINTFUL` pipeline.
2. In **Printful publishing**, choose a live category and product.
3. Select only intended in-stock size/color variants, technique, placement, and retail price.
4. Select one or more enabled native/custom stores. A disabled store requires its ecommerce-platform connector before it can be selected.
5. Review and confirm. AI or automation never bypasses the moderator confirmation.
6. Watch each store status progress from `QUEUED` to `PUBLISHING` to `PUBLISHED`.
7. Confirm a Printful sync-product ID appears for every store.
8. Open each connected store and verify title, variants, price, print placement, design file, and mockups.

If one store fails, the other store publications remain independently tracked. Fix the reported error and use **Retry safely** on that store. RashPOD reuses a deterministic external product ID, looks up an existing product, and updates it when present instead of creating a duplicate.

## 5. Verify storefront variants and shipping

1. Open the published RashPOD product page.
2. Confirm only moderator-selected Printful colors and sizes appear.
3. Add two distinct variants to the cart and verify the cart preserves each size/color combination.
4. At checkout, enter address line 1, city, ISO alpha-2 country code, and postal code. State/region is required for destinations where Printful requires it.
5. Continue to shipping and confirm a live **Printful delivery** quote appears.
6. Confirm the server recalculates the live quote while creating the order; the client-displayed fee is never trusted.

## 6. Verify paid-order fulfillment

Use a dedicated Printful test/native store and a controlled payment test:

1. Complete Click payment for the RashPOD order.
2. Confirm RashPOD creates `GLOBAL_POD_PROVIDER` production jobs grouped by Printful store.
3. Confirm the worker creates one confirmed Printful order per store using the exact sync-variant IDs.
4. Confirm `providerOrderId` and `providerStatus` are recorded on the production jobs.
5. Retry the worker job and verify it does not create a duplicate Printful order.
6. Trigger shipped/delivered events in the simulator and verify tracking, production-job status, and RashPOD order status update.

Automatic confirmation charges the Printful account. Keep billing configured and use a test store/product during validation.

## 7. Production rollout order

1. Database migrations.
2. API with token and webhook secret.
3. Worker with the same token and default store ID.
4. Moderator dashboard.
5. Storefront.
6. Configure or refresh Printful webhook settings against the deployed API.
7. Run one controlled low-value end-to-end order.
8. Monitor failed `PUBLISH_MARKETPLACE_LISTING` and `SUBMIT_PRINTFUL_ORDER` jobs, webhook 403/5xx rates, and provider statuses.

## 8. Rollback and incident handling

- Disable new Printful work with `PRINTFUL_ENABLED=false` and roll the API/worker revisions.
- Do not delete publication or provider-order records; they are the reconciliation trail.
- Cancel a Printful order only while its provider status permits cancellation.
- Rotate the API token or webhook secret immediately if either is exposed.
- A product-sales approval never grants film-sale rights; Printful publishing must not change film consent fields.
