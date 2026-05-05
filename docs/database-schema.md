# RashPOD Database Schema Plan

## Principles
- PostgreSQL with UUID primary keys.
- Explicit enums for statuses.
- Audit business-critical changes.
- Do not hardcode commercial logic.
- Keep design rights separate from moderation.
- Use shared `CommerceListing` for products and films.

## Enums
```text
UserRole: SUPER_ADMIN, ADMIN, OPERATIONS_MANAGER, MODERATOR, PRODUCTION_STAFF, FINANCE_STAFF, SUPPORT_STAFF, DESIGNER, CUSTOMER, CORPORATE_CLIENT
DesignStatus: DRAFT, SUBMITTED, NEEDS_FIX, APPROVED, REJECTED, SUSPENDED, READY_FOR_MOCKUP, READY_TO_PUBLISH, PUBLISHED
ListingType: PRODUCT, FILM
ListingStatus: DRAFT, READY_FOR_REVIEW, PUBLISHED, ARCHIVED, REJECTED, SUSPENDED
FilmMethod: DTF, UV_DTF
OrderStatus: PENDING_PAYMENT, PAID, IN_PRODUCTION, READY_FOR_PICKUP, SHIPPED, DELIVERED, CANCELLED, REFUNDED
PaymentStatus: PENDING, PAID, FAILED, CANCELLED, REFUNDED, PARTIALLY_REFUNDED
ProductionJobStatus: ORDERED, FILE_CHECK, READY_FOR_PRINT, PRINTING, QC, PACKING, READY_FOR_PICKUP, DELIVERED
RoyaltyBasis: SALE_PRICE_PERCENT, NET_PROFIT_PERCENT, FIXED_AMOUNT
GeneratedAssetStatus: PENDING, PROCESSING, READY, FAILED
DeliveryProviderType: YANDEX_DELIVERY, UZPOST, PICKUP, MANUAL
```

## Core Entities
```text
User(id, email, phone, passwordHash, displayName, role, status, createdAt, updatedAt)
Role(id, name, description)
Permission(id, key, description)
RolePermission(roleId, permissionId)
DesignerProfile(id, userId, handle, displayName, bio, avatarFileId, payoutStatus, defaultRoyaltyRuleId)
CustomerProfile(id, userId)
CorporateProfile(id, userId, companyName, taxId, contactPerson, phone, email, billingAddress)
```

## Design Entities
```text
DesignAsset(id, designerId, title, description, status, currentVersionId, createdAt, updatedAt)
DesignVersion(id, designAssetId, versionNumber, fileId, previewFileId, widthPx, heightPx, dpi, hasTransparency, fileType, fileSizeBytes, checksum, createdAt)
DesignModerationCase(id, designAssetId, designVersionId, status, reviewerId, decision, reason, notes, createdAt, reviewedAt)
CommercialRights(id, designAssetId, designVersionId, allowProductSales, allowMarketplacePublishing, allowFilmSales, allowCorporateBidding, filmConsentGrantedAt, filmConsentRevokedAt, filmConsentVersionId, filmRoyaltyRate, createdAt, updatedAt)
```

## Product and Mockup Entities
```text
ProductType(id, name, slug, category, isActive, availableForDesigners, availableInShop, availableForCorporate, availableForMarketplace, requiresMockup, supportsFilmSale, defaultProductionMethod, baseCost, defaultMargin, metadataJson)
BaseProduct(id, productTypeId, name, skuPrefix, description, isActive, baseCost, defaultPrice, availableColorsJson, availableSizesJson)
ProductVariant(id, baseProductId, sku, color, size, material, baseCost, price, isActive)
MockupTemplate(id, baseProductId, name, templateType, baseImageFileId, lifestyleImageFileId, closeupImageFileId, isActive, sortOrder)
PrintArea(id, mockupTemplateId, name, x, y, width, height, safeX, safeY, safeWidth, safeHeight, allowMove, allowResize, allowRotate, minScale, maxScale, maxPrintWidthMm, maxPrintHeightMm)
DesignPlacement(id, designAssetId, designVersionId, mockupTemplateId, printAreaId, x, y, scale, rotation, width, height, approvedByDesigner, approvedAt)
GeneratedAsset(id, sourceDesignPlacementId, type, status, fileId, widthPx, heightPx, errorMessage)
```

## Commerce Entities
```text
CommerceListing(id, type, designerId, designAssetId, designVersionId, title, description, slug, status, price, currency, royaltyRuleId, seoTitle, seoDescription, tagsJson, imagesJson, metadataJson, publishedAt)
ProductListingDetails(id, commerceListingId, productTypeId, baseProductId, variantIdsJson, mockupTemplateIdsJson, productionMethod)
FilmListingDetails(id, commerceListingId, filmMethod, minWidthMm, minHeightMm, maxWidthMm, maxHeightMm, priceRuleId, productionFileId)
```

## Order, Payment, Delivery
```text
Order(id, customerId, status, subtotal, deliveryFee, discountTotal, total, currency, paymentStatus, deliveryMethod, deliveryAddressJson)
OrderItem(id, orderId, commerceListingId, type, quantity, unitPrice, totalPrice, variantJson, filmSpecJson)
PaymentTransaction(id, orderId, provider, providerTransactionId, status, amount, currency, rawPayloadJson)
DeliveryProvider(id, type, name, isActive, configJson)
DeliveryQuote(id, orderId, providerId, amount, currency, estimatedDeliveryTime, rawPayloadJson)
Shipment(id, orderId, providerId, trackingNumber, status, rawPayloadJson)
```

## Production and Finance
```text
ProductionJob(id, orderId, orderItemId, jobType, status, priority, productionMethod, quantity, fileIdsJson, specJson, assignedToUserId, dueAt)
ProductionJobStatusLog(id, productionJobId, fromStatus, toStatus, changedByUserId, note)
RoyaltyRule(id, name, scope, basis, value, productTypeId, designerId, channel, isActive, effectiveFrom, effectiveTo)
RoyaltyLedger(id, designerId, orderId, orderItemId, commerceListingId, royaltyRuleId, basis, grossAmount, netProfitAmount, royaltyAmount, currency, status)
Payout(id, designerId, amount, currency, status, method, reference, paidAt)
```

## Corporate
```text
CorporateRequest(id, corporateProfileId, status, title, description, productTypesJson, quantity, deadline, budget, attachmentsJson, deliveryAddressJson)
DesignerBid(id, corporateRequestId, designerId, status, proposedDesignFileIdsJson, designFee, timelineDays, notes)
CommercialOffer(id, corporateRequestId, selectedBidId, status, title, subtotal, discount, deliveryFee, total, currency, pdfFileId, sentAt, acceptedAt)
CommercialOfferLineItem(id, commercialOfferId, label, description, quantity, unitPrice, total, sortOrder)
```

## Files, Notifications, Audit
```text
FileAsset(id, bucket, path, publicUrl, signedUrlExpiresAt, mimeType, sizeBytes, checksum, visibility, createdByUserId)
EmailTemplate(id, key, subject, bodyHtml, bodyText, locale, isActive)
NotificationLog(id, userId, channel, templateKey, status, providerMessageId, errorMessage, payloadJson)
AuditLog(id, actorUserId, action, entityType, entityId, beforeJson, afterJson, ipAddress, userAgent)
```

## Indexes
Add indexes for user email, designer handle, design status/designer, listing type/status/slug, order customer/status, production status/due date, royalty designer, corporate status, and audit entity.
