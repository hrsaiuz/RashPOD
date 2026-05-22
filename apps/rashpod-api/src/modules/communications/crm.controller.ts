import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { CreateCrmContactLogDto, CreateCrmNoteDto, ListCrmProfilesDto, UpsertCrmTagDto } from "./dto/crm.dto";
import { CrmService } from "./crm.service";

@Controller("crm")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get("profiles")
  @RequirePermission("crm:profiles-read")
  profiles(@Query() query: ListCrmProfilesDto) {
    return this.crm.listProfiles(query);
  }

  @Get("profiles/:id")
  @RequirePermission("crm:profiles-read")
  profile(@Param("id") id: string) {
    return this.crm.getProfile(id);
  }

  @Post("profiles/:id/notes")
  @RequirePermission("crm:profiles-manage")
  addNote(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: CreateCrmNoteDto) {
    return this.crm.addNote(user.sub, id, dto);
  }

  @Post("profiles/:id/contact-logs")
  @RequirePermission("crm:profiles-manage")
  addContact(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: CreateCrmContactLogDto) {
    return this.crm.addContact(user.sub, id, dto);
  }

  @Get("tags")
  @RequirePermission("crm:profiles-read")
  tags() {
    return this.crm.listTags();
  }

  @Post("tags")
  @RequirePermission("crm:profiles-manage")
  upsertTag(@CurrentUser() user: RequestUser, @Body() dto: UpsertCrmTagDto) {
    return this.crm.upsertTag(user.sub, dto);
  }

  @Post("profiles/:id/tags/:key")
  @RequirePermission("crm:profiles-manage")
  assignTag(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("key") key: string) {
    return this.crm.assignTag(user.sub, id, key);
  }

  @Delete("profiles/:id/tags/:key")
  @RequirePermission("crm:profiles-manage")
  removeTag(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("key") key: string) {
    return this.crm.removeTag(user.sub, id, key);
  }
}
