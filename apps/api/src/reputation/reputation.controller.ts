import { Controller, Get, Param, UseGuards, Req } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ReputationService } from "./reputation.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@repo/db";
import { Request } from "express";

@ApiTags("Store Reputation & Trust")
@Controller("api/v1")
export class ReputationController {
  constructor(private readonly reputationService: ReputationService) {}

  @Get("stores/:slug/reputation")
  @ApiOperation({ summary: "Get public store reputation and trust badge metrics" })
  @ApiResponse({ status: 200, description: "Store reputation summary returned" })
  getStoreReputation(@Param("slug") slug: string) {
    return this.reputationService.getBySlug(slug);
  }

  @Get("student/reputation")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get seller performance scorecard for authenticated student" })
  @ApiResponse({ status: 200, description: "Detailed scorecard and tips returned" })
  getStudentScorecard(@Req() req: Request & { user: { id: string } }) {
    return this.reputationService.getStudentScorecard(req.user.id);
  }
}
