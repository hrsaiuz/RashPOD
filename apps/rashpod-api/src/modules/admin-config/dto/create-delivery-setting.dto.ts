import { IsBoolean, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateDeliverySettingDto {
  @IsString()
  providerType!: string;

  @IsString()
  displayName!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  zone!: string;

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
