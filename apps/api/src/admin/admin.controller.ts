import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DynamicPermissionsGuard } from "../auth/dynamic-permissions.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import { InstituteDashboardService } from "./institute-dashboard.service";
import { StudentGovernanceService } from "./student-governance.service";
import { StoreStatus } from "@repo/db";

import { IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateStoreStatusDto {
  @IsEnum(StoreStatus)
  status!: StoreStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller("api/v1/admin")
@UseGuards(JwtAuthGuard, DynamicPermissionsGuard)
export class AdminController {
  constructor(
    private readonly dashboardService: InstituteDashboardService,
    private readonly governanceService: StudentGovernanceService,
  ) {}

  @Get("dashboard/kpis")
  @RequirePermission("students:view")
  async getDashboardKpis() {
    return this.dashboardService.getExecutiveKpis();
  }

  @Get("students")
  @RequirePermission("students:view")
  async getStudents(
    @Query("search") search?: string,
    @Query("status") status?: StoreStatus,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.governanceService.getStudentsList({
      search,
      status,
      page: pageNum,
      limit: limitNum,
    });
  }

  @Patch("students/:storeId/status")
  @RequirePermission("students:suspend")
  async updateStoreStatus(
    @Request() req: any,
    @Param("storeId") storeId: string,
    @Body() dto: UpdateStoreStatusDto,
  ) {
    return this.governanceService.updateStoreStatus(
      storeId,
      dto.status,
      dto.reason,
      req.user.id,
    );
  }

  @Get("sellers/scorecard")
  @RequirePermission("students:view")
  async getSellerScorecard() {
    return this.governanceService.getSellerScorecard();
  }
}
