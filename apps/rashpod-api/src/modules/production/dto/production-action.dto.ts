import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class ProductionNoteDto {
  @IsString()
  @MaxLength(2000)
  note!: string;
}

export class ProductionReasonDto {
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class ProductionFileRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class ProductionFulfillmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  trackingRef?: string;
}

export class ProductionQcDecisionDto {
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
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsBoolean()
  reprintRequired?: boolean;
}
