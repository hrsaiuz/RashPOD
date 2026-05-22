import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { AddCustomFilmCartDto } from "./dto/add-custom-film-cart.dto";
import { AddDesignFilmCartDto } from "./dto/add-design-film-cart.dto";
import { FilmQuoteDto } from "./dto/film-quote.dto";
import { FilmService } from "./film.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FilmController {
  constructor(private readonly film: FilmService) {}

  @Post("film/quote")
  @RequirePermission("film:quote")
  quote(@Body() dto: FilmQuoteDto) {
    return this.film.quote(dto);
  }

  @Get("film/designs/:id/eligibility")
  @RequirePermission("film:quote")
  designEligibility(@Param("id") id: string) {
    return this.film.designEligibility(id);
  }

  @Post("cart/film/design")
  @RequirePermission("customer:film-order-create")
  addDesignFilm(@CurrentUser() user: RequestUser, @Body() dto: AddDesignFilmCartDto) {
    return this.film.addDesignFilmToCart(user.sub, dto);
  }

  @Post("cart/film/custom")
  @RequirePermission("customer:film-order-create")
  addCustomFilm(@CurrentUser() user: RequestUser, @Body() dto: AddCustomFilmCartDto) {
    return this.film.addCustomFilmToCart(user.sub, dto);
  }

  @Get("customer/film-orders")
  @RequirePermission("customer:film-orders-read")
  listCustomerFilmOrders(@CurrentUser() user: RequestUser) {
    return this.film.listCustomerFilmOrders(user.sub);
  }

  @Get("customer/film-orders/:id")
  @RequirePermission("customer:film-orders-read")
  getCustomerFilmOrder(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.film.getCustomerFilmOrder(user.sub, id);
  }

  @Get("designer/film-sales")
  @RequirePermission("designer:film-sales-read")
  listDesignerFilmSales(@CurrentUser() user: RequestUser) {
    return this.film.listDesignerFilmSales(user.sub);
  }

  @Get("admin/film-orders")
  @RequirePermission("film:orders-read")
  listAdminFilmOrders() {
    return this.film.listAdminFilmOrders();
  }
}
