import { IsObject, IsOptional, IsString } from "class-validator";

export class CreateEmailTemplateDto {
  @IsString()
  key!: string;

  @IsString()
  subject!: string;

  @IsString()
  body!: string;

  @IsObject()
  @IsOptional()
  variables?: Record<string, unknown>;
}
