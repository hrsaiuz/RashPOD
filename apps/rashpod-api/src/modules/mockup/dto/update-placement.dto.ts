import { IsInt, IsNumber, IsOptional, Max, Min } from "class-validator";

export class UpdatePlacementDto {
  @IsInt()
  @IsOptional()
  x?: number;
  @IsInt()
  @IsOptional()
  y?: number;
  @IsInt()
  @IsOptional()
  width?: number;
  @IsInt()
  @IsOptional()
  height?: number;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  @Max(10)
  scale?: number;

  @IsNumber()
  @IsOptional()
  @Min(-360)
  @Max(360)
  rotation?: number;
}
