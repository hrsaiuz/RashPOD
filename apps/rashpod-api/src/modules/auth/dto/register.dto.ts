import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";

export const REGISTRATION_ROLES = ["CUSTOMER", "DESIGNER", "CORPORATE_CLIENT"] as const;
export type RegistrationRole = (typeof REGISTRATION_ROLES)[number];

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsOptional()
  @IsIn(REGISTRATION_ROLES as unknown as string[])
  role?: RegistrationRole;
}
