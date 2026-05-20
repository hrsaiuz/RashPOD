import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from "class-validator";

export class CreatePlacementPresetDto {
  @IsString()
  name!: string;

  @IsIn(["LOCAL", "GLOBAL_PRINTFUL"])
  pipeline!: "LOCAL" | "GLOBAL_PRINTFUL";

  @IsString()
  @IsOptional()
  productTemplateId?: string;

  @IsString()
  @IsOptional()
  localBaseProductId?: string;

  @IsString()
  placement!: string;

  @IsNumber()
  @IsOptional()
  defaultWidthCm?: number;

  @IsNumber()
  @IsOptional()
  defaultHeightCm?: number;

  @IsNumber()
  @IsOptional()
  defaultWidthIn?: number;

  @IsNumber()
  @IsOptional()
  defaultHeightIn?: number;

  @IsNumber()
  @IsOptional()
  defaultX?: number;

  @IsNumber()
  @IsOptional()
  defaultY?: number;

  @IsNumber()
  @IsOptional()
  defaultScale?: number;

  @IsString()
  @IsOptional()
  alignment?: string;

  @IsString()
  @IsOptional()
  units?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
