import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BonusStatus, BonusType, DesignerStatus, LedgerEntryStatus, LedgerEntryType, Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CurrencyService, PRIMARY_CURRENCY } from "../currency/currency.service";
import { GrantDesignerBonusDto, GrantGroupBonusDto } from "./dto/grant-designer-bonus.dto";
import { UpdateDesignerStatusDto } from "./dto/update-designer-status.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";

const STAFF_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.MODERATOR,
  UserRole.OPERATIONS_MANAGER,
  UserRole.PRODUCTION_STAFF,
  UserRole.FINANCE_STAFF,
  UserRole.SUPPORT_STAFF,
];

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly currency: CurrencyService,
  ) {}

  private decimal(value: Prisma.Decimal | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    return typeof value === "number" ? value : Number(value);
  }

  async listUsers(opts: { search?: string; segment?: "designers" | "customers" | "staff"; role?: UserRole; limit?: number }) {
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
    const where: Prisma.UserWhereInput = {};
    if (opts.role) {
      where.role = opts.role;
    } else if (opts.segment === "designers") {
      where.role = UserRole.DESIGNER;
    } else if (opts.segment === "customers") {
      where.role = { in: [UserRole.CUSTOMER, UserRole.CORPORATE_CLIENT] };
    } else if (opts.segment === "staff") {
      where.role = { in: STAFF_ROLES };
    }
    if (opts.search) {
      where.OR = [
        { email: { contains: opts.search, mode: "insensitive" } },
        { displayName: { contains: opts.search, mode: "insensitive" } },
      ];
    }
    const rows = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        designerStatus: true,
        createdAt: true,
        _count: { select: { designAssets: true, listings: true, orders: true, corporateRequests: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      displayName: r.displayName,
      role: r.role,
      designerStatus: r.designerStatus,
      createdAt: r.createdAt,
      designsCount: r._count.designAssets,
      listingsCount: r._count.listings,
      ordersCount: r._count.orders,
      requestsCount: r._count.corporateRequests,
    }));
  }

  async updateUserRole(actorId: string, id: string, dto: UpdateUserRoleDto, actorRole: UserRole) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    if (dto.role === UserRole.SUPER_ADMIN && actorRole !== UserRole.SUPER_ADMIN) {
      throw new BadRequestException("Only super admins can assign the SUPER_ADMIN role");
    }
    const updated = await this.prisma.user.update({ where: { id }, data: { role: dto.role } });
    await this.audit.log({
      actorId,
      action: "user.role.update",
      entityType: "User",
      entityId: id,
      metadata: { from: user.role, to: dto.role },
    });
    return updated;
  }

  async listDesigners(opts: { search?: string; limit?: number }) {
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
    const where: Prisma.UserWhereInput = { role: UserRole.DESIGNER };
    if (opts.search) {
      where.OR = [
        { email: { contains: opts.search, mode: "insensitive" } },
        { displayName: { contains: opts.search, mode: "insensitive" } },
      ];
    }
    const rows = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        email: true,
        displayName: true,
        designerStatus: true,
        createdAt: true,
        _count: { select: { designAssets: true, listings: true } },
      },
    });
    const designerIds = rows.map((r) => r.id);
    const [royalties, bonuses] = await Promise.all([
      this.prisma.royaltyLedgerEntry.groupBy({
        by: ["designerId"],
        where: { designerId: { in: designerIds }, status: { in: ["CALCULATED", "ACKNOWLEDGED", "PAIDOUT"] } },
        _sum: { amountUzs: true },
      }),
      this.prisma.designerBonus.groupBy({
        by: ["designerId"],
        where: { designerId: { in: designerIds }, status: BonusStatus.APPLIED },
        _sum: { amountUzs: true },
      }),
    ]);
    const royaltyByDesigner = new Map(royalties.map((r) => [r.designerId, this.decimal(r._sum.amountUzs)]));
    const bonusByDesigner = new Map(bonuses.map((b) => [b.designerId, this.decimal(b._sum.amountUzs)]));
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.displayName,
      displayName: r.displayName,
      status: r.designerStatus,
      createdAt: r.createdAt,
      designsCount: r._count.designAssets,
      listingsCount: r._count.listings,
      lifetimeEarningsUzs: (royaltyByDesigner.get(r.id) ?? 0) + (bonusByDesigner.get(r.id) ?? 0),
      _count: { designAssets: r._count.designAssets, listings: r._count.listings },
    }));
  }

  async listCustomers(opts: { search?: string; limit?: number; corporateOnly?: boolean }) {
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
    const where: Prisma.UserWhereInput = {
      role: opts.corporateOnly ? UserRole.CORPORATE_CLIENT : UserRole.CUSTOMER,
    };
    if (opts.search) {
      where.OR = [
        { email: { contains: opts.search, mode: "insensitive" } },
        { displayName: { contains: opts.search, mode: "insensitive" } },
      ];
    }
    const rows = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
        _count: { select: { orders: true, corporateRequests: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      displayName: r.displayName,
      role: r.role,
      createdAt: r.createdAt,
      ordersCount: r._count.orders,
      requestsCount: r._count.corporateRequests,
    }));
  }

  async getDesigner(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        preferences: true,
        designAssets: { orderBy: { createdAt: "desc" }, take: 20 },
        listings: { orderBy: { createdAt: "desc" }, take: 20 },
        royaltyLedgerEntries: { orderBy: { createdAt: "desc" }, take: 50 },
        payouts: { orderBy: { createdAt: "desc" }, take: 20 },
        bonuses: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!user || user.role !== UserRole.DESIGNER) throw new NotFoundException("Designer not found");
    const [royalties, bonuses, unpaid] = await Promise.all([
      this.prisma.royaltyLedgerEntry.aggregate({ where: { designerId: id }, _sum: { amountUzs: true } }),
      this.prisma.designerBonus.aggregate({ where: { designerId: id, status: BonusStatus.APPLIED }, _sum: { amountUzs: true } }),
      this.prisma.royaltyLedgerEntry.aggregate({ where: { designerId: id, status: { in: ["CALCULATED", "ACKNOWLEDGED"] } }, _sum: { amountUzs: true } }),
    ]);
    return {
      ...user,
      earningsSummary: {
        royaltiesUzs: this.decimal(royalties._sum.amountUzs),
        bonusesUzs: this.decimal(bonuses._sum.amountUzs),
        unpaidUzs: this.decimal(unpaid._sum.amountUzs),
      },
    };
  }

  async updateDesignerStatus(actorId: string, id: string, dto: UpdateDesignerStatusDto) {
    const designer = await this.prisma.user.findUnique({ where: { id } });
    if (!designer || designer.role !== UserRole.DESIGNER) throw new NotFoundException("Designer not found");
    const status = dto.status as DesignerStatus;
    const updated = await this.prisma.user.update({ where: { id }, data: { designerStatus: status } });
    await this.audit.log({
      actorId,
      action: "designer.status.update",
      entityType: "User",
      entityId: id,
      metadata: { previousStatus: designer.designerStatus, status, reason: dto.reason },
    });
    return updated;
  }

  async grantDesignerBonus(actorId: string, designerId: string, dto: GrantDesignerBonusDto) {
    const designer = await this.prisma.user.findUnique({ where: { id: designerId } });
    if (!designer || designer.role !== UserRole.DESIGNER) throw new NotFoundException("Designer not found");
    const currency = (dto.currency || PRIMARY_CURRENCY).toUpperCase();
    const amount = new Prisma.Decimal(dto.amount);
    const amountUzs = await this.currency.convertToUzs(amount, currency);
    const bonus = await this.prisma.$transaction(async (tx) => {
      const ledger = await tx.ledgerEntry.create({
        data: {
          type: LedgerEntryType.BONUS,
          status: LedgerEntryStatus.POSTED,
          designerId,
          amount,
          currency,
          amountUzs,
          description: dto.reason,
          postedAt: new Date(),
        },
      });
      return tx.designerBonus.create({
        data: {
          designerId,
          ledgerEntryId: ledger.id,
          createdById: actorId,
          type: BonusType.MANUAL,
          status: BonusStatus.APPLIED,
          amount,
          currency,
          amountUzs,
          reason: dto.reason,
          appliedAt: new Date(),
        },
      });
    });
    await this.audit.log({ actorId, action: "designer.bonus.grant", entityType: "DesignerBonus", entityId: bonus.id, metadata: { designerId, amount: dto.amount, currency, amountUzs: amountUzs.toString(), reason: dto.reason } });
    return bonus;
  }

  async grantGroupBonus(actorId: string, dto: GrantGroupBonusDto) {
    const designerIds = [...new Set(dto.designerIds)].filter(Boolean);
    if (!designerIds.length) throw new BadRequestException("designerIds cannot be empty");
    const designers = await this.prisma.user.findMany({ where: { id: { in: designerIds }, role: UserRole.DESIGNER }, select: { id: true } });
    if (designers.length !== designerIds.length) throw new BadRequestException("All group bonus recipients must be designers");
    const currency = (dto.currency || PRIMARY_CURRENCY).toUpperCase();
    const amount = new Prisma.Decimal(dto.amount);
    const amountUzs = await this.currency.convertToUzs(amount, currency);
    const group = await this.prisma.$transaction(async (tx) => {
      const created = await tx.groupBonus.create({
        data: {
          name: dto.name || `Group bonus ${new Date().toISOString().slice(0, 10)}`,
          type: BonusType.GROUP,
          status: BonusStatus.APPLIED,
          amountPerDesigner: amount,
          currency,
          amountPerDesignerUzs: amountUzs,
          reason: dto.reason,
          createdById: actorId,
          appliedAt: new Date(),
          criteriaJson: { designerIds },
        },
      });
      for (const designer of designers) {
        const ledger = await tx.ledgerEntry.create({
          data: { type: LedgerEntryType.BONUS, status: LedgerEntryStatus.POSTED, designerId: designer.id, amount, currency, amountUzs, description: dto.reason, postedAt: new Date(), metadataJson: { groupBonusId: created.id } },
        });
        await tx.designerBonus.create({
          data: { designerId: designer.id, groupBonusId: created.id, ledgerEntryId: ledger.id, createdById: actorId, type: BonusType.GROUP, status: BonusStatus.APPLIED, amount, currency, amountUzs, reason: dto.reason, appliedAt: new Date() },
        });
      }
      return created;
    });
    await this.audit.log({ actorId, action: "designer.group-bonus.grant", entityType: "GroupBonus", entityId: group.id, metadata: { designerIds, amount: dto.amount, currency, amountUzs: amountUzs.toString(), reason: dto.reason } });
    return group;
  }

  async getCustomer(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        orders: { orderBy: { createdAt: "desc" }, take: 20 },
        corporateRequests: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }
}
