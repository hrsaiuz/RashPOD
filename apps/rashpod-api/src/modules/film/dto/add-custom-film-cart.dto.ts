import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class AddCustomFilmCartDto {
  @IsString()
  sourceAssetId!: string;

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

  @IsString()
  @IsOptional()
  note?: string;
}
