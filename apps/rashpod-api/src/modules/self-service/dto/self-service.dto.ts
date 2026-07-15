import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateStoryEngagementDto {
  @IsBoolean()
  liked!: boolean;

  @IsBoolean()
  bookmarked!: boolean;
}

export class SupportRequestDto {
  @IsString()
  @IsIn(["payment", "delivery", "product_issue", "cancellation_refund", "rejected_design", "payout", "listing", "account", "upload_problem", "other"])
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subject?: string;

  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  designId?: string;

  @IsOptional()
  @IsString()
  listingId?: string;
}

export class UpdateCustomerProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultDeliveryAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;
}

export class UpdateDesignerProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  handle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  payoutNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;
}
