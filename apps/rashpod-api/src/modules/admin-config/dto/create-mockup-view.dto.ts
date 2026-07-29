import { IsBoolean, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Matches, MaxLength, Min } from "class-validator";

export class CreateMockupViewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  viewKey!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  placementCode!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(1024)
  blankImageKey!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  mockupStyle?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  metadataJson?: Record<string, unknown>;
}
