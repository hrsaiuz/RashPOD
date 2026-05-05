import { Body, Controller, Get, Headers, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { CreateClickPaymentDto } from "./dto/create-click-payment.dto";
import { ClickWebhookDto } from "./dto/click-webhook.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("click/create")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("order:manage-own")
  createClick(@Body() dto: CreateClickPaymentDto) {
    return this.payments.createClickPayment(dto.orderId);
  }

  @Post("click/webhook")
  clickWebhook(
    @Body() payload: ClickWebhookDto,
    @Headers("x-click-signature") signature?: string,
    @Headers("x-click-timestamp") timestamp?: string,
  ) {
    this.payments.verifyClickWebhookSignature(payload, signature, timestamp);
    return this.payments.clickWebhook(payload);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("order:manage-own")
  getPayment(@Param("id") id: string) {
    return this.payments.getPayment(id);
  }
}
