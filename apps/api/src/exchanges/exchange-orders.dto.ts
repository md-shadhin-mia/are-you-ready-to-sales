import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";
import { ExchangeStatus, ReturnGrading } from "@repo/db";

export class CreateExchangeDto {
  @IsUUID()
  originalOrderId!: string;

  @IsUUID()
  returnedProductId!: string;

  @IsUUID()
  replacementProductId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  proofPhotos?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  returnDeliveryFee?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ExchangeReasonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class DispatchExchangeDto {
  @IsString()
  @IsNotEmpty()
  courierName!: string;

  @IsString()
  @IsNotEmpty()
  reverseTrackingNumber!: string;

  @IsString()
  @IsNotEmpty()
  forwardTrackingNumber!: string;
}

export class InspectExchangeDto {
  @IsEnum(ReturnGrading)
  grading!: ReturnGrading;
}

export class ExchangeQueryDto {
  @IsOptional()
  @IsEnum(ExchangeStatus)
  status?: ExchangeStatus;

  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;
}
