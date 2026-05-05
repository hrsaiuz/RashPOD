import { IsBoolean, IsNumber, IsOptional, Max, Min } from "class-validator";

export class UpdateRightsDto {
  @IsBoolean()
  @IsOptional()
  allowProductSales?: boolean;

  @IsBoolean()
  @IsOptional()
  allowMarketplacePublishing?: boolean;

  @IsBoolean()
  @IsOptional()
  allowFilmSales?: boolean;

  @IsBoolean()
  @IsOptional()
  allowCorporateBidding?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  filmRoyaltyRate?: number;
}
