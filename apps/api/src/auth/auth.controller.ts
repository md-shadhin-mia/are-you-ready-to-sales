import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterDto, LoginDto, RefreshTokenDto, LogoutDto } from "./dto/auth.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { Request } from "express";

@ApiTags("Authentication")
@Controller("api/v1/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register a new student account" })
  @ApiResponse({ status: 201, description: "Student registered successfully" })
  @ApiResponse({ status: 409, description: "Email already registered" })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with email and password" })
  @ApiResponse({ status: 200, description: "Authentication successful" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token using refresh token" })
  @ApiResponse({ status: 200, description: "Tokens refreshed successfully" })
  @ApiResponse({ status: 401, description: "Invalid or expired refresh token" })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout and revoke refresh token" })
  @ApiResponse({ status: 200, description: "Logged out successfully" })
  async logout(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: LogoutDto,
  ) {
    return this.authService.logout(req.user.id, dto.refreshToken);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current authenticated user profile" })
  @ApiResponse({ status: 200, description: "User profile details" })
  async getProfile(@Req() req: Request & { user: { id: string } }) {
    return this.authService.getProfile(req.user.id);
  }
}
