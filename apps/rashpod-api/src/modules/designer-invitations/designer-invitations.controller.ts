import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { AcceptDesignerInvitationDto, CreateDesignerInvitationDto } from "./dto/designer-invitation.dto";
import { DesignerInvitationsService } from "./designer-invitations.service";

@Controller()
export class DesignerInvitationsController {
  constructor(private readonly invitations: DesignerInvitationsService) {}

  @Get("admin/designer-invitations")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("designer-invitations:manage")
  list(@CurrentUser() user: RequestUser) { return this.invitations.list(user); }

  @Post("admin/designer-invitations")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("designer-invitations:manage")
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateDesignerInvitationDto) { return this.invitations.create(user, dto); }

  @Post("admin/designer-invitations/:id/resend")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("designer-invitations:manage")
  resend(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.invitations.resend(user, id); }

  @Post("admin/designer-invitations/:id/revoke")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("designer-invitations:manage")
  revoke(@CurrentUser() user: RequestUser, @Param("id") id: string) { return this.invitations.revoke(user, id); }

  @Get("designer-invitations/:token")
  publicDetail(@Param("token") token: string) { return this.invitations.publicDetail(token); }

  @Post("designer-invitations/:token/accept")
  acceptNew(@Param("token") token: string, @Body() dto: AcceptDesignerInvitationDto) { return this.invitations.acceptNew(token, dto); }

  @Post("designer-invitations/:token/accept-existing")
  @UseGuards(JwtAuthGuard)
  acceptExisting(@CurrentUser() user: RequestUser, @Param("token") token: string, @Body() dto: AcceptDesignerInvitationDto) { return this.invitations.acceptExisting(user, token, dto); }
}
