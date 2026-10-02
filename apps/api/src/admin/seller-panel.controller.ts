import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DynamicPermissionsGuard } from "../auth/dynamic-permissions.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import { SellerGovernanceService } from "./seller-governance.service";
import { CreateTicketDto, ReasonDto, SellerAdjustmentDto, UpdateTicketDto } from "./dto/seller-panel.dto";

@Controller("api/v1/admin/seller-panel")
@UseGuards(JwtAuthGuard, DynamicPermissionsGuard)
@RequirePermission("sellers:manage")
export class SellerPanelController {
  constructor(private readonly sellers: SellerGovernanceService) {}

  @Get("overview")
  overview() {
    return this.sellers.overview();
  }

  @Get("adjustments")
  listAdjustments(@Query() query: Record<string, any>) {
    return this.sellers.listAdjustments(query);
  }

  @Post("sellers/:id/adjustments")
  requestAdjustment(@Request() req: any, @Param("id") id: string, @Body() dto: SellerAdjustmentDto) {
    return this.sellers.requestAdjustment(id, dto, req.user.id);
  }

  @Post("adjustments/:id/approve")
  @HttpCode(200)
  @RequirePermission("sellers:approve_adjustment")
  approve(@Request() req: any, @Param("id") id: string) {
    return this.sellers.approveAdjustment(id, req.user.id);
  }

  @Post("adjustments/:id/reject")
  @HttpCode(200)
  @RequirePermission("sellers:approve_adjustment")
  reject(@Request() req: any, @Param("id") id: string, @Body() dto: ReasonDto) {
    return this.sellers.rejectAdjustment(id, req.user.id, dto.reason);
  }

  @Post("sellers/:id/deactivate")
  @HttpCode(200)
  deactivate(@Param("id") id: string, @Body() dto: ReasonDto) {
    return this.sellers.deactivateSeller(id, dto.reason);
  }

  @Get("tickets")
  listTickets(@Query() query: Record<string, any>) {
    return this.sellers.listTickets(query);
  }

  @Post("tickets")
  createTicket(@Body() dto: CreateTicketDto) {
    return this.sellers.createTicket(dto);
  }

  @Patch("tickets/:id")
  updateTicket(@Param("id") id: string, @Body() dto: UpdateTicketDto) {
    return this.sellers.updateTicket(id, dto);
  }

  @Post("scorecards/recompute")
  @HttpCode(200)
  recomputeScorecards() {
    return this.sellers.recomputeScorecards();
  }
}
