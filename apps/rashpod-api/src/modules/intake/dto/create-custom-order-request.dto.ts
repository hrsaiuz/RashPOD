import { IsArray, IsDateString, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class CreateCustomOrderRequestDto {
  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsOptional()
  @IsString()
  companyEventName?: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phoneCountryCode?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsString()
  estimatedBudget?: string;

  @IsOptional()
  @IsString()
  preferredDelivery?: string;

  @IsOptional()
  @IsString()
  productNeed?: string;

  @IsOptional()
  @IsString()
  quantity?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  hasDesign?: string;

  @IsOptional()
  @IsString()
  designTypes?: string;

  @IsOptional()
  @IsArray()
  uploadedFiles?: unknown[];
}
