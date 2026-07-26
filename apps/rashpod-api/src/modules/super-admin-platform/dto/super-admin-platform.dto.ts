import { DesignerStatus, UserRole } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";
import { PermissionKey } from "../../../common/auth/permissions";

export class UpdatePermissionsDto {
  @IsObject()
  overrides!: Partial<Record<PermissionKey, UserRole[]>>;
}

export class ListPlatformUsersQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;
}

export class UpdatePlatformUserRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}

export class UpdatePlatformDesignerStatusDto {
  @IsEnum(DesignerStatus)
  designerStatus!: DesignerStatus;
}

export class CreateSecretReferenceDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/, { message: "envVar must be an uppercase environment variable name" })
  envVar!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  secretManagerRef?: string;

  @IsString()
  @MaxLength(120)
  service!: string;

  @IsDateString()
  @IsOptional()
  lastRotatedAt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateSecretReferenceDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[A-Z][A-Z0-9_]*$/, { message: "envVar must be an uppercase environment variable name" })
  envVar?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  secretManagerRef?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  service?: string;

  @IsDateString()
  @IsOptional()
  lastRotatedAt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
