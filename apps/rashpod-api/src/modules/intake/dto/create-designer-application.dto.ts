import { IsArray, IsBoolean, IsEmail, IsObject, IsOptional, IsString, MinLength } from "class-validator";

export class CreateDesignerApplicationDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

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
  telegramUsername?: string;

  @IsOptional()
  @IsBoolean()
  passwordProvided?: boolean;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsArray()
  designCategories?: string[];

  @IsOptional()
  @IsString()
  shortBio?: string;

  @IsOptional()
  @IsArray()
  portfolioFiles?: unknown[];

  @IsOptional()
  @IsArray()
  identityFiles?: unknown[];

  @IsOptional()
  @IsArray()
  selfieFiles?: unknown[];

  @IsOptional()
  @IsObject()
  confirmations?: Record<string, boolean>;
}
