import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import {
  CheckoutDto,
  DispatchOrderDto,
  UpdateOrderStatusDto,
  QueryOrdersDto,
} from "./dto/order.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@repo/db";
import { Request } from "express";

@ApiTags("Orders & Fulfillment")
@Controller("api/v1")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ----------------------------------------------------
  // PUBLIC STOREFRONT ENDPOINTS
  // ----------------------------------------------------

  @Post("stores/:slug/checkout")
  @ApiOperation({ summary: "Customer checkout with pessimistic stock locking" })
  @ApiResponse({ status: 201, description: "Order created successfully" })
  @ApiResponse({ status: 409, description: "Insufficient product inventory" })
  checkout(@Param("slug") slug: string, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(slug, dto);
  }

  @Get("orders/track/:orderNumber")
  @ApiOperation({ summary: "Public order tracking by order number" })
  @ApiResponse({ status: 200, description: "Order tracking details" })
  trackOrder(@Param("orderNumber") orderNumber: string) {
    return this.ordersService.trackOrder(orderNumber);
  }

  // ----------------------------------------------------
  // STUDENT DASHBOARD ENDPOINTS
  // ----------------------------------------------------

  @Get("student/orders")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List orders for the authenticated student's store" })
  @ApiResponse({ status: 200, description: "Student orders returned" })
  listStudentOrders(
    @Req() req: Request & { user: { id: string } },
    @Query() query: QueryOrdersDto,
  ) {
    return this.ordersService.listStudentOrders(req.user.id, query);
  }

  // ----------------------------------------------------
  // INSTITUTE ADMIN / FULFILLMENT ENDPOINTS
  // ----------------------------------------------------

  @Get("admin/orders")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.INSTITUTE_ADMIN, UserRole.ORDER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Global fulfillment queue across all stores" })
  @ApiResponse({ status: 200, description: "All orders returned" })
  listAdminOrders(@Query() query: QueryOrdersDto) {
    return this.ordersService.listAdminOrders(query);
  }

  @Patch("admin/orders/:id/dispatch")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.INSTITUTE_ADMIN, UserRole.ORDER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Dispatch order with courier tracking information" })
  @ApiResponse({ status: 200, description: "Order marked as SHIPPED with tracking" })
  dispatchOrder(
    @Param("id") id: string,
    @Body() dto: DispatchOrderDto,
  ) {
    return this.ordersService.dispatchOrder(id, dto);
  }

  @Patch("admin/orders/:id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.INSTITUTE_ADMIN, UserRole.ORDER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update order fulfillment status (with stock restitution on cancel)" })
  @ApiResponse({ status: 200, description: "Order status updated" })
  updateOrderStatus(
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, dto.status);
  }
}
