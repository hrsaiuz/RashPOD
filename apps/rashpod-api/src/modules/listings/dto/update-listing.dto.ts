import { IsArray, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateListingDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsOptional()
  metadataJson?: Record<string, unknown>;
}
