import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { CompleteUploadDto } from "./dto/complete-upload.dto";
import { CreateUploadUrlDto } from "./dto/create-upload-url.dto";
import { FilesService } from "./files.service";

@Controller("files")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("upload-url")
  @RequirePermission("file:upload-own")
  createUploadUrl(@CurrentUser() user: RequestUser, @Body() dto: CreateUploadUrlDto) {
    return this.filesService.createUploadUrl(user.sub, dto);
  }

  @Post("complete-upload")
  @RequirePermission("file:upload-own")
  completeUpload(@CurrentUser() user: RequestUser, @Body() dto: CompleteUploadDto) {
    return this.filesService.completeUpload(user.sub, dto);
  }

  @Get(":id/signed-url")
  @RequirePermission("file:upload-own")
  getSignedUrl(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.filesService.getSignedReadUrl(user.sub, id);
  }
}
