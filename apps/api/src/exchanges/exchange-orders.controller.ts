import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DynamicPermissionsGuard } from "../auth/dynamic-permissions.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import { Idempotent } from "../common/idempotency/idempotent.decorator";
import { ExchangeOrdersService } from "./exchange-orders.service";
import {
  CreateExchangeDto,
  DispatchExchangeDto,
  ExchangeQueryDto,
  ExchangeReasonDto,
  InspectExchangeDto,
} from "./exchange-orders.dto";

@Controller("api/v1/admin/exchanges")
@UseGuards(JwtAuthGuard, DynamicPermissionsGuard)
@RequirePermission("exchanges:manage")
export class ExchangeOrdersController {
  constructor(private readonly exchanges: ExchangeOrdersService) {}

  @Get()
  list(@Query() query: ExchangeQueryDto) {
    return this.exchanges.list(query);
  }

  @Get("overview")
  overview() {
    return this.exchanges.overview();
  }

  @Post()
  @Idempotent()
  create(@Request() req: any, @Body() dto: CreateExchangeDto) {
    return this.exchanges.create(dto, req.user.id);
  }

  @Post(":id/approve")
  @HttpCode(200)
  approve(@Request() req: any, @Param("id") id: string) {
    return this.exchanges.approve(id, req.user.id);
  }

  @Post(":id/hold")
  @HttpCode(200)
  hold(@Param("id") id: string, @Body() dto: ExchangeReasonDto) {
    return this.exchanges.hold(id, dto.reason);
  }

  @Post(":id/reject")
  @HttpCode(200)
  reject(@Request() req: any, @Param("id") id: string, @Body() dto: ExchangeReasonDto) {
    return this.exchanges.reject(id, dto.reason, req.user.id);
  }

  @Post(":id/dispatch")
  @HttpCode(200)
  dispatch(@Request() req: any, @Param("id") id: string, @Body() dto: DispatchExchangeDto) {
    return this.exchanges.dispatch(id, dto, req.user.id);
  }

  @Patch(":id/inspect")
  inspect(@Request() req: any, @Param("id") id: string, @Body() dto: InspectExchangeDto) {
    return this.exchanges.inspect(id, dto.grading, req.user.id);
  }

  @Post(":id/complete")
  @HttpCode(200)
  complete(@Param("id") id: string) {
    return this.exchanges.complete(id);
  }
}
