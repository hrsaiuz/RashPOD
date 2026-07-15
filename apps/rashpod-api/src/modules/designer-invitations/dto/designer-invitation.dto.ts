import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateDesignerInvitationDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() @MaxLength(120) displayName?: string;
  @IsOptional() @IsIn(["en", "ru", "uz"]) locale?: string;
  @IsOptional() @IsString() @MaxLength(1000) personalMessage?: string;
}

export class AcceptDesignerInvitationDto {
  @IsOptional() @IsString() @MaxLength(120) displayName?: string;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(128) password?: string;
  @IsBoolean() agreementsAccepted!: boolean;
}
