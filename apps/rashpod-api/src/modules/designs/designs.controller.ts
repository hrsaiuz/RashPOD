import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { CreateDesignDto } from "./dto/create-design.dto";
import { CreateDesignVersionDto } from "./dto/create-design-version.dto";
import { DesignsService } from "./designs.service";

@Controller("designs")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DesignsController {
  constructor(private readonly designsService: DesignsService) {}

  @Post()
  @RequirePermission("design:create")
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateDesignDto) {
    return this.designsService.create(user.sub, dto);
  }

  @Get()
  @RequirePermission("design:read-own")
  list(@CurrentUser() user: RequestUser) {
    return this.designsService.listOwn(user.sub);
  }

  @Post(":id/submit")
  @RequirePermission("design:submit-own")
  submit(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.designsService.submit(user.sub, id);
  }

  @Post(":id/versions")
  @RequirePermission("design:create")
  createVersion(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: CreateDesignVersionDto) {
    return this.designsService.createVersion(user.sub, id, dto);
  }
}
