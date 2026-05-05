import { IsString } from "class-validator";

export class VerifyEmailTokenDto {
  @IsString()
  token!: string;
}
