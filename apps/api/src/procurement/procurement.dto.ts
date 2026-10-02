import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Matches(/^\d{12}$/, { message: "tinNumber must be a 12-digit Tax Identification Number" })
  tinNumber!: string;

  @IsString()
  @MinLength(10)
  businessAddress!: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  contractStartDate?: string;

  @IsOptional()
  @IsDateString()
  contractEndDate?: string;
}

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  businessAddress?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  contractStartDate?: string;

  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PurchaseLineDto {
  @IsUUID()
  masterProductId!: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost!: number;
}

export class CreatePurchaseOrderDto {
  @IsUUID()
  supplierId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PurchaseLineDto)
  items!: PurchaseLineDto[];

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ReceiveLineDto {
  @IsUUID()
  purchaseOrderItemId!: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class ReceiveGoodsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReceiveLineDto)
  items!: ReceiveLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class MatchInvoiceDto {
  @IsString()
  @IsNotEmpty()
  invoiceNumber!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  invoiceAmount!: number;
}

export class SupplierPaymentDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;
}

export class CreatePurchaseReturnDto {
  @IsUUID()
  supplierId!: string;

  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @IsUUID()
  masterProductId!: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsUUID()
  returnTypeId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateReturnTypeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Matches(/^[A-Z0-9_]{2,30}$/)
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
