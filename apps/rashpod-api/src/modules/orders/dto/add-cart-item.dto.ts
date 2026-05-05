import { IsInt, IsString, Min } from "class-validator";

export class AddCartItemDto {
  @IsString()
  listingId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
