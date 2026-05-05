import { IsInt, IsNumber, IsString, Min } from "class-validator";

export class CreateDesignerBidDto {
  @IsString()
  proposal!: string;

  @IsNumber()
  @Min(0)
  designFee!: number;

  @IsInt()
  @Min(1)
  timelineDays!: number;
}
