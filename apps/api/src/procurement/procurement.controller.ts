import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DynamicPermissionsGuard } from "../auth/dynamic-permissions.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import { Idempotent } from "../common/idempotency/idempotent.decorator";
import { PurchasesService } from "./purchases.service";
import { SuppliersService } from "./suppliers.service";
import {
  CreatePurchaseOrderDto,
  CreatePurchaseReturnDto,
  CreateReturnTypeDto,
  CreateSupplierDto,
  MatchInvoiceDto,
  ReceiveGoodsDto,
  SupplierPaymentDto,
  UpdateSupplierDto,
} from "./procurement.dto";

@Controller("api/v1/admin/suppliers")
@UseGuards(JwtAuthGuard, DynamicPermissionsGuard)
@RequirePermission("suppliers:manage")
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  list(@Query("includeInactive") includeInactive?: string) {
    return this.suppliers.list(includeInactive === "true");
  }

  @Get("contract-alerts")
  contractAlerts() {
    return this.suppliers.contractAlerts();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.suppliers.get(id);
  }

  @Post()
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliers.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliers.update(id, dto);
  }
}

@Controller("api/v1/admin")
@UseGuards(JwtAuthGuard, DynamicPermissionsGuard)
@RequirePermission("purchases:manage")
export class PurchasesController {
  constructor(private readonly purchases: PurchasesService) {}

  @Post("purchases")
  @Idempotent()
  directPurchase(@Request() req: any, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchases.createDirectPurchase(dto, req.user.id);
  }

  @Get("purchases/ap-aging")
  apAging() {
    return this.purchases.apAging();
  }

  @Get("purchase-orders")
  list(@Query() query: Record<string, any>) {
    return this.purchases.list(query);
  }

  @Post("purchase-orders")
  @Idempotent()
  create(@Request() req: any, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchases.createPurchaseOrder(dto, req.user.id);
  }

  @Get("purchase-orders/:id")
  get(@Param("id") id: string) {
    return this.purchases.get(id);
  }

  @Post("purchase-orders/:id/issue")
  @HttpCode(200)
  issue(@Param("id") id: string) {
    return this.purchases.issue(id);
  }

  @Post("purchase-orders/:id/cancel")
  @HttpCode(200)
  cancel(@Param("id") id: string) {
    return this.purchases.cancel(id);
  }

  @Post("purchase-orders/:id/receive")
  receive(@Request() req: any, @Param("id") id: string, @Body() dto: ReceiveGoodsDto) {
    return this.purchases.receive(id, dto.items, req.user.id, dto.notes);
  }

  @Post("purchase-orders/:id/match-invoice")
  @HttpCode(200)
  matchInvoice(@Param("id") id: string, @Body() dto: MatchInvoiceDto) {
    return this.purchases.matchInvoice(id, dto);
  }

  @Post("purchase-orders/:id/payments")
  @HttpCode(200)
  recordPayment(@Param("id") id: string, @Body() dto: SupplierPaymentDto) {
    return this.purchases.recordPayment(id, dto.amount);
  }

  @Get("purchase-returns")
  listReturns(@Query() query: Record<string, any>) {
    return this.purchases.listReturns(query);
  }

  @Post("purchase-returns")
  createReturn(@Request() req: any, @Body() dto: CreatePurchaseReturnDto) {
    return this.purchases.createReturn(dto, req.user.id);
  }

  @Get("purchase-return-types")
  listReturnTypes() {
    return this.purchases.listReturnTypes();
  }

  @Post("purchase-return-types")
  createReturnType(@Body() dto: CreateReturnTypeDto) {
    return this.purchases.createReturnType(dto);
  }
}
