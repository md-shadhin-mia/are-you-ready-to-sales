import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
  IsUUID,
  Min,
  Max,
  IsNumber,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { OrderStatus } from "@repo/db";

export class WholesaleOrderItemDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsString()
  @IsNotEmpty()
  masterProductId!: string;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class WholesaleShippingAddressDto {
  @ApiPropertyOptional({ example: "Karim Ahmed (Reseller)" })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiPropertyOptional({ example: "Karim Ahmed (Reseller)" })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: "Apex Gadgets" })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ example: "+8801700000003" })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiPropertyOptional({ example: "Plot 14, Block C, Mirpur 1" })
  @IsOptional()
  @IsString()
  addressLine?: string;

  @ApiPropertyOptional({ example: "Plot 14, Block C, Mirpur 1" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: "Dhaka" })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiPropertyOptional({ example: "1205" })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: "Dhaka" })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: "Please deliver before 5 PM" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateWholesaleOrderDto {
  @ApiProperty({ type: [WholesaleOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WholesaleOrderItemDto)
  items!: WholesaleOrderItemDto[];

  @ApiProperty({ type: WholesaleShippingAddressDto })
  @ValidateNested()
  @Type(() => WholesaleShippingAddressDto)
  shippingAddress!: WholesaleShippingAddressDto;

  @ApiProperty({ example: "WALLET", enum: ["WALLET", "COD", "BANK_TRANSFER", "CREDIT"] })
  @IsString()
  @IsIn(["WALLET", "COD", "BANK_TRANSFER", "CREDIT"])
  paymentMethod!: "WALLET" | "COD" | "BANK_TRANSFER" | "CREDIT";

  @ApiPropertyOptional({ example: 15, description: "Requested discount; must not exceed the earned volume tier" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({ example: "Urgent inventory replenishment" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryWholesaleOrdersDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit?: number = 20;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  status?: OrderStatus;
}

export class UpdateWholesaleOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsNotEmpty()
  status!: OrderStatus;

  @ApiPropertyOptional({ example: "STE-992144" })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: "Steadfast Courier" })
  @IsOptional()
  @IsString()
  courierName?: string;
}

export class AdminCreateWholesaleOrderDto extends CreateWholesaleOrderDto {
  @ApiProperty({ description: "Enterprise/reseller account the order is placed for" })
  @IsUUID()
  userId!: string;
}

export class UpsertCreditAccountDto {
  @ApiProperty({ example: 50000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditLimit!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
