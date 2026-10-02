import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Request, UseGuards } from "@nestjs/common";
import { PenaltyStatus } from "@repo/db";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DynamicPermissionsGuard } from "../auth/dynamic-permissions.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import { EmployeesService } from "./employees.service";
import { PayrollService } from "./payroll.service";
import { CreateCommissionDto, CreateEmployeeDto, CreatePenaltyDto, UpdateEmployeeDto } from "./hr.dto";

@Controller("api/v1/admin/employees")
@UseGuards(JwtAuthGuard, DynamicPermissionsGuard)
@RequirePermission("employees:manage")
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  list(@Request() req: any, @Query() query: Record<string, string>) {
    return this.employees.list(query, req.user);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateEmployeeDto) {
    return this.employees.create(dto, req.user);
  }

  @Post("commissions/:id/approve")
  @HttpCode(200)
  approveCommission(@Request() req: any, @Param("id") id: string) {
    return this.employees.approveCommission(id, req.user.id);
  }

  @Post("penalties/:id/approve")
  @HttpCode(200)
  approvePenalty(@Request() req: any, @Param("id") id: string) {
    return this.employees.decidePenalty(id, PenaltyStatus.APPROVED, req.user.id, req.user);
  }

  @Post("penalties/:id/reject")
  @HttpCode(200)
  rejectPenalty(@Request() req: any, @Param("id") id: string) {
    return this.employees.decidePenalty(id, PenaltyStatus.REJECTED, req.user.id, req.user);
  }

  @Get(":id")
  get(@Request() req: any, @Param("id") id: string) {
    return this.employees.get(id, req.user);
  }

  @Put(":id")
  update(@Request() req: any, @Param("id") id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employees.update(id, dto, req.user);
  }

  @Get(":id/commissions")
  listCommissions(@Request() req: any, @Param("id") id: string) {
    return this.employees.listCommissions(id, req.user);
  }

  @Post(":id/commissions")
  addCommission(@Request() req: any, @Param("id") id: string, @Body() dto: CreateCommissionDto) {
    return this.employees.addCommission(id, dto, req.user);
  }

  @Get(":id/penalties")
  listPenalties(@Request() req: any, @Param("id") id: string) {
    return this.employees.listPenalties(id, req.user);
  }

  @Post(":id/penalties")
  addPenalty(@Request() req: any, @Param("id") id: string, @Body() dto: CreatePenaltyDto) {
    return this.employees.addPenalty(id, dto, req.user);
  }
}

@Controller("api/v1/admin/payroll")
@UseGuards(JwtAuthGuard, DynamicPermissionsGuard)
@RequirePermission("payroll:finalize")
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Get(":month")
  get(@Param("month") month: string) {
    return this.payroll.get(month);
  }

  @Post(":month/generate")
  @HttpCode(200)
  generate(@Request() req: any, @Param("month") month: string) {
    return this.payroll.generate(month, req.user.id);
  }

  @Post(":month/finalize")
  @HttpCode(200)
  finalize(@Request() req: any, @Param("month") month: string) {
    return this.payroll.finalize(month, req.user.id);
  }
}
