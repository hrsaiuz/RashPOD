import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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
        createdAt: true,
        _count: { select: { designAssets: true, listings: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      displayName: r.displayName,
      createdAt: r.createdAt,
      designsCount: r._count.designAssets,
      listingsCount: r._count.listings,
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
        designAssets: { orderBy: { createdAt: "desc" }, take: 20 },
        listings: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!user || user.role !== UserRole.DESIGNER) throw new NotFoundException("Designer not found");
    return user;
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
