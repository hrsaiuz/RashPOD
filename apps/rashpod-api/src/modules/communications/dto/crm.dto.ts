import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { CrmContactChannel, CrmContactDirection, UserRole } from "@prisma/client";

export class ListCrmProfilesDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class CreateCrmNoteDto {
  @IsString()
  @MaxLength(2000)
  note!: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

export class CreateCrmContactLogDto {
  @IsEnum(CrmContactChannel)
  channel!: CrmContactChannel;

  @IsOptional()
  @IsEnum(CrmContactDirection)
  direction?: CrmContactDirection;

  @IsString()
  @MaxLength(1000)
  summary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  outcome?: string;
}

export class UpsertCrmTagDto {
  @IsString()
  @MaxLength(60)
  key!: string;

  @IsString()
  @MaxLength(80)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}
