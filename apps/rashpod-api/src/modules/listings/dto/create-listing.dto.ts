import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { ListingType } from "@prisma/client";

export class CreateListingDto {
  @IsEnum(ListingType)
  type!: ListingType;

  @IsString()
  designAssetId!: string;

  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price!: number;
}
