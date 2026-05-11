import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { CreateCommercialOfferDto } from "./dto/create-commercial-offer.dto";
import { CreateCorporateRequestDto } from "./dto/create-corporate-request.dto";
import { CreateDesignerBidDto } from "./dto/create-designer-bid.dto";
import { UpdateCommercialOfferDto } from "./dto/update-commercial-offer.dto";
import { UpdateCorporateRequestDto } from "./dto/update-corporate-request.dto";
import { CorporateService } from "./corporate.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CorporateController {
  constructor(private readonly corporate: CorporateService) {}

  @Post("corporate/requests")
  @RequirePermission("corporate-request:create")
  createRequest(@CurrentUser() user: RequestUser, @Body() dto: CreateCorporateRequestDto) {
    return this.corporate.createRequest(user, dto);
  }

  @Get("corporate/requests")
  @RequirePermission("corporate-request:read-own")
  listRequests(@CurrentUser() user: RequestUser) {
    return this.corporate.listRequests(user);
  }

  @Get("designer/bids")
  @RequirePermission("designer-bid:create")
  listMyBids(@CurrentUser() user: RequestUser) {
    return this.corporate.listMyBids(user);
  }

  @Get("corporate/requests/:id")
  @RequirePermission("corporate-request:read-own")
  getRequest(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.corporate.getRequest(user, id);
  }

  @Patch("corporate/requests/:id")
  @RequirePermission("corporate-request:read-own")
  updateRequest(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateCorporateRequestDto) {
    return this.corporate.updateRequest(user, id, dto);
  }

  @Post("corporate/requests/:id/bids")
  @RequirePermission("designer-bid:create")
  createBid(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: CreateDesignerBidDto) {
    return this.corporate.createBid(user, id, dto);
  }

  @Get("corporate/requests/:id/bids")
  @RequirePermission("corporate-request:read-own")
  listBids(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.corporate.listBids(user, id);
  }

  @Post("admin/corporate/bids/:id/select")
  @RequirePermission("designer-bid:manage")
  selectBid(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.corporate.selectBid(user.sub, id);
  }

  @Post("admin/commercial-offers/:requestId")
  @RequirePermission("commercial-offer:create")
  createOffer(@CurrentUser() user: RequestUser, @Param("requestId") requestId: string, @Body() dto: CreateCommercialOfferDto) {
    return this.corporate.createOffer(user.sub, requestId, dto);
  }

  @Get("admin/commercial-offers/:id")
  @RequirePermission("commercial-offer:manage")
  getOffer(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.corporate.getOffer(user.sub, id);
  }

  @Patch("admin/commercial-offers/:id")
  @RequirePermission("commercial-offer:manage")
  updateOffer(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateCommercialOfferDto) {
    return this.corporate.updateOffer(user.sub, id, dto);
  }

  @Post("admin/commercial-offers/:id/generate-pdf")
  @RequirePermission("commercial-offer:manage")
  generateOfferPdf(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.corporate.generateOfferPdf(user.sub, id);
  }

  @Post("admin/commercial-offers/:id/send")
  @RequirePermission("commercial-offer:send")
  sendOffer(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.corporate.sendOffer(user.sub, id);
  }

  @Post("corporate/commercial-offers/:id/accept")
  @RequirePermission("commercial-offer:accept-own")
  acceptOffer(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.corporate.acceptOffer(user, id);
  }

  @Post("corporate/commercial-offers/:id/reject")
  @RequirePermission("commercial-offer:accept-own")
  rejectOffer(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.corporate.rejectOffer(user, id);
  }
}
