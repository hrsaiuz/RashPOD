import { IntakeStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateIntakeStatusDto {
  @IsOptional()
  @IsEnum(IntakeStatus)
  status?: IntakeStatus;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  reviewNotes?: string;
}
