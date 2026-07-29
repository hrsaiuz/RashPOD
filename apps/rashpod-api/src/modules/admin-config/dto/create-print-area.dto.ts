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
  @IsInt()
  @Min(0)
  safeX!: number;
  @IsInt()
  @Min(0)
  safeY!: number;
  @IsInt()
  @Min(1)
  safeWidth!: number;
  @IsInt()
  @Min(1)
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

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
