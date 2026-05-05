import { IsDateString, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateCorporateRequestDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  details?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  budget?: number;

  @IsDateString()
  @IsOptional()
  deadline?: string;
}
