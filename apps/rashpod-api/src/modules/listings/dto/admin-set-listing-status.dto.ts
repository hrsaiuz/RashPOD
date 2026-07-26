import { ListingStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from "class-validator";

export class AdminSetListingStatusDto {
  @IsEnum(ListingStatus)
  status!: ListingStatus;

  @ValidateIf((dto: AdminSetListingStatusDto) => dto.status === ListingStatus.REJECTED)
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
