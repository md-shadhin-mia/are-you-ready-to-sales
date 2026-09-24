import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";
import { Type } from "class-transformer";

export class ImportProductDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsString()
  @IsNotEmpty()
  masterProductId!: string;

  @ApiProperty({ example: 2400.0, description: "Customer selling price in BDT" })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  sellingPrice!: number;

  @ApiPropertyOptional({ example: 2800.0, description: "Original strike-through price" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  compareAtPrice?: number;

  @ApiPropertyOptional({ example: "Apex Pro Wireless Headphones" })
  @IsOptional()
  @IsString()
  customTitle?: string;

  @ApiPropertyOptional({ example: "Custom copywriting for local audience..." })
  @IsOptional()
  @IsString()
  customDescription?: string;

  @ApiPropertyOptional({ example: ["https://example.com/custom1.jpg"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customImages?: string[];

  @ApiPropertyOptional({ example: ["audio", "wireless"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class UpdateStoreProductDto {
  @ApiPropertyOptional({ example: 2500.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  sellingPrice?: number;

  @ApiPropertyOptional({ example: 3000.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  compareAtPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customImages?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class QueryStoreProductsDto {
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
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVisible?: boolean;
}
