import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";
import { StoreStatus } from "@repo/db";

export class CreateStoreDto {
  @ApiProperty({ example: "Apex Gadgets" })
  @IsString()
  @IsNotEmpty()
  storeName!: string;

  @ApiProperty({ example: "apex-gadgets" })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({ example: { primaryColor: "#2563eb", secondaryColor: "#1e293b" } })
  @IsOptional()
  @IsObject()
  themeConfig?: Record<string, any>;

  @ApiPropertyOptional({ example: { tagline: "Curated electronics" } })
  @IsOptional()
  @IsObject()
  brandingInfo?: Record<string, any>;
}

export class UpdateBrandingDto {
  @ApiPropertyOptional({ example: "Apex Gadgets Pro" })
  @IsOptional()
  @IsString()
  storeName?: string;

  @ApiPropertyOptional({ example: "https://minio.platform.local/platform-media/logo.png" })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @ApiPropertyOptional({ example: { tagline: "Premium tech accessories in Bangladesh" } })
  @IsOptional()
  @IsObject()
  brandingInfo?: Record<string, any>;
}

export class UpdateThemeDto {
  @ApiProperty({
    example: {
      primaryColor: "#059669",
      secondaryColor: "#111827",
      fontFamily: "Inter",
      borderRadius: "0.5rem",
    },
  })
  @IsObject()
  @IsNotEmpty()
  themeConfig!: Record<string, any>;
}

export class UpdateStoreStatusDto {
  @ApiProperty({ enum: StoreStatus, example: StoreStatus.ACTIVE })
  @IsEnum(StoreStatus)
  status!: StoreStatus;
}

export class UpdateCustomDomainDto {
  @ApiPropertyOptional({ example: "mystore.com" })
  @IsOptional()
  @IsString()
  customDomain?: string | null;
}

