import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateBaseProductDto {
  @IsString()
  @IsOptional()
  productTypeId?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  skuPrefix?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  availableColors?: string[];

  @IsArray()
  @IsOptional()
  availableSizes?: string[];
}
