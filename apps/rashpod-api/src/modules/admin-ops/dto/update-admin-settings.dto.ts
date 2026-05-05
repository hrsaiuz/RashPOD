import { IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { IsArray } from "class-validator";

class QueueAlertThresholdsDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  oldestPendingAgeSeconds?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  failedRatePercent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  alertCooldownSeconds?: number;

  @IsArray()
  @IsOptional()
  alertRecipients?: string[];
}

class AdminSettingsMetadataDto {
  @ValidateNested()
  @Type(() => QueueAlertThresholdsDto)
  @IsOptional()
  queueAlerts?: QueueAlertThresholdsDto;
}

export class UpdateAdminSettingsDto {
  @IsString()
  @IsOptional()
  supportEmail?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @ValidateNested()
  @Type(() => AdminSettingsMetadataDto)
  @IsOptional()
  metadata?: AdminSettingsMetadataDto;
}
