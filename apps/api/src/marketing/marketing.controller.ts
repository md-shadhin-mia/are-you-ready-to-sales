import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
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
import { CouponService } from "./coupon.service";
import { BannerService } from "./banner.service";
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  UpdateBannerDto,
} from "./dto/marketing.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@repo/db";
import { Request } from "express";

@ApiTags("Marketing & Coupons")
@Controller("api/v1")
export class MarketingController {
  constructor(
    private readonly couponService: CouponService,
    private readonly bannerService: BannerService,
  ) {}

  // ----------------------------------------------------
  // PUBLIC STOREFRONT ENDPOINTS
  // ----------------------------------------------------

  @Post("stores/:slug/coupons/validate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Validate coupon code for storefront checkout" })
  @ApiResponse({ status: 200, description: "Coupon is valid and discount calculated" })
  @ApiResponse({ status: 400, description: "Coupon expired, inactive, or below minimum spend" })
  validateCoupon(
    @Param("slug") slug: string,
    @Body() dto: ValidateCouponDto,
  ) {
    return this.couponService.validateStorefrontCoupon(slug, dto.code, dto.subtotal);
  }

  @Get("stores/:slug/banner")
  @ApiOperation({ summary: "Get promotional announcement banner for store" })
  @ApiResponse({ status: 200, description: "Active announcement banner" })
  getStoreBanner(@Param("slug") slug: string) {
    return this.bannerService.getStoreBanner(slug);
  }

  // ----------------------------------------------------
  // STUDENT DASHBOARD ENDPOINTS
  // ----------------------------------------------------

  @Post("student/coupons")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new discount coupon for the student's store" })
  @ApiResponse({ status: 201, description: "Coupon created" })
  createCoupon(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: CreateCouponDto,
  ) {
    return this.couponService.createCoupon(req.user.id, dto);
  }

  @Get("student/coupons")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all coupons for student's store" })
  @ApiResponse({ status: 200, description: "List of coupons" })
  listCoupons(@Req() req: Request & { user: { id: string } }) {
    return this.couponService.listStudentCoupons(req.user.id);
  }

  @Patch("student/coupons/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update coupon active status, limit, or expiry" })
  @ApiResponse({ status: 200, description: "Coupon updated" })
  updateCoupon(
    @Req() req: Request & { user: { id: string } },
    @Param("id") id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponService.updateCoupon(req.user.id, id, dto);
  }

  @Patch("student/marketing/banner")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Configure promotional announcement bar" })
  @ApiResponse({ status: 200, description: "Store banner updated" })
  updateBanner(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: UpdateBannerDto,
  ) {
    return this.bannerService.updateBanner(req.user.id, dto);
  }
}
