import { IsInt, IsNumber, IsOptional, Max, Min } from "class-validator";

export class UpdatePlacementDto {
  @IsInt()
  @IsOptional()
  @Min(0)
  x?: number;
  @IsInt()
  @IsOptional()
  @Min(0)
  y?: number;
  @IsInt()
  @IsOptional()
  @Min(1)
  width?: number;
  @IsInt()
  @IsOptional()
  @Min(1)
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
