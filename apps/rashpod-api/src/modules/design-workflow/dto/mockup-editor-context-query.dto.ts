import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class MockupEditorContextQueryDto {
  @IsString()
  localBaseProductId!: string;

  @IsString()
  mockupTemplateId!: string;

  @IsString()
  printAreaId!: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  placementPresetId?: string;
}
