import { ArrayNotEmpty, IsArray, IsString } from "class-validator";

export class RetryDeadLetterDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];
}
