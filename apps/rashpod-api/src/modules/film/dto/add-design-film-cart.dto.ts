import { IsIn, IsInt, IsNumber, IsString, Min } from "class-validator";

export class AddDesignFilmCartDto {
  @IsString()
  listingId!: string;

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
}
