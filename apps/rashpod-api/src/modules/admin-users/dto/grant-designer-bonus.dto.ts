import { IsArray, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class GrantDesignerBonusDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  reason!: string;
}

export class GrantGroupBonusDto extends GrantDesignerBonusDto {
  @IsArray()
  @IsString({ each: true })
  designerIds!: string[];

  @IsString()
  @IsOptional()
  name?: string;
}