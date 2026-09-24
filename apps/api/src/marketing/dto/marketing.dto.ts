import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsBoolean,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import { CouponDiscountType } from "@repo/db";

export class CreateCouponDto {
  @ApiProperty({ example: "EID2026" })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ enum: CouponDiscountType, example: CouponDiscountType.PERCENTAGE })
  @IsEnum(CouponDiscountType)
  discountType!: CouponDiscountType;

  @ApiProperty({ example: 10, description: "Percentage (1-100) or Fixed Amount in BDT" })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  discountValue!: number;

  @ApiPropertyOptional({ example: 500, description: "Minimum cart subtotal to qualify" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minSpend?: number = 0;

  @ApiPropertyOptional({ example: 100, description: "Max total redemptions permitted" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({ example: "2026-09-01T00:00:00Z" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-10-01T23:59:59Z" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateCouponDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({ example: "2026-12-31T23:59:59Z" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ValidateCouponDto {
  @ApiProperty({ example: "WELCOME10" })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 1200 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  subtotal!: number;
}

export class UpdateBannerDto {
  @ApiPropertyOptional({ example: "Flash Sale: Use code FLASH20 for 20% off all gadgets!" })
  @IsOptional()
  @IsString()
  bannerText?: string;

  @ApiPropertyOptional({ example: "/products" })
  @IsOptional()
  @IsString()
  bannerLink?: string;

  @ApiPropertyOptional({ example: "#2563eb" })
  @IsOptional()
  @IsString()
  bannerBgColor?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  bannerActive?: boolean;
}
