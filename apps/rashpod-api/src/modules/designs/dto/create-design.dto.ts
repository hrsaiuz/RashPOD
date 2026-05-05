import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateDesignDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
