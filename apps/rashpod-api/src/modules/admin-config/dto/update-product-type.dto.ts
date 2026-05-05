import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

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
}
