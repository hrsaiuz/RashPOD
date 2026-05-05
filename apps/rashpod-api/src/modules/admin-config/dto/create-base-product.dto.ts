import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateBaseProductDto {
  @IsString()
  productTypeId!: string;

  @IsString()
  name!: string;

  @IsString()
  skuPrefix!: string;

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
