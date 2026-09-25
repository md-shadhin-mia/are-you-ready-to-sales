import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "student@example.com" })
  @IsEmail({}, { message: "Invalid email format" })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: "Secret123!" })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password!: string;

  @ApiProperty({ example: "Tariqul Islam" })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiPropertyOptional({ example: "+8801712345678" })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ example: "student@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: "Secret123!" })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6..." })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiPropertyOptional({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6..." })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
