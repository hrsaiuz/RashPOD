import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class DeliveryQuoteDto {
  @IsString()
  zone!: string;

  @IsNumber()
  @Min(0)
  subtotal!: number;

  @IsString()
  @IsOptional()
  providerType?: string;
}
