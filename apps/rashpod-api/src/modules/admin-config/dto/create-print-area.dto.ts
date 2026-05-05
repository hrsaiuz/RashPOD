import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreatePrintAreaDto {
  @IsString()
  mockupTemplateId!: string;

  @IsString()
  name!: string;

  @IsInt()
  x!: number;
  @IsInt()
  y!: number;
  @IsInt()
  width!: number;
  @IsInt()
  height!: number;
  @IsInt()
  safeX!: number;
  @IsInt()
  safeY!: number;
  @IsInt()
  safeWidth!: number;
  @IsInt()
  safeHeight!: number;

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
