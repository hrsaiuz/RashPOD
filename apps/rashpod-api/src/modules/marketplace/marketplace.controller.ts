import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { MarketplaceService } from "./marketplace.service";

@Controller("admin/marketplace")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get("overview")
  @RequirePermission("marketplace:read")
  overview() {
    return this.marketplace.overview();
  }

  @Get("configs")
  @RequirePermission("marketplace:read")
  listConfigs() {
    return this.marketplace.listConfigs();
  }

  @Post("configs")
  @RequirePermission("marketplace:manage-settings")
  createConfig(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.marketplace.createConfig(user.sub, body);
  }

  @Patch("configs/:id")
  @RequirePermission("marketplace:manage-settings")
  updateConfig(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.marketplace.updateConfig(user.sub, id, body);
  }

  @Post("configs/:id/enable")
  @RequirePermission("marketplace:manage-settings")
  enableConfig(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.marketplace.setConfigEnabled(user.sub, id, true);
  }

  @Post("configs/:id/disable")
  @RequirePermission("marketplace:manage-settings")
  disableConfig(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.marketplace.setConfigEnabled(user.sub, id, false);
  }

  @Get("configs/:id/category-mappings")
  @RequirePermission("marketplace:read")
  listMappings(@Param("id") id: string) {
    return this.marketplace.listMappings(id);
  }

  @Post("configs/:id/category-mappings")
  @RequirePermission("marketplace:manage-mappings")
  createMapping(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.marketplace.createMapping(user.sub, id, body);
  }

  @Patch("category-mappings/:mappingId")
  @RequirePermission("marketplace:manage-mappings")
  updateMapping(@CurrentUser() user: RequestUser, @Param("mappingId") mappingId: string, @Body() body: Record<string, unknown>) {
    return this.marketplace.updateMapping(user.sub, mappingId, body);
  }

  @Delete("category-mappings/:mappingId")
  @RequirePermission("marketplace:manage-mappings")
  deleteMapping(@CurrentUser() user: RequestUser, @Param("mappingId") mappingId: string) {
    return this.marketplace.deleteMapping(user.sub, mappingId);
  }

  @Get("configs/:id/export-candidates")
  @RequirePermission("marketplace:read")
  listCandidates(@Param("id") id: string, @Query("type") type?: "PRODUCT" | "FILM", @Query("search") search?: string) {
    return this.marketplace.listCandidates(id, { type, search });
  }

  @Post("configs/:id/validate-listings")
  @RequirePermission("marketplace:create-export")
  validateListings(@Param("id") id: string, @Body() body: { listingIds?: string[] }) {
    return this.marketplace.validateListings(id, body.listingIds ?? []);
  }

  @Get("export-batches")
  @RequirePermission("marketplace:read")
  listBatches() {
    return this.marketplace.listBatches();
  }

  @Post("export-batches")
  @RequirePermission("marketplace:create-export")
  createBatch(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.marketplace.createBatch(user.sub, body);
  }

  @Get("export-batches/:id")
  @RequirePermission("marketplace:read")
  getBatch(@Param("id") id: string) {
    return this.marketplace.getBatch(id);
  }

  @Patch("export-batches/:id/items/:itemId")
  @RequirePermission("marketplace:create-export")
  updateBatchItem(@CurrentUser() user: RequestUser, @Param("itemId") itemId: string, @Body() body: Record<string, unknown>) {
    return this.marketplace.updateBatchItem(user.sub, itemId, body);
  }

  @Post("export-batches/:id/mark-ready")
  @RequirePermission("marketplace:create-export")
  markBatchReady(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.marketplace.markBatchReady(user.sub, id);
  }

  @Post("export-batches/:id/generate")
  @RequirePermission("marketplace:generate-export")
  generateBatch(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.marketplace.generateBatch(user.sub, id);
  }

  @Get("export-batches/:id/download")
  @RequirePermission("marketplace:download-export")
  getBatchDownload(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.marketplace.getBatchDownload(user.sub, id);
  }

  @Post("export-batches/:id/mark-exported")
  @RequirePermission("marketplace:generate-export")
  markBatchExported(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.marketplace.markBatchExported(user.sub, id);
  }

  @Post("export-batches/:id/cancel")
  @RequirePermission("marketplace:create-export")
  cancelBatch(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.marketplace.cancelBatch(user.sub, id);
  }

  @Get("exported-listings")
  @RequirePermission("marketplace:read")
  listExportedListings(@Query("marketplaceConfigId") marketplaceConfigId?: string, @Query("status") status?: any) {
    return this.marketplace.listExportedListings({ marketplaceConfigId, status });
  }

  @Patch("exported-listings/:id")
  @RequirePermission("marketplace:update-exported-listing")
  updateExportedListing(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.marketplace.updateExportedListing(user.sub, id, body);
  }

  @Post("exported-listings/:id/mark-listed")
  @RequirePermission("marketplace:update-exported-listing")
  markExportedListingListed(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.marketplace.markExportedListingListed(user.sub, id, body);
  }

  @Post("exported-listings/:id/archive")
  @RequirePermission("marketplace:update-exported-listing")
  archiveExportedListing(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.marketplace.archiveExportedListing(user.sub, id);
  }

  @Get("external-sales")
  @RequirePermission("marketplace:read")
  listExternalSales(@Query("marketplaceConfigId") marketplaceConfigId?: string, @Query("status") status?: any) {
    return this.marketplace.listExternalSales({ marketplaceConfigId, status });
  }

  @Post("external-sales")
  @RequirePermission("marketplace:record-external-sale")
  recordExternalSale(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.marketplace.recordExternalSale(user.sub, body);
  }

  @Post("external-sales/:id/convert-to-order")
  @RequirePermission("marketplace:convert-external-sale")
  convertExternalSale() {
    return this.marketplace.convertExternalSale();
  }

  @Get("export")
  @RequirePermission("marketplace-export:manage")
  exportGet(@CurrentUser() user: RequestUser, @Query("type") type?: "PRODUCT" | "FILM") {
    return this.marketplace.exportListings(user.sub, { type });
  }

  @Post("export")
  @RequirePermission("marketplace-export:manage")
  exportPost(@CurrentUser() user: RequestUser, @Body() body: { type?: "PRODUCT" | "FILM" }) {
    return this.marketplace.exportListings(user.sub, { type: body.type });
  }

  @Get("export/csv")
  @RequirePermission("marketplace-export:manage")
  exportCsv(@CurrentUser() user: RequestUser, @Query("type") type?: "PRODUCT" | "FILM") {
    return this.marketplace.exportListingsCsv(user.sub, { type });
  }
}
