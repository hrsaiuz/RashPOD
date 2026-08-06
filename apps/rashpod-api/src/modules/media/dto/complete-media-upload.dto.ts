import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { MediaCategory } from "@prisma/client";
import { MEDIA_UPLOAD_MAX_BYTES } from "./create-media-upload-url.dto";

export class CompleteMediaUploadDto {
  @IsString()
  objectKey!: string;

  @IsEnum(MediaCategory)
  category!: MediaCategory;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @MaxLength(120)
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(MEDIA_UPLOAD_MAX_BYTES)
  sizeBytes!: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  width?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  height?: number;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  key?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
