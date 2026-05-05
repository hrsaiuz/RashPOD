import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateDesignVersionDto {
  @IsString()
  fileId!: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(30000)
  widthPx?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(30000)
  heightPx?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(2400)
  dpi?: number;
}
