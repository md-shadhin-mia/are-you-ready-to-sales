import { Type } from "class-transformer";
import { IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUrl, IsUUID, MaxLength } from "class-validator";
import { AdjustmentType, TicketPriority, TicketStatus } from "@repo/db";
import { ADJUSTMENT_REASON_CODES } from "../seller-governance.service";

export class SellerAdjustmentDto {
  @IsEnum(AdjustmentType)
  type!: AdjustmentType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @IsIn(ADJUSTMENT_REASON_CODES)
  reasonCode!: string;

  @IsUrl()
  documentUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ReasonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class CreateTicketDto {
  @IsUUID()
  sellerId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}

export class UpdateTicketDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  resolution?: string;
}
