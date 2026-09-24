import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { StoresService } from "./stores.service";
import {
  CreateStoreDto,
  UpdateBrandingDto,
  UpdateThemeDto,
  UpdateStoreStatusDto,
} from "./dto/store.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@repo/db";
import { Request } from "express";

@ApiTags("Stores")
@Controller("api/v1/stores")
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get("check-slug")
  @ApiOperation({ summary: "Check if a subdomain slug is available" })
  @ApiQuery({ name: "slug", required: true, example: "nexus-tech" })
  @ApiResponse({ status: 200, description: "Slug availability result" })
  checkSlug(@Query("slug") slug: string) {
    return this.storesService.checkSlug(slug);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN, UserRole.INSTITUTE_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get currently logged-in student's store details" })
  @ApiResponse({ status: 200, description: "Store details returned" })
  getMyStore(@Req() req: Request & { user: { id: string } }) {
    return this.storesService.getMyStore(req.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new store for the student" })
  @ApiResponse({ status: 201, description: "Store created successfully" })
  createStore(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: CreateStoreDto,
  ) {
    return this.storesService.createStore(req.user.id, dto);
  }

  @Patch("me/branding")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update store name, logo, and branding information" })
  @ApiResponse({ status: 200, description: "Store branding updated" })
  updateBranding(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: UpdateBrandingDto,
  ) {
    return this.storesService.updateBranding(req.user.id, dto);
  }

  @Patch("me/theme")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update storefront theme colors and typography" })
  @ApiResponse({ status: 200, description: "Theme updated" })
  updateTheme(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: UpdateThemeDto,
  ) {
    return this.storesService.updateTheme(req.user.id, dto);
  }

  @Patch("me/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update store status (DRAFT <-> ACTIVE)" })
  @ApiResponse({ status: 200, description: "Store status updated" })
  updateStatus(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: UpdateStoreStatusDto,
  ) {
    return this.storesService.updateStatus(req.user.id, dto.status);
  }
}
