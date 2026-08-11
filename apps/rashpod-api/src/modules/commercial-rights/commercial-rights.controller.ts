import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { RbacService } from "../../common/auth/rbac.service";
import { BulkFilmSalesAction, BulkUpdateRightsDto } from "./dto/bulk-update-rights.dto";
import { UpdateRightsDto } from "./dto/update-rights.dto";
import { CommercialRightsService } from "./commercial-rights.service";

@Controller("designs")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class BulkCommercialRightsController {
  constructor(
    private readonly service: CommercialRightsService,
    private readonly rbac: RbacService,
  ) {}

  @Patch("commercial-rights/bulk")
  @RequirePermission("rights:update-own")
  update(@CurrentUser() user: RequestUser, @Body() dto: BulkUpdateRightsDto) {
    const filmPermission =
      dto.filmSalesAction === BulkFilmSalesAction.ENABLE
        ? "rights:enable-film-own"
        : dto.filmSalesAction === BulkFilmSalesAction.DISABLE
          ? "rights:disable-film-own"
          : null;
    if (filmPermission && !this.rbac.getAllowedRoles(filmPermission).includes(user.role as UserRole)) {
      throw new ForbiddenException(`Missing permission: ${filmPermission}`);
    }
    return this.service.updateBulk(user, dto);
  }
}

@Controller("designs/:id")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CommercialRightsController {
  constructor(private readonly service: CommercialRightsService) {}

  @Get("commercial-rights")
  @RequirePermission("rights:read-own")
  get(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.service.getByDesign(id, user);
  }

  @Patch("commercial-rights")
  @RequirePermission("rights:update-own")
  update(@Param("id") id: string, @CurrentUser() user: RequestUser, @Body() dto: UpdateRightsDto) {
    return this.service.updateByDesign(id, user, dto);
  }

  @Post("enable-film-sales")
  @RequirePermission("rights:enable-film-own")
  enableFilm(@Param("id") id: string, @CurrentUser() user: RequestUser, @Body("reason") reason?: string) {
    return this.service.enableFilmSales(id, user, reason);
  }

  @Post("disable-film-sales")
  @RequirePermission("rights:disable-film-own")
  disableFilm(@Param("id") id: string, @CurrentUser() user: RequestUser, @Body("reason") reason?: string) {
    return this.service.disableFilmSales(id, user, reason);
  }
}
