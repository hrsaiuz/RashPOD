import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateUploadUrlDto {
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
}
