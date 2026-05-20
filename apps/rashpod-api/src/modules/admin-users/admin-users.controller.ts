import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { AdminUsersService } from "./admin-users.service";
import { GrantDesignerBonusDto, GrantGroupBonusDto } from "./dto/grant-designer-bonus.dto";
import { UpdateDesignerStatusDto } from "./dto/update-designer-status.dto";

@Controller("admin/users")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get("designers")
  @RequirePermission("user:manage")
  listDesigners(@Query("search") search?: string, @Query("limit") limit?: string) {
    return this.service.listDesigners({ search, limit: limit ? Number(limit) : undefined });
  }

  @Get("designers/:id")
  @RequirePermission("user:manage")
  getDesigner(@Param("id") id: string) {
    return this.service.getDesigner(id);
  }

  @Patch("designers/:id/status")
  @RequirePermission("user:manage")
  updateDesignerStatus(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateDesignerStatusDto) {
    return this.service.updateDesignerStatus(user.sub, id, dto);
  }

  @Post("designers/:id/bonus")
  @RequirePermission("user:manage")
  grantDesignerBonus(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: GrantDesignerBonusDto) {
    return this.service.grantDesignerBonus(user.sub, id, dto);
  }

  @Post("designers/group-bonus")
  @RequirePermission("user:manage")
  grantGroupBonus(@CurrentUser() user: RequestUser, @Body() dto: GrantGroupBonusDto) {
    return this.service.grantGroupBonus(user.sub, dto);
  }

  @Get("customers")
  @RequirePermission("user:manage")
  listCustomers(
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("corporate") corporate?: string,
  ) {
    return this.service.listCustomers({
      search,
      limit: limit ? Number(limit) : undefined,
      corporateOnly: corporate === "true",
    });
  }

  @Get("customers/:id")
  @RequirePermission("user:manage")
  getCustomer(@Param("id") id: string) {
    return this.service.getCustomer(id);
  }
}
