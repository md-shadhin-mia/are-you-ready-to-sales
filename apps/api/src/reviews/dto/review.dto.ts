import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";

export enum RatingFilterType {
  ALL = "ALL",
  FIVE_STAR = "5_STAR",
  CRITICAL = "CRITICAL",
}

export class SubmitReviewDto {
  @IsOptional()
  @IsString()
  reviewToken?: string;

  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsString()
  @IsNotEmpty()
  masterProductId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  productRating!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  storeRating!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  deliveryRating!: number;

  @IsOptional()
  @IsString()
  productComment?: string;

  @IsOptional()
  @IsString()
  storeComment?: string;

  @IsOptional()
  @IsString()
  deliveryComment?: string;
}

export class QueryReviewsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  ratingFilter?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class TogglePublishReviewDto {
  @IsBoolean()
  isPublished!: boolean;
}
