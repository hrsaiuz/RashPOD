import { IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateDesignDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID("4")
  requestedBaseProductId!: string;
}
