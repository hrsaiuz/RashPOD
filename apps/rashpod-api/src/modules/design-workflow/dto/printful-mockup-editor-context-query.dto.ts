import { IsString } from "class-validator";

export class PrintfulMockupEditorContextQueryDto {
  @IsString()
  printfulProductTemplateId!: string;

  @IsString()
  placementPresetId!: string;

  @IsString()
  placement!: string;
}
