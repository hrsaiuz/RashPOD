import { IsEnum, IsInt, IsString, Max, MaxLength, Min } from "class-validator";
import { MediaCategory } from "@prisma/client";

export const MEDIA_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

export class CreateMediaUploadUrlDto {
  @IsEnum(MediaCategory)
  category!: MediaCategory;

  @IsString()
  @MaxLength(255)
  filename!: string;

  @IsString()
  @MaxLength(120)
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(MEDIA_UPLOAD_MAX_BYTES)
  sizeBytes!: number;
}
