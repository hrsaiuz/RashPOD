import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { IntakeStatus } from "@prisma/client";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { CreateContactMessageDto } from "./dto/create-contact-message.dto";
import { CreateCustomOrderRequestDto } from "./dto/create-custom-order-request.dto";
import { CreateDesignerApplicationDto } from "./dto/create-designer-application.dto";
import { UpdateIntakeStatusDto } from "./dto/update-intake-status.dto";
import { IntakeService } from "./intake.service";

@Controller("intake")
export class PublicIntakeController {
  constructor(private readonly intake: IntakeService) {}

  @Post("designer-applications")
  createDesignerApplication(@Body() dto: CreateDesignerApplicationDto) {
    return this.intake.createDesignerApplication(dto);
  }

  @Post("contact-messages")
  createContactMessage(@Body() dto: CreateContactMessageDto) {
    return this.intake.createContactMessage(dto);
  }

  @Post("custom-order-requests")
  createCustomOrderRequest(@Body() dto: CreateCustomOrderRequestDto) {
    return this.intake.createCustomOrderRequest(dto);
  }
}

@Controller("admin/intake")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminIntakeController {
  constructor(private readonly intake: IntakeService) {}

  @Get("designer-applications")
  @RequirePermission("intake:manage")
  listDesignerApplications(@Query("status") status?: IntakeStatus) {
    return this.intake.list("designer-applications", status);
  }

  @Patch("designer-applications/:id")
  @RequirePermission("intake:manage")
  updateDesignerApplication(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateIntakeStatusDto) {
    return this.intake.update("designer-applications", id, dto, user.sub);
  }

  @Get("contact-messages")
  @RequirePermission("intake:manage")
  listContactMessages(@Query("status") status?: IntakeStatus) {
    return this.intake.list("contact-messages", status);
  }

  @Patch("contact-messages/:id")
  @RequirePermission("intake:manage")
  updateContactMessage(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateIntakeStatusDto) {
    return this.intake.update("contact-messages", id, dto, user.sub);
  }

  @Get("custom-order-requests")
  @RequirePermission("intake:manage")
  listCustomOrderRequests(@Query("status") status?: IntakeStatus) {
    return this.intake.list("custom-order-requests", status);
  }

  @Patch("custom-order-requests/:id")
  @RequirePermission("intake:manage")
  updateCustomOrderRequest(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateIntakeStatusDto) {
    return this.intake.update("custom-order-requests", id, dto, user.sub);
  }
}
