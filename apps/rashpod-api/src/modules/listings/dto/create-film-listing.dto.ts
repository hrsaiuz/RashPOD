import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateFilmListingDto {
  @IsString()
  designAssetId!: string;

  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price!: number;
}
