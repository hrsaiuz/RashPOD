import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { CreatePayoutDto, PayoutActionDto, ReconciliationReviewDto, RoyaltyAdjustmentDto, TrackRefundDto } from "./dto/finance.dto";
import { FinanceService } from "./finance.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get("finance/overview")
  @RequirePermission("finance:read")
  overview() {
    return this.finance.overview();
  }

  @Get("finance/orders/:orderId")
  @RequirePermission("finance:read")
  orderFinance(@Param("orderId") orderId: string) {
    return this.finance.orderFinance(orderId);
  }

  @Post("finance/orders/:orderId/refund")
  @RequirePermission("finance:manage")
  trackRefund(@CurrentUser() user: RequestUser, @Param("orderId") orderId: string, @Body() dto: TrackRefundDto) {
    return this.finance.trackRefund(user.sub, orderId, dto);
  }

  @Get("finance/royalties")
  @RequirePermission("finance:read")
  royalties(@Query("designerId") designerId?: string, @Query("status") status?: string) {
    return this.finance.listRoyalties({ designerId, status });
  }

  @Get("finance/designers/:designerId/balance")
  @RequirePermission("finance:read")
  designerBalance(@Param("designerId") designerId: string) {
    return this.finance.designerBalance(designerId);
  }

  @Post("finance/royalties/adjustment")
  @RequirePermission("finance:adjust-royalties")
  adjustment(@CurrentUser() user: RequestUser, @Body() dto: RoyaltyAdjustmentDto) {
    return this.finance.createAdjustment(user.sub, dto);
  }

  @Get("finance/payouts")
  @RequirePermission("finance:read")
  payouts() {
    return this.finance.listPayouts();
  }

  @Post("finance/payouts")
  @RequirePermission("finance:create-payout")
  createPayout(@CurrentUser() user: RequestUser, @Body() dto: CreatePayoutDto) {
    return this.finance.createPayout(user.sub, dto);
  }

  @Get("finance/payouts/:id")
  @RequirePermission("finance:read")
  payout(@Param("id") id: string) {
    return this.finance.getPayout(id);
  }

  @Post("finance/payouts/:id/approve")
  @RequirePermission("finance:approve-payout")
  approvePayout(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.finance.approvePayout(user.sub, id);
  }

  @Post("finance/payouts/:id/mark-paid")
  @RequirePermission("finance:mark-payout-paid")
  markPaid(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: PayoutActionDto) {
    return this.finance.markPayoutPaid(user.sub, id, dto);
  }

  @Post("finance/payouts/:id/cancel")
  @RequirePermission("finance:create-payout")
  cancelPayout(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: PayoutActionDto) {
    return this.finance.cancelPayout(user.sub, id, dto);
  }

  @Get("finance/payouts/:id/export")
  @RequirePermission("finance:read")
  exportPayout(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.finance.exportPayout(user.sub, id);
  }

  @Get("finance/reconciliation")
  @RequirePermission("finance:read")
  reconciliation() {
    return this.finance.listReconciliation();
  }

  @Post("finance/reconciliation/:paymentId/mark-reviewed")
  @RequirePermission("finance:reconcile-payments")
  markReviewed(@CurrentUser() user: RequestUser, @Param("paymentId") paymentId: string, @Body() dto: ReconciliationReviewDto) {
    return this.finance.markReconciliationReviewed(user.sub, paymentId, dto);
  }

  @Post("finance/reconciliation/:paymentId/mark-matched")
  @RequirePermission("finance:reconcile-payments")
  markMatched(@CurrentUser() user: RequestUser, @Param("paymentId") paymentId: string, @Body() dto: ReconciliationReviewDto) {
    return this.finance.markReconciliationMatched(user.sub, paymentId, dto);
  }

  @Get("designer/earnings")
  @RequirePermission("designer:earnings-read")
  designerEarnings(@CurrentUser() user: RequestUser) {
    return this.finance.designerEarnings(user.sub);
  }

  @Get("designer/earnings/payouts")
  @RequirePermission("designer:earnings-read")
  designerPayouts(@CurrentUser() user: RequestUser) {
    return this.finance.designerPayouts(user.sub);
  }
}
