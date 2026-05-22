import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { LedgerEntryStatus, LedgerEntryType, OrderStatus, PaymentReconciliationStatus, PaymentStatus, PayoutMethod, PayoutStatus, Prisma, ProductionJobStatus, RoyaltyEntryType, RoyaltyLedgerStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreatePayoutDto, PayoutActionDto, ReconciliationReviewDto, RoyaltyAdjustmentDto, TrackRefundDto } from "./dto/finance.dto";

const DEFAULT_ROYALTY_STATUS = RoyaltyLedgerStatus.PENDING;

type JsonObject = Record<string, unknown>;

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async overview() {
    const [orders, snapshots, royalties, payouts, reconciliationIssues] = await Promise.all([
      this.prisma.order.findMany({ select: { status: true, total: true, subtotal: true, discountTotal: true, currency: true } }),
      this.prisma.orderFinanceSnapshot.findMany(),
      this.prisma.royaltyLedgerEntry.findMany({ select: { status: true, entryType: true, amount: true, currency: true } }),
      this.prisma.payout.findMany({ select: { status: true, amount: true, currency: true } }),
      this.prisma.paymentReconciliation.count({ where: { status: { in: [PaymentReconciliationStatus.MISMATCHED, PaymentReconciliationStatus.MANUAL_REVIEW, PaymentReconciliationStatus.UNRECONCILED] } } }),
    ]);
    const grossSales = orders.filter((order) => this.paidOrderStatus(order.status)).reduce((sum, order) => sum + Number(order.total), 0);
    const netSales = snapshots.reduce((sum, item) => sum + Number(item.netRevenue), 0);
    const estimatedPlatformMargin = snapshots.reduce((sum, item) => sum + Number(item.platformMarginEstimate ?? 0), 0);
    return {
      grossSales,
      netSales,
      paidOrders: orders.filter((order) => this.paidOrderStatus(order.status)).length,
      unpaidOrFailedPayments: orders.filter((order) => order.status === OrderStatus.PENDING_PAYMENT || order.status === OrderStatus.CANCELLED).length,
      pendingRoyalties: this.sumRoyalty(royalties, [RoyaltyLedgerStatus.PENDING]),
      earnedRoyalties: this.sumRoyalty(royalties, [RoyaltyLedgerStatus.EARNED]),
      payableRoyalties: this.sumRoyalty(royalties, [RoyaltyLedgerStatus.PAYABLE]),
      paidPayouts: payouts.filter((payout) => payout.status === PayoutStatus.PAID || payout.status === PayoutStatus.CONFIRMED).reduce((sum, payout) => sum + Number(payout.amount), 0),
      estimatedPlatformMargin,
      reconciliationIssues,
      incompleteCostWarnings: snapshots.filter((item) => item.marginIncomplete).length,
      currency: orders[0]?.currency ?? "UZS",
    };
  }

  async orderFinance(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: { orderBy: { createdAt: "desc" } }, financeSnapshots: true, royaltyLedgerEntries: true, paymentReconciliations: true },
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  async listRoyalties(filters: { designerId?: string; status?: string } = {}) {
    return this.prisma.royaltyLedgerEntry.findMany({
      where: {
        ...(filters.designerId ? { designerId: filters.designerId } : {}),
        ...(filters.status ? { status: filters.status as RoyaltyLedgerStatus } : {}),
      },
      include: {
        designer: { select: { id: true, email: true, displayName: true, handle: true } },
        order: { select: { id: true, status: true, createdAt: true } },
        orderItem: { select: { id: true, listingTitle: true, quantity: true, totalPrice: true } },
        listing: { select: { id: true, title: true, slug: true } },
        payout: { select: { id: true, status: true, reference: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  }

  async designerBalance(designerId: string) {
    const entries = await this.prisma.royaltyLedgerEntry.findMany({ where: { designerId }, orderBy: { createdAt: "desc" } });
    const byStatus = (status: RoyaltyLedgerStatus[]) => entries.filter((entry) => status.includes(entry.status)).reduce((sum, entry) => sum + Number(entry.amount), 0);
    const adjustments = entries.filter((entry) => entry.entryType === RoyaltyEntryType.ADJUSTMENT).reduce((sum, entry) => sum + Number(entry.amount), 0);
    return {
      designerId,
      pending: byStatus([RoyaltyLedgerStatus.PENDING, RoyaltyLedgerStatus.CALCULATED]),
      earned: byStatus([RoyaltyLedgerStatus.EARNED]),
      payable: byStatus([RoyaltyLedgerStatus.PAYABLE]),
      paid: byStatus([RoyaltyLedgerStatus.PAID, RoyaltyLedgerStatus.PAIDOUT]),
      reversed: byStatus([RoyaltyLedgerStatus.REVERSED, RoyaltyLedgerStatus.CANCELLED]),
      adjustments,
      currentPayableBalance: byStatus([RoyaltyLedgerStatus.PAYABLE]),
      entries,
    };
  }

  designerEarnings(designerId: string) {
    return this.designerBalance(designerId);
  }

  designerPayouts(designerId: string) {
    return this.prisma.payout.findMany({ where: { designerId }, include: { royaltyEntries: true }, orderBy: { createdAt: "desc" } });
  }

  async createAdjustment(actorId: string, dto: RoyaltyAdjustmentDto) {
    if (!dto.reason?.trim()) throw new BadRequestException("Adjustment reason is required");
    const entry = await this.prisma.royaltyLedgerEntry.create({
      data: {
        designerId: dto.designerId,
        orderId: dto.orderId,
        orderItemId: dto.orderItemId,
        listingId: dto.listingId,
        entryType: RoyaltyEntryType.ADJUSTMENT,
        amount: this.decimal(dto.amount),
        amountUzs: this.decimal(dto.amount),
        currency: dto.currency,
        status: RoyaltyLedgerStatus.PAYABLE,
        availableAt: new Date(),
        reason: dto.reason,
        createdById: actorId,
        source: "MANUAL",
        metadataJson: this.json({ manual: true }),
      },
    });
    await this.audit.log({ actorId, action: "royalty.adjustment.created", entityType: "RoyaltyLedgerEntry", entityId: entry.id, metadata: { designerId: dto.designerId, amount: dto.amount, currency: dto.currency, reason: dto.reason } });
    return entry;
  }

  async createPayout(actorId: string, dto: CreatePayoutDto) {
    const currency = dto.currency ?? "UZS";
    const entries = await this.prisma.royaltyLedgerEntry.findMany({
      where: {
        designerId: dto.designerId,
        status: RoyaltyLedgerStatus.PAYABLE,
        payoutId: null,
        currency,
        ...(dto.entryIds?.length ? { id: { in: dto.entryIds } } : {}),
      },
      orderBy: { createdAt: "asc" },
    });
    if (!entries.length) throw new BadRequestException("No payable royalty entries available for payout");
    const total = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);
    if (total <= 0) throw new BadRequestException("Payout total must be positive");
    const payout = await this.prisma.payout.create({
      data: {
        designerId: dto.designerId,
        amount: this.decimal(total),
        amountUzs: this.decimal(total),
        currency,
        status: PayoutStatus.DRAFT,
        method: PayoutMethod.MANUAL,
        note: dto.note,
        royaltyEntries: { connect: entries.map((entry) => ({ id: entry.id })) },
        metadataJson: this.json({ entryIds: entries.map((entry) => entry.id) }),
      },
      include: { royaltyEntries: true, designer: { select: { id: true, email: true, displayName: true } } },
    });
    await this.audit.log({ actorId, action: "payout.batch.created", entityType: "Payout", entityId: payout.id, metadata: { designerId: dto.designerId, amount: total, currency, entries: entries.length } });
    return payout;
  }

  listPayouts() {
    return this.prisma.payout.findMany({ include: { designer: { select: { id: true, email: true, displayName: true, handle: true } }, royaltyEntries: true }, orderBy: { createdAt: "desc" }, take: 500 });
  }

  async getPayout(id: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id }, include: { designer: { select: { id: true, email: true, displayName: true, handle: true } }, royaltyEntries: { include: { order: true, orderItem: true, listing: true } } } });
    if (!payout) throw new NotFoundException("Payout not found");
    return payout;
  }

  async approvePayout(actorId: string, id: string) {
    const payout = await this.getPayout(id);
    if (payout.status !== PayoutStatus.DRAFT && payout.status !== PayoutStatus.REQUESTED) throw new BadRequestException("Only draft payouts can be approved");
    const updated = await this.prisma.payout.update({ where: { id }, data: { status: PayoutStatus.APPROVED, approvedById: actorId, approvedAt: new Date() }, include: { royaltyEntries: true } });
    await this.audit.log({ actorId, action: "payout.batch.approved", entityType: "Payout", entityId: id, metadata: { designerId: payout.designerId, amount: Number(payout.amount), currency: payout.currency } });
    return updated;
  }

  async markPayoutPaid(actorId: string, id: string, dto: PayoutActionDto) {
    const payout = await this.getPayout(id);
    if (payout.status !== PayoutStatus.APPROVED && payout.status !== PayoutStatus.PROCESSING) throw new BadRequestException("Payout must be approved before marking paid");
    const paidAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.royaltyLedgerEntry.updateMany({ where: { payoutId: id }, data: { status: RoyaltyLedgerStatus.PAID, entryType: RoyaltyEntryType.PAID, paidOutAt: paidAt } });
      return tx.payout.update({ where: { id }, data: { status: PayoutStatus.PAID, method: dto.method ?? PayoutMethod.MANUAL, reference: dto.reference, note: dto.note, paidById: actorId, paidAt, confirmedAt: paidAt }, include: { royaltyEntries: true } });
    });
    await this.audit.log({ actorId, action: "payout.batch.marked_paid", entityType: "Payout", entityId: id, metadata: { designerId: payout.designerId, amount: Number(payout.amount), currency: payout.currency, reference: dto.reference ?? null } });
    return updated;
  }

  async cancelPayout(actorId: string, id: string, dto: PayoutActionDto) {
    const payout = await this.getPayout(id);
    if (payout.status === PayoutStatus.PAID || payout.status === PayoutStatus.CONFIRMED) throw new BadRequestException("Paid payouts cannot be canceled");
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.royaltyLedgerEntry.updateMany({ where: { payoutId: id }, data: { payoutId: null } });
      return tx.payout.update({ where: { id }, data: { status: PayoutStatus.CANCELED, note: dto.note, canceledAt: new Date() }, include: { royaltyEntries: true } });
    });
    await this.audit.log({ actorId, action: "payout.batch.canceled", entityType: "Payout", entityId: id, metadata: { designerId: payout.designerId, reason: dto.note ?? null } });
    return updated;
  }

  async exportPayout(actorId: string, id: string) {
    const payout = await this.getPayout(id);
    const rows = [
      ["payoutId", "designerId", "entryId", "orderId", "orderItemId", "listingId", "amount", "currency", "status", "note"],
      ...payout.royaltyEntries.map((entry) => [payout.id, payout.designerId, entry.id, entry.orderId ?? "", entry.orderItemId ?? "", entry.listingId ?? "", Number(entry.amount).toFixed(2), entry.currency, entry.status, entry.note ?? ""]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    await this.audit.log({ actorId, action: "payout.exported", entityType: "Payout", entityId: id, metadata: { designerId: payout.designerId, amount: Number(payout.amount), currency: payout.currency } });
    return { filename: `payout-${id}.csv`, contentType: "text/csv; charset=utf-8", csv };
  }

  listReconciliation() {
    return this.prisma.paymentReconciliation.findMany({ include: { paymentTransaction: true, order: { include: { customer: { select: { id: true, email: true, displayName: true } } } } }, orderBy: { updatedAt: "desc" }, take: 500 });
  }

  async markReconciliationReviewed(actorId: string, paymentId: string, dto: ReconciliationReviewDto) {
    if (!dto.note?.trim()) throw new BadRequestException("Review note is required");
    const payment = await this.prisma.paymentTransaction.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException("Payment not found");
    const received = dto.receivedAmount ?? Number(payment.amount);
    const discrepancy = Number((received - Number(payment.amount)).toFixed(2));
    const status = discrepancy === 0 ? PaymentReconciliationStatus.MATCHED : PaymentReconciliationStatus.MANUAL_REVIEW;
    const row = await this.upsertReconciliation(payment, { status, receivedAmount: received, note: dto.note, reviewedById: actorId });
    await this.audit.log({ actorId, action: status === PaymentReconciliationStatus.MATCHED ? "payment.reconciliation.matched" : "payment.reconciliation.manual_review", entityType: "PaymentTransaction", entityId: paymentId, metadata: { note: dto.note, discrepancy } });
    return row;
  }

  async markReconciliationMatched(actorId: string, paymentId: string, dto: ReconciliationReviewDto) {
    const payment = await this.prisma.paymentTransaction.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException("Payment not found");
    const row = await this.upsertReconciliation(payment, { status: PaymentReconciliationStatus.MATCHED, receivedAmount: dto.receivedAmount ?? Number(payment.amount), note: dto.note, reviewedById: actorId });
    await this.audit.log({ actorId, action: "payment.reconciliation.matched", entityType: "PaymentTransaction", entityId: paymentId, metadata: { note: dto.note ?? null } });
    return row;
  }

  async trackRefund(actorId: string, orderId: string, dto: TrackRefundDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { items: true, royaltyLedgerEntries: true } });
    if (!order) throw new NotFoundException("Order not found");
    const entries = order.royaltyLedgerEntries.filter((entry) => !dto.orderItemId || entry.orderItemId === dto.orderItemId);
    const created = [];
    for (const entry of entries.filter((entry) => !this.royaltyStatusIn(entry.status, [RoyaltyLedgerStatus.REVERSED, RoyaltyLedgerStatus.PAID]))) {
      const reversal = await this.prisma.royaltyLedgerEntry.create({
        data: {
          designerId: entry.designerId,
          orderId: entry.orderId,
          orderItemId: entry.orderItemId,
          listingId: entry.listingId,
          designId: entry.designId,
          designVersionId: entry.designVersionId,
          entryType: RoyaltyEntryType.REVERSED,
          amount: this.decimal(-Math.abs(Number(entry.amount))),
          amountUzs: this.decimal(-Math.abs(Number(entry.amountUzs))),
          currency: entry.currency,
          status: RoyaltyLedgerStatus.REVERSED,
          reason: dto.reason,
          createdById: actorId,
          source: "REFUND",
          reversalOfEntryId: entry.id,
        },
      });
      created.push(reversal);
      await this.audit.log({ actorId, action: "royalty.entry.reversed", entityType: "RoyaltyLedgerEntry", entityId: reversal.id, metadata: { orderId, originalEntryId: entry.id, amount: reversal.amount, reason: dto.reason } });
    }
    for (const entry of entries.filter((entry) => entry.status === RoyaltyLedgerStatus.PAID)) {
      const adjustment = await this.createAdjustment(actorId, { designerId: entry.designerId, orderId: entry.orderId ?? undefined, orderItemId: entry.orderItemId ?? undefined, listingId: entry.listingId ?? undefined, amount: -Math.abs(Number(entry.amount)), currency: entry.currency, reason: dto.reason });
      created.push(adjustment);
    }
    await this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.REFUNDED } });
    await this.prisma.orderFinanceSnapshot.updateMany({ where: { orderId, ...(dto.orderItemId ? { orderItemId: dto.orderItemId } : {}) }, data: { refundStatus: "REFUNDED", settlementStatus: "REVERSED" } });
    await this.audit.log({ actorId, action: "refund.tracked", entityType: "Order", entityId: orderId, metadata: { amount: dto.amount, currency: dto.currency, reason: dto.reason, reversals: created.length } });
    return { orderId, created };
  }

  async handlePaymentSucceeded(paymentId: string, actorId?: string, receivedAmount?: number, raw?: JsonObject) {
    const payment = await this.prisma.paymentTransaction.findUnique({ where: { id: paymentId }, include: { order: { include: { items: true } } } });
    if (!payment) throw new NotFoundException("Payment not found");
    const reconciliation = await this.reconcilePayment(payment, receivedAmount ?? Number(payment.amount), raw);
    if (reconciliation.status === PaymentReconciliationStatus.MATCHED) {
      await this.createOrderFinance(payment.orderId, payment.id, actorId);
    }
    return reconciliation;
  }

  async reconcilePayment(payment: { id: string; orderId: string; provider: string; providerRef: string | null; amount: Prisma.Decimal; currency: string; status: PaymentStatus; rawPayloadJson?: Prisma.JsonValue | null }, receivedAmount: number, raw?: JsonObject) {
    const discrepancy = Number((receivedAmount - Number(payment.amount)).toFixed(2));
    const status = discrepancy === 0 ? PaymentReconciliationStatus.MATCHED : PaymentReconciliationStatus.MANUAL_REVIEW;
    return this.upsertReconciliation(payment, { status, receivedAmount, raw, note: discrepancy === 0 ? undefined : "Payment amount mismatch" });
  }

  async createOrderFinance(orderId: string, paymentId?: string, actorId?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { items: true, payments: true } });
    if (!order) throw new NotFoundException("Order not found");
    if (!this.paidOrderStatus(order.status)) return [];
    const existing = await this.prisma.royaltyLedgerEntry.count({ where: { orderId, entryType: RoyaltyEntryType.PENDING } });
    if (existing > 0) return this.prisma.orderFinanceSnapshot.findMany({ where: { orderId } });
    const snapshots = [];
    for (const item of order.items) {
      const snapshot = await this.createSnapshotAndRoyalty(order, item, paymentId, actorId);
      snapshots.push(snapshot);
    }
    await this.audit.log({ actorId, action: "finance.snapshot.created", entityType: "Order", entityId: orderId, metadata: { items: snapshots.length, paymentId: paymentId ?? null } });
    return snapshots;
  }

  async markOrderItemEligible(orderItemId: string, actorId?: string) {
    const entries = await this.prisma.royaltyLedgerEntry.findMany({ where: { orderItemId, status: { in: [RoyaltyLedgerStatus.PENDING, RoyaltyLedgerStatus.CALCULATED] } } });
    const updated = [];
    for (const entry of entries) {
      const row = await this.prisma.royaltyLedgerEntry.update({ where: { id: entry.id }, data: { status: RoyaltyLedgerStatus.PAYABLE, entryType: RoyaltyEntryType.PAYABLE, availableAt: new Date() } });
      updated.push(row);
      await this.audit.log({ actorId, action: "royalty.status.changed", entityType: "RoyaltyLedgerEntry", entityId: entry.id, metadata: { from: entry.status, to: RoyaltyLedgerStatus.PAYABLE, orderItemId } });
    }
    await this.prisma.orderFinanceSnapshot.updateMany({ where: { orderItemId }, data: { settlementStatus: "PAYABLE" } });
    return updated;
  }

  private async createSnapshotAndRoyalty(order: { id: string; customerId: string; currency: string; discountTotal: Prisma.Decimal; deliveryFee: Prisma.Decimal; items: unknown[] }, item: any, paymentId?: string, actorId?: string) {
    const pricing = this.objectJson(item.pricingSnapshotJson);
    const royaltySnapshot = this.objectJson(item.royaltySnapshotJson);
    const lineGross = Number(item.totalPrice);
    const discount = Number(order.discountTotal || 0) > 0 ? Number((Number(order.discountTotal) / Math.max(1, (order.items as unknown[]).length)).toFixed(2)) : 0;
    const netRevenue = Number((lineGross - discount).toFixed(2));
    const baseCost = this.numberFrom(pricing.baseProductCost) ?? this.numberFrom(item.productionCostEstimate);
    const productionCost = this.numberFrom(pricing.productionCostEstimate) ?? this.numberFrom(item.productionCostEstimate);
    const deliveryCost = this.numberFrom(pricing.deliveryCost) ?? null;
    const deliveryFeeAllocation = this.numberFrom(item.deliveryFeeAllocation) ?? this.numberFrom(pricing.deliveryFeeAllocation) ?? 0;
    const royaltyAmount = this.numberFrom(item.designerRoyaltyAmount) ?? this.calculateRoyaltyFromSnapshot(item, netRevenue, baseCost, productionCost);
    const missing = [baseCost == null ? "base product cost" : null, productionCost == null ? "production cost" : null].filter(Boolean).join(", ");
    const platformMargin = Number((netRevenue - (baseCost ?? 0) - (productionCost ?? 0) - (deliveryCost ?? 0) - royaltyAmount).toFixed(2));
    const snapshot = await this.prisma.orderFinanceSnapshot.upsert({
      where: { orderItemId: item.id },
      create: {
        orderId: order.id,
        orderItemId: item.id,
        listingId: item.listingId,
        designerId: item.designerId,
        customerId: order.customerId,
        currency: order.currency,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        grossLineAmount: item.totalPrice,
        discountAmount: this.decimal(discount),
        netRevenue: this.decimal(netRevenue),
        deliveryFeeAllocation: this.decimal(deliveryFeeAllocation),
        baseProductCost: baseCost == null ? null : this.decimal(baseCost),
        productionCost: productionCost == null ? null : this.decimal(productionCost),
        deliveryCost: deliveryCost == null ? null : this.decimal(deliveryCost),
        royaltyRuleSnapshot: this.json(royaltySnapshot),
        royaltyAmount: this.decimal(royaltyAmount),
        platformMarginEstimate: this.decimal(platformMargin),
        marginIncomplete: Boolean(missing),
        incompleteReason: missing || null,
        calculationBasisJson: this.json({ paymentId, pricing, royaltySnapshot, formula: "netRevenue - baseProductCost - productionCost - deliveryCost - paymentProviderFee - designerRoyalty" }),
      },
      update: {},
    });
    if (item.designerId) {
      const existing = await this.prisma.royaltyLedgerEntry.findFirst({ where: { orderItemId: item.id, designerId: item.designerId, entryType: RoyaltyEntryType.PENDING } });
      if (!existing) {
        const entry = await this.prisma.royaltyLedgerEntry.create({
          data: {
            designerId: item.designerId,
            orderId: order.id,
            orderItemId: item.id,
            listingId: item.listingId,
            designId: item.designAssetId,
            designVersionId: item.designVersionId,
            entryType: RoyaltyEntryType.PENDING,
            royaltyRuleId: this.stringFrom(royaltySnapshot.royaltyRuleId),
            royaltyRate: this.decimal(this.numberFrom(royaltySnapshot.value) ?? 0),
            amount: this.decimal(royaltyAmount),
            amountUzs: this.decimal(royaltyAmount),
            currency: order.currency,
            calculationBasis: this.json({ netRevenue, baseCost, productionCost, deliveryCost, quantity: item.quantity, unitPrice: Number(item.unitPrice) }),
            royaltyRuleSnapshot: this.json(royaltySnapshot),
            status: DEFAULT_ROYALTY_STATUS,
            source: "PAYMENT_SUCCESS",
          },
        });
        await this.prisma.ledgerEntry.create({ data: { type: LedgerEntryType.ROYALTY, status: LedgerEntryStatus.POSTED, designerId: item.designerId, orderId: order.id, orderItemId: item.id, paymentTransactionId: paymentId, amount: this.decimal(royaltyAmount), amountUzs: this.decimal(royaltyAmount), currency: order.currency, description: "Pending designer royalty", metadataJson: this.json({ royaltyEntryId: entry.id }) } });
        await this.audit.log({ actorId, action: "royalty.entry.created", entityType: "RoyaltyLedgerEntry", entityId: entry.id, metadata: { designerId: item.designerId, orderId: order.id, orderItemId: item.id, amount: royaltyAmount, currency: order.currency } });
      }
    }
    return snapshot;
  }

  private calculateRoyaltyFromSnapshot(item: any, netRevenue: number, baseCost?: number | null, productionCost?: number | null) {
    const snapshot = this.objectJson(item.royaltySnapshotJson);
    const basis = String(snapshot.basis ?? "").toUpperCase();
    const value = this.numberFrom(snapshot.value) ?? 0;
    if (basis.includes("FIXED")) return Number((value * item.quantity).toFixed(2));
    if (basis.includes("MARGIN")) return Number((Math.max(0, netRevenue - (baseCost ?? 0) - (productionCost ?? 0)) * (value > 1 ? value / 100 : value)).toFixed(2));
    if (value > 0) return Number((netRevenue * (value > 1 ? value / 100 : value)).toFixed(2));
    return 0;
  }

  private async upsertReconciliation(payment: { id: string; orderId: string; provider: string; providerRef: string | null; amount: Prisma.Decimal; currency: string; status: PaymentStatus; rawPayloadJson?: Prisma.JsonValue | null }, input: { status: PaymentReconciliationStatus; receivedAmount: number; note?: string; reviewedById?: string; raw?: JsonObject }) {
    const discrepancy = Number((input.receivedAmount - Number(payment.amount)).toFixed(2));
    const row = await this.prisma.paymentReconciliation.upsert({
      where: { paymentTransactionId: payment.id },
      create: {
        paymentTransactionId: payment.id,
        orderId: payment.orderId,
        provider: payment.provider,
        providerTransactionId: payment.providerRef,
        expectedAmount: payment.amount,
        receivedAmount: this.decimal(input.receivedAmount),
        currency: payment.currency,
        providerStatus: payment.status,
        internalStatus: payment.status,
        discrepancyAmount: this.decimal(discrepancy),
        status: input.status,
        reconciledAt: input.status === PaymentReconciliationStatus.MATCHED ? new Date() : null,
        reviewedById: input.reviewedById,
        note: input.note,
        rawPayloadJson: this.json(input.raw ?? this.objectJson(payment.rawPayloadJson ?? null)),
      },
      update: {
        providerTransactionId: payment.providerRef,
        receivedAmount: this.decimal(input.receivedAmount),
        providerStatus: payment.status,
        internalStatus: payment.status,
        discrepancyAmount: this.decimal(discrepancy),
        status: input.status,
        reconciledAt: input.status === PaymentReconciliationStatus.MATCHED ? new Date() : undefined,
        reviewedById: input.reviewedById,
        note: input.note,
        rawPayloadJson: this.json(input.raw ?? this.objectJson(payment.rawPayloadJson ?? null)),
      },
    });
    await this.audit.log({ action: input.status === PaymentReconciliationStatus.MATCHED ? "payment.reconciliation.matched" : "payment.reconciliation.mismatched", entityType: "PaymentTransaction", entityId: payment.id, metadata: { orderId: payment.orderId, expectedAmount: Number(payment.amount), receivedAmount: input.receivedAmount, discrepancy, status: input.status } });
    return row;
  }

  private sumRoyalty(entries: Array<{ status: RoyaltyLedgerStatus; amount: Prisma.Decimal }>, statuses: RoyaltyLedgerStatus[]) {
    return entries.filter((entry) => statuses.includes(entry.status)).reduce((sum, entry) => sum + Number(entry.amount), 0);
  }

  private paidOrderStatus(status: OrderStatus) {
    return this.orderStatusIn(status, [OrderStatus.PAID, OrderStatus.IN_PRODUCTION, OrderStatus.READY_FOR_PICKUP, OrderStatus.SHIPPED, OrderStatus.DELIVERED]);
  }

  private royaltyStatusIn(status: RoyaltyLedgerStatus, statuses: RoyaltyLedgerStatus[]) {
    return statuses.includes(status);
  }

  private orderStatusIn(status: OrderStatus, statuses: OrderStatus[]) {
    return statuses.includes(status);
  }

  private objectJson(value: Prisma.JsonValue | null | undefined): JsonObject {
    return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
  }

  private numberFrom(value: unknown) {
    if (value instanceof Prisma.Decimal) return Number(value);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
    return undefined;
  }

  private stringFrom(value: unknown) {
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }

  private decimal(value: number | Prisma.Decimal) {
    return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(Number(value || 0).toFixed(2));
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }
}
