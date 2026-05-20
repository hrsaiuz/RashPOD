import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdatePrintfulProductTemplateDto {
  @IsString()
  @IsOptional()
  rashpodProductType?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  printfulCatalogProductId?: string;

  @IsString()
  @IsOptional()
  printfulProductName?: string;

  @IsArray()
  @IsOptional()
  printfulVariantIds?: string[];

  @IsArray()
  @IsOptional()
  allowedColorVariantIds?: string[];

  @IsArray()
  @IsOptional()
  allowedSizeVariantIds?: string[];

  @IsArray()
  @IsOptional()
  allowedPlacements?: string[];

  @IsArray()
  @IsOptional()
  allowedTechniques?: string[];

  @IsString()
  @IsOptional()
  defaultTechnique?: string;

  @IsString()
  @IsOptional()
  defaultPlacement?: string;

  @IsString()
  @IsOptional()
  printfulStoreId?: string | null;

  @IsNumber()
  @IsOptional()
  defaultRetailPrice?: number | null;

  @IsNumber()
  @IsOptional()
  estimatedBaseCost?: number | null;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsOptional()
  metadataJson?: Record<string, unknown> | null;
}
