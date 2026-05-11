import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { MediaCategory } from "@prisma/client";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { MediaService } from "./media.service";
import { CreateMediaUploadUrlDto } from "./dto/create-media-upload-url.dto";
import { CompleteMediaUploadDto } from "./dto/complete-media-upload.dto";
import { UpdateMediaAssetDto } from "./dto/update-media-asset.dto";

@Controller("admin/media")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminMediaController {
  constructor(private readonly service: MediaService) {}

  @Post("upload-url")
  @RequirePermission("media:manage")
  createUploadUrl(@CurrentUser() user: RequestUser, @Body() dto: CreateMediaUploadUrlDto) {
    return this.service.createUploadUrl(user.sub, dto);
  }

  @Post("complete")
  @RequirePermission("media:manage")
  complete(@CurrentUser() user: RequestUser, @Body() dto: CompleteMediaUploadDto) {
    return this.service.completeUpload(user.sub, dto);
  }

  @Get()
  @RequirePermission("media:manage")
  list(@Query("category") category?: string, @Query("activeOnly") activeOnly?: string) {
    const cat =
      category && (Object.values(MediaCategory) as string[]).includes(category)
        ? (category as MediaCategory)
        : undefined;
    return this.service.list({ category: cat, activeOnly: activeOnly === "true" });
  }

  @Patch(":id")
  @RequirePermission("media:manage")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateMediaAssetDto) {
    return this.service.update(user.sub, id, dto);
  }

  @Delete(":id")
  @RequirePermission("media:manage")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.remove(user.sub, id);
  }
}

@Controller("admin/branding")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminBrandingController {
  constructor(private readonly service: MediaService) {}

  @Get()
  @RequirePermission("branding:manage")
  get() {
    return this.service.branding();
  }

  @Patch("theme")
  @RequirePermission("branding:manage")
  updateTheme(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.service.updateBrandingTheme(user.sub, body || {});
  }
}

@Controller("branding")
export class PublicBrandingController {
  constructor(private readonly service: MediaService) {}

  @Get()
  get() {
    return this.service.branding();
  }
}
