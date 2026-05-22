import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { ExternalSalesService } from "./external-sales.service";

@Controller("admin/external-sales")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ExternalSalesController {
  constructor(private readonly externalSales: ExternalSalesService) {}

  @Get("overview")
  @RequirePermission("external-sales:read")
  overview() {
    return this.externalSales.overview();
  }

  @Post()
  @RequirePermission("external-sales:create")
  create(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.externalSales.createIntake(user.sub, body);
  }

  @Get()
  @RequirePermission("external-sales:read")
  list(@Query("status") status?: string, @Query("sourceType") sourceType?: string) {
    return this.externalSales.listIntakes({ status, sourceType });
  }

  @Get("mapping-suggestions")
  @RequirePermission("external-sales:read")
  mappingSuggestions(@Query("sku") sku?: string, @Query("externalListingId") externalListingId?: string, @Query("exportedListingId") exportedListingId?: string) {
    return this.externalSales.mappingSuggestions({ sku, externalListingId, exportedListingId });
  }

  @Get("duplicates")
  @RequirePermission("external-sales:read")
  duplicates() {
    return this.externalSales.listDuplicates();
  }

  @Post("imports/upload")
  @RequirePermission("external-sales:import")
  uploadImport(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.externalSales.createImport(user.sub, body);
  }

  @Post("imports/:importId/parse")
  @RequirePermission("external-sales:import")
  parseImport(@CurrentUser() user: RequestUser, @Param("importId") importId: string, @Body() body: Record<string, unknown>) {
    return this.externalSales.parseImport(user.sub, importId, body);
  }

  @Post("imports/:importId/map-columns")
  @RequirePermission("external-sales:import")
  mapColumns(@CurrentUser() user: RequestUser, @Param("importId") importId: string, @Body() body: Record<string, unknown>) {
    return this.externalSales.mapImportColumns(user.sub, importId, body);
  }

  @Post("imports/:importId/validate")
  @RequirePermission("external-sales:import")
  validateImport(@CurrentUser() user: RequestUser, @Param("importId") importId: string, @Body() body: Record<string, unknown>) {
    return this.externalSales.validateImport(user.sub, importId, body);
  }

  @Post("imports/:importId/import-rows")
  @RequirePermission("external-sales:import")
  importRows(@CurrentUser() user: RequestUser, @Param("importId") importId: string, @Body() body: Record<string, unknown>) {
    return this.externalSales.importRows(user.sub, importId, body);
  }

  @Get("imports/:importId")
  @RequirePermission("external-sales:read")
  getImport(@Param("importId") importId: string) {
    return this.externalSales.getImport(importId);
  }

  @Get(":id")
  @RequirePermission("external-sales:read")
  get(@Param("id") id: string) {
    return this.externalSales.getIntake(id);
  }

  @Patch(":id")
  @RequirePermission("external-sales:create")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.externalSales.updateIntake(user.sub, id, body);
  }

  @Post(":id/validate")
  @RequirePermission("external-sales:create")
  validate(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.externalSales.validateIntake(user.sub, id, body);
  }

  @Post(":id/convert-to-order")
  @RequirePermission("external-sales:convert-to-order")
  convert(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.externalSales.convertToOrder(user.sub, id, body);
  }

  @Post(":id/cancel")
  @RequirePermission("external-sales:cancel")
  cancel(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.externalSales.cancelIntake(user.sub, id, body);
  }

  @Post(":id/items/:itemId/map")
  @RequirePermission("external-sales:map-items")
  mapItem(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("itemId") itemId: string, @Body() body: Record<string, unknown>) {
    return this.externalSales.mapItem(user.sub, id, itemId, body);
  }

  @Post(":id/items/:itemId/unmap")
  @RequirePermission("external-sales:map-items")
  unmapItem(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("itemId") itemId: string) {
    return this.externalSales.unmapItem(user.sub, id, itemId);
  }

  @Post(":id/mark-duplicate")
  @RequirePermission("external-sales:resolve-duplicates")
  markDuplicate(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.externalSales.markDuplicate(user.sub, id, body);
  }

  @Post(":id/mark-not-duplicate")
  @RequirePermission("external-sales:resolve-duplicates")
  markNotDuplicate(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.externalSales.markNotDuplicate(user.sub, id, body);
  }

  @Post(":id/mark-paid-externally")
  @RequirePermission("external-sales:mark-paid")
  markPaid(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.externalSales.markPaidExternally(user.sub, id, body);
  }

  @Post(":id/mark-refunded-externally")
  @RequirePermission("external-sales:mark-paid")
  markRefunded(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.externalSales.markRefundedExternally(user.sub, id, body);
  }
}
