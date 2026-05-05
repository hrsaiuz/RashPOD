import { Controller, Get, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";

@Controller("dashboard")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("designer")
  @RequirePermission("design:read-own")
  async designer(@CurrentUser() user: RequestUser) {
    const [designs, listings, orders] = await Promise.all([
      this.prisma.designAsset.count({ where: { designerId: user.sub } }),
      this.prisma.commerceListing.count({ where: { designerId: user.sub } }),
      this.prisma.orderItem.count({ where: { listing: { designerId: user.sub } } }),
    ]);
    return { designs, listings, soldItems: orders };
  }

  @Get("customer")
  @RequirePermission("order:manage-own")
  async customer(@CurrentUser() user: RequestUser) {
    const [orders, cartItems] = await Promise.all([
      this.prisma.order.count({ where: { customerId: user.sub } }),
      this.prisma.cartItem.count({ where: { cart: { customerId: user.sub } } }),
    ]);
    return { orders, cartItems };
  }

  @Get("moderator")
  @RequirePermission("design:moderate")
  async moderator() {
    const [submitted, needsFix] = await Promise.all([
      this.prisma.designAsset.count({ where: { status: "SUBMITTED" } }),
      this.prisma.designAsset.count({ where: { status: "NEEDS_FIX" } }),
    ]);
    return { submitted, needsFix };
  }

  @Get("production")
  @RequirePermission("production:manage")
  async production() {
    const [total, printing, qc] = await Promise.all([
      this.prisma.productionJob.count(),
      this.prisma.productionJob.count({ where: { status: "PRINTING" } }),
      this.prisma.productionJob.count({ where: { status: "QC" } }),
    ]);
    return { total, printing, qc };
  }

  @Get("admin")
  @RequirePermission("product-type:manage")
  async admin() {
    const [users, listings, orders, failedJobs] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.commerceListing.count(),
      this.prisma.order.count(),
      this.prisma.workerJob.count({ where: { status: "FAILED" } }),
    ]);
    return { users, listings, orders, failedJobs };
  }
}
