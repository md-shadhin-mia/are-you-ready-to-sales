import { Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DynamicPermissionsGuard } from "../auth/dynamic-permissions.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import { ReportsService } from "./reports.service";

@Controller("api/v1/admin/reports")
@UseGuards(JwtAuthGuard, DynamicPermissionsGuard)
@RequirePermission("reports:view")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("product-courier-status")
  productCourierStatus() {
    return this.reports.getProductCourierStatus();
  }

  @Get("supplier-products")
  supplierProducts() {
    return this.reports.getSupplierProductReport();
  }

  @Get("supplier-profit-lifecycle")
  supplierProfitLifecycle() {
    return this.reports.getSupplierProfitLifecycle();
  }

  @Post("refresh")
  @HttpCode(200)
  refresh() {
    return this.reports.refreshMaterializedViews();
  }
}
