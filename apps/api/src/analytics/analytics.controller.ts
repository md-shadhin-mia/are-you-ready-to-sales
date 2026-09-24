import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";
import { FunnelEventDto, QueryFunnelDto } from "./dto/analytics.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@repo/db";
import { Request } from "express";

@ApiTags("Store Analytics & Coaching Engine")
@Controller("api/v1")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ----------------------------------------------------
  // PUBLIC STOREFRONT BEACON
  // ----------------------------------------------------

  @Post("stores/:slug/events")
  @ApiOperation({ summary: "Ingest visitor funnel beacon event" })
  @ApiResponse({ status: 201, description: "Event ingested" })
  recordFunnelEvent(
    @Param("slug") slug: string,
    @Body() dto: FunnelEventDto,
  ) {
    return this.analyticsService.recordFunnelEvent(slug, dto);
  }

  // ----------------------------------------------------
  // STUDENT ANALYTICS DASHBOARD
  // ----------------------------------------------------

  @Get("student/analytics/funnel")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get store conversion funnel metrics and coaching advice" })
  @ApiResponse({ status: 200, description: "Funnel metrics and diagnosis returned" })
  getFunnelMetrics(
    @Req() req: Request & { user: { id: string } },
    @Query() query: QueryFunnelDto,
  ) {
    return this.analyticsService.getFunnelMetrics(req.user.id, query.range || "30d");
  }

  @Get("student/analytics/coach")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get latest automated business coaching advice" })
  @ApiResponse({ status: 200, description: "Coaching recommendation returned" })
  async getCoachingAdvice(
    @Req() req: Request & { user: { id: string } },
  ) {
    const data = await this.analyticsService.getFunnelMetrics(req.user.id, "30d");
    return data.coachingAdvice;
  }
}
