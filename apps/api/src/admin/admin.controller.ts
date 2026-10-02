import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  Delete,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DynamicPermissionsGuard } from "../auth/dynamic-permissions.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import { InstituteDashboardService } from "./institute-dashboard.service";
import { StudentGovernanceService } from "./student-governance.service";
import { BranchesService } from "./branches.service";
import { BatchesService } from "./batches.service";
import { CreateBatchDto, CreateBranchDto, EnrollStudentsDto, UpdateBatchDto, UpdateBranchDto } from "./dto/campus.dto";
import { SellersService, OnboardSellerDto, UpdateSellerDto } from "./sellers.service";
import { StoreStatus, BatchStatus, SellerStatus, SellerType, KycStatus } from "@repo/db";
import { KycDecisionDto, StudentPerformanceQueryDto, SuspendStudentDto } from "./dto/student-governance.dto";

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
    private readonly branchesService: BranchesService,
    private readonly batchesService: BatchesService,
    private readonly sellersService: SellersService,
  ) {}

  // ----------------------------------------------------
  // DASHBOARDS & ALERTS (Bubble 01)
  // ----------------------------------------------------

  @Get("dashboard/kpis")
  @RequirePermission("students:view")
  async getDashboardKpis() {
    return this.dashboardService.getExecutiveKpis();
  }

  @Get("dashboard/overview")
  @RequirePermission("students:view")
  async getDashboardOverview() {
    return this.dashboardService.getExecutiveOverview();
  }

  @Get("dashboard/alerts")
  @RequirePermission("students:view")
  async getDashboardAlerts() {
    return this.dashboardService.getUrgentAlerts();
  }

  // ----------------------------------------------------
  // STUDENTS (Expandable Suite)
  // ----------------------------------------------------

  @Get("students")
  @RequirePermission("students:view")
  async getStudents(
    @Request() req: any,
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
      viewer: req.user,
    });
  }

  @Get("students/performance")
  @RequirePermission("students:view")
  async getStudentPerformance(@Request() req: any, @Query() query: StudentPerformanceQueryDto) {
    return this.governanceService.getStudentPerformance({ ...query, viewer: req.user });
  }

  @Get("students/:id")
  @RequirePermission("students:view")
  async getStudentById(@Request() req: any, @Param("id") id: string) {
    return this.governanceService.getStudentById(id, req.user);
  }

  @Get("students/:id/profit-summary")
  @RequirePermission("students:view")
  async getStudentProfitSummary(@Request() req: any, @Param("id") id: string) {
    return this.governanceService.getProfitSummary(id, req.user);
  }

  @Patch("students/:id/kyc")
  @RequirePermission("students:verify")
  async decideKyc(@Request() req: any, @Param("id") id: string, @Body() dto: KycDecisionDto) {
    return this.governanceService.verifyKyc(id, dto.status, req.user.id);
  }

  @Post("students/:id/suspend")
  @HttpCode(200)
  @RequirePermission("students:suspend")
  async suspendStudent(@Request() req: any, @Param("id") id: string, @Body() dto: SuspendStudentDto) {
    return this.governanceService.suspendStudent(id, dto.reason, req.user.id);
  }

  @Post("students/:id/reinstate")
  @HttpCode(200)
  @RequirePermission("students:suspend")
  async reinstateStudent(@Request() req: any, @Param("id") id: string) {
    return this.governanceService.reinstateStudent(id, req.user.id);
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

  @Post("students/:id/verify-kyc")
  @RequirePermission("students:suspend")
  async verifyKyc(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: { isVerified: boolean },
  ) {
    const decision = body.isVerified !== false ? KycStatus.VERIFIED : KycStatus.REJECTED;
    return this.governanceService.verifyKyc(id, decision, req.user.id);
  }

  // ----------------------------------------------------
  // CAMPUS BRANCHES
  // ----------------------------------------------------

  @Get("branches")
  @RequirePermission("students:view")
  async listBranches() {
    return this.branchesService.listBranches();
  }

  @Get("branches/metrics")
  @RequirePermission("students:view")
  async getBranchMetrics() {
    return this.branchesService.getBranchMetrics();
  }

  @Post("branches")
  @RequirePermission("branches:manage")
  async createBranch(@Request() req: any, @Body() dto: CreateBranchDto) {
    return this.branchesService.createBranch(dto, req.user.id);
  }

  @Put("branches/:id")
  @RequirePermission("branches:manage")
  async updateBranch(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchesService.updateBranch(id, dto, req.user.id);
  }

  @Delete("branches/:id")
  @RequirePermission("branches:manage")
  async deleteBranch(@Param("id") id: string) {
    return this.branchesService.deleteBranch(id);
  }

  @Get("branches/:id/analytics")
  @RequirePermission("students:view")
  async getBranchAnalytics(@Param("id") id: string) {
    return this.branchesService.getBranchAnalytics(id);
  }

  @Get("branches/:id/manager-history")
  @RequirePermission("students:view")
  async getBranchManagerHistory(@Param("id") id: string) {
    return this.branchesService.getManagerHistory(id);
  }

  // ----------------------------------------------------
  // STUDENT BATCHES & COHORTS
  // ----------------------------------------------------

  @Get("batches")
  @RequirePermission("students:view")
  async listBatches(
    @Query("branchId") branchId?: string,
    @Query("status") status?: BatchStatus,
  ) {
    return this.batchesService.listBatches({ branchId, status });
  }

  @Get("batches/analytics")
  @RequirePermission("students:view")
  async getBatchAnalytics() {
    return this.batchesService.getBatchAnalytics();
  }

  @Get("batches/:id")
  @RequirePermission("students:view")
  async getBatchById(@Param("id") id: string) {
    return this.batchesService.getBatchById(id);
  }

  @Post("batches")
  @RequirePermission("branches:manage")
  async createBatch(@Body() dto: CreateBatchDto) {
    return this.batchesService.createBatch(dto);
  }

  @Put("batches/:id")
  @RequirePermission("branches:manage")
  async updateBatch(
    @Param("id") id: string,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.batchesService.updateBatch(id, dto);
  }

  @Post(["batches/:id/enroll", "batches/:id/enrollments"])
  @RequirePermission("branches:manage")
  async bulkEnrollStudents(@Param("id") id: string, @Body() dto: EnrollStudentsDto) {
    return this.batchesService.bulkEnrollStudents(id, dto.studentIds);
  }

  @Get("batches/:id/leaderboard")
  @RequirePermission("students:view")
  async getBatchLeaderboard(@Param("id") id: string) {
    return this.batchesService.getBatchLeaderboard(id);
  }

  // ----------------------------------------------------
  // SELLER PANEL
  // ----------------------------------------------------

  @Get("sellers")
  @RequirePermission("students:view")
  async listSellers(
    @Query("status") status?: SellerStatus,
    @Query("sellerType") sellerType?: SellerType,
  ) {
    return this.sellersService.listSellers({ status, sellerType });
  }

  @Get("sellers/scorecard")
  @RequirePermission("students:view")
  async getSellerScorecard() {
    return this.governanceService.getSellerScorecard();
  }

  @Get("sellers/:id")
  @RequirePermission("students:view")
  async getSellerById(@Param("id") id: string) {
    return this.sellersService.getSellerById(id);
  }

  @Post("sellers")
  @RequirePermission("students:suspend")
  async onboardSeller(@Body() dto: OnboardSellerDto) {
    return this.sellersService.onboardSeller(dto);
  }

  @Put("sellers/:id")
  @RequirePermission("students:suspend")
  async updateSeller(
    @Param("id") id: string,
    @Body() dto: UpdateSellerDto,
  ) {
    return this.sellersService.updateSeller(id, dto);
  }
}
