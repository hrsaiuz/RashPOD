import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { CurrencyService } from "./currency.service";
import { UpsertCurrencyDto } from "./dto/upsert-currency.dto";

@Controller("admin/currencies")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CurrencyController {
  constructor(private readonly service: CurrencyService) {}

  @Get()
  @RequirePermission("currency:manage")
  listCurrencies() {
    return this.service.listCurrencies();
  }

  @Get(":code")
  @RequirePermission("currency:manage")
  getCurrency(@Param("code") code: string) {
    return this.service.getCurrency(code);
  }

  @Put(":code")
  @RequirePermission("currency:manage")
  upsertCurrency(@CurrentUser() user: RequestUser, @Param("code") code: string, @Body() dto: UpsertCurrencyDto) {
    return this.service.upsertCurrency(user.sub, { ...dto, code });
  }
}