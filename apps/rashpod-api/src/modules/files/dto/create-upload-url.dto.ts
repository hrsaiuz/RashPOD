import { AssetPurpose } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateUploadUrlDto {
  @IsEnum(AssetPurpose)
  @IsOptional()
  purpose?: AssetPurpose;

  @IsString()
  filename!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(40_000_000)
  sizeBytes!: number;

  @IsString()
  @IsOptional()
  checksum?: string;

  @IsString()
  @IsOptional()
  designId?: string;

  @IsString()
  @IsOptional()
  designVersionId?: string;

  @IsString()
  @IsOptional()
  listingId?: string;

  @IsString()
  @IsOptional()
  baseProductId?: string;

  @IsString()
  @IsOptional()
  mockupTemplateId?: string;

  @IsString()
  @IsOptional()
  printAreaId?: string;
}
