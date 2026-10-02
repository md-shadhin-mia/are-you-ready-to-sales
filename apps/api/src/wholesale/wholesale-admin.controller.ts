import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DynamicPermissionsGuard } from "../auth/dynamic-permissions.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import { WholesaleService } from "./wholesale.service";
import { AdminCreateWholesaleOrderDto, UpsertCreditAccountDto } from "./dto/wholesale-order.dto";

@Controller("api/v1/admin/wholesale")
@UseGuards(JwtAuthGuard, DynamicPermissionsGuard)
@RequirePermission("wholesale:manage")
export class WholesaleAdminController {
  constructor(private readonly wholesale: WholesaleService) {}

  @Post("orders")
  async create(@Body() dto: AdminCreateWholesaleOrderDto) {
    const { userId, ...order } = dto;
    return this.wholesale.serializeOrder(await this.wholesale.createWholesaleOrder(userId, order));
  }

  @Get("credit-accounts")
  listCreditAccounts() {
    return this.wholesale.listCreditAccounts();
  }

  @Put("credit-accounts/:userId")
  upsertCreditAccount(@Param("userId") userId: string, @Body() dto: UpsertCreditAccountDto) {
    return this.wholesale.upsertCreditAccount(userId, dto);
  }

  @Get("reports/product-wise")
  productWiseReport() {
    return this.wholesale.productWiseReport();
  }
}
