import { Type } from "class-transformer";
import { IsIn, IsOptional, IsString, ValidateNested } from "class-validator";
import { ModerationPositionDto } from "./moderation-decision.dto";

export class SuggestPrintfulPlacementDto {
  @IsString()
  printfulProductTemplateId!: string;

  @IsString()
  placement!: string;

  @IsString()
  @IsOptional()
  printAreaId?: string;

  @IsString()
  @IsOptional()
  localBaseProductId?: string;

  @ValidateNested()
  @Type(() => ModerationPositionDto)
  position!: ModerationPositionDto;

  @IsIn(["CM", "PX"])
  @IsOptional()
  unit?: "CM" | "PX";
}
