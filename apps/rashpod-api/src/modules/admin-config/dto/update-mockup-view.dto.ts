import { IsBoolean, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpdateMockupViewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @IsOptional()
  viewKey?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @IsOptional()
  placementCode?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  @IsOptional()
  blankImageKey?: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  mockupStyle?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  metadataJson?: Record<string, unknown>;
}
