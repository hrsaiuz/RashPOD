import { PlacementKind } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateDesignVersionDto {
  @IsString()
  fileId!: string;

  @IsEnum(PlacementKind)
  @IsOptional()
  placement?: PlacementKind;

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
