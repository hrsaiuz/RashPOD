import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateCorporateRequestDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  details?: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  budget?: number;

  @IsDateString()
  @IsOptional()
  deadline?: string;
}
