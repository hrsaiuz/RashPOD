import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PlacementKind } from "@prisma/client";

export class CreatePrintAreaDto {
  @IsString()
  mockupTemplateId!: string;

  @IsString()
  @IsOptional()
  mockupViewId?: string;

  @IsString()
  name!: string;

  @IsEnum(PlacementKind)
  @IsOptional()
  placement?: PlacementKind;

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
