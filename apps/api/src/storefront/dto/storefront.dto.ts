import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, IsIn } from "class-validator";
import { Type } from "class-transformer";

export class QueryStorefrontProductsDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ["newest", "price_asc", "price_desc"],
    default: "newest",
  })
  @IsOptional()
  @IsString()
  @IsIn(["newest", "price_asc", "price_desc"])
  sortBy?: "newest" | "price_asc" | "price_desc" = "newest";
}
