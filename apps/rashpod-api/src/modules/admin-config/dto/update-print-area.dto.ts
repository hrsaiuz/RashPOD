import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdatePrintAreaDto {
  @IsString()
  @IsOptional()
  mockupTemplateId?: string;

  @IsString()
  @IsOptional()
  name?: string;

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

  @IsInt()
  @IsOptional()
  safeX?: number;

  @IsInt()
  @IsOptional()
  safeY?: number;

  @IsInt()
  @IsOptional()
  safeWidth?: number;

  @IsInt()
  @IsOptional()
  safeHeight?: number;

  @IsBoolean()
  @IsOptional()
  allowMove?: boolean;

  @IsBoolean()
  @IsOptional()
  allowResize?: boolean;

  @IsBoolean()
  @IsOptional()
  allowRotate?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  minScale?: number;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  maxScale?: number;
}
