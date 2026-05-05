import { IsEnum } from "class-validator";
import { ProductionJobStatus } from "@prisma/client";

export class UpdateProductionStatusDto {
  @IsEnum(ProductionJobStatus)
  status!: ProductionJobStatus;
}
