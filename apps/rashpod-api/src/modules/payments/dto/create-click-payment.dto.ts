import { IsString } from "class-validator";

export class CreateClickPaymentDto {
  @IsString()
  orderId!: string;
}
