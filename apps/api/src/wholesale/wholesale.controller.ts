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
import { WholesaleService } from "./wholesale.service";
import {
  CreateWholesaleOrderDto,
  QueryWholesaleOrdersDto,
  UpdateWholesaleOrderStatusDto,
} from "./dto/wholesale-order.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@repo/db";
import { Request } from "express";

@ApiTags("Wholesale Procurement & B2B Orders")
@Controller("api/v1")
export class WholesaleController {
  constructor(private readonly wholesaleService: WholesaleService) {}

  // ----------------------------------------------------
  // PUBLIC WHOLESALE CATALOG ENDPOINTS
  // ----------------------------------------------------

  @Get("wholesale/catalog")
  @ApiOperation({ summary: "Browse public wholesale factory catalog items and inventory" })
  getPublicCatalog(
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.wholesaleService.getPublicCatalog({ category, search, page, limit });
  }

  // ----------------------------------------------------
  // RESELLER / STUDENT ENDPOINTS
  // ----------------------------------------------------

  @Get("student/wholesale/profile")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get authenticated reseller profile, wallet balance, and wholesale stats" })
  getResellerProfile(@Req() req: Request & { user: { id: string } }) {
    return this.wholesaleService.getResellerProfile(req.user.id);
  }

  @Post("student/wholesale/orders")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Place a wholesale inventory purchase order" })
  @ApiResponse({ status: 201, description: "Wholesale order placed successfully" })
  createOrder(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: CreateWholesaleOrderDto,
  ) {
    return this.wholesaleService.createWholesaleOrder(req.user.id, dto);
  }

  @Get("student/wholesale/orders")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List past wholesale purchase orders for reseller" })
  listMyOrders(
    @Req() req: Request & { user: { id: string } },
    @Query() query: QueryWholesaleOrdersDto,
  ) {
    return this.wholesaleService.listMyWholesaleOrders(req.user.id, query);
  }

  @Get("student/wholesale/orders/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get single wholesale purchase order details" })
  getOrder(
    @Req() req: Request & { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.wholesaleService.getWholesaleOrder(req.user.id, id);
  }

  // ----------------------------------------------------
  // ADMIN FULFILLMENT ENDPOINTS
  // ----------------------------------------------------

  @Get("admin/wholesale/orders")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.INSTITUTE_ADMIN, UserRole.ORDER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Global queue of all reseller wholesale orders" })
  listAdminOrders(@Query() query: QueryWholesaleOrdersDto) {
    return this.wholesaleService.listAdminWholesaleOrders(query);
  }

  @Patch("admin/wholesale/orders/:id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.INSTITUTE_ADMIN, UserRole.ORDER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update status and tracking of wholesale order" })
  updateAdminStatus(
    @Param("id") id: string,
    @Body() dto: UpdateWholesaleOrderStatusDto,
  ) {
    return this.wholesaleService.updateAdminWholesaleOrderStatus(id, dto);
  }
}
