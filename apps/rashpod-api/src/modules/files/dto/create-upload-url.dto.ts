import { AssetPurpose } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { DIRECT_UPLOAD_MAX_BYTES } from "../asset-upload-policy";

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
  @Max(DIRECT_UPLOAD_MAX_BYTES)
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
