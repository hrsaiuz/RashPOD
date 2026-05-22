import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { ProductionJobStatus } from "@prisma/client";

export class WorkshopQueueDto {
  @IsOptional()
  @IsString()
  filter?: string;

  @IsOptional()
  @IsIn(["priority", "dueDate", "oldest", "newest", "status"])
  sort?: "priority" | "dueDate" | "oldest" | "newest" | "status";

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class WorkshopScanDto {
  @IsString()
  @MaxLength(128)
  code!: string;
}

export class WorkshopActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class WorkshopStatusDto extends WorkshopActionDto {
  @IsEnum(ProductionJobStatus)
  status!: ProductionJobStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  producedQuantity?: number;
}

export class WorkshopQcDto extends WorkshopActionDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  producedQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  acceptedQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  rejectedQuantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  defectReason?: string;

  @IsOptional()
  @IsBoolean()
  reprintRequired?: boolean;
}

export class WorkshopEvidenceSignUploadDto {
  @IsString()
  @MaxLength(180)
  filename!: string;

  @IsString()
  @MaxLength(80)
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(20_000_000)
  sizeBytes!: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  checksum?: string;
}

export class WorkshopEvidenceCompleteDto extends WorkshopActionDto {
  @IsInt()
  @Min(1)
  uploadedSizeBytes!: number;

  @IsString()
  @MaxLength(80)
  uploadedMimeType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  uploadedChecksum?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  defectReason?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  acceptedQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  rejectedQuantity?: number;

  @IsOptional()
  @IsBoolean()
  customerVisible?: boolean;
}

export class WorkshopPackItemDto extends WorkshopActionDto {
  @IsString()
  @MaxLength(80)
  productionJobId!: string;
}

export class WorkshopIssueDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @IsString()
  @MaxLength(80)
  type!: string;

  @IsIn(["LOW", "NORMAL", "HIGH", "URGENT"])
  severity!: "LOW" | "NORMAL" | "HIGH" | "URGENT";

  @IsString()
  @MaxLength(2000)
  note!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  photoAssetId?: string;

  @IsOptional()
  @IsBoolean()
  blockItem?: boolean;
}

export class WorkshopResolveIssueDto extends WorkshopActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionNote?: string;
}

export class WorkshopFulfillmentDto extends WorkshopActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  trackingRef?: string;
}
