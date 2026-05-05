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
  x!: number;
  @IsInt()
  y!: number;
  @IsInt()
  width!: number;
  @IsInt()
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
