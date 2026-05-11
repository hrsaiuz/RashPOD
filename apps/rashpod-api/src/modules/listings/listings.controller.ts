import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ListingType } from "@prisma/client";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { CreateFilmListingDto } from "./dto/create-film-listing.dto";
import { CreateListingDto } from "./dto/create-listing.dto";
import { UpdateListingDto } from "./dto/update-listing.dto";
import { ListingsService } from "./listings.service";

@Controller()
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Post("listings")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("listing:manage-own")
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateListingDto) {
    return this.listings.create(user, dto);
  }

  @Get("listings")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("listing:manage-own")
  listOwn(@CurrentUser() user: RequestUser) {
    return this.listings.listOwn(user.sub);
  }

  @Get("listings/:id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("listing:manage-own")
  byId(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.listings.byId(user, id);
  }

  @Patch("listings/:id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("listing:manage-own")
  patch(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateListingDto) {
    return this.listings.patch(user, id, dto);
  }

  @Post("listings/:id/publish")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("listing:publish")
  publish(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.listings.publish(user, id);
  }

  @Post("listings/:id/archive")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("listing:manage-own")
  archive(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.listings.archive(user, id);
  }

  @Post("listings/film")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("listing:manage-own")
  createFilm(@CurrentUser() user: RequestUser, @Body() dto: CreateFilmListingDto) {
    return this.listings.create(user, { ...dto, type: ListingType.FILM });
  }

  @Patch("listings/film/:id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("listing:manage-own")
  patchFilm(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateListingDto) {
    return this.listings.patch(user, id, dto, ListingType.FILM);
  }

  @Get("shop/listings")
  shopList(
    @Query("type") type?: string,
    @Query("q") q?: string,
    @Query("limit") limit?: string,
  ) {
    const parsed = limit ? Number(limit) : undefined;
    return this.listings.shopList(type, q, Number.isFinite(parsed) ? parsed : undefined);
  }

  @Get("shop/designers")
  shopDesigners(@Query("limit") limit?: string) {
    const parsed = limit ? Number(limit) : undefined;
    return this.listings.shopDesignersList(Number.isFinite(parsed) ? parsed : undefined);
  }

  @Get("shop/listings/:slug")
  bySlug(@Param("slug") slug: string) {
    return this.listings.shopBySlug(slug);
  }

  @Get("shop/designers/:handle")
  byDesigner(@Param("handle") handle: string) {
    return this.listings.shopByDesigner(handle);
  }
}
