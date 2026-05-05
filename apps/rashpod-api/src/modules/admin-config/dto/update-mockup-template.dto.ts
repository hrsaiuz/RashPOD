import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";

export class UpdateMockupTemplateDto {
  @IsString()
  @IsOptional()
  baseProductId?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  baseImageKey?: string;

  @IsString()
  @IsOptional()
  lifestyleImageKey?: string;

  @IsString()
  @IsOptional()
  closeupImageKey?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
