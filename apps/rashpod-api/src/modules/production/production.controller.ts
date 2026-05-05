import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { AssignProductionJobDto } from "./dto/assign-production-job.dto";
import { SubmitQcDto } from "./dto/submit-qc.dto";
import { UpdateProductionStatusDto } from "./dto/update-production-status.dto";
import { ProductionService } from "./production.service";

@Controller("production/jobs")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("production:manage")
export class ProductionController {
  constructor(private readonly production: ProductionService) {}

  @Get()
  list(@Query("queueType") queueType?: string) {
    return this.production.list(queueType);
  }

  @Patch(":id/status")
  updateStatus(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateProductionStatusDto) {
    return this.production.updateStatus(user.sub, id, dto.status);
  }

  @Post(":id/assign")
  assign(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: AssignProductionJobDto) {
    return this.production.assign(user.sub, id, dto.assigneeId, dto.note);
  }

  @Post(":id/qc")
  submitQc(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: SubmitQcDto) {
    return this.production.submitQc(user.sub, id, dto.passed, dto.note, dto.checklist);
  }
}
