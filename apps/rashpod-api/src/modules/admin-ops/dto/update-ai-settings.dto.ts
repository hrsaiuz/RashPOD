import { IsBoolean, IsIn, IsNumber, IsObject, IsOptional } from "class-validator";

export class UpdateAiSettingsDto {
  @IsIn(["OPENAI", "DISABLED"])
  @IsOptional()
  provider?: "OPENAI" | "DISABLED";

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  monthlyBudgetUsd?: number;

  @IsBoolean()
  @IsOptional()
  moderationAssistEnabled?: boolean;

  @IsObject()
  @IsOptional()
  workflows?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  dataSharing?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  logging?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  safety?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  budget?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  languages?: Record<string, unknown> | string[];
}
