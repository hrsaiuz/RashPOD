import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

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
}
