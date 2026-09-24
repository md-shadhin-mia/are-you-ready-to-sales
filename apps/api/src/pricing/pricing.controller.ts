import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { PricingService } from "./pricing.service";
import { PricingPreviewDto } from "./dto/pricing.dto";
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
  constructor(private readonly pricingService: PricingService) {}

  @Post("preview")
  @ApiOperation({
    summary: "Preview profit margins, platform commission, payment fees, and customer price",
  })
  @ApiResponse({ status: 200, description: "Detailed profit & fee breakdown returned" })
  previewPricing(@Body() dto: PricingPreviewDto) {
    return this.pricingService.calculateBreakdown({
      basePrice: dto.basePrice,
      sellingPrice: dto.sellingPrice,
      isOnlinePayment: dto.isOnlinePayment,
      isInsideDhaka: dto.isInsideDhaka,
    });
  }
}
