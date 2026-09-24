import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsPositive } from "class-validator";
import { Type } from "class-transformer";

export class PricingPreviewDto {
  @ApiProperty({ example: 1800, description: "Wholesale base price in BDT" })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  basePrice!: number;

  @ApiProperty({ example: 2400, description: "Desired retail selling price in BDT" })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  sellingPrice!: number;

  @ApiPropertyOptional({ example: false, default: false, description: "True if MFS/Card, false if Cash on Delivery" })
  @IsOptional()
  @IsBoolean()
  isOnlinePayment?: boolean = false;

  @ApiPropertyOptional({ example: true, default: true, description: "True if shipping inside Dhaka (80 BDT), false outside (150 BDT)" })
  @IsOptional()
  @IsBoolean()
  isInsideDhaka?: boolean = true;
}
