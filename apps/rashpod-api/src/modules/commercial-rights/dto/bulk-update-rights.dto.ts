import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from "class-validator";

export enum BulkFilmSalesAction {
  ENABLE = "ENABLE",
  DISABLE = "DISABLE",
}

export class BulkUpdateRightsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID("4", { each: true })
  designIds!: string[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  allowProductSales?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  allowMarketplacePublishing?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  allowCorporateBidding?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(BulkFilmSalesAction)
  filmSalesAction?: BulkFilmSalesAction;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  reason?: string;
}
