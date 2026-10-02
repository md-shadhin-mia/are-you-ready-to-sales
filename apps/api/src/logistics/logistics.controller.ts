import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req, Request, UseGuards } from "@nestjs/common";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { RtoInspectionStatus } from "@repo/db";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DynamicPermissionsGuard } from "../auth/dynamic-permissions.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import { CourierWebhookService } from "./courier-webhook.service";
import { LogisticsService } from "./logistics.service";

export class ResolveRtoDto {
  @IsIn([RtoInspectionStatus.SEAL_VERIFIED, RtoInspectionStatus.DAMAGED])
  result!: RtoInspectionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

@Controller("api/v1/webhooks/courier")
export class CourierWebhookController {
  constructor(private readonly webhooks: CourierWebhookService) {}

  @Post(":provider")
  @HttpCode(200)
  receive(
    @Param("provider") provider: string,
    @Headers("x-courier-signature") signature: string | undefined,
    @Req() req: { rawBody?: Buffer; body: unknown },
  ) {
    const raw = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body ?? {});
    return this.webhooks.handle(provider, raw, signature);
  }
}

@Controller("api/v1/admin/logistics")
@UseGuards(JwtAuthGuard, DynamicPermissionsGuard)
export class LogisticsController {
  constructor(private readonly logistics: LogisticsService) {}

  @Get("in-courier")
  @RequirePermission("orders:read")
  inCourier(@Query() query: Record<string, string>) {
    return this.logistics.listInCourier(query);
  }

  @Get("rto-inspections")
  @RequirePermission("orders:read")
  rtoInspections(@Query() query: Record<string, any>) {
    return this.logistics.listRtoInspections(query);
  }

  @Post("rto-inspections/:id/resolve")
  @HttpCode(200)
  @RequirePermission("orders:returns")
  resolve(@Request() req: any, @Param("id") id: string, @Body() dto: ResolveRtoDto) {
    return this.logistics.resolveRtoInspection(id, dto.result, req.user.id, dto.notes);
  }
}
