import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { ListPrintfulCatalogProductsQueryDto, PreparePrintfulCatalogProductDto, PublishPrintfulListingDto } from "./dto/printful-catalog.dto";
import { PrintfulPublicationService } from "./printful-publication.service";

@Controller("admin/printful")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PrintfulController {
  constructor(private readonly publication: PrintfulPublicationService) {}

  @Get("stores")
  @RequirePermission("printful-catalog:read")
  listStores() {
    return this.publication.listStores();
  }

  @Get("categories")
  @RequirePermission("printful-catalog:read")
  listCategories() {
    return this.publication.listCategories();
  }

  @Get("catalog-products")
  @RequirePermission("printful-catalog:read")
  listProducts(@Query() query: ListPrintfulCatalogProductsQueryDto) {
    return this.publication.listProducts(query);
  }

  @Get("catalog-products/:id")
  @RequirePermission("printful-catalog:read")
  getProduct(@Param("id", ParseIntPipe) id: number) {
    return this.publication.getProduct(id);
  }

  @Post("catalog-products/:id/prepare")
  @RequirePermission("printful-catalog:read")
  prepareProduct(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: PreparePrintfulCatalogProductDto,
  ) {
    return this.publication.prepareCatalogProduct(user.sub, id, dto);
  }

  @Get("listings/:id/publications")
  @RequirePermission("printful-catalog:read")
  listPublications(@Param("id") id: string) {
    return this.publication.listPublications(id);
  }

  @Post("listings/:id/publish")
  @RequirePermission("marketplace-publication:publish")
  publish(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: PublishPrintfulListingDto) {
    return this.publication.publish(user.sub, id, dto);
  }

  @Post("publications/:id/retry")
  @RequirePermission("marketplace-publication:publish")
  retry(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.publication.retry(user.sub, id);
  }
}
