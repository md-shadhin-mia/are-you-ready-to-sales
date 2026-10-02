import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength, NotEquals } from "class-validator";
import { StockMovementType } from "@repo/db";

export class StockAdjustmentDto {
  @IsUUID()
  masterProductId!: string;

  @Type(() => Number)
  @IsInt()
  @NotEquals(0)
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  notes!: string;
}

export class StockQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  lowStock?: boolean;

  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;
}

export class MovementQueryDto {
  @IsOptional()
  @IsUUID()
  masterProductId?: string;

  @IsOptional()
  @IsEnum(StockMovementType)
  movementType?: StockMovementType;

  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;
}
