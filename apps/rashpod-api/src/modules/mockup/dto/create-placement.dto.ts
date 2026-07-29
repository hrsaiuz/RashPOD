import { IsInt, IsNumber, IsString, Max, Min } from "class-validator";

export class CreatePlacementDto {
  @IsString()
  designAssetId!: string;

  @IsString()
  designVersionId!: string;

  @IsString()
  mockupTemplateId!: string;

  @IsString()
  printAreaId!: string;

  @IsInt()
  @Min(0)
  x!: number;
  @IsInt()
  @Min(0)
  y!: number;
  @IsInt()
  @Min(1)
  width!: number;
  @IsInt()
  @Min(1)
  height!: number;

  @IsNumber()
  @Min(0.01)
  @Max(10)
  scale!: number;

  @IsNumber()
  @Min(-360)
  @Max(360)
  rotation!: number;
}
