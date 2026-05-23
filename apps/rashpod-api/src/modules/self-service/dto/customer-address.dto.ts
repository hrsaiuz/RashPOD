import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateCustomerAddressDto {
  @IsString()
  @MaxLength(60)
  label!: string;

  @IsString()
  @MaxLength(120)
  recipientName!: string;

  @IsString()
  @MaxLength(40)
  phone!: string;

  @IsString()
  @MaxLength(500)
  line1!: string;

  @IsString()
  @MaxLength(120)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  zone?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateCustomerAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  recipientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  line1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  zone?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class AddWishlistItemDto {
  @IsString()
  listingId!: string;
}
