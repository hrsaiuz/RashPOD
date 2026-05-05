import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { AdminConfigService } from "./admin-config.service";
import { CreateProductTypeDto } from "./dto/create-product-type.dto";
import { CreateRoyaltyRuleDto } from "./dto/create-royalty-rule.dto";
import { CreateBaseProductDto } from "./dto/create-base-product.dto";
import { CreateMockupTemplateDto } from "./dto/create-mockup-template.dto";
import { CreatePrintAreaDto } from "./dto/create-print-area.dto";
import { UpsertFilmSaleSettingsDto } from "./dto/upsert-film-sale-settings.dto";
import { CreateDeliverySettingDto } from "./dto/create-delivery-setting.dto";
import { UpdateDeliverySettingDto } from "./dto/update-delivery-setting.dto";
import { UpdateProductTypeDto } from "./dto/update-product-type.dto";
import { UpdateBaseProductDto } from "./dto/update-base-product.dto";
import { UpdateMockupTemplateDto } from "./dto/update-mockup-template.dto";
import { UpdatePrintAreaDto } from "./dto/update-print-area.dto";

@Controller("admin")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminConfigController {
  constructor(private readonly service: AdminConfigService) {}

  @Get("product-types")
  @RequirePermission("product-type:manage")
  listProductTypes() {
    return this.service.listProductTypes();
  }

  @Post("product-types")
  @RequirePermission("product-type:manage")
  createProductType(@CurrentUser() user: RequestUser, @Body() dto: CreateProductTypeDto) {
    return this.service.createProductType(user.sub, dto);
  }

  @Get("product-types/:id")
  @RequirePermission("product-type:manage")
  getProductType(@Param("id") id: string) {
    return this.service.getProductType(id);
  }

  @Patch("product-types/:id")
  @RequirePermission("product-type:manage")
  updateProductType(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateProductTypeDto) {
    return this.service.updateProductType(user.sub, id, dto);
  }

  @Delete("product-types/:id")
  @RequirePermission("product-type:manage")
  deleteProductType(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.deleteProductType(user.sub, id);
  }

  @Get("royalty-rules")
  @RequirePermission("royalty-rule:manage")
  listRoyaltyRules() {
    return this.service.listRoyaltyRules();
  }

  @Post("royalty-rules")
  @RequirePermission("royalty-rule:manage")
  createRoyaltyRule(@CurrentUser() user: RequestUser, @Body() dto: CreateRoyaltyRuleDto) {
    return this.service.createRoyaltyRule(user.sub, dto);
  }

  @Get("base-products")
  @RequirePermission("base-product:manage")
  listBaseProducts() {
    return this.service.listBaseProducts();
  }

  @Post("base-products")
  @RequirePermission("base-product:manage")
  createBaseProduct(@CurrentUser() user: RequestUser, @Body() dto: CreateBaseProductDto) {
    return this.service.createBaseProduct(user.sub, dto);
  }

  @Get("base-products/:id")
  @RequirePermission("base-product:manage")
  getBaseProduct(@Param("id") id: string) {
    return this.service.getBaseProduct(id);
  }

  @Patch("base-products/:id")
  @RequirePermission("base-product:manage")
  updateBaseProduct(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateBaseProductDto) {
    return this.service.updateBaseProduct(user.sub, id, dto);
  }

  @Delete("base-products/:id")
  @RequirePermission("base-product:manage")
  deleteBaseProduct(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.deleteBaseProduct(user.sub, id);
  }

  @Get("mockup-templates")
  @RequirePermission("mockup-template:manage")
  listMockupTemplates() {
    return this.service.listMockupTemplates();
  }

  @Post("mockup-templates")
  @RequirePermission("mockup-template:manage")
  createMockupTemplate(@CurrentUser() user: RequestUser, @Body() dto: CreateMockupTemplateDto) {
    return this.service.createMockupTemplate(user.sub, dto);
  }

  @Get("mockup-templates/:id")
  @RequirePermission("mockup-template:manage")
  getMockupTemplate(@Param("id") id: string) {
    return this.service.getMockupTemplate(id);
  }

  @Patch("mockup-templates/:id")
  @RequirePermission("mockup-template:manage")
  updateMockupTemplate(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateMockupTemplateDto) {
    return this.service.updateMockupTemplate(user.sub, id, dto);
  }

  @Delete("mockup-templates/:id")
  @RequirePermission("mockup-template:manage")
  deleteMockupTemplate(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.deleteMockupTemplate(user.sub, id);
  }

  @Get("print-areas")
  @RequirePermission("print-area:manage")
  listPrintAreas() {
    return this.service.listPrintAreas();
  }

  @Post("print-areas")
  @RequirePermission("print-area:manage")
  createPrintArea(@CurrentUser() user: RequestUser, @Body() dto: CreatePrintAreaDto) {
    return this.service.createPrintArea(user.sub, dto);
  }

  @Get("print-areas/:id")
  @RequirePermission("print-area:manage")
  getPrintArea(@Param("id") id: string) {
    return this.service.getPrintArea(id);
  }

  @Patch("print-areas/:id")
  @RequirePermission("print-area:manage")
  updatePrintArea(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdatePrintAreaDto) {
    return this.service.updatePrintArea(user.sub, id, dto);
  }

  @Delete("print-areas/:id")
  @RequirePermission("print-area:manage")
  deletePrintArea(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.deletePrintArea(user.sub, id);
  }

  @Get("film-sale-settings")
  @RequirePermission("film-settings:manage")
  getFilmSaleSettings() {
    return this.service.getFilmSaleSettings();
  }

  @Post("film-sale-settings")
  @RequirePermission("film-settings:manage")
  upsertFilmSaleSettings(@CurrentUser() user: RequestUser, @Body() dto: UpsertFilmSaleSettingsDto) {
    return this.service.upsertFilmSaleSettings(user.sub, dto);
  }

  @Get("delivery-settings")
  @RequirePermission("delivery-settings:manage")
  listDeliverySettings() {
    return this.service.listDeliverySettings();
  }

  @Post("delivery-settings")
  @RequirePermission("delivery-settings:manage")
  createDeliverySetting(@CurrentUser() user: RequestUser, @Body() dto: CreateDeliverySettingDto) {
    return this.service.createDeliverySetting(user.sub, dto);
  }

  @Patch("delivery-settings/:id")
  @RequirePermission("delivery-settings:manage")
  updateDeliverySetting(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateDeliverySettingDto) {
    return this.service.updateDeliverySetting(user.sub, id, dto);
  }
}
