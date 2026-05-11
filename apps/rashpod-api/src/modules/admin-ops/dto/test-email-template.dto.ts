import { IsEmail, IsObject, IsOptional, IsString } from "class-validator";

export class TestEmailTemplateDto {
  @IsEmail()
  to!: string;

  @IsString()
  key!: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}
