import { IsArray, IsEnum, IsNumber, IsOptional, IsString, MaxLength } from "class-validator";
import { PayoutMethod } from "@prisma/client";

export class RoyaltyAdjustmentDto {
  @IsString()
  designerId!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  currency!: string;

  @IsString()
  @MaxLength(1000)
  reason!: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  orderItemId?: string;

  @IsOptional()
  @IsString()
  listingId?: string;
}

export class CreatePayoutDto {
  @IsString()
  designerId!: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  entryIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class PayoutActionDto {
  @IsOptional()
  @IsEnum(PayoutMethod)
  method?: PayoutMethod;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ReconciliationReviewDto {
  @IsString()
  @MaxLength(1000)
  note!: string;

  @IsOptional()
  @IsNumber()
  receivedAmount?: number;
}

export class TrackRefundDto {
  @IsNumber()
  amount!: number;

  @IsString()
  currency!: string;

  @IsString()
  @MaxLength(1000)
  reason!: string;

  @IsOptional()
  @IsString()
  orderItemId?: string;
}
