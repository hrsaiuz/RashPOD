import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { CreatePlacementDto } from "./dto/create-placement.dto";
import { UpdatePlacementDto } from "./dto/update-placement.dto";
import { MockupService } from "./mockup.service";

@Controller("mockup/placements")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MockupController {
  constructor(private readonly mockupService: MockupService) {}

  @Post()
  @RequirePermission("design:create")
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePlacementDto) {
    return this.mockupService.createPlacement(user.sub, dto);
  }

  @Get(":id")
  @RequirePermission("design:read-own")
  get(@Param("id") id: string) {
    return this.mockupService.getPlacement(id);
  }

  @Patch(":id")
  @RequirePermission("design:create")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdatePlacementDto) {
    return this.mockupService.updatePlacement(user.sub, id, dto);
  }

  @Post(":id/approve")
  @RequirePermission("design:create")
  approve(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.mockupService.approvePlacement(user.sub, id);
  }

  @Post(":id/generate-preview")
  @RequirePermission("design:create")
  generatePreview(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.mockupService.generatePreview(user.sub, id);
  }

  @Post(":id/generate-listing-images")
  @RequirePermission("design:create")
  generateListingImages(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.mockupService.generateListingImages(user.sub, id);
  }

  @Post(":id/generate-film-preview")
  @RequirePermission("design:create")
  generateFilmPreview(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.mockupService.generateFilmPreview(user.sub, id);
  }

  @Post(":id/generate-production-file")
  @RequirePermission("design:create")
  generateProductionFile(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.mockupService.generateProductionFile(user.sub, id);
  }
}
