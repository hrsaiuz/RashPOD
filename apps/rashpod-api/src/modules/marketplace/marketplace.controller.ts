import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { MarketplaceService } from "./marketplace.service";

@Controller("admin/marketplace")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("marketplace-export:manage")
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get("export")
  exportGet(@CurrentUser() user: RequestUser, @Query("type") type?: "PRODUCT" | "FILM") {
    return this.marketplace.exportListings(user.sub, { type });
  }

  @Post("export")
  exportPost(@CurrentUser() user: RequestUser, @Body() body: { type?: "PRODUCT" | "FILM" }) {
    return this.marketplace.exportListings(user.sub, { type: body.type });
  }

  @Get("export/csv")
  exportCsv(@CurrentUser() user: RequestUser, @Query("type") type?: "PRODUCT" | "FILM") {
    return this.marketplace.exportListingsCsv(user.sub, { type });
  }
}
