import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CreateMockupTemplateDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  baseProductId!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(1024)
  baseImageKey!: string;

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
