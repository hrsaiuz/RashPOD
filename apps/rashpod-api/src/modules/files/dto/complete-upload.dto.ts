import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CompleteUploadDto {
  @IsString()
  fileId!: string;

  @IsInt()
  @Min(1)
  uploadedSizeBytes!: number;

  @IsString()
  uploadedMimeType!: string;

  @IsString()
  @IsOptional()
  uploadedChecksum?: string;
}
