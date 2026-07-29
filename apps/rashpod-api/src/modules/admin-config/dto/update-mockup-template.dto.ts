import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class UpdateMockupTemplateDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @IsOptional()
  baseProductId?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(1024)
  @IsOptional()
  baseImageKey?: string;

  @IsString()
  @Matches(/\S/)
  @MaxLength(1024)
  @IsOptional()
  lifestyleImageKey?: string;

  @IsString()
  @Matches(/\S/)
  @MaxLength(1024)
  @IsOptional()
  closeupImageKey?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
