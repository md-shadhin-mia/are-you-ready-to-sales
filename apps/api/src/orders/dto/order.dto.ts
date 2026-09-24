import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { OrderStatus } from "@repo/db";

export class CheckoutItemDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsString()
  @IsNotEmpty()
  storeProductId!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class ShippingAddressDto {
  @ApiProperty({ example: "Karim Ullah" })
  @IsString()
  @IsNotEmpty()
  recipientName!: string;

  @ApiProperty({ example: "01811223344" })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: "House 12, Road 4, Block B, Banani" })
  @IsString()
  @IsNotEmpty()
  addressLine!: string;

  @ApiProperty({ example: "Dhaka" })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ example: "Dhaka" })
  @IsString()
  @IsNotEmpty()
  district!: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isInsideDhaka?: boolean = true;
}

export class CheckoutDto {
  @ApiProperty({ example: "Karim Ullah" })
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @ApiProperty({ example: "01811223344" })
  @IsString()
  @IsNotEmpty()
  customerPhone!: string;

  @ApiPropertyOptional({ example: "buyer@example.com" })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @ApiProperty({ type: [CheckoutItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @ApiProperty({ example: "COD", enum: ["COD", "BKASH", "NAGAD", "CARD"] })
  @IsString()
  @IsIn(["COD", "BKASH", "NAGAD", "CARD"])
  paymentMethod!: string;

  @ApiPropertyOptional({ example: "WELCOME10" })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ example: "facebook" })
  @IsOptional()
  @IsString()
  utmSource?: string;

  @ApiPropertyOptional({ example: "cpc" })
  @IsOptional()
  @IsString()
  utmMedium?: string;

  @ApiPropertyOptional({ example: "summer_sale" })
  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @ApiPropertyOptional({ example: "karim" })
  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class DispatchOrderDto {
  @ApiProperty({ example: "Steadfast" })
  @IsString()
  @IsNotEmpty()
  courierName!: string;

  @ApiProperty({ example: "ST-998877" })
  @IsString()
  @IsNotEmpty()
  trackingNumber!: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.DELIVERED })
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

export class QueryOrdersDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 20;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
