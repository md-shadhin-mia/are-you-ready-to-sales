import { Controller, Post, Body, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { PricingService } from "./pricing.service";
import { PricingPreviewDto } from "./dto/pricing.dto";
import { GamificationService } from "../gamification/gamification.service";
import { getCommissionRateForLevel } from "../gamification/gamification.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@repo/db";

@ApiTags("Pricing & Margins")
@Controller("api/v1/student/pricing")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN, UserRole.INSTITUTE_ADMIN)
@ApiBearerAuth()
export class PricingController {
  constructor(
    private readonly pricingService: PricingService,
    private readonly gamificationService: GamificationService,
  ) {}

  @Post("preview")
  @ApiOperation({
    summary: "Preview profit margins, platform commission, payment fees, and customer price",
  })
  @ApiResponse({ status: 200, description: "Detailed profit & fee breakdown returned" })
  async previewPricing(
    @Req() req: Request & { user: { id: string; role: UserRole } },
    @Body() dto: PricingPreviewDto,
  ) {
    // Reflect the caller's actual tier commission rate so the preview never
    // diverges from what checkout will charge (Level-5+ sellers get a
    // reduced rate — see getCommissionRateForLevel).
    let commissionRate: number | undefined;
    if (req.user.role === UserRole.STUDENT) {
      const studentLevel = await this.gamificationService.getOrCreateStudentLevel(
        req.user.id,
      );
      commissionRate = getCommissionRateForLevel(studentLevel.currentLevel);
    }

    return this.pricingService.calculateBreakdown({
      basePrice: dto.basePrice,
      sellingPrice: dto.sellingPrice,
      isOnlinePayment: dto.isOnlinePayment,
      isInsideDhaka: dto.isInsideDhaka,
      commissionRate,
    });
  }
}
