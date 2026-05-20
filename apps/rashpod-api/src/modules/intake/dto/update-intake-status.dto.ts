import { IntakeStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateIntakeStatusDto {
  @IsOptional()
  @IsEnum(IntakeStatus)
  status?: IntakeStatus;

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
