import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";

export class PrintfulCatalogAllowlistItemDto {
  @IsInt()
  catalogProductId!: number;

  @IsString()
  rashpodProductType!: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  defaultVariantIds?: number[];

  @IsString()
  @IsOptional()
  defaultTechnique?: string;

  @IsString()
  @IsOptional()
  defaultPlacement?: string;
}

export class UpdatePrintfulSettingsDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsString()
  @IsOptional()
  defaultStoreId?: string;

  @IsArray()
  @IsOptional()
  connectedMarketplaces?: string[];

  @IsBoolean()
  @IsOptional()
  autoPublishTrusted?: boolean;

  @IsBoolean()
  @IsOptional()
  allowGlobalWithoutLocal?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrintfulCatalogAllowlistItemDto)
  @IsOptional()
  catalogAllowlist?: PrintfulCatalogAllowlistItemDto[];
}
