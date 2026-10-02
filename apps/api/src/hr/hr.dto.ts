import { Type } from "class-transformer";
import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Matches, MaxLength, Min } from "class-validator";

export class CreateEmployeeDto {
  @IsUUID()
  userId!: string;

  @Matches(/^[A-Z0-9-]{3,30}$/)
  employeeCode!: string;

  @IsString()
  @IsNotEmpty()
  designation!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseSalary!: number;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsDateString()
  joinedAt?: string;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  designation?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseSalary?: number;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateCommissionDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreatePenaltyDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @Matches(/^POL-[A-Z0-9]+-\d+$/, { message: "infractionCode must cite a policy code such as POL-ATT-02" })
  infractionCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  supervisorNotes!: string;

  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  effectiveMonth!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
