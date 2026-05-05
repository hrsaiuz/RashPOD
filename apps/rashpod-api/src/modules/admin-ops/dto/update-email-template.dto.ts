import { IsObject, IsOptional, IsString } from "class-validator";

export class UpdateEmailTemplateDto {
  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsObject()
  @IsOptional()
  variables?: Record<string, unknown>;
}
