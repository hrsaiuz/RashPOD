import { MockupGalleryAssetRole } from "@prisma/client";
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpdateMockupGalleryAssetDto {
  @IsString()
  @IsOptional()
  mockupViewId?: string | null;

  @IsEnum(MockupGalleryAssetRole)
  @IsOptional()
  role?: MockupGalleryAssetRole;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  @IsOptional()
  imageKey?: string;

  @IsString()
  @MaxLength(240)
  @IsOptional()
  altText?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  metadataJson?: Record<string, unknown>;
}
