import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DynamicPermissionsGuard } from "../auth/dynamic-permissions.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import { PayoutService, ApprovePayoutDto } from "./payout.service";
import { PayoutStatus } from "@repo/db";

import { IsOptional, IsString } from "class-validator";

export class RejectPayoutDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller("api/v1/admin/finance")
@UseGuards(JwtAuthGuard, DynamicPermissionsGuard)
export class FinanceAdminController {
  constructor(private readonly payoutService: PayoutService) {}

  @Get("payouts")
  @RequirePermission("finance:payout")
  async getPayouts(
    @Query("status") status?: PayoutStatus,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.payoutService.getAdminPayoutQueue({
      status,
      page: pageNum,
      limit: limitNum,
    });
  }

  @Post("payouts/:id/approve")
  @RequirePermission("finance:payout")
  async approvePayout(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: ApprovePayoutDto,
  ) {
    return this.payoutService.approvePayout(id, req.user.id, dto);
  }

  @Post("payouts/:id/reject")
  @RequirePermission("finance:payout")
  async rejectPayout(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: RejectPayoutDto,
  ) {
    return this.payoutService.rejectPayout(id, req.user.id, dto?.reason);
  }

  @Get("summary")
  @RequirePermission("finance:view_ledger")
  async getFinanceSummary() {
    return this.payoutService.getFinanceSummary();
  }
}
