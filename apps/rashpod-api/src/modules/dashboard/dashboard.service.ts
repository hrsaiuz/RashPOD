import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

const DEFAULT_ROYALTY_PCT = 15;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private async getDefaultRoyaltyPct(): Promise<number> {
    const rule = await this.prisma.royaltyRule.findFirst({
      where: { scope: "DEFAULT", basis: "NET_PROFIT_PERCENT", isActive: true },
      orderBy: { effectiveAt: "desc" },
    });
    if (!rule) return DEFAULT_ROYALTY_PCT;
    return Number(rule.value);
  }

  private decimal(value: Prisma.Decimal | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    return typeof value === "number" ? value : Number(value);
  }

  async designerOverview(designerId: string) {
    const [designs, listings, orders, items, designByStatus, royaltyPct] = await Promise.all([
      this.prisma.designAsset.count({ where: { designerId } }),
      this.prisma.commerceListing.count({ where: { designerId } }),
      this.prisma.orderItem.count({ where: { listing: { designerId } } }),
      this.prisma.orderItem.findMany({
        where: { listing: { designerId } },
        select: { totalPrice: true, createdAt: true },
      }),
      this.prisma.designAsset.groupBy({
        by: ["status"],
        where: { designerId },
        _count: { _all: true },
      }),
      this.getDefaultRoyaltyPct(),
    ]);

    const rate = royaltyPct / 100;
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    let lifetimeEarnings = 0;
    let monthEarnings = 0;
    for (const item of items) {
      const royalty = this.decimal(item.totalPrice) * rate;
      lifetimeEarnings += royalty;
      if (item.createdAt >= monthStart) monthEarnings += royalty;
    }

    const designStatus: Record<string, number> = {};
    for (const row of designByStatus) {
      designStatus[row.status] = row._count._all;
    }

    // Next payout estimate: sum of royalties on items whose orders are DELIVERED.
    // (Approximates the unpaid balance ready to be paid out.)
    const deliveredItems = items.filter((it) => (it as { orderStatus?: string }).orderStatus === "DELIVERED");
    // items above doesn't include order.status; recompute via a dedicated query:
    const payoutItems = await this.prisma.orderItem.findMany({
      where: { listing: { designerId }, order: { status: "DELIVERED" } },
      select: { totalPrice: true },
    });
    let nextPayoutEstimate = 0;
    for (const it of payoutItems) nextPayoutEstimate += this.decimal(it.totalPrice) * rate;
    // suppress unused warning for deliveredItems if linter complains
    void deliveredItems;

    return {
      designs,
      listings,
      soldItems: orders,
      lifetimeEarnings: Number(lifetimeEarnings.toFixed(2)),
      monthEarnings: Number(monthEarnings.toFixed(2)),
      nextPayoutEstimate: Number(nextPayoutEstimate.toFixed(2)),
      royaltyPct,
      designStatus,
      pendingModeration: designStatus["SUBMITTED"] ?? 0,
      needsFix: designStatus["NEEDS_FIX"] ?? 0,
    };
  }

  async designerRoyalties(designerId: string, limit = 25) {
    const [items, royaltyPct] = await Promise.all([
      this.prisma.orderItem.findMany({
        where: { listing: { designerId } },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          listing: { select: { id: true, title: true } },
          order: { select: { id: true, status: true, createdAt: true } },
        },
      }),
      this.getDefaultRoyaltyPct(),
    ]);
    const rate = royaltyPct / 100;
    return items.map((it) => ({
      id: it.id,
      orderId: it.orderId,
      orderStatus: it.order.status,
      listingId: it.listingId,
      listingTitle: it.listing.title,
      quantity: it.quantity,
      unitPrice: this.decimal(it.unitPrice),
      totalPrice: this.decimal(it.totalPrice),
      royalty: Number((this.decimal(it.totalPrice) * rate).toFixed(2)),
      royaltyPct,
      createdAt: it.createdAt,
    }));
  }

  async customerOverview(customerId: string) {
    const [orders, cartItems, recentOrders] = await Promise.all([
      this.prisma.order.count({ where: { customerId } }),
      this.prisma.cartItem.count({ where: { cart: { customerId } } }),
      this.prisma.order.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          total: true,
          currency: true,
          createdAt: true,
        },
      }),
    ]);
    return {
      orders,
      cartItems,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        status: o.status,
        total: this.decimal(o.total),
        currency: o.currency,
        createdAt: o.createdAt,
      })),
    };
  }

  async moderatorOverview() {
    const [submitted, needsFix, recentCases] = await Promise.all([
      this.prisma.designAsset.count({ where: { status: "SUBMITTED" } }),
      this.prisma.designAsset.count({ where: { status: "NEEDS_FIX" } }),
      this.prisma.designModerationCase.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          designAssetId: true,
          decision: true,
          createdAt: true,
          reason: true,
        },
      }),
    ]);
    return { submitted, needsFix, recentCases };
  }

  async productionOverview() {
    const [total, ordered, printing, qc, packing, recent] = await Promise.all([
      this.prisma.productionJob.count(),
      this.prisma.productionJob.count({ where: { status: "ORDERED" } }),
      this.prisma.productionJob.count({ where: { status: "PRINTING" } }),
      this.prisma.productionJob.count({ where: { status: "QC" } }),
      this.prisma.productionJob.count({ where: { status: "PACKING" } }),
      this.prisma.productionJob.findMany({
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          id: true,
          orderId: true,
          status: true,
          updatedAt: true,
        },
      }),
    ]);
    return { total, ordered, printing, qc, packing, recent };
  }

  async adminOverview() {
    const [users, listings, orders, failedJobs, pendingModeration, openCorporateRequests, paidPayments] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.commerceListing.count(),
        this.prisma.order.count(),
        this.prisma.workerJob.count({ where: { status: "FAILED" } }),
        this.prisma.designAsset.count({ where: { status: "SUBMITTED" } }),
        this.prisma.corporateRequest.count({ where: { status: "BIDDING" } }),
        this.prisma.paymentTransaction.aggregate({
          where: { status: "PAID" },
          _sum: { amount: true },
        }),
      ]);
    return {
      users,
      listings,
      orders,
      failedJobs,
      pendingModeration,
      openCorporateRequests,
      grossRevenue: this.decimal(paidPayments._sum.amount),
    };
  }
}
