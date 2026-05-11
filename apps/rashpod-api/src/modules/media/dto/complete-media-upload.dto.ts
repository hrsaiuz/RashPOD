import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { MediaCategory } from "@prisma/client";

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
  sizeBytes!: number;

  @IsInt()
  @IsOptional()
  width?: number;

  @IsInt()
  @IsOptional()
  height?: number;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  key?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
