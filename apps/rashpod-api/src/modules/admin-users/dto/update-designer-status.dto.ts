import { IsIn, IsOptional, IsString } from "class-validator";

export class UpdateDesignerStatusDto {
  @IsIn(["ACTIVE", "INACTIVE", "SUSPENDED"])
  status!: "ACTIVE" | "INACTIVE" | "SUSPENDED";

  @IsString()
  @IsOptional()
  reason?: string;
}