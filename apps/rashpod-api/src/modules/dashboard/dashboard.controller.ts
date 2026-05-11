import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("designer")
  @RequirePermission("design:read-own")
  designer(@CurrentUser() user: RequestUser) {
    return this.dashboard.designerOverview(user.sub);
  }

  @Get("designer/royalties")
  @RequirePermission("design:read-own")
  designerRoyalties(@CurrentUser() user: RequestUser, @Query("limit") limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : undefined;
    return this.dashboard.designerRoyalties(user.sub, Number.isFinite(parsed) ? parsed : undefined);
  }

  @Get("customer")
  @RequirePermission("order:manage-own")
  customer(@CurrentUser() user: RequestUser) {
    return this.dashboard.customerOverview(user.sub);
  }

  @Get("moderator")
  @RequirePermission("design:moderate")
  moderator() {
    return this.dashboard.moderatorOverview();
  }

  @Get("production")
  @RequirePermission("production:manage")
  production() {
    return this.dashboard.productionOverview();
  }

  @Get("admin")
  @RequirePermission("product-type:manage")
  admin() {
    return this.dashboard.adminOverview();
  }
}
