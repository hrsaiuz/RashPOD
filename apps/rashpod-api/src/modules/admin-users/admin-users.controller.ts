import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { AdminUsersService } from "./admin-users.service";

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
