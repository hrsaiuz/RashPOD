import { IsBoolean, IsNumber, IsOptional } from "class-validator";

export class UpdateAiSettingsDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  monthlyBudgetUsd?: number;

  @IsBoolean()
  @IsOptional()
  moderationAssistEnabled?: boolean;
}
