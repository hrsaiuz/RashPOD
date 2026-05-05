import { IsOptional, IsString, MaxLength } from "class-validator";

export class AssignProductionJobDto {
  @IsString()
  assigneeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
