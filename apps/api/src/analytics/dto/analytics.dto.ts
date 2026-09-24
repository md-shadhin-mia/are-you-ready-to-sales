import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsIn,
  IsObject,
} from "class-validator";
import { FunnelEventType } from "@repo/db";

export class FunnelEventDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiProperty({ enum: FunnelEventType, example: FunnelEventType.PAGE_VIEW })
  @IsEnum(FunnelEventType)
  eventType!: FunnelEventType;

  @ApiPropertyOptional({ example: "product-uuid" })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ example: { path: "/products", utmSource: "facebook" } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class QueryFunnelDto {
  @ApiPropertyOptional({ example: "30d", enum: ["7d", "30d", "90d"] })
  @IsOptional()
  @IsString()
  @IsIn(["7d", "30d", "90d"])
  range?: "7d" | "30d" | "90d" = "30d";
}
