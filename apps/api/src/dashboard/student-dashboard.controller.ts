import {
  Controller,
  Get,
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
import { StudentDashboardService } from "./student-dashboard.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@repo/db";
import { Request } from "express";

@ApiTags("Student Executive Dashboard")
@Controller("api/v1/student/dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class StudentDashboardController {
  constructor(private readonly dashboardService: StudentDashboardService) {}

  @Get("summary")
  @ApiOperation({ summary: "Get executive dashboard business KPIs and summary" })
  @ApiResponse({ status: 200, description: "Student dashboard KPIs returned" })
  getSummary(@Req() req: Request & { user: { id: string } }) {
    return this.dashboardService.getExecutiveSummary(req.user.id);
  }

  @Get("chart-data")
  @ApiOperation({ summary: "Get time-series chart data for revenue, profit, and orders" })
  @ApiQuery({ name: "range", enum: ["7d", "30d", "1y"], required: false })
  @ApiResponse({ status: 200, description: "Chart data points returned" })
  getChartData(
    @Req() req: Request & { user: { id: string } },
    @Query("range") range?: "7d" | "30d" | "1y",
  ) {
    return this.dashboardService.getChartData(req.user.id, range || "30d");
  }
}
