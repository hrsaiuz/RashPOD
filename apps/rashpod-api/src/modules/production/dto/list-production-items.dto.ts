import { IsIn, IsOptional, IsString } from "class-validator";

export class ListProductionItemsDto {
  @IsOptional()
  @IsString()
  filter?: string;

  @IsOptional()
  @IsIn(["newest", "oldest", "priority", "dueDate", "status"])
  sort?: "newest" | "oldest" | "priority" | "dueDate" | "status";

  @IsOptional()
  @IsString()
  queueType?: string;
}
