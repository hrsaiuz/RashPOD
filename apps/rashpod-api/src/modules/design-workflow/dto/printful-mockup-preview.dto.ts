import { Type } from "class-transformer";
import { IsArray, IsOptional, IsString, ValidateNested } from "class-validator";
import { ModerationPositionDto } from "./moderation-decision.dto";

export class PrintfulMockupPreviewDto {
  @IsString()
  printfulProductTemplateId!: string;

  @IsString()
  placement!: string;

  @IsString()
  @IsOptional()
  technique?: string;

  @IsArray()
  @IsOptional()
  selectedVariantIds?: string[];

  @ValidateNested()
  @Type(() => ModerationPositionDto)
  position!: ModerationPositionDto;
}
