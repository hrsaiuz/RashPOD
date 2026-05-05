import { IsDateString, IsNumber, IsString, Max, Min } from "class-validator";

export class CreateRoyaltyRuleDto {
  @IsString()
  scope!: string;

  @IsString()
  basis!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  value!: number;

  @IsDateString()
  effectiveAt!: string;
}
