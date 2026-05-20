import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdatePlacementPresetDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  productTemplateId?: string | null;

  @IsString()
  @IsOptional()
  localBaseProductId?: string | null;

  @IsString()
  @IsOptional()
  placement?: string;

  @IsNumber()
  @IsOptional()
  defaultWidthCm?: number | null;

  @IsNumber()
  @IsOptional()
  defaultHeightCm?: number | null;

  @IsNumber()
  @IsOptional()
  defaultWidthIn?: number | null;

  @IsNumber()
  @IsOptional()
  defaultHeightIn?: number | null;

  @IsNumber()
  @IsOptional()
  defaultX?: number | null;

  @IsNumber()
  @IsOptional()
  defaultY?: number | null;

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
