import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { SupportRequestDto, UpdateCustomerProfileDto, UpdateDesignerProfileDto } from "./dto/self-service.dto";
import { SelfServiceService } from "./self-service.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SelfServiceController {
  constructor(private readonly selfService: SelfServiceService) {}

  @Get("customer/dashboard")
  @RequirePermission("customer:dashboard-read")
  customerDashboard(@CurrentUser() user: RequestUser) {
    return this.selfService.customerDashboard(user.sub);
  }

  @Get("customer/orders")
  @RequirePermission("customer:orders-read")
  customerOrders(@CurrentUser() user: RequestUser) {
    return this.selfService.customerOrders(user.sub);
  }

  @Get("customer/orders/:id")
  @RequirePermission("customer:orders-read")
  customerOrder(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.selfService.customerOrder(user.sub, id);
  }

  @Post("customer/orders/:id/retry-payment")
  @RequirePermission("customer:payment-retry")
  retryCustomerPayment(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.selfService.retryCustomerPayment(user.sub, id);
  }

  @Post("customer/orders/:id/support-request")
  @RequirePermission("customer:support-create")
  createCustomerSupportRequest(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: SupportRequestDto) {
    return this.selfService.createCustomerSupportRequest(user.sub, id, dto);
  }

  @Get("customer/profile")
  @RequirePermission("customer:dashboard-read")
  customerProfile(@CurrentUser() user: RequestUser) {
    return this.selfService.customerProfile(user.sub);
  }

  @Patch("customer/profile")
  @RequirePermission("customer:profile-update")
  updateCustomerProfile(@CurrentUser() user: RequestUser, @Body() dto: UpdateCustomerProfileDto) {
    return this.selfService.updateCustomerProfile(user.sub, dto);
  }

  @Get("designer/dashboard")
  @RequirePermission("designer:dashboard-read")
  designerDashboard(@CurrentUser() user: RequestUser) {
    return this.selfService.designerDashboard(user.sub);
  }

  @Get("designer/designs")
  @RequirePermission("designer:designs-read-own")
  designerDesigns(@CurrentUser() user: RequestUser, @Query("status") status?: string) {
    return this.selfService.designerDesigns(user.sub, status);
  }

  @Get("designer/designs/:id")
  @RequirePermission("designer:designs-read-own")
  designerDesign(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.selfService.designerDesign(user.sub, id);
  }

  @Post("designer/designs/:id/archive")
  @RequirePermission("designer:designs-archive-own")
  archiveDesignerDesign(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.selfService.archiveDesignerDesign(user.sub, id);
  }

  @Get("designer/listings")
  @RequirePermission("designer:listings-read-own")
  designerListings(@CurrentUser() user: RequestUser) {
    return this.selfService.designerListings(user.sub);
  }

  @Get("designer/listings/:id")
  @RequirePermission("designer:listings-read-own")
  designerListing(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.selfService.designerListing(user.sub, id);
  }

  @Get("designer/profile")
  @RequirePermission("designer:dashboard-read")
  designerProfile(@CurrentUser() user: RequestUser) {
    return this.selfService.designerProfile(user.sub);
  }

  @Patch("designer/profile")
  @RequirePermission("designer:profile-update")
  updateDesignerProfile(@CurrentUser() user: RequestUser, @Body() dto: UpdateDesignerProfileDto) {
    return this.selfService.updateDesignerProfile(user.sub, dto);
  }

  @Post("designer/support-request")
  @RequirePermission("designer:support-create")
  createDesignerSupportRequest(@CurrentUser() user: RequestUser, @Body() dto: SupportRequestDto) {
    return this.selfService.createDesignerSupportRequest(user.sub, dto);
  }
}
