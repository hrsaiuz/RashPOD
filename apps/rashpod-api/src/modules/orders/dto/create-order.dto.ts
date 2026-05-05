import { IsOptional, IsString } from "class-validator";

export class CreateOrderDto {
  @IsString()
  @IsOptional()
  deliveryType?: string;

  @IsString()
  @IsOptional()
  deliveryZone?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
