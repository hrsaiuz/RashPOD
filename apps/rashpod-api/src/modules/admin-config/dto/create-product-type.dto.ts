import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

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
}
