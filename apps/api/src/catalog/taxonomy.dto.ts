import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID, Matches, Min } from "class-validator";

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "slug must be lowercase kebab-case" })
  slug!: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateSizeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Matches(/^[A-Za-z0-9-]{1,20}$/)
  code!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateSizeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateColorDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Matches(/^[A-Za-z0-9-]{1,20}$/)
  code!: string;

  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: "hexCode must look like #1A2B3C" })
  hexCode!: string;
}

export class UpdateColorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  hexCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GenerateVariantsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID("all", { each: true })
  sizeIds!: string[];

  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID("all", { each: true })
  colorIds!: string[];
}
