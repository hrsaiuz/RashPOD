import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class SubmitQcDto {
  @IsBoolean()
  passed!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  checklist?: {
    printQuality?: boolean;
    sizeAccuracy?: boolean;
    placementAccuracy?: boolean;
    packagingReady?: boolean;
  };
}
