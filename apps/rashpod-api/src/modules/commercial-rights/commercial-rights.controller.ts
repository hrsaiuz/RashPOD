import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { UpdateRightsDto } from "./dto/update-rights.dto";
import { CommercialRightsService } from "./commercial-rights.service";

@Controller("designs/:id")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CommercialRightsController {
  constructor(private readonly service: CommercialRightsService) {}

  @Get("commercial-rights")
  @RequirePermission("rights:update-own")
  get(@Param("id") id: string) {
    return this.service.getByDesign(id);
  }

  @Patch("commercial-rights")
  @RequirePermission("rights:update-own")
  update(@Param("id") id: string, @CurrentUser() user: RequestUser, @Body() dto: UpdateRightsDto) {
    return this.service.updateByDesign(id, user, dto);
  }

  @Post("enable-film-sales")
  @RequirePermission("rights:enable-film-own")
  enableFilm(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.service.enableFilmSales(id, user);
  }

  @Post("disable-film-sales")
  @RequirePermission("rights:disable-film-own")
  disableFilm(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.service.disableFilmSales(id, user);
  }
}
