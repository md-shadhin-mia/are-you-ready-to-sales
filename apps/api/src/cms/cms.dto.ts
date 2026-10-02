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
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

const URL_RULES = { require_protocol: true, protocols: ["http", "https"] };

export class UpdateSiteSettingsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  siteName?: string;

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsUrl(URL_RULES)
  logoUrl?: string;

  @IsOptional()
  @IsUrl(URL_RULES)
  faviconUrl?: string;

  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  supportPhone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;

  /** Write-only: stored encrypted, never returned. */
  @IsOptional()
  @IsObject()
  apiSecrets?: Record<string, string>;

  /** Write-only: stored encrypted, never returned. */
  @IsOptional()
  @IsObject()
  webhooks?: Record<string, string>;
}

export class CreatePageDto {
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  contentHtml!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  metaDescription?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdatePageDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  contentHtml?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  metaDescription?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class LeaderDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  role!: string;

  @IsUrl(URL_RULES)
  photoUrl!: string;

  @IsString()
  @IsNotEmpty()
  bio!: string;

  @IsUrl(URL_RULES)
  linkedInUrl!: string;
}

export class UpdateAboutDto {
  @IsString()
  @IsNotEmpty()
  headline!: string;

  @IsString()
  @IsNotEmpty()
  story!: string;

  @IsOptional()
  @IsString()
  mission?: string;

  @IsOptional()
  @IsString()
  vision?: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => LeaderDto)
  leadershipTeam!: LeaderDto[];
}

export class CreateBannerDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsUrl(URL_RULES)
  imageUrl!: string;

  @IsOptional()
  @IsUrl(URL_RULES)
  linkUrl?: string;

  @IsOptional()
  @IsString()
  placement?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBannerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsUrl(URL_RULES)
  imageUrl?: string;

  @IsOptional()
  @IsUrl(URL_RULES)
  linkUrl?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReorderBannersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("all", { each: true })
  orderedIds!: string[];
}

export class CreateFaqDto {
  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsString()
  @IsNotEmpty()
  answer!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateFaqDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  question?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  answer?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
