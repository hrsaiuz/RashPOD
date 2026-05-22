import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { PodService } from "./pod.service";

@Controller()
export class PodController {
  constructor(private readonly pod: PodService) {}

  @Get("admin/pod/overview")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:read")
  overview() {
    return this.pod.overview();
  }

  @Get("admin/pod/providers")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:read")
  listProviders() {
    return this.pod.listProviders();
  }

  @Post("admin/pod/providers")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:manage-providers")
  createProvider(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.pod.createProvider(user.sub, body);
  }

  @Patch("admin/pod/providers/:id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:manage-providers")
  updateProvider(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.pod.updateProvider(user.sub, id, body);
  }

  @Post("admin/pod/providers/:id/enable")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:manage-providers")
  enableProvider(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.pod.setProviderEnabled(user.sub, id, true);
  }

  @Post("admin/pod/providers/:id/disable")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:manage-providers")
  disableProvider(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.pod.setProviderEnabled(user.sub, id, false);
  }

  @Post("admin/pod/providers/:id/validate-config")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:manage-providers")
  validateProvider(@Param("id") id: string) {
    return this.pod.validateProviderConfig(id);
  }

  @Post("admin/pod/providers/:id/sync-catalog")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:sync-catalog")
  syncCatalog(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.pod.syncCatalog(user.sub, id);
  }

  @Get("admin/pod/catalog")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:read")
  listCatalog(@Query("providerConfigId") providerConfigId?: string, @Query("availabilityStatus") availabilityStatus?: string, @Query("mapped") mapped?: string) {
    return this.pod.listCatalog({ providerConfigId, availabilityStatus, mapped });
  }

  @Get("admin/pod/catalog/:id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:read")
  getCatalogProduct(@Param("id") id: string) {
    return this.pod.getCatalogProduct(id);
  }

  @Get("admin/pod/product-mappings")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:read")
  listProductMappings(@Query("providerConfigId") providerConfigId?: string) {
    return this.pod.listProductMappings(providerConfigId);
  }

  @Post("admin/pod/product-mappings")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:manage-product-mappings")
  createProductMapping(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.pod.createProductMapping(user.sub, body);
  }

  @Patch("admin/pod/product-mappings/:id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:manage-product-mappings")
  updateProductMapping(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.pod.updateProductMapping(user.sub, id, body);
  }

  @Get("admin/pod/print-area-mappings")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:read")
  listPrintAreaMappings(@Query("providerConfigId") providerConfigId?: string) {
    return this.pod.listPrintAreaMappings(providerConfigId);
  }

  @Post("admin/pod/print-area-mappings")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:manage-print-area-mappings")
  createPrintAreaMapping(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.pod.createPrintAreaMapping(user.sub, body);
  }

  @Patch("admin/pod/print-area-mappings/:id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:manage-print-area-mappings")
  updatePrintAreaMapping(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.pod.updatePrintAreaMapping(user.sub, id, body);
  }

  @Post("admin/pod/print-area-mappings/:id/validate")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:validate-global-pipeline")
  validatePrintAreaMapping(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.pod.validatePrintAreaMapping(id, body);
  }

  @Get("admin/pod/global-candidates")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:validate-global-pipeline")
  listGlobalCandidates(@Query("providerConfigId") providerConfigId?: string) {
    return this.pod.listGlobalCandidates(providerConfigId);
  }

  @Post("admin/pod/global-candidates/:listingId/validate")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:validate-global-pipeline")
  validateGlobalCandidate(@Param("listingId") listingId: string, @Body() body: Record<string, unknown>) {
    return this.pod.validateGlobalCandidate(listingId, body);
  }

  @Post("admin/pod/global-candidates/:listingId/create-sync-record")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:create-sync-record")
  createSyncRecord(@CurrentUser() user: RequestUser, @Param("listingId") listingId: string, @Body() body: Record<string, unknown>) {
    return this.pod.createSyncRecord(user.sub, listingId, body);
  }

  @Post("admin/pod/provider-files/upload")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:create-sync-record")
  prepareProviderFile(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.pod.prepareProviderFile(user.sub, body);
  }

  @Get("admin/pod/sync-records")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:read")
  listSyncRecords(@Query("providerConfigId") providerConfigId?: string, @Query("status") status?: string) {
    return this.pod.listSyncRecords({ providerConfigId, status });
  }

  @Get("admin/pod/sync-records/:id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:view-provider-payloads")
  getSyncRecord(@Param("id") id: string) {
    return this.pod.getSyncRecord(id);
  }

  @Post("admin/pod/sync-records/:id/sync")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:create-sync-record")
  syncRecord(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.pod.syncRecord(user.sub, id);
  }

  @Post("admin/pod/sync-records/:id/retry")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:retry-sync")
  retrySyncRecord(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.pod.syncRecord(user.sub, id);
  }

  @Post("admin/pod/sync-records/:id/cancel")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("pod:retry-sync")
  cancelSyncRecord(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.pod.cancelSyncRecord(user.sub, id);
  }

  @Post("webhooks/pod/:provider")
  webhook(@Param("provider") provider: string, @Body() body: Record<string, unknown>, @Headers("x-rashpod-signature") signature?: string) {
    return this.pod.logWebhook(provider, body, signature);
  }
}
