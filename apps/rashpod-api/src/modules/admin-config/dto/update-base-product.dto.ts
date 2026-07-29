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

  @IsString()
  @IsOptional()
  imageUrl?: string | null;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsArray()
  @IsOptional()
  availableColors?: string[];

  @IsArray()
  @IsOptional()
  availableSizes?: string[];
}
