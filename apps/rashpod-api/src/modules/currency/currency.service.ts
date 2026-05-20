import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { UpsertCurrencyDto } from "./dto/upsert-currency.dto";

export const PRIMARY_CURRENCY = "UZS";

@Injectable()
export class CurrencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private normalizeCode(code: string) {
    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized)) throw new BadRequestException("Currency code must be a 3-letter ISO code");
    return normalized;
  }

  async listCurrencies() {
    return this.prisma.currencyConfig.findMany({ orderBy: [{ isPrimary: "desc" }, { code: "asc" }] });
  }

  async getCurrency(code: string) {
    const item = await this.prisma.currencyConfig.findUnique({ where: { code: this.normalizeCode(code) } });
    if (!item) throw new NotFoundException("Currency not found");
    return item;
  }

  async upsertCurrency(actorId: string, dto: UpsertCurrencyDto) {
    const code = this.normalizeCode(dto.code);
    if (code === PRIMARY_CURRENCY && dto.isActive === false) {
      throw new BadRequestException("UZS must remain active as the primary RashPOD currency");
    }
    if (dto.exchangeRateToUzs <= 0) throw new BadRequestException("exchangeRateToUzs must be greater than zero");

    if (dto.isPrimary || code === PRIMARY_CURRENCY) {
      await this.prisma.currencyConfig.updateMany({ where: { isPrimary: true, code: { not: code } }, data: { isPrimary: false } });
    }

    const item = await this.prisma.currencyConfig.upsert({
      where: { code },
      create: {
        code,
        name: dto.name,
        symbol: dto.symbol,
        decimalPlaces: dto.decimalPlaces ?? 2,
        isActive: dto.isActive ?? true,
        isPrimary: dto.isPrimary ?? code === PRIMARY_CURRENCY,
        exchangeRateToUzs: new Prisma.Decimal(dto.exchangeRateToUzs),
      },
      update: {
        name: dto.name,
        symbol: dto.symbol,
        decimalPlaces: dto.decimalPlaces ?? 2,
        isActive: dto.isActive ?? true,
        isPrimary: dto.isPrimary ?? code === PRIMARY_CURRENCY,
        exchangeRateToUzs: new Prisma.Decimal(dto.exchangeRateToUzs),
      },
    });

    await this.prisma.exchangeRate.create({
      data: {
        fromCurrency: code,
        toCurrency: PRIMARY_CURRENCY,
        rate: new Prisma.Decimal(dto.exchangeRateToUzs),
        source: "MANUAL",
        effectiveAt: new Date(),
      },
    });

    await this.audit.log({
      actorId,
      action: "currency.upsert",
      entityType: "CurrencyConfig",
      entityId: code,
      metadata: { code, isPrimary: item.isPrimary, isActive: item.isActive },
    });

    return item;
  }

  async convertToUzs(amount: Prisma.Decimal.Value, currency: string) {
    const code = this.normalizeCode(currency);
    const decimal = new Prisma.Decimal(amount);
    if (code === PRIMARY_CURRENCY) return decimal;
    const config = await this.getCurrency(code);
    if (!config.isActive) throw new BadRequestException(`Currency ${code} is inactive`);
    return decimal.mul(config.exchangeRateToUzs).toDecimalPlaces(2);
  }
}