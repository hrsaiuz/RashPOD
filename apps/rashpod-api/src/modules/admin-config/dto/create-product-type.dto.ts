import { IsBoolean, IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateProductTypeDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  slug!: string;

  @IsString()
  category!: string;

  @IsString()
  productionMethod!: string;

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
