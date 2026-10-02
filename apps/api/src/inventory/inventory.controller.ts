import { Body, Controller, Get, Post, Query, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DynamicPermissionsGuard } from "../auth/dynamic-permissions.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import { InventoryService } from "./inventory.service";
import { MovementQueryDto, StockAdjustmentDto, StockQueryDto } from "./inventory.dto";

@Controller("api/v1/admin/inventory")
@UseGuards(JwtAuthGuard, DynamicPermissionsGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get("stock")
  @RequirePermission("inventory:view")
  listStock(@Query() query: StockQueryDto) {
    return this.inventory.listStock(query);
  }

  @Get("ledger")
  @RequirePermission("inventory:view")
  listLedger(@Query() query: MovementQueryDto) {
    return this.inventory.listMovements(query);
  }

  @Get("reorder-forecast")
  @RequirePermission("inventory:view")
  reorderForecast() {
    return this.inventory.getReorderForecast();
  }

  @Post("adjustments")
  @RequirePermission("inventory:manage")
  adjust(@Request() req: any, @Body() dto: StockAdjustmentDto) {
    return this.inventory.adjust(dto.masterProductId, dto.quantity, {
      performedById: req.user.id,
      notes: dto.notes,
    });
  }
}
