import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateCommercialOfferDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  subtotal?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @IsString()
  @IsOptional()
  terms?: string;
}
