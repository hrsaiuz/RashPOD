import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class FilmQuoteDto {
  @IsIn(["DTF", "UV_DTF"])
  filmType!: "DTF" | "UV_DTF";

  @IsNumber()
  @Min(1)
  widthCm!: number;

  @IsNumber()
  @Min(1)
  heightCm!: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsIn(["DESIGN_FILM", "CUSTOM_FILM"])
  @IsOptional()
  itemKind?: "DESIGN_FILM" | "CUSTOM_FILM";

  @IsString()
  @IsOptional()
  listingId?: string;

  @IsString()
  @IsOptional()
  sourceAssetId?: string;
}
