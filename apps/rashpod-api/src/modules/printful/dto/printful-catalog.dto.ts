import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class ListPrintfulCatalogProductsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  categoryId?: number;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}

export class PublishPrintfulListingDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  catalogProductId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  variantIds!: number[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  storeIds!: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  rashpodProductType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  placement!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  technique!: string;

  @IsNumberString()
  retailPrice!: string;
}

export class PreparePrintfulCatalogProductDto {
  @IsString()
  @IsOptional()
  @MaxLength(80)
  rashpodProductType?: string;
}
