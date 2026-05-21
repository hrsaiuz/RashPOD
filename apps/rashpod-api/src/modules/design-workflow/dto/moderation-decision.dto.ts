import { Type } from "class-transformer";
import { IsArray, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class ModerationPositionDto {
  @IsNumber()
  @IsOptional()
  widthCm?: number;

  @IsNumber()
  @IsOptional()
  heightCm?: number;

  @IsNumber()
  @IsOptional()
  widthPx?: number;

  @IsNumber()
  @IsOptional()
  heightPx?: number;

  @IsNumber()
  @IsOptional()
  xCm?: number;

  @IsNumber()
  @IsOptional()
  yCm?: number;

  @IsNumber()
  @IsOptional()
  xPx?: number;

  @IsNumber()
  @IsOptional()
  yPx?: number;

  @IsNumber()
  @IsOptional()
  widthIn?: number;

  @IsNumber()
  @IsOptional()
  heightIn?: number;

  @IsNumber()
  @IsOptional()
  leftIn?: number;

  @IsNumber()
  @IsOptional()
  topIn?: number;

  @IsNumber()
  @IsOptional()
  scale?: number;

  @IsNumber()
  @IsOptional()
  rotation?: number;
}

export class LocalSelectionDto {
  @IsString()
  localBaseProductId!: string;

  @IsString()
  @IsOptional()
  mockupTemplateId?: string;

  @IsString()
  @IsOptional()
  printAreaId?: string;

  @IsString()
  placementPresetId!: string;

  @IsString()
  placement!: string;

  @IsIn(["CM", "PX"])
  @IsOptional()
  unit?: "CM" | "PX";

  @IsIn(["TOP_LEFT", "CENTER"])
  @IsOptional()
  anchor?: "TOP_LEFT" | "CENTER";

  @ValidateNested()
  @Type(() => ModerationPositionDto)
  position!: ModerationPositionDto;
}

export class GlobalPrintfulSelectionDto {
  @IsString()
  printfulProductTemplateId!: string;

  @IsString()
  placementPresetId!: string;

  @IsString()
  placement!: string;

  @IsString()
  @IsOptional()
  technique?: string;

  @ValidateNested()
  @Type(() => ModerationPositionDto)
  position!: ModerationPositionDto;

  @IsArray()
  @IsOptional()
  targetMarketplaces?: string[];
}

export class SubmitModerationDecisionDto {
  @IsIn(["REJECT", "APPROVE_LOCAL", "APPROVE_GLOBAL"])
  decision!: "REJECT" | "APPROVE_LOCAL" | "APPROVE_GLOBAL";

  @IsArray()
  @IsOptional()
  rejectionReasons?: string[];

  @IsString()
  @IsOptional()
  customRejectionReason?: string;

  @ValidateNested({ each: true })
  @Type(() => LocalSelectionDto)
  @IsOptional()
  localSelections?: LocalSelectionDto[];

  @ValidateNested({ each: true })
  @Type(() => GlobalPrintfulSelectionDto)
  @IsOptional()
  globalPrintfulSelections?: GlobalPrintfulSelectionDto[];

  @IsString()
  @IsOptional()
  moderatorNotes?: string;
}
