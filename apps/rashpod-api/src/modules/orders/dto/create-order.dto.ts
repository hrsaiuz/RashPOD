import { Type } from "class-transformer";
import { IsEmail, IsISO31661Alpha2, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";

export class DeliveryAddressDetailsDto {
  @IsString()
  @MaxLength(500)
  address1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address2?: string;

  @IsString()
  @MaxLength(120)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  stateCode?: string;

  @IsISO31661Alpha2()
  countryCode!: string;

  @IsString()
  @MaxLength(32)
  postalCode!: string;
}

export class CreateOrderDto {
  @IsString()
  customerName!: string;

  @IsString()
  customerPhone!: string;

  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  deliveryType!: string;

  @IsString()
  @IsOptional()
  deliveryZone?: string;

  @IsString()
  @IsOptional()
  deliveryAddress?: string;

  @IsString()
  @IsOptional()
  pickupLocation?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryAddressDetailsDto)
  deliveryAddressDetails?: DeliveryAddressDetailsDto;

  @IsString()
  @IsOptional()
  customerNote?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class PrintfulShippingRatesDto {
  @ValidateNested()
  @Type(() => DeliveryAddressDetailsDto)
  deliveryAddressDetails!: DeliveryAddressDetailsDto;
}
