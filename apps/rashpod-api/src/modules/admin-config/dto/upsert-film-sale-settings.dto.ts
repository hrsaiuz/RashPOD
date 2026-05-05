import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

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
}
