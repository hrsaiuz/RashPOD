import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class CreatePrintfulProductTemplateDto {
  @IsString()
  rashpodProductType!: string;

  @IsString()
  displayName!: string;

  @IsString()
  printfulCatalogProductId!: string;

  @IsString()
  printfulProductName!: string;

  @IsArray()
  printfulVariantIds!: string[];

  @IsArray()
  @IsOptional()
  allowedColorVariantIds?: string[];

  @IsArray()
  @IsOptional()
  allowedSizeVariantIds?: string[];

  @IsArray()
  allowedPlacements!: string[];

  @IsArray()
  allowedTechniques!: string[];

  @IsString()
  defaultTechnique!: string;

  @IsString()
  defaultPlacement!: string;

  @IsString()
  @IsOptional()
  printfulStoreId?: string;

  @IsNumber()
  @IsOptional()
  defaultRetailPrice?: number;

  @IsNumber()
  @IsOptional()
  estimatedBaseCost?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsOptional()
  metadataJson?: Record<string, unknown>;
}
