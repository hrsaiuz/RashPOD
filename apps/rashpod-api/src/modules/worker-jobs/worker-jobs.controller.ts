import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { AdminOpsService } from "../admin-ops/admin-ops.service";
import { ListWorkerJobsDto } from "./dto/list-worker-jobs.dto";
import { RetryDeadLetterDto } from "./dto/retry-dead-letter.dto";
import { JobDispatcherService } from "./job-dispatcher.service";

@Controller("admin/worker-jobs")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("worker-jobs:manage")
export class WorkerJobsController {
  constructor(
    private readonly jobs: JobDispatcherService,
    private readonly adminOps: AdminOpsService,
  ) {}

  @Get()
  list(@Query() query: ListWorkerJobsDto) {
    return this.jobs.list(query);
  }

  @Get("metrics")
  metrics() {
    return this.jobs.metrics();
  }

  @Get("health")
  health() {
    return this.jobs.health(this.adminOps.getQueueAlertThresholds());
  }

  @Post("health/check")
  checkHealth(@CurrentUser() user: RequestUser) {
    return this.jobs.checkHealthAndAlert(user.sub, this.adminOps.getQueueAlertThresholds());
  }

  @Get("dead-letter")
  deadLetter() {
    return this.jobs.deadLetterList();
  }

  @Post("dead-letter/retry")
  retryDeadLetter(@CurrentUser() user: RequestUser, @Body() body: RetryDeadLetterDto) {
    return this.jobs.retryDeadLetter(user.sub, body.ids);
  }

  @Post(":id/retry")
  retry(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.jobs.retry(user.sub, id);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.jobs.getById(id);
  }

  @Post(":id/cancel")
  cancel(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.jobs.cancel(user.sub, id);
  }
}
