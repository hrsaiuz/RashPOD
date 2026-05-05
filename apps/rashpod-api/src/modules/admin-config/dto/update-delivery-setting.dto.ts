import { IsBoolean, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateDeliverySettingDto {
  @IsString()
  @IsOptional()
  providerType?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  zone?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  freeDeliveryThreshold?: number;

  @IsString()
  @IsOptional()
  etaText?: string;
}
