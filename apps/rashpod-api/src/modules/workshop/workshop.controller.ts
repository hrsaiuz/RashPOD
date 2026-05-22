import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import {
  WorkshopActionDto,
  WorkshopEvidenceCompleteDto,
  WorkshopEvidenceSignUploadDto,
  WorkshopFulfillmentDto,
  WorkshopIssueDto,
  WorkshopPackItemDto,
  WorkshopQcDto,
  WorkshopQueueDto,
  WorkshopResolveIssueDto,
  WorkshopScanDto,
  WorkshopStatusDto,
} from "./dto/workshop.dto";
import { WorkshopService } from "./workshop.service";

type RequestWithMeta = { headers?: Record<string, string | string[] | undefined>; ip?: string };

@Controller("workshop")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WorkshopController {
  constructor(private readonly workshop: WorkshopService) {}

  @Get("overview")
  @RequirePermission("workshop:read")
  overview(@CurrentUser() user: RequestUser) {
    return this.workshop.overview(user.sub);
  }

  @Get("queue")
  @RequirePermission("workshop:read")
  queue(@CurrentUser() user: RequestUser, @Query() query: WorkshopQueueDto) {
    return this.workshop.queue(user.sub, query);
  }

  @Get("items/:id")
  @RequirePermission("workshop:read")
  item(@Param("id") id: string) {
    return this.workshop.getItem(id);
  }

  @Get("items/by-code/:code")
  @RequirePermission("workshop:scan")
  byCode(@CurrentUser() user: RequestUser, @Param("code") code: string, @Req() req: RequestWithMeta) {
    return this.workshop.lookupByCode(user.sub, code, this.meta(req));
  }

  @Post("scan")
  @RequirePermission("workshop:scan")
  scan(@CurrentUser() user: RequestUser, @Body() dto: WorkshopScanDto, @Req() req: RequestWithMeta) {
    return this.workshop.scan(user.sub, dto.code, this.meta(req));
  }

  @Get("labels/order/:orderId")
  @RequirePermission("workshop:scan")
  orderLabel(@CurrentUser() user: RequestUser, @Param("orderId") orderId: string, @Req() req: RequestWithMeta) {
    return this.workshop.label(user.sub, "order", orderId, this.meta(req));
  }

  @Get("labels/production-item/:id")
  @RequirePermission("workshop:scan")
  productionLabel(@CurrentUser() user: RequestUser, @Param("id") id: string, @Req() req: RequestWithMeta) {
    return this.workshop.label(user.sub, "production-item", id, this.meta(req));
  }

  @Get("labels/package/:id")
  @RequirePermission("workshop:scan")
  packageLabel(@CurrentUser() user: RequestUser, @Param("id") id: string, @Req() req: RequestWithMeta) {
    return this.workshop.label(user.sub, "package", id, this.meta(req));
  }

  @Post("items/:id/assign-to-me")
  @RequirePermission("workshop:assign-self")
  assignToMe(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: WorkshopActionDto, @Req() req: RequestWithMeta) {
    return this.workshop.assignToMe(user.sub, id, dto, this.meta(req));
  }

  @Post("items/:id/status")
  @RequirePermission("workshop:update-status")
  status(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: WorkshopStatusDto, @Req() req: RequestWithMeta) {
    return this.workshop.updateStatus(user.sub, id, dto, this.meta(req));
  }

  @Post("items/:id/block")
  @RequirePermission("workshop:update-status")
  block(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: WorkshopActionDto, @Req() req: RequestWithMeta) {
    return this.workshop.block(user.sub, id, dto, this.meta(req));
  }

  @Post("items/:id/request-file")
  @RequirePermission("workshop:update-status")
  requestFile(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: WorkshopActionDto, @Req() req: RequestWithMeta) {
    return this.workshop.requestFile(user.sub, id, dto, false, this.meta(req));
  }

  @Post("items/:id/retry-file")
  @RequirePermission("workshop:update-status")
  retryFile(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: WorkshopActionDto, @Req() req: RequestWithMeta) {
    return this.workshop.requestFile(user.sub, id, dto, true, this.meta(req));
  }

  @Get("items/:id/download-production-file")
  @RequirePermission("workshop:download-production-file")
  downloadFile(@CurrentUser() user: RequestUser, @Param("id") id: string, @Req() req: RequestWithMeta) {
    return this.workshop.downloadFile(user.sub, id, this.meta(req));
  }

  @Post("items/:id/qc/pass")
  @RequirePermission("workshop:qc")
  qcPass(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: WorkshopQcDto, @Req() req: RequestWithMeta) {
    return this.workshop.qcPass(user.sub, id, dto, this.meta(req));
  }

  @Post("items/:id/qc/fail")
  @RequirePermission("workshop:qc")
  qcFail(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: WorkshopQcDto, @Req() req: RequestWithMeta) {
    return this.workshop.qcFail(user.sub, id, dto, this.meta(req));
  }

  @Post("items/:id/qc/evidence/sign-upload")
  @RequirePermission("workshop:qc-evidence-upload")
  signEvidence(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: WorkshopEvidenceSignUploadDto) {
    return this.workshop.signEvidenceUpload(user.sub, id, dto);
  }

  @Post("items/:id/qc/evidence/:assetId/complete")
  @RequirePermission("workshop:qc-evidence-upload")
  completeEvidence(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("assetId") assetId: string, @Body() dto: WorkshopEvidenceCompleteDto, @Req() req: RequestWithMeta) {
    return this.workshop.completeEvidence(user.sub, id, assetId, dto, this.meta(req));
  }

  @Get("packing")
  @RequirePermission("workshop:pack")
  packing(@Query() query: WorkshopQueueDto) {
    return this.workshop.packing(query);
  }

  @Post("orders/:orderId/pack-item")
  @RequirePermission("workshop:pack")
  packItem(@CurrentUser() user: RequestUser, @Param("orderId") orderId: string, @Body() dto: WorkshopPackItemDto, @Req() req: RequestWithMeta) {
    return this.workshop.packItem(user.sub, orderId, dto, this.meta(req));
  }

  @Post("orders/:orderId/mark-packed")
  @RequirePermission("workshop:pack")
  markPacked(@CurrentUser() user: RequestUser, @Param("orderId") orderId: string, @Body() dto: WorkshopActionDto, @Req() req: RequestWithMeta) {
    return this.workshop.markOrderPacked(user.sub, orderId, dto, this.meta(req));
  }

  @Get("orders/:orderId/packing-slip")
  @RequirePermission("workshop:pack")
  packingSlip(@CurrentUser() user: RequestUser, @Param("orderId") orderId: string, @Req() req: RequestWithMeta) {
    return this.workshop.packingSlip(user.sub, orderId, this.meta(req));
  }

  @Get("pickup")
  @RequirePermission("workshop:pickup")
  pickup() {
    return this.workshop.pickupList();
  }

  @Post("orders/:orderId/picked-up")
  @RequirePermission("workshop:pickup")
  pickedUp(@CurrentUser() user: RequestUser, @Param("orderId") orderId: string, @Body() dto: WorkshopActionDto, @Req() req: RequestWithMeta) {
    return this.workshop.pickedUp(user.sub, orderId, dto, this.meta(req));
  }

  @Get("delivery")
  @RequirePermission("workshop:delivery")
  delivery() {
    return this.workshop.deliveryList();
  }

  @Post("orders/:orderId/out-for-delivery")
  @RequirePermission("workshop:delivery")
  outForDelivery(@CurrentUser() user: RequestUser, @Param("orderId") orderId: string, @Body() dto: WorkshopFulfillmentDto, @Req() req: RequestWithMeta) {
    return this.workshop.outForDelivery(user.sub, orderId, dto, this.meta(req));
  }

  @Post("orders/:orderId/delivered")
  @RequirePermission("workshop:delivery")
  delivered(@CurrentUser() user: RequestUser, @Param("orderId") orderId: string, @Body() dto: WorkshopFulfillmentDto, @Req() req: RequestWithMeta) {
    return this.workshop.delivered(user.sub, orderId, dto, this.meta(req));
  }

  @Post("orders/:orderId/delivery-failed")
  @RequirePermission("workshop:delivery")
  deliveryFailed(@CurrentUser() user: RequestUser, @Param("orderId") orderId: string, @Body() dto: WorkshopActionDto, @Req() req: RequestWithMeta) {
    return this.workshop.deliveryFailed(user.sub, orderId, dto, this.meta(req));
  }

  @Post("items/:id/issues")
  @RequirePermission("workshop:report-issue")
  createIssue(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: WorkshopIssueDto, @Req() req: RequestWithMeta) {
    return this.workshop.createIssue(user.sub, id, dto, this.meta(req));
  }

  @Get("issues")
  @RequirePermission("workshop:report-issue")
  issues(@Query("status") status?: string) {
    return this.workshop.issues(status || "OPEN");
  }

  @Post("issues/:id/resolve")
  @RequirePermission("workshop:report-issue")
  resolveIssue(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: WorkshopResolveIssueDto, @Req() req: RequestWithMeta) {
    return this.workshop.resolveIssue(user.sub, id, dto, this.meta(req));
  }

  private meta(req: RequestWithMeta) {
    return { request: req, userAgent: Array.isArray(req.headers?.["user-agent"]) ? req.headers?.["user-agent"]?.[0] : req.headers?.["user-agent"], ip: req.ip };
  }
}
