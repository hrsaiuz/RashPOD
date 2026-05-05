import { IsOptional, IsString } from "class-validator";

export class CreateShipmentDto {
  @IsString()
  orderId!: string;

  @IsString()
  @IsOptional()
  providerType?: string;
}
