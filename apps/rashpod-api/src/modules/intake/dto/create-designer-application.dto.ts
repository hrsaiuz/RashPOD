import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateDesignerApplicationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneCountryCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  telegramUsername?: string;

  @IsOptional()
  @IsBoolean()
  passwordProvided?: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  country!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  designCategories!: string[];

  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  shortBio!: string;

  @IsArray()
  @ArrayMinSize(1)
  portfolioFiles!: unknown[];

  @IsArray()
  @ArrayMinSize(1)
  identityFiles!: unknown[];

  @IsArray()
  @ArrayMinSize(1)
  selfieFiles!: unknown[];

  @IsObject()
  confirmations!: Record<string, boolean>;
}
