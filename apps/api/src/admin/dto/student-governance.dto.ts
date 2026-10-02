import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { KycStatus, StoreStatus } from "@repo/db";

export class KycDecisionDto {
  @IsIn([KycStatus.VERIFIED, KycStatus.REJECTED])
  status!: KycStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class SuspendStudentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class StudentPerformanceQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value === "true" ? true : value === "false" ? false : value))
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsEnum(StoreStatus)
  storeStatus?: StoreStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;
}
