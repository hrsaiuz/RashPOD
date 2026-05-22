import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  ExternalOrderDuplicateStatus,
  ExternalOrderImportStatus,
  ExternalOrderIntakeStatus,
  ExternalOrderItemMappingStatus,
  ExternalOrderPaymentStatus,
  ExternalOrderSourceType,
  ListingStatus,
  OrderFulfillmentRoute,
  OrderStatus,
  PaymentReconciliationStatus,
  PaymentStatus,
  PodSyncRecordStatus,
  Prisma,
} from "@prisma/client";
import ExcelJS from "exceljs";
import { createHash, randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { FinanceService } from "../finance/finance.service";
import { OrdersService } from "../orders/orders.service";

type JsonRecord = Record<string, unknown>;

@Injectable()
export class ExternalSalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly finance: FinanceService,
    private readonly orders: OrdersService,
  ) {}

  async overview() {
    const [intakes, imports, duplicateCount, externalOrders] = await Promise.all([
      this.prisma.externalOrderIntake.findMany({ select: { status: true, sourceType: true, paymentStatus: true, duplicateStatus: true, totalAmount: true, currency: true } }),
      this.prisma.externalOrderImport.findMany({ select: { status: true } }),
      this.prisma.externalOrderDuplicateCandidate.count({ where: { duplicateStatus: ExternalOrderDuplicateStatus.POSSIBLE_DUPLICATE } }),
      this.prisma.order.count({ where: { source: "EXTERNAL" } }),
    ]);
    const by = (field: "status" | "sourceType" | "paymentStatus" | "duplicateStatus") => intakes.reduce<Record<string, number>>((acc, row) => {
      const key = String(row[field]);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const revenueBySource = intakes.reduce<Record<string, number>>((acc, row) => {
      if (row.status === ExternalOrderIntakeStatus.CANCELED || row.status === ExternalOrderIntakeStatus.DUPLICATE) return acc;
      acc[row.sourceType] = (acc[row.sourceType] ?? 0) + Number(row.totalAmount);
      return acc;
    }, {});
    return {
      kpis: {
        total: intakes.length,
        newIntakes: intakes.filter((row) => row.status === ExternalOrderIntakeStatus.DRAFT).length,
        needsReview: intakes.filter((row) => row.status === ExternalOrderIntakeStatus.NEEDS_REVIEW).length,
        readyToConvert: intakes.filter((row) => row.status === ExternalOrderIntakeStatus.READY_TO_CONVERT).length,
        convertedOrders: externalOrders,
        duplicates: duplicateCount,
        failedImports: imports.filter((row) => row.status === ExternalOrderImportStatus.FAILED).length,
      },
      byStatus: by("status"),
      bySource: by("sourceType"),
      byPaymentStatus: by("paymentStatus"),
      byDuplicateStatus: by("duplicateStatus"),
      revenueBySource,
      currency: intakes[0]?.currency ?? "UZS",
    };
  }

  listIntakes(filters: { status?: string; sourceType?: string }) {
    return this.prisma.externalOrderIntake.findMany({
      where: {
        ...(filters.status ? { status: filters.status as ExternalOrderIntakeStatus } : {}),
        ...(filters.sourceType ? { sourceType: filters.sourceType as ExternalOrderSourceType } : {}),
      },
      include: { marketplaceConfig: true, items: true, duplicateCandidates: true, internalOrder: { include: { payments: true, productionJobs: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
  }

  async getIntake(id: string) {
    const intake = await this.prisma.externalOrderIntake.findUnique({
      where: { id },
      include: {
        marketplaceConfig: true,
        import: true,
        items: { include: { listing: true, exportedListing: true, providerSyncRecord: true } },
        duplicateCandidates: { include: { matchedIntake: true }, orderBy: { createdAt: "desc" } },
        duplicateMatches: true,
        internalOrder: { include: { items: true, payments: true, productionJobs: true, financeSnapshots: true, royaltyLedgerEntries: true } },
      },
    });
    if (!intake) throw new NotFoundException("External order intake not found");
    return intake;
  }

  async createIntake(actorId: string, input: Record<string, unknown>) {
    const sourceType = this.enumValue(ExternalOrderSourceType, input.sourceType, "Source type") ?? ExternalOrderSourceType.MARKETPLACE_MANUAL;
    const paymentStatus = this.enumValue(ExternalOrderPaymentStatus, input.paymentStatus, "Payment status") ?? ExternalOrderPaymentStatus.MANUAL_REVIEW;
    const marketplaceConfigId = this.optionalString(input.marketplaceId ?? input.marketplaceConfigId);
    const items = this.arrayOfRecords(input.items, "Items");
    if (!items.length) throw new BadRequestException("At least one external order item is required");
    const customerName = this.requiredString(input.customerName, "Customer name");
    const customerPhone = this.requiredString(input.customerPhone, "Customer phone");
    const currency = this.optionalString(input.currency) ?? "UZS";
    const preparedItems = [];
    for (const item of items) preparedItems.push(await this.prepareItem(item, marketplaceConfigId, currency));
    const totalAmount = this.numberFrom(input.totalAmount) ?? preparedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const rawPayload = this.objectJson(input.rawPayloadJson ?? input.rawPayload ?? input);
    const intake = await this.prisma.externalOrderIntake.create({
      data: {
        sourceType,
        marketplaceConfigId,
        importId: this.optionalString(input.importId),
        externalOrderId: this.optionalString(input.externalOrderId),
        externalOrderUrl: this.optionalString(input.externalOrderUrl),
        customerName,
        customerPhone,
        customerEmail: this.optionalString(input.customerEmail),
        deliveryMethod: this.optionalString(input.deliveryMethod ?? input.deliveryType),
        deliveryAddress: this.optionalString(input.deliveryAddress),
        pickupLocation: this.optionalString(input.pickupLocation),
        paymentStatus,
        currency,
        totalAmount: this.decimal(totalAmount),
        notes: this.optionalString(input.notes),
        rawPayloadJson: this.json(rawPayload),
        rawPayloadHash: this.hashJson(rawPayload),
        createdById: actorId,
        items: { create: preparedItems.map((item) => this.itemCreateData(item, marketplaceConfigId) as any) },
      },
    });
    await this.audit.log({ actorId, action: "external_sale.created", entityType: "ExternalOrderIntake", entityId: intake.id, metadata: { sourceType, marketplaceConfigId, externalOrderId: intake.externalOrderId, amount: totalAmount, currency } });
    await this.detectDuplicates(actorId, intake.id);
    return this.validateIntake(actorId, intake.id, { silent: true });
  }

  async updateIntake(actorId: string, id: string, input: Record<string, unknown>) {
    const intake = await this.getIntake(id);
    if (intake.status === ExternalOrderIntakeStatus.CONVERTED_TO_ORDER) throw new BadRequestException("Converted external orders cannot be edited");
    const data: Prisma.ExternalOrderIntakeUpdateInput = {};
    if (input.customerName !== undefined) data.customerName = this.requiredString(input.customerName, "Customer name");
    if (input.customerPhone !== undefined) data.customerPhone = this.requiredString(input.customerPhone, "Customer phone");
    if (input.customerEmail !== undefined) data.customerEmail = this.optionalString(input.customerEmail);
    if (input.externalOrderId !== undefined) data.externalOrderId = this.optionalString(input.externalOrderId);
    if (input.externalOrderUrl !== undefined) data.externalOrderUrl = this.optionalString(input.externalOrderUrl);
    if (input.deliveryMethod !== undefined) data.deliveryMethod = this.optionalString(input.deliveryMethod);
    if (input.deliveryAddress !== undefined) data.deliveryAddress = this.optionalString(input.deliveryAddress);
    if (input.pickupLocation !== undefined) data.pickupLocation = this.optionalString(input.pickupLocation);
    if (input.paymentStatus !== undefined) data.paymentStatus = this.enumValue(ExternalOrderPaymentStatus, input.paymentStatus, "Payment status")!;
    if (input.currency !== undefined) data.currency = this.requiredString(input.currency, "Currency");
    if (input.totalAmount !== undefined) data.totalAmount = this.decimal(this.requiredNumber(input.totalAmount, "Total amount"));
    if (input.notes !== undefined) data.notes = this.optionalString(input.notes);
    const updated = await this.prisma.externalOrderIntake.update({ where: { id }, data, include: { items: true, duplicateCandidates: true } });
    await this.audit.log({ actorId, action: "external_sale.updated", entityType: "ExternalOrderIntake", entityId: id, metadata: { changed: Object.keys(input) } });
    await this.detectDuplicates(actorId, id);
    return updated;
  }

  async validateIntake(actorId: string, id: string, input: Record<string, unknown> = {}) {
    const intake = await this.getIntake(id);
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!intake.customerName.trim()) errors.push("CUSTOMER_NAME_REQUIRED");
    if (!intake.customerPhone.trim()) errors.push("CUSTOMER_PHONE_REQUIRED");
    if (!intake.items.length) errors.push("ITEM_REQUIRED");
    for (const item of intake.items) {
      if (!this.mappingReady(item.mappingStatus)) errors.push(`ITEM_${item.id}_NEEDS_MAPPING`);
      if (item.quantity <= 0) errors.push(`ITEM_${item.id}_QUANTITY_INVALID`);
      if (Number(item.unitPrice) < 0) errors.push(`ITEM_${item.id}_UNIT_PRICE_INVALID`);
      if (!this.objectJson(item.matchedSnapshotJson).productionReady) warnings.push(`ITEM_${item.id}_PRODUCTION_REVIEW`);
    }
    if (intake.duplicateStatus === ExternalOrderDuplicateStatus.CONFIRMED_DUPLICATE) errors.push("CONFIRMED_DUPLICATE");
    if (intake.duplicateStatus === ExternalOrderDuplicateStatus.POSSIBLE_DUPLICATE) errors.push("POSSIBLE_DUPLICATE_REQUIRES_REVIEW");
    const status = errors.length ? ExternalOrderIntakeStatus.NEEDS_REVIEW : ExternalOrderIntakeStatus.READY_TO_CONVERT;
    const preview = {
      canConvert: errors.length === 0,
      order: { source: "EXTERNAL", sourceType: intake.sourceType, total: Number(intake.totalAmount), currency: intake.currency, items: intake.items.length },
      production: { willHandoff: intake.paymentStatus === ExternalOrderPaymentStatus.PAID_EXTERNALLY, warnings },
      finance: { channel: intake.sourceType, grossRevenue: Number(intake.totalAmount), royaltyItems: intake.items.filter((item) => this.objectJson(item.matchedSnapshotJson).designerId).length },
    };
    const updated = await this.prisma.externalOrderIntake.update({ where: { id }, data: { status, validationErrorsJson: this.json(errors), validationWarningsJson: this.json(warnings), conversionPreviewJson: this.json(preview) }, include: { items: true, duplicateCandidates: true, internalOrder: true } });
    await this.audit.log({ actorId, action: errors.length ? "external_sale.validation_failed" : "external_sale.validated", entityType: "ExternalOrderIntake", entityId: id, metadata: { errors, warnings, silent: Boolean(input.silent) } });
    return updated;
  }

  async mappingSuggestions(input: { sku?: string; externalListingId?: string; exportedListingId?: string }) {
    const or: Prisma.ExportedListingWhereInput[] = [];
    if (input.exportedListingId) or.push({ id: input.exportedListingId });
    if (input.sku) or.push({ exportSku: input.sku });
    if (input.externalListingId) or.push({ externalListingId: input.externalListingId });
    const exportedListings = or.length ? await this.prisma.exportedListing.findMany({ where: { OR: or }, include: { marketplaceConfig: true, listing: true }, take: 10 }) : [];
    const listing = input.sku ? await this.prisma.commerceListing.findFirst({ where: { OR: [{ id: input.sku }, { slug: input.sku }] } }) : null;
    return { exportedListings, listings: listing ? [listing] : [] };
  }

  async mapItem(actorId: string, intakeId: string, itemId: string, input: Record<string, unknown>) {
    const current = await this.ensureIntakeItem(intakeId, itemId);
    const prepared = await this.prepareItem({ ...this.objectJson(current.rawItemJson), ...input }, this.optionalString(input.marketplaceConfigId) ?? current.marketplaceConfigId, current.currency);
    if (!prepared.listingId) throw new BadRequestException("Mapping target was not found");
    const item = await this.prisma.externalOrderIntakeItem.update({
      where: { id: itemId },
      data: {
        externalSku: prepared.externalSku,
        externalListingId: prepared.externalListingId,
        externalListingUrl: prepared.externalListingUrl,
        exportedListingId: prepared.exportedListingId,
        listingId: prepared.listingId,
        baseProductId: prepared.baseProductId,
        productTypeId: prepared.productTypeId,
        designId: prepared.designId,
        designVersionId: prepared.designVersionId,
        providerSyncRecordId: prepared.providerSyncRecordId,
        mappingStatus: ExternalOrderItemMappingStatus.MAPPED,
        validationErrorsJson: this.json([]),
        validationWarningsJson: this.json(prepared.warnings),
        matchedSnapshotJson: this.json(prepared.matchedSnapshot ?? null),
      },
    });
    await this.audit.log({ actorId, action: "external_sale.item_mapped", entityType: "ExternalOrderIntakeItem", entityId: item.id, metadata: { intakeId, listingId: item.listingId, exportedListingId: item.exportedListingId, reason: this.optionalString(input.reason) ?? null } });
    await this.validateIntake(actorId, intakeId, { silent: true });
    return item;
  }

  async unmapItem(actorId: string, intakeId: string, itemId: string) {
    await this.ensureIntakeItem(intakeId, itemId);
    const item = await this.prisma.externalOrderIntakeItem.update({ where: { id: itemId }, data: { exportedListingId: null, listingId: null, baseProductId: null, productTypeId: null, designId: null, designVersionId: null, providerSyncRecordId: null, mappingStatus: ExternalOrderItemMappingStatus.NEEDS_MAPPING, matchedSnapshotJson: Prisma.JsonNull } });
    await this.audit.log({ actorId, action: "external_sale.item_unmapped", entityType: "ExternalOrderIntakeItem", entityId: item.id, metadata: { intakeId } });
    await this.validateIntake(actorId, intakeId, { silent: true });
    return item;
  }

  listDuplicates() {
    return this.prisma.externalOrderDuplicateCandidate.findMany({ where: { duplicateStatus: { in: [ExternalOrderDuplicateStatus.POSSIBLE_DUPLICATE, ExternalOrderDuplicateStatus.CONFIRMED_DUPLICATE] } }, include: { intake: true, matchedIntake: true }, orderBy: { createdAt: "desc" }, take: 200 });
  }

  async markDuplicate(actorId: string, id: string, input: Record<string, unknown>) {
    const reason = this.requiredString(input.reason, "Reason");
    const updated = await this.prisma.externalOrderIntake.update({ where: { id }, data: { duplicateStatus: ExternalOrderDuplicateStatus.CONFIRMED_DUPLICATE, status: ExternalOrderIntakeStatus.DUPLICATE } });
    await this.prisma.externalOrderDuplicateCandidate.updateMany({ where: { intakeId: id }, data: { duplicateStatus: ExternalOrderDuplicateStatus.CONFIRMED_DUPLICATE, resolutionReason: reason, resolvedById: actorId, resolvedAt: new Date() } });
    await this.audit.log({ actorId, action: "external_sale.marked_duplicate", entityType: "ExternalOrderIntake", entityId: id, metadata: { reason } });
    return updated;
  }

  async markNotDuplicate(actorId: string, id: string, input: Record<string, unknown>) {
    const reason = this.requiredString(input.reason, "Reason");
    await this.prisma.externalOrderDuplicateCandidate.updateMany({ where: { intakeId: id }, data: { duplicateStatus: ExternalOrderDuplicateStatus.DUPLICATE_IGNORED, resolutionReason: reason, resolvedById: actorId, resolvedAt: new Date() } });
    await this.prisma.externalOrderIntake.update({ where: { id }, data: { duplicateStatus: ExternalOrderDuplicateStatus.DUPLICATE_IGNORED, status: ExternalOrderIntakeStatus.DRAFT } });
    await this.audit.log({ actorId, action: "external_sale.marked_not_duplicate", entityType: "ExternalOrderIntake", entityId: id, metadata: { reason } });
    return this.validateIntake(actorId, id, { silent: true });
  }

  async convertToOrder(actorId: string, id: string, input: Record<string, unknown> = {}) {
    const intake = await this.getIntake(id);
    if (intake.internalOrderId) return intake.internalOrder;
    if (intake.status === ExternalOrderIntakeStatus.CANCELED || intake.status === ExternalOrderIntakeStatus.DUPLICATE || intake.status === ExternalOrderIntakeStatus.FAILED) throw new BadRequestException("External order cannot be converted in its current state");
    if (intake.duplicateStatus === ExternalOrderDuplicateStatus.CONFIRMED_DUPLICATE || intake.duplicateStatus === ExternalOrderDuplicateStatus.POSSIBLE_DUPLICATE) throw new BadRequestException("Resolve duplicate review before conversion");
    const validated = await this.validateIntake(actorId, id, { silent: true });
    if (validated.status !== ExternalOrderIntakeStatus.READY_TO_CONVERT && !this.booleanValue(input.overrideValidation, false)) throw new BadRequestException("External order is not ready to convert");
    const fresh = await this.getIntake(id);
    if (fresh.items.some((item) => !this.mappingReady(item.mappingStatus) || !item.listingId)) throw new BadRequestException("All items must be mapped before conversion");
    if (fresh.items.some((item) => !this.objectJson(item.matchedSnapshotJson).productionReady) && !this.booleanValue(input.overrideValidation, false)) throw new BadRequestException("Production readiness review is required before conversion");

    const order = await this.prisma.$transaction(async (tx) => {
      const customer = await this.ensureExternalCustomer(tx, fresh);
      const createdOrder = await tx.order.create({
        data: {
          customerId: customer.id,
          customerName: fresh.customerName,
          customerPhone: fresh.customerPhone,
          customerEmail: fresh.customerEmail,
          deliveryAddress: fresh.deliveryAddress,
          pickupLocation: fresh.pickupLocation,
          customerNote: fresh.notes,
          subtotal: fresh.totalAmount,
          deliveryFee: this.decimal(0),
          discountTotal: this.decimal(0),
          total: fresh.totalAmount,
          currency: fresh.currency,
          deliveryType: fresh.deliveryMethod,
          notes: `External order ${fresh.externalOrderId ?? fresh.id}`,
          source: "EXTERNAL",
          channel: fresh.sourceType,
          externalSourceType: fresh.sourceType,
          externalOrderId: fresh.externalOrderId,
          externalSourceSnapshotJson: this.json({ intakeId: fresh.id, importId: fresh.importId, marketplaceConfigId: fresh.marketplaceConfigId, externalOrderUrl: fresh.externalOrderUrl, rawPayloadHash: fresh.rawPayloadHash }),
          status: OrderStatus.PENDING_PAYMENT,
          pricingSnapshotJson: this.json({ source: "EXTERNAL", total: Number(fresh.totalAmount), currency: fresh.currency }),
          deliverySnapshotJson: this.json({ method: fresh.deliveryMethod, address: fresh.deliveryAddress, pickupLocation: fresh.pickupLocation }),
          paymentSnapshotJson: this.json({ externalPaymentStatus: fresh.paymentStatus }),
        },
      });
      for (const item of fresh.items) {
        const snapshot = this.objectJson(item.matchedSnapshotJson);
        await tx.orderItem.create({ data: this.orderItemCreateData(createdOrder.id, fresh, item, snapshot) });
      }
      const paymentStatus = fresh.paymentStatus === ExternalOrderPaymentStatus.PAID_EXTERNALLY ? PaymentStatus.PAID : PaymentStatus.PENDING;
      const payment = await tx.paymentTransaction.create({ data: { orderId: createdOrder.id, provider: this.paymentProviderFor(fresh.paymentStatus), providerRef: fresh.externalOrderId ?? fresh.id, amount: fresh.totalAmount, currency: fresh.currency, status: paymentStatus, idempotencyKey: `external:${fresh.id}`, rawPayloadJson: this.json({ intakeId: fresh.id, sourceType: fresh.sourceType, externalPaymentStatus: fresh.paymentStatus }), settingsSnapshotJson: this.json({ externalPayment: true }) } });
      await tx.paymentReconciliation.create({ data: { paymentTransactionId: payment.id, orderId: createdOrder.id, provider: payment.provider, providerTransactionId: payment.providerRef, expectedAmount: payment.amount, receivedAmount: paymentStatus === PaymentStatus.PAID ? payment.amount : null, currency: payment.currency, providerStatus: fresh.paymentStatus, internalStatus: payment.status, discrepancyAmount: this.decimal(0), status: paymentStatus === PaymentStatus.PAID ? PaymentReconciliationStatus.MATCHED : PaymentReconciliationStatus.UNRECONCILED, reconciledAt: paymentStatus === PaymentStatus.PAID ? new Date() : null, rawPayloadJson: this.json({ intakeId: fresh.id }) } });
      await tx.externalOrderIntake.update({ where: { id: fresh.id }, data: { internalOrderId: createdOrder.id, status: ExternalOrderIntakeStatus.CONVERTED_TO_ORDER, convertedAt: new Date() } });
      return createdOrder;
    });

    if (fresh.paymentStatus === ExternalOrderPaymentStatus.PAID_EXTERNALLY) {
      await this.orders.confirmPaid(actorId, order.id, fresh.externalOrderId ?? fresh.id);
    } else if (fresh.paymentStatus === ExternalOrderPaymentStatus.CASH_ON_DELIVERY && this.booleanValue(input.acceptForProduction, false)) {
      await this.prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAID, paymentSnapshotJson: this.json({ externalPaymentStatus: fresh.paymentStatus, cashCollectionPending: true }) } });
      await this.finance.createOrderFinance(order.id, undefined, actorId);
      await this.orders.createProductionJobsForPaidOrder(actorId, order.id);
    }
    await this.audit.log({ actorId, action: "external_sale.converted_to_order", entityType: "ExternalOrderIntake", entityId: id, metadata: { internalOrderId: order.id, sourceType: fresh.sourceType, externalOrderId: fresh.externalOrderId, amount: Number(fresh.totalAmount), currency: fresh.currency } });
    return this.getIntake(id);
  }

  async cancelIntake(actorId: string, id: string, input: Record<string, unknown>) {
    const intake = await this.getIntake(id);
    if (intake.internalOrderId) throw new BadRequestException("Converted external orders must be canceled from the internal order workflow");
    const updated = await this.prisma.externalOrderIntake.update({ where: { id }, data: { status: ExternalOrderIntakeStatus.CANCELED, canceledAt: new Date(), notes: this.optionalString(input.reason) ?? intake.notes } });
    await this.audit.log({ actorId, action: "external_sale.canceled", entityType: "ExternalOrderIntake", entityId: id, metadata: { reason: this.optionalString(input.reason) ?? null } });
    return updated;
  }

  async markPaidExternally(actorId: string, id: string, input: Record<string, unknown>) {
    const intake = await this.prisma.externalOrderIntake.update({ where: { id }, data: { paymentStatus: ExternalOrderPaymentStatus.PAID_EXTERNALLY } });
    if (intake.internalOrderId) await this.orders.confirmPaid(actorId, intake.internalOrderId, this.optionalString(input.providerRef) ?? intake.externalOrderId ?? intake.id);
    await this.audit.log({ actorId, action: "external_sale.payment_marked_paid", entityType: "ExternalOrderIntake", entityId: id, metadata: { providerRef: this.optionalString(input.providerRef) ?? null } });
    return this.getIntake(id);
  }

  async markRefundedExternally(actorId: string, id: string, input: Record<string, unknown>) {
    const intake = await this.prisma.externalOrderIntake.update({ where: { id }, data: { paymentStatus: ExternalOrderPaymentStatus.REFUNDED_EXTERNALLY } });
    if (intake.internalOrderId) await this.finance.trackRefund(actorId, intake.internalOrderId, { amount: Number(intake.totalAmount), currency: intake.currency, reason: this.optionalString(input.reason) ?? "External refund" });
    await this.audit.log({ actorId, action: "external_sale.payment_marked_refunded", entityType: "ExternalOrderIntake", entityId: id, metadata: { reason: this.optionalString(input.reason) ?? null } });
    return this.getIntake(id);
  }

  async createImport(actorId: string, input: Record<string, unknown>) {
    const sourceType = this.enumValue(ExternalOrderSourceType, input.sourceType, "Source type") ?? ExternalOrderSourceType.MARKETPLACE_CSV_IMPORT;
    const row = await this.prisma.externalOrderImport.create({ data: { sourceType, marketplaceConfigId: this.optionalString(input.marketplaceId ?? input.marketplaceConfigId), fileAssetId: this.optionalString(input.fileAssetId), originalFilename: this.optionalString(input.originalFilename ?? input.filename), mimeType: this.optionalString(input.mimeType), strictMode: this.booleanValue(input.strictMode, false), notes: this.optionalString(input.notes), rawPayloadHash: this.hashJson(input), createdById: actorId } });
    await this.audit.log({ actorId, action: "external_sale.import_file_uploaded", entityType: "ExternalOrderImport", entityId: row.id, metadata: { sourceType, marketplaceConfigId: row.marketplaceConfigId, fileAssetId: row.fileAssetId } });
    return row;
  }

  async parseImport(actorId: string, importId: string, input: Record<string, unknown>) {
    const rows = await this.parseRows(input);
    const updated = await this.prisma.externalOrderImport.update({ where: { id: importId }, data: { status: ExternalOrderImportStatus.PARSED, parsedRowsJson: this.json(rows), rawPayloadHash: this.hashJson(rows) } });
    await this.audit.log({ actorId, action: "external_sale.import_parsed", entityType: "ExternalOrderImport", entityId: importId, metadata: { rows: rows.length } });
    return { import: updated, rows, expectedFields: ["externalOrderId", "externalListingId", "externalSku", "title", "quantity", "unitPrice", "totalAmount", "currency", "customerName", "customerPhone", "customerEmail", "deliveryAddress", "paymentStatus", "notes"] };
  }

  async mapImportColumns(actorId: string, importId: string, input: Record<string, unknown>) {
    const mapping = this.objectJson(input.columnMappingJson ?? input.mapping ?? input);
    const updated = await this.prisma.externalOrderImport.update({ where: { id: importId }, data: { status: ExternalOrderImportStatus.MAPPED, columnMappingJson: this.json(mapping) } });
    await this.audit.log({ actorId, action: "external_sale.import_columns_mapped", entityType: "ExternalOrderImport", entityId: importId, metadata: { fields: Object.keys(mapping) } });
    return updated;
  }

  async validateImport(actorId: string, importId: string, input: Record<string, unknown> = {}) {
    const row = await this.ensureImport(importId);
    const rows = this.importRowsFrom(row, input);
    const mapping = this.objectJson(input.columnMappingJson ?? row.columnMappingJson);
    const normalized = rows.map((raw, index) => this.normalizeImportRow(raw, mapping, index));
    const errors = normalized.flatMap((item) => item.errors.map((error) => ({ row: item.index, error })));
    const warnings = normalized.flatMap((item) => item.warnings.map((warning) => ({ row: item.index, warning })));
    const updated = await this.prisma.externalOrderImport.update({ where: { id: importId }, data: { status: ExternalOrderImportStatus.VALIDATED, validationErrorsJson: this.json(errors), validationWarningsJson: this.json(warnings), failedCount: errors.length } });
    await this.audit.log({ actorId, action: errors.length ? "external_sale.import_validation_failed" : "external_sale.import_validated", entityType: "ExternalOrderImport", entityId: importId, metadata: { errors: errors.length, warnings: warnings.length } });
    return { import: updated, rows: normalized, errors, warnings };
  }

  async importRows(actorId: string, importId: string, input: Record<string, unknown> = {}) {
    const importRow = await this.ensureImport(importId);
    const validation = await this.validateImport(actorId, importId, input);
    if ((this.booleanValue(input.strictMode, importRow.strictMode)) && validation.errors.length) throw new BadRequestException("Strict import blocked because at least one row is invalid");
    const created = [];
    const skipped = [];
    for (const row of validation.rows) {
      if (row.errors.length) {
        skipped.push({ row: row.index, errors: row.errors });
        continue;
      }
      const createdIntake = await this.createIntake(actorId, { ...row.input, importId, sourceType: importRow.sourceType, marketplaceConfigId: importRow.marketplaceConfigId, rawPayloadJson: row.raw, items: [row.item] });
      created.push(createdIntake);
    }
    const updated = await this.prisma.externalOrderImport.update({ where: { id: importId }, data: { status: ExternalOrderImportStatus.IMPORTED, importedCount: created.length, failedCount: skipped.length } });
    await this.audit.log({ actorId, action: "external_sale.import_rows_created", entityType: "ExternalOrderImport", entityId: importId, metadata: { created: created.length, skipped: skipped.length } });
    return { import: updated, created, skipped };
  }

  async getImport(importId: string) {
    const row = await this.prisma.externalOrderImport.findUnique({ where: { id: importId }, include: { fileAsset: true, marketplaceConfig: true, intakes: { include: { items: true } } } });
    if (!row) throw new NotFoundException("External order import not found");
    return row;
  }

  private async prepareItem(input: JsonRecord, marketplaceConfigId: string | undefined | null, fallbackCurrency: string) {
    const externalSku = this.optionalString(input.externalSku ?? input.sku ?? input.exportSku);
    const externalListingId = this.optionalString(input.externalListingId);
    const exportedListingId = this.optionalString(input.exportedListingId);
    const exportMatch = await this.findExportedListing({ externalSku, externalListingId, exportedListingId, marketplaceConfigId });
    const listingId = this.optionalString(input.listingId) ?? exportMatch?.listingId;
    const listing = listingId ? await this.listingForSnapshot(listingId) : null;
    const providerSyncRecord = listing?.podSyncRecords?.[0] ?? null;
    const quantity = Math.max(1, Math.trunc(this.numberFrom(input.quantity) ?? 1));
    const unitPrice = this.numberFrom(input.unitPrice ?? input.salePrice ?? input.price ?? exportMatch?.exportPrice ?? listing?.price) ?? 0;
    const warnings: string[] = [];
    const errors: string[] = [];
    if (!listing) errors.push(externalSku || externalListingId || exportedListingId ? "MATCH_NOT_FOUND" : "MAPPING_REQUIRED");
    if (listing && listing.status !== ListingStatus.PUBLISHED) warnings.push("LISTING_NOT_PUBLISHED");
    const matchedSnapshot = listing ? this.buildMatchedSnapshot(listing, exportMatch, providerSyncRecord, quantity) : null;
    const mappingStatus = listing ? ExternalOrderItemMappingStatus.AUTO_MAPPED : errors.includes("MATCH_NOT_FOUND") ? ExternalOrderItemMappingStatus.NOT_FOUND : ExternalOrderItemMappingStatus.NEEDS_MAPPING;
    return {
      externalSku,
      externalListingId,
      externalListingUrl: this.optionalString(input.externalListingUrl),
      exportedListingId: exportMatch?.id ?? exportedListingId,
      listingId: listing?.id,
      baseProductId: listing?.localBaseProductId ?? undefined,
      productTypeId: listing?.localBaseProduct?.productTypeId ?? undefined,
      designId: listing?.designAssetId,
      designVersionId: listing?.designAsset?.versions?.[0]?.id,
      providerSyncRecordId: providerSyncRecord?.id,
      title: this.optionalString(input.title ?? input.itemTitle ?? input.productTitle) ?? exportMatch?.exportTitle ?? listing?.title ?? externalSku ?? "External item",
      selectedSize: this.optionalString(input.size ?? input.selectedSize),
      selectedColor: this.optionalString(input.color ?? input.selectedColor),
      selectedMaterial: this.optionalString(input.material ?? input.selectedMaterial),
      selectedPrintSide: this.optionalString(input.printSide ?? input.selectedPrintSide),
      quantity,
      unitPrice,
      currency: this.optionalString(input.currency) ?? exportMatch?.currency ?? listing?.currency ?? fallbackCurrency,
      imageUrl: this.optionalString(input.imageUrl ?? input.previewUrl) ?? this.firstImageUrl(listing?.imagesJson),
      mappingStatus,
      warnings,
      errors,
      matchedSnapshot,
      rawItem: input,
    };
  }

  private itemCreateData(item: any, marketplaceConfigId?: string | null) {
    return { marketplaceConfigId, externalSku: item.externalSku, externalListingId: item.externalListingId, externalListingUrl: item.externalListingUrl, exportedListingId: item.exportedListingId, listingId: item.listingId, baseProductId: item.baseProductId, productTypeId: item.productTypeId, designId: item.designId, designVersionId: item.designVersionId, providerSyncRecordId: item.providerSyncRecordId, title: item.title, selectedSize: item.selectedSize, selectedColor: item.selectedColor, selectedMaterial: item.selectedMaterial, selectedPrintSide: item.selectedPrintSide, quantity: item.quantity, unitPrice: this.decimal(item.unitPrice), currency: item.currency, imageUrl: item.imageUrl, mappingStatus: item.mappingStatus, validationWarningsJson: this.json(item.warnings), validationErrorsJson: this.json(item.errors), matchedSnapshotJson: this.json(item.matchedSnapshot), rawItemJson: this.json(item.rawItem) };
  }

  private orderItemCreateData(orderId: string, intake: any, item: any, snapshot: JsonRecord): Prisma.OrderItemUncheckedCreateInput {
    return {
      orderId,
      listingId: item.listingId,
      listingTitle: item.title,
      designerId: this.stringFrom(snapshot.designerId),
      designAssetId: item.designId,
      designVersionId: item.designVersionId,
      productTypeId: item.productTypeId,
      productTypeName: this.stringFrom(snapshot.productTypeName),
      baseProductId: item.baseProductId,
      baseProductName: this.stringFrom(snapshot.baseProductName),
      baseProductSku: this.stringFrom(snapshot.baseProductSku),
      selectedSize: item.selectedSize,
      selectedColor: item.selectedColor,
      selectedMaterial: item.selectedMaterial,
      selectedPrintSide: item.selectedPrintSide,
      mockupAssetIds: this.json(snapshot.mockupAssetIds ?? []),
      mockupImageUrl: item.imageUrl ?? this.stringFrom(snapshot.mockupImageUrl),
      productionFileAssetId: this.stringFrom(snapshot.productionFileAssetId),
      placementSnapshotJson: this.json(snapshot.placementSnapshotJson ?? null),
      printAreaSnapshotJson: this.json(snapshot.printAreaSnapshotJson ?? null),
      royaltySnapshotJson: this.json(snapshot.royaltySnapshotJson ?? null),
      pricingSnapshotJson: this.json({ ...(this.objectJson(snapshot.pricingSnapshotJson)), externalSale: true, sourceType: intake.sourceType, exportSku: item.externalSku }),
      productionSnapshotJson: this.json(snapshot.productionSnapshotJson ?? null),
      fulfillmentRoute: item.providerSyncRecordId ? OrderFulfillmentRoute.GLOBAL_POD_PROVIDER : OrderFulfillmentRoute.LOCAL_PRODUCTION,
      providerSyncRecordId: item.providerSyncRecordId,
      providerType: this.stringFrom(snapshot.providerType) as any,
      providerProductId: this.stringFrom(snapshot.providerProductId),
      providerVariantId: this.stringFrom(snapshot.providerVariantId),
      providerFileId: this.stringFrom(snapshot.providerFileId),
      providerPlacementPayloadSnapshotJson: this.json(snapshot.providerPlacementPayloadSnapshotJson ?? null),
      providerFulfillmentSnapshotJson: this.json(snapshot.providerFulfillmentSnapshotJson ?? null),
      externalOrderIntakeItemId: item.id,
      externalSourceType: intake.sourceType,
      externalOrderId: intake.externalOrderId,
      externalSku: item.externalSku,
      externalListingId: item.externalListingId,
      externalChannelSnapshotJson: this.json({ marketplaceConfigId: item.marketplaceConfigId, exportedListingId: item.exportedListingId, externalListingUrl: item.externalListingUrl }),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: this.decimal(Number(item.unitPrice) * item.quantity),
      designerRoyaltyAmount: this.decimalOrNull(this.numberFrom(snapshot.designerRoyaltyAmount)),
      productionCostEstimate: this.decimalOrNull(this.numberFrom(snapshot.productionCostEstimate)),
      deliveryFeeAllocation: this.decimal(0),
      metadataJson: this.json({ externalOrderIntakeId: intake.id, externalOrderIntakeItemId: item.id, matchedSnapshot: snapshot }),
    };
  }

  private async detectDuplicates(actorId: string | undefined, intakeId: string) {
    const intake = await this.prisma.externalOrderIntake.findUnique({ where: { id: intakeId }, include: { items: true } });
    if (!intake) return;
    const matches: Array<{ matchedIntakeId?: string; duplicateStatus: ExternalOrderDuplicateStatus; matchType: string; score: number; details: JsonRecord }> = [];
    if (intake.externalOrderId) {
      const exact = await this.prisma.externalOrderIntake.findFirst({ where: { id: { not: intake.id }, sourceType: intake.sourceType, marketplaceConfigId: intake.marketplaceConfigId, externalOrderId: intake.externalOrderId, status: { not: ExternalOrderIntakeStatus.CANCELED } } });
      if (exact) matches.push({ matchedIntakeId: exact.id, duplicateStatus: ExternalOrderDuplicateStatus.CONFIRMED_DUPLICATE, matchType: "EXTERNAL_ORDER_ID", score: 100, details: { externalOrderId: intake.externalOrderId } });
    }
    if (intake.rawPayloadHash) {
      const repeated = await this.prisma.externalOrderIntake.findFirst({ where: { id: { not: intake.id }, rawPayloadHash: intake.rawPayloadHash } });
      if (repeated) matches.push({ matchedIntakeId: repeated.id, duplicateStatus: ExternalOrderDuplicateStatus.CONFIRMED_DUPLICATE, matchType: "RAW_PAYLOAD_HASH", score: 100, details: { rawPayloadHash: intake.rawPayloadHash } });
    }
    const possible = await this.prisma.externalOrderIntake.findFirst({ where: { id: { not: intake.id }, marketplaceConfigId: intake.marketplaceConfigId, customerPhone: intake.customerPhone, totalAmount: intake.totalAmount, createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) } } });
    if (possible) matches.push({ matchedIntakeId: possible.id, duplicateStatus: ExternalOrderDuplicateStatus.POSSIBLE_DUPLICATE, matchType: "PHONE_AMOUNT_DATE", score: 70, details: { customerPhone: intake.customerPhone, totalAmount: Number(intake.totalAmount) } });
    if (!matches.length) return;
    await this.prisma.externalOrderDuplicateCandidate.createMany({ data: matches.map((match) => ({ intakeId, matchedIntakeId: match.matchedIntakeId, duplicateStatus: match.duplicateStatus, matchType: match.matchType, score: this.decimal(match.score), detailsJson: this.json(match.details) })) });
    const confirmed = matches.some((match) => match.duplicateStatus === ExternalOrderDuplicateStatus.CONFIRMED_DUPLICATE);
    await this.prisma.externalOrderIntake.update({ where: { id: intakeId }, data: { duplicateStatus: confirmed ? ExternalOrderDuplicateStatus.CONFIRMED_DUPLICATE : ExternalOrderDuplicateStatus.POSSIBLE_DUPLICATE, status: confirmed ? ExternalOrderIntakeStatus.DUPLICATE : ExternalOrderIntakeStatus.NEEDS_REVIEW } });
    await this.audit.log({ actorId, action: "external_sale.duplicate_detected", entityType: "ExternalOrderIntake", entityId: intakeId, metadata: { matches } });
  }

  private async findExportedListing(input: { externalSku?: string; externalListingId?: string; exportedListingId?: string; marketplaceConfigId?: string | null }) {
    const or: Prisma.ExportedListingWhereInput[] = [];
    if (input.exportedListingId) or.push({ id: input.exportedListingId });
    if (input.externalSku) or.push({ exportSku: input.externalSku, ...(input.marketplaceConfigId ? { marketplaceConfigId: input.marketplaceConfigId } : {}) });
    if (input.externalListingId) or.push({ externalListingId: input.externalListingId, ...(input.marketplaceConfigId ? { marketplaceConfigId: input.marketplaceConfigId } : {}) });
    return or.length ? this.prisma.exportedListing.findFirst({ where: { OR: or }, include: { marketplaceConfig: true } }) : null;
  }

  private listingForSnapshot(listingId: string) {
    return this.prisma.commerceListing.findUnique({ where: { id: listingId }, include: { designer: { select: { id: true, email: true, displayName: true, handle: true } }, designAsset: { include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } } }, localBaseProduct: { include: { productType: true, mockupTemplates: { include: { printAreas: true }, take: 1 } } }, designProductSelection: { include: { mockupAssets: { orderBy: { createdAt: "asc" } } } }, podSyncRecords: { where: { status: { in: [PodSyncRecordStatus.READY, PodSyncRecordStatus.SYNCED] } }, orderBy: { updatedAt: "desc" }, take: 1 } } });
  }

  private buildMatchedSnapshot(listing: Awaited<ReturnType<ExternalSalesService["listingForSnapshot"]>>, exported: any, providerSyncRecord: any, quantity: number) {
    if (!listing) return null;
    const readyMockups = listing.designProductSelection?.mockupAssets.filter((asset) => (asset.status === "READY" || asset.status === "GENERATED") && !asset.archivedAt) ?? [];
    const firstMockup = readyMockups[0];
    const baseProduct = listing.localBaseProduct;
    const latestVersion = listing.designAsset.versions[0];
    const metadata = this.objectJson(listing.metadataJson);
    const royaltyAmount = listing.designerRoyalty ? Number(listing.designerRoyalty) * quantity : 0;
    const productionFileAssetId = this.stringFrom(metadata.productionFileAssetId) ?? this.stringFrom(metadata.generatedProductionAssetId);
    return { listingId: listing.id, listingTitle: listing.title, designerId: listing.designerId, designAssetId: listing.designAssetId, designVersionId: latestVersion?.id ?? null, productTypeId: baseProduct?.productType?.id ?? null, productTypeName: baseProduct?.productType?.name ?? null, baseProductId: baseProduct?.id ?? null, baseProductName: baseProduct?.name ?? null, baseProductSku: baseProduct?.skuPrefix ?? null, mockupAssetIds: readyMockups.map((asset) => asset.id), mockupImageUrl: firstMockup?.imageUrl ?? this.firstImageUrl(listing.imagesJson), productionFileAssetId, placementSnapshotJson: firstMockup?.placementSnapshotJson ?? listing.designProductSelection?.placementConfigJson ?? null, printAreaSnapshotJson: baseProduct?.mockupTemplates?.[0]?.printAreas?.[0] ?? null, royaltySnapshotJson: { royaltyRuleId: metadata.royaltyRuleId ?? null, basis: metadata.royaltyBasis ?? null, value: metadata.royaltyValue ?? null, amount: royaltyAmount }, pricingSnapshotJson: { listingPrice: Number(listing.price), exportPrice: exported ? Number(exported.exportPrice) : null, currency: listing.currency, quantity, designerRoyaltyAmount: royaltyAmount }, productionSnapshotJson: { baseProduct, productType: baseProduct?.productType, designVersion: latestVersion, export: exported ? { id: exported.id, sku: exported.exportSku, price: Number(exported.exportPrice) } : null }, providerType: providerSyncRecord?.provider ?? null, providerProductId: providerSyncRecord?.providerProductId ?? null, providerVariantId: providerSyncRecord?.providerVariantId ?? null, providerFileId: providerSyncRecord?.providerFileId ?? null, providerPlacementPayloadSnapshotJson: providerSyncRecord?.providerPlacementPayloadSnapshotJson ?? null, providerFulfillmentSnapshotJson: providerSyncRecord ? { providerSyncRecordId: providerSyncRecord.id, provider: providerSyncRecord.provider, status: providerSyncRecord.status, liveOrderSubmission: false } : null, designerRoyaltyAmount: royaltyAmount, productionCostEstimate: listing.cost ? Number(listing.cost) : baseProduct?.baseCost ? Number(baseProduct.baseCost) : null, productionReady: Boolean(providerSyncRecord || productionFileAssetId || firstMockup?.placementSnapshotJson) };
  }

  private async ensureExternalCustomer(tx: any, intake: { customerEmail: string | null; customerPhone: string; customerName: string }) {
    const email = intake.customerEmail?.trim().toLowerCase() || `external-${this.hashText(intake.customerPhone).slice(0, 16)}@rashpod.local`;
    const existing = await tx.user.findUnique({ where: { email } });
    if (existing) return existing;
    return tx.user.create({ data: { email, passwordHash: `external-${randomUUID()}`, displayName: intake.customerName, role: "CUSTOMER" } });
  }

  private async ensureIntakeItem(intakeId: string, itemId: string) {
    const item = await this.prisma.externalOrderIntakeItem.findUnique({ where: { id: itemId } });
    if (!item || item.intakeId !== intakeId) throw new NotFoundException("External order item not found");
    return item;
  }

  private async ensureImport(importId: string) {
    const row = await this.prisma.externalOrderImport.findUnique({ where: { id: importId } });
    if (!row) throw new NotFoundException("External order import not found");
    return row;
  }

  private importRowsFrom(row: { parsedRowsJson: Prisma.JsonValue | null }, input: Record<string, unknown>) {
    const source = Array.isArray(input.rows) ? input.rows : Array.isArray(row.parsedRowsJson) ? row.parsedRowsJson : [];
    return source.filter((item): item is JsonRecord => Boolean(item && typeof item === "object" && !Array.isArray(item)));
  }

  private normalizeImportRow(raw: JsonRecord, mapping: JsonRecord, index: number) {
    const read = (field: string) => raw[String(mapping[field] ?? field)];
    const input = { externalOrderId: this.optionalString(read("externalOrderId")), customerName: this.optionalString(read("customerName")) ?? "External customer", customerPhone: this.optionalString(read("customerPhone")) ?? "", customerEmail: this.optionalString(read("customerEmail")), deliveryAddress: this.optionalString(read("deliveryAddress")), paymentStatus: this.optionalString(read("paymentStatus")) ?? ExternalOrderPaymentStatus.MANUAL_REVIEW, totalAmount: this.numberFrom(read("totalAmount")) ?? 0, currency: this.optionalString(read("currency")) ?? "UZS", notes: this.optionalString(read("notes")) };
    const item = { externalSku: this.optionalString(read("externalSku")) ?? this.optionalString(read("sku")) ?? this.optionalString(read("SKU")), externalListingId: this.optionalString(read("externalListingId")), title: this.optionalString(read("title")) ?? this.optionalString(read("productTitle")) ?? "External item", quantity: this.numberFrom(read("quantity")) ?? 1, unitPrice: this.numberFrom(read("unitPrice")) ?? 0, currency: input.currency };
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!input.customerPhone) errors.push("CUSTOMER_PHONE_REQUIRED");
    if (!item.externalSku && !item.externalListingId) errors.push("SKU_OR_EXTERNAL_LISTING_REQUIRED");
    if ((item.quantity ?? 0) <= 0) errors.push("QUANTITY_INVALID");
    if (!input.customerName || input.customerName === "External customer") warnings.push("CUSTOMER_NAME_FALLBACK_USED");
    return { index, raw, input, item, errors, warnings };
  }

  private async parseRows(input: Record<string, unknown>) {
    if (Array.isArray(input.rows)) return input.rows as JsonRecord[];
    const content = typeof input.contentBase64 === "string" ? Buffer.from(input.contentBase64, "base64") : Buffer.from(String(input.content ?? input.rawText ?? ""));
    const filename = String(input.filename ?? input.originalFilename ?? "import.csv").toLowerCase();
    const mimeType = String(input.mimeType ?? "").toLowerCase();
    if (filename.endsWith(".xlsx") || mimeType.includes("spreadsheet")) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(content);
      const sheet = workbook.worksheets[0];
      if (!sheet) return [];
      const headers = (sheet.getRow(1).values as unknown[]).slice(1).map((value) => String(value ?? "").trim());
      const rows: JsonRecord[] = [];
      sheet.eachRow((line, rowNumber) => { if (rowNumber !== 1) { const values = (line.values as unknown[]).slice(1); const record: JsonRecord = {}; headers.forEach((header, index) => { if (header) record[header] = values[index] ?? null; }); if (Object.values(record).some((value) => value != null && String(value).trim())) rows.push(record); } });
      return rows;
    }
    return this.parseCsv(content.toString("utf8"));
  }

  private parseCsv(content: string) {
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    if (!lines.length) return [];
    const headers = this.parseCsvLine(lines[0]);
    return lines.slice(1).map((line) => { const values = this.parseCsvLine(line); return headers.reduce<JsonRecord>((record, header, index) => { record[header] = values[index] ?? ""; return record; }, {}); });
  }

  private parseCsvLine(line: string) {
    const cells: string[] = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];
      if (char === '"' && quoted && next === '"') { current += '"'; index += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { cells.push(current.trim()); current = ""; }
      else current += char;
    }
    cells.push(current.trim());
    return cells;
  }

  private paymentProviderFor(status: ExternalOrderPaymentStatus) {
    if (status === ExternalOrderPaymentStatus.CASH_ON_DELIVERY) return "EXTERNAL_COD";
    if (status === ExternalOrderPaymentStatus.PAID_EXTERNALLY) return "EXTERNAL_PAID";
    return "EXTERNAL_MANUAL";
  }

  private mappingReady(status: ExternalOrderItemMappingStatus) {
    return status === ExternalOrderItemMappingStatus.MAPPED || status === ExternalOrderItemMappingStatus.AUTO_MAPPED;
  }

  private enumValue<T extends Record<string, string>>(values: T, value: unknown, label: string): T[keyof T] | undefined {
    if (value == null || value === "") return undefined;
    const text = String(value).trim().toUpperCase();
    if (Object.values(values).includes(text)) return text as T[keyof T];
    throw new BadRequestException(`${label} is invalid`);
  }

  private arrayOfRecords(value: unknown, label: string) {
    if (!Array.isArray(value)) throw new BadRequestException(`${label} must be an array`);
    return value.filter((item): item is JsonRecord => Boolean(item && typeof item === "object" && !Array.isArray(item)));
  }

  private requiredString(value: unknown, label: string) {
    const text = this.optionalString(value);
    if (!text) throw new BadRequestException(`${label} is required`);
    return text;
  }

  private optionalString(value: unknown) {
    if (value == null) return undefined;
    const text = String(value).trim();
    return text ? text : undefined;
  }

  private stringFrom(value: unknown) {
    return this.optionalString(value);
  }

  private requiredNumber(value: unknown, label: string) {
    const number = this.numberFrom(value);
    if (number == null) throw new BadRequestException(`${label} must be numeric`);
    return number;
  }

  private numberFrom(value: unknown) {
    if (value instanceof Prisma.Decimal) return Number(value);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
    return undefined;
  }

  private booleanValue(value: unknown, fallback: boolean) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return fallback;
  }

  private objectJson(value: unknown): JsonRecord {
    return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
  }

  private decimal(value: number | Prisma.Decimal) {
    return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(Number(value || 0).toFixed(2));
  }

  private decimalOrNull(value: number | undefined) {
    return value == null ? null : this.decimal(value);
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }

  private hashJson(value: unknown) {
    return this.hashText(JSON.stringify(value ?? null));
  }

  private hashText(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private firstImageUrl(value: Prisma.JsonValue | undefined | null) {
    if (Array.isArray(value)) {
      const first = value.find((item) => typeof item === "string" || Boolean(item && typeof item === "object"));
      if (typeof first === "string") return first;
      if (first && typeof first === "object" && "url" in first && typeof first.url === "string") return first.url;
    }
    return undefined;
  }
}
