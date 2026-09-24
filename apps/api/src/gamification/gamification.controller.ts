import {
  Controller,
  Get,
  Post,
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
import { GamificationService } from "./gamification.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@repo/db";
import { Request } from "express";

@ApiTags("Gamification & Training Progression")
@Controller("api/v1")
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  // ----------------------------------------------------
  // STUDENT ENDPOINTS
  // ----------------------------------------------------

  @Get("student/gamification/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current student level, XP progress, and active challenges" })
  @ApiResponse({ status: 200, description: "Student gamification status returned" })
  getStudentStatus(@Req() req: Request & { user: { id: string } }) {
    return this.gamificationService.getStudentStatus(req.user.id);
  }

  @Post("student/gamification/claim/:challengeId")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Claim XP reward for a completed challenge" })
  @ApiResponse({ status: 200, description: "XP claimed and level re-evaluated" })
  claimReward(
    @Req() req: Request & { user: { id: string } },
    @Param("challengeId") challengeId: string,
  ) {
    return this.gamificationService.claimChallengeReward(req.user.id, challengeId);
  }

  // ----------------------------------------------------
  // ADMIN & INSTITUTE ENDPOINTS
  // ----------------------------------------------------

  @Get("admin/gamification/challenges")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.INSTITUTE_ADMIN, UserRole.TRAINING_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all platform milestones and gamification challenges" })
  @ApiResponse({ status: 200, description: "List of all challenges" })
  listChallenges() {
    return this.gamificationService.listAllChallenges();
  }

  @Get("admin/gamification/overview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.INSTITUTE_ADMIN, UserRole.TRAINING_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get student level distribution and gamification metrics" })
  @ApiResponse({ status: 200, description: "Gamification overview returned" })
  getOverview() {
    return this.gamificationService.getGamificationOverview();
  }
}
