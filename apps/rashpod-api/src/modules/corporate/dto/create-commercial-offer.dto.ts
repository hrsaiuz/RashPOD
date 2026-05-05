import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateCommercialOfferDto {
  @IsString()
  selectedBidId!: string;

  @IsNumber()
  @Min(0)
  subtotal!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discount?: number;

  @IsString()
  @IsOptional()
  terms?: string;
}
