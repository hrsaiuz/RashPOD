import { IsIn, IsOptional, IsString } from "class-validator";

export class ClickWebhookDto {
  @IsString()
  paymentId!: string;

  @IsIn(["PAID", "FAILED"])
  status!: "PAID" | "FAILED";

  @IsOptional()
  @IsString()
  providerRef?: string;

  @IsOptional()
  raw?: Record<string, unknown>;
}
