import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateRoyaltyRuleDto {
  @IsString()
  @IsOptional()
  scope?: string;

  @IsString()
  @IsOptional()
  basis?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  value?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  effectiveAt?: string;
}