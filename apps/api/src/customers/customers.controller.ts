import {
  Controller,
  Get,
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
  ApiQuery,
} from "@nestjs/swagger";
import { CustomersService } from "./customers.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@repo/db";
import { Request } from "express";

@ApiTags("Student Store CRM")
@Controller("api/v1/student/customers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: "List customers for authenticated student's store" })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  @ApiQuery({ name: "search", required: false, example: "Karim" })
  @ApiResponse({ status: 200, description: "Paginated store customers" })
  listCustomers(
    @Req() req: Request & { user: { id: string } },
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
  ) {
    return this.customersService.listForStore(req.user.id, {
      page,
      limit,
      search,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get customer details and order history" })
  @ApiResponse({ status: 200, description: "Customer details returned" })
  getCustomer(
    @Req() req: Request & { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.customersService.getById(req.user.id, id);
  }
}
