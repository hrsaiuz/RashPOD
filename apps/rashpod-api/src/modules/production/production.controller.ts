import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { AssignProductionJobDto } from "./dto/assign-production-job.dto";
import { ListProductionItemsDto } from "./dto/list-production-items.dto";
import { ProductionFileRequestDto, ProductionFulfillmentDto, ProductionNoteDto, ProductionQcDecisionDto, ProductionReasonDto } from "./dto/production-action.dto";
import { SubmitQcDto } from "./dto/submit-qc.dto";
import { UpdateProductionStatusDto } from "./dto/update-production-status.dto";
import { ProductionService } from "./production.service";

type AuthenticatedRequest = { user?: { id?: string } };

@Controller("production")
export class ProductionController {
  constructor(private readonly production: ProductionService) {}

  @Get("overview")
  @RequirePermission("production:read")
  overview() {
    return this.production.overview();
  }

  @Get("jobs")
  @RequirePermission("production:read")
  listJobs(@Query() query: ListProductionItemsDto) {
    return this.production.list(query);
  }

  @Get("items")
  @RequirePermission("production:read")
  listItems(@Query() query: ListProductionItemsDto) {
    return this.production.list(query);
  }

  @Get("jobs/:id")
  @RequirePermission("production:read")
  getJob(@Param("id") id: string) {
    return this.production.get(id);
  }

  @Get("items/:id")
  @RequirePermission("production:read")
  getItem(@Param("id") id: string) {
    return this.production.get(id);
  }

  @Patch("jobs/:id/status")
  @RequirePermission("production:update-status")
  updateJobStatus(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: UpdateProductionStatusDto) {
    return this.production.updateStatus(req.user?.id ?? "system", id, dto);
  }

  @Patch("items/:id/status")
  @RequirePermission("production:update-status")
  updateItemStatus(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: UpdateProductionStatusDto) {
    return this.production.updateStatus(req.user?.id ?? "system", id, dto);
  }

  @Post("jobs/:id/assign")
  @RequirePermission("production:assign")
  assignJob(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: AssignProductionJobDto) {
    return this.production.assign(req.user?.id ?? "system", id, dto.assigneeId, dto.note);
  }

  @Patch("items/:id/assign")
  @RequirePermission("production:assign")
  assignItem(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: AssignProductionJobDto) {
    return this.production.assign(req.user?.id ?? "system", id, dto.assigneeId, dto.note);
  }

  @Patch("items/:id/block")
  @RequirePermission("production:update-status")
  block(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ProductionReasonDto) {
    return this.production.block(req.user?.id ?? "system", id, dto);
  }

  @Patch("items/:id/cancel")
  @RequirePermission("production:cancel")
  cancel(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ProductionReasonDto) {
    return this.production.cancel(req.user?.id ?? "system", id, dto);
  }

  @Patch("items/:id/notes")
  @RequirePermission("production:update-status")
  note(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ProductionNoteDto) {
    return this.production.addNote(req.user?.id ?? "system", id, dto);
  }

  @Post("items/:id/request-file")
  @RequirePermission("production:request-file-generation")
  requestFile(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ProductionFileRequestDto) {
    return this.production.requestFile(req.user?.id ?? "system", id, dto, false);
  }

  @Post("items/:id/retry-file")
  @RequirePermission("production:request-file-generation")
  retryFile(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ProductionFileRequestDto) {
    return this.production.requestFile(req.user?.id ?? "system", id, dto, true);
  }

  @Get("items/:id/download-file")
  @RequirePermission("production:download-file")
  downloadFile(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.production.downloadFile(req.user?.id ?? "system", id);
  }

  @Post("jobs/:id/qc")
  @RequirePermission("production:qc")
  submitQc(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: SubmitQcDto) {
    return this.production.submitQc(req.user?.id ?? "system", id, dto.passed, dto.note, dto.checklist);
  }

  @Post("items/:id/qc/pass")
  @RequirePermission("production:qc")
  passQc(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ProductionQcDecisionDto) {
    return this.production.passQc(req.user?.id ?? "system", id, dto);
  }

  @Post("items/:id/qc/fail")
  @RequirePermission("production:qc")
  failQc(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ProductionQcDecisionDto) {
    return this.production.failQc(req.user?.id ?? "system", id, dto);
  }

  @Post("items/:id/reprint")
  @RequirePermission("production:qc")
  reprint(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ProductionReasonDto) {
    return this.production.requestReprint(req.user?.id ?? "system", id, dto);
  }

  @Post("items/:id/ready-for-pickup")
  @RequirePermission("production:update-status")
  readyForPickup(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ProductionFulfillmentDto) {
    return this.production.readyForPickup(req.user?.id ?? "system", id, dto);
  }

  @Post("items/:id/ready-for-delivery")
  @RequirePermission("production:update-status")
  readyForDelivery(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ProductionFulfillmentDto) {
    return this.production.readyForDelivery(req.user?.id ?? "system", id, dto);
  }

  @Post("items/:id/out-for-delivery")
  @RequirePermission("production:update-status")
  outForDelivery(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ProductionFulfillmentDto) {
    return this.production.outForDelivery(req.user?.id ?? "system", id, dto);
  }

  @Post("items/:id/delivered")
  @RequirePermission("production:update-status")
  delivered(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ProductionFulfillmentDto) {
    return this.production.delivered(req.user?.id ?? "system", id, dto);
  }

  @Post("items/:id/complete")
  @RequirePermission("production:update-status")
  complete(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ProductionFulfillmentDto) {
    return this.production.complete(req.user?.id ?? "system", id, dto);
  }
}
