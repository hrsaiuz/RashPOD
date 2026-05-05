import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";

export class CreateMockupTemplateDto {
  @IsString()
  baseProductId!: string;

  @IsString()
  name!: string;

  @IsString()
  baseImageKey!: string;

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
