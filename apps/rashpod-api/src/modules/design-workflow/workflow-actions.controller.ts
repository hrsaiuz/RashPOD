import { Controller, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { DesignWorkflowService } from "./design-workflow.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WorkflowActionsController {
  constructor(private readonly workflow: DesignWorkflowService) {}

  @Post("design-product-selections/:id/retry-mockup")
  @RequirePermission("design-workflow:retry")
  retryMockup(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.workflow.retryMockup(user.sub, id);
  }

  @Post("product-listings/:id/publish")
  @RequirePermission("marketplace-publication:publish")
  publishListing(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.workflow.publishListing(user.sub, id);
  }

  @Post("marketplace-publications/:id/retry")
  @RequirePermission("marketplace-publication:publish")
  retryMarketplacePublication(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.workflow.retryMarketplacePublication(user.sub, id);
  }
}
