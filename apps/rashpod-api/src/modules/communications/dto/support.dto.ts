import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { SupportPriority, SupportRequestStatus } from "@prisma/client";

export class ListSupportTicketsDto {
  @IsOptional()
  @IsEnum(SupportRequestStatus)
  status?: SupportRequestStatus;

  @IsOptional()
  @IsEnum(SupportPriority)
  priority?: SupportPriority;

  @IsOptional()
  @IsString()
  requesterId?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class UpdateSupportTicketDto {
  @IsOptional()
  @IsEnum(SupportRequestStatus)
  status?: SupportRequestStatus;

  @IsOptional()
  @IsEnum(SupportPriority)
  priority?: SupportPriority;

  @IsOptional()
  @IsString()
  assignedToId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNotes?: string;
}

export class CreateSupportMessageDto {
  @IsString()
  @MaxLength(2000)
  body!: string;

  @IsOptional()
  @IsBoolean()
  internal?: boolean;
}

export class CreateManualSupportTicketDto {
  @IsString()
  requesterId!: string;

  @IsString()
  @IsIn(["payment", "delivery", "product_issue", "cancellation_refund", "rejected_design", "payout", "listing", "account", "upload_problem", "corporate", "other"])
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subject?: string;

  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsEnum(SupportPriority)
  priority?: SupportPriority;
}
