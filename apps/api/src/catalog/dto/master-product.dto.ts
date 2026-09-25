import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from "class-validator";
import { Transform, Type } from "class-transformer";

export class CreateMasterProductDto {
  @ApiProperty({ example: "SKU-ELEC-009" })
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiProperty({ example: "Mechanical Wireless Keyboard" })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @ApiProperty({ example: 4500.0, description: "Wholesale base price in BDT" })
  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: "Base price must be a positive number" })
  basePrice!: number;

  @ApiPropertyOptional({ example: 50, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: "Stock quantity cannot be negative" })
  stockQuantity?: number;

  @ApiProperty({ example: "RGB backlit tactile mechanical keyboard." })
  @IsString()
  @IsNotEmpty()
  masterDescription!: string;

  @ApiPropertyOptional({
    example: ["https://minio.platform.local/platform-media/uploads/keyboard.jpg"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  masterImages?: string[];
}

export class UpdateMasterProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  basePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  masterDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  masterImages?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdjustStockDto {
  @ApiProperty({
    example: 25,
    description: "Amount to increment (positive) or decrement (negative)",
  })
  @Type(() => Number)
  @IsNumber()
  quantityChange!: number;

  @ApiProperty({ example: "Received supplier batch PO #9942" })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class QueryMasterProductsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
