import { IsEnum, IsInt, IsString, MaxLength, Min } from "class-validator";
import { MediaCategory } from "@prisma/client";

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
  sizeBytes!: number;
}
