import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { GangSheetsService } from "./gang-sheets.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class GangSheetsController {
  constructor(private readonly gangSheets: GangSheetsService) {}

  @Get("admin/film/sheet-presets")
  @RequirePermission("gang-sheets:admin-manage")
  listSheetPresets(@Query("filmType") filmType?: string, @Query("includeDisabled") includeDisabled?: string) {
    return this.gangSheets.listSheetPresets({ filmType, includeDisabled: includeDisabled === "true" });
  }

  @Post("admin/film/sheet-presets")
  @RequirePermission("gang-sheets:admin-manage")
  createSheetPreset(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.gangSheets.createSheetPreset(user.sub, body);
  }

  @Patch("admin/film/sheet-presets/:id")
  @RequirePermission("gang-sheets:admin-manage")
  updateSheetPreset(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.gangSheets.updateSheetPreset(user.sub, id, body);
  }

  @Post("admin/film/sheet-presets/:id/enable")
  @RequirePermission("gang-sheets:admin-manage")
  enableSheetPreset(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.gangSheets.setSheetPresetEnabled(user.sub, id, true);
  }

  @Post("admin/film/sheet-presets/:id/disable")
  @RequirePermission("gang-sheets:admin-manage")
  disableSheetPreset(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.gangSheets.setSheetPresetEnabled(user.sub, id, false);
  }

  @Post("gang-sheets")
  @RequirePermission("gang-sheets:create-own")
  create(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.gangSheets.createGangSheet(user, body);
  }

  @Get("gang-sheets")
  @RequirePermission("gang-sheets:read-own")
  listOwn(@CurrentUser() user: RequestUser) {
    return this.gangSheets.listOwn(user);
  }

  @Get("gang-sheets/:id")
  @RequirePermission("gang-sheets:read-own")
  getOwn(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.gangSheets.getGangSheet(user, id);
  }

  @Patch("gang-sheets/:id")
  @RequirePermission("gang-sheets:update-own-draft")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.gangSheets.updateGangSheet(user, id, body);
  }

  @Post("gang-sheets/:id/items")
  @RequirePermission("gang-sheets:update-own-draft")
  addItem(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.gangSheets.addItem(user, id, body);
  }

  @Patch("gang-sheets/:id/items/:itemId")
  @RequirePermission("gang-sheets:update-own-draft")
  updateItem(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("itemId") itemId: string, @Body() body: Record<string, unknown>) {
    return this.gangSheets.updateItem(user, id, itemId, body);
  }

  @Post("gang-sheets/:id/items/:itemId/duplicate")
  @RequirePermission("gang-sheets:update-own-draft")
  duplicateItem(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("itemId") itemId: string) {
    return this.gangSheets.duplicateItem(user, id, itemId);
  }

  @Delete("gang-sheets/:id/items/:itemId")
  @RequirePermission("gang-sheets:update-own-draft")
  removeItem(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("itemId") itemId: string) {
    return this.gangSheets.removeItem(user, id, itemId);
  }

  @Post("gang-sheets/:id/auto-arrange")
  @RequirePermission("gang-sheets:update-own-draft")
  autoArrange(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.gangSheets.autoArrange(user, id, body);
  }

  @Post("gang-sheets/:id/validate")
  @RequirePermission("gang-sheets:update-own-draft")
  validate(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.gangSheets.validateGangSheet(user, id);
  }

  @Post("gang-sheets/:id/quote")
  @RequirePermission("film:quote")
  quote(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.gangSheets.quoteGangSheet(user, id);
  }

  @Post("gang-sheets/:id/preview")
  @RequirePermission("gang-sheets:update-own-draft")
  preview(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.gangSheets.requestPreview(user, id);
  }

  @Post("gang-sheets/:id/add-to-cart")
  @RequirePermission("gang-sheets:checkout-own")
  addToCart(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.gangSheets.addToCart(user, id);
  }

  @Get("admin/gang-sheets")
  @RequirePermission("gang-sheets:admin-read")
  listAdmin(@Query("status") status?: string, @Query("filmType") filmType?: string, @Query("source") source?: string) {
    return this.gangSheets.listAdmin({ status, filmType, source });
  }

  @Get("admin/gang-sheets/:id")
  @RequirePermission("gang-sheets:admin-read")
  getAdmin(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.gangSheets.getGangSheet(user, id);
  }

  @Post("admin/gang-sheets/:id/validate")
  @RequirePermission("gang-sheets:admin-manage")
  validateAdmin(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.gangSheets.validateGangSheet(user, id);
  }

  @Post("admin/gang-sheets/:id/request-production-file")
  @RequirePermission("gang-sheets:admin-manage")
  requestAdminProductionFile(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.gangSheets.requestPreview(user, id);
  }

  @Post("admin/gang-sheets/batch-from-production-items")
  @RequirePermission("gang-sheets:batch-orders")
  batchFromProductionItems(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.gangSheets.batchFromProductionItems(user, body);
  }

  @Get("production/gang-sheets")
  @RequirePermission("gang-sheets:production-manage")
  listProduction(@Query("status") status?: string, @Query("filmType") filmType?: string) {
    return this.gangSheets.listAdmin({ status, filmType });
  }

  @Get("production/gang-sheets/:id")
  @RequirePermission("gang-sheets:production-manage")
  getProduction(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.gangSheets.getGangSheet(user, id, true);
  }
}
