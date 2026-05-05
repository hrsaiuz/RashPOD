import { IsEmail, IsString } from "class-validator";

export class TestEmailTemplateDto {
  @IsEmail()
  to!: string;

  @IsString()
  key!: string;
}
