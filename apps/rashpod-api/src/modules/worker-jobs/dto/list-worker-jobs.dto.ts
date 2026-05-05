import { IsIn, IsOptional, IsString } from "class-validator";

export class ListWorkerJobsDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsIn(["PENDING", "PROCESSING", "COMPLETED", "FAILED"])
  status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

  @IsOptional()
  @IsIn(["true", "false"])
  deadLetter?: "true" | "false";
}
