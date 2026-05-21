import { IsBoolean, IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";

export class UpdateProductTypeDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  productionMethod?: string;

  @IsBoolean()
  @IsOptional()
  supportsFilmSale?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  availableForDesigners?: boolean;

  @IsBoolean()
  @IsOptional()
  availableInShop?: boolean;

  @IsBoolean()
  @IsOptional()
  availableForCorporate?: boolean;

  @IsBoolean()
  @IsOptional()
  availableForMarketplace?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresMockup?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  baseCost?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  defaultMargin?: number;
}
