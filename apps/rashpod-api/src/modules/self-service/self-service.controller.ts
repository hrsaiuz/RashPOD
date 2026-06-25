import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { DesignStoriesService } from "../design-stories/design-stories.service";
import { AttachDesignStoryMediaDto, UpsertDesignStoryDraftDto } from "../design-stories/dto/design-story.dto";
import { SupportRequestDto, UpdateCustomerProfileDto, UpdateDesignerProfileDto } from "./dto/self-service.dto";
import { AddWishlistItemDto, CreateCustomerAddressDto, UpdateCustomerAddressDto } from "./dto/customer-address.dto";
import { SelfServiceService } from "./self-service.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SelfServiceController {
  constructor(
    private readonly selfService: SelfServiceService,
    private readonly designStories: DesignStoriesService,
  ) {}

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

  @Get("customer/addresses")
  @RequirePermission("customer:profile-update")
  listCustomerAddresses(@CurrentUser() user: RequestUser) {
    return this.selfService.listCustomerAddresses(user.sub);
  }

  @Post("customer/addresses")
  @RequirePermission("customer:profile-update")
  createCustomerAddress(@CurrentUser() user: RequestUser, @Body() dto: CreateCustomerAddressDto) {
    return this.selfService.createCustomerAddress(user.sub, dto);
  }

  @Patch("customer/addresses/:id")
  @RequirePermission("customer:profile-update")
  updateCustomerAddress(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateCustomerAddressDto) {
    return this.selfService.updateCustomerAddress(user.sub, id, dto);
  }

  @Delete("customer/addresses/:id")
  @RequirePermission("customer:profile-update")
  deleteCustomerAddress(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.selfService.deleteCustomerAddress(user.sub, id);
  }

  @Post("customer/addresses/:id/set-default")
  @RequirePermission("customer:profile-update")
  setDefaultCustomerAddress(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.selfService.setDefaultCustomerAddress(user.sub, id);
  }

  @Get("customer/wishlist")
  @RequirePermission("customer:dashboard-read")
  listCustomerWishlist(@CurrentUser() user: RequestUser) {
    return this.selfService.listCustomerWishlist(user.sub);
  }

  @Post("customer/wishlist")
  @RequirePermission("customer:wishlist-manage")
  addCustomerWishlistItem(@CurrentUser() user: RequestUser, @Body() dto: AddWishlistItemDto) {
    return this.selfService.addCustomerWishlistItem(user.sub, dto);
  }

  @Delete("customer/wishlist/:listingId")
  @RequirePermission("customer:wishlist-manage")
  removeCustomerWishlistItem(@CurrentUser() user: RequestUser, @Param("listingId") listingId: string) {
    return this.selfService.removeCustomerWishlistItem(user.sub, listingId);
  }

  @Get("customer/wishlist/:listingId/status")
  @RequirePermission("customer:dashboard-read")
  wishlistStatus(@CurrentUser() user: RequestUser, @Param("listingId") listingId: string) {
    return this.selfService.isListingWishlisted(user.sub, listingId);
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

  @Get("designer/designs/:id/story")
  @RequirePermission("designer:designs-read-own")
  designerDesignStory(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.designStories.getDesignerStory(user.sub, id);
  }

  @Post("designer/designs/:id/story")
  @RequirePermission("designer:designs-read-own")
  upsertDesignerDesignStory(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpsertDesignStoryDraftDto) {
    return this.designStories.upsertDraft(user.sub, id, dto);
  }

  @Post("designer/designs/:id/story/media")
  @RequirePermission("designer:designs-read-own")
  attachDesignerDesignStoryMedia(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: AttachDesignStoryMediaDto) {
    return this.designStories.attachMedia(user.sub, id, dto);
  }

  @Post("designer/designs/:id/story/request-publish")
  @RequirePermission("designer:designs-read-own")
  requestDesignerDesignStoryPublish(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.designStories.requestPublish(user.sub, id);
  }

  @Post("designer/designs/:id/story/regenerate-qr")
  @RequirePermission("designer:designs-read-own")
  regenerateDesignerDesignStoryQr(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.designStories.regenerateQr(user.sub, id);
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
