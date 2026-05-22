import { IsBoolean, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min } from "class-validator";

export class UpsertFilmSaleSettingsDto {
  @IsBoolean()
  enableFilmSalesGlobally!: boolean;

  @IsBoolean()
  enableDTF!: boolean;

  @IsBoolean()
  enableUvDtf!: boolean;

  @IsString()
  defaultRoyaltyBasis!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  defaultRoyaltyValue!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minimumOrderPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  rushOrderFee?: number;

  @IsString()
  @IsOptional()
  revocationPolicy?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsObject()
  @IsOptional()
  dtfPricingJson?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  uvDtfPricingJson?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  consentPolicyJson?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  royaltyPolicyJson?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  productionConstraintsJson?: Record<string, unknown>;

  @IsInt()
  @IsOptional()
  @Min(1)
  settingsVersion?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  taxRatePercent?: number;
}
