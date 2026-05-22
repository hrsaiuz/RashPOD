import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { CreateManualSupportTicketDto, CreateSupportMessageDto, ListSupportTicketsDto, UpdateSupportTicketDto } from "./dto/support.dto";
import { SupportService } from "./support.service";

@Controller("support")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get("kpis")
  @RequirePermission("support:tickets-read")
  kpis() {
    return this.support.kpis();
  }

  @Get("tickets")
  @RequirePermission("support:tickets-read")
  list(@Query() query: ListSupportTicketsDto) {
    return this.support.list(query);
  }

  @Post("tickets")
  @RequirePermission("support:tickets-manage")
  createManual(@CurrentUser() user: RequestUser, @Body() dto: CreateManualSupportTicketDto) {
    return this.support.createManual(user.sub, dto);
  }

  @Get("tickets/:id")
  @RequirePermission("support:tickets-read")
  get(@Param("id") id: string) {
    return this.support.get(id);
  }

  @Patch("tickets/:id")
  @RequirePermission("support:tickets-manage")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateSupportTicketDto) {
    return this.support.update(user.sub, id, dto);
  }

  @Post("tickets/:id/messages")
  @RequirePermission("support:tickets-message")
  addMessage(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: CreateSupportMessageDto) {
    return this.support.addMessage(user.sub, user.role, id, dto);
  }
}
