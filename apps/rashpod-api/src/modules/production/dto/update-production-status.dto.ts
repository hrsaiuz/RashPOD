import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { ProductionJobStatus } from "@prisma/client";

export class UpdateProductionStatusDto {
  @IsEnum(ProductionJobStatus)
  status!: ProductionJobStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  producedQuantity?: number;
}
