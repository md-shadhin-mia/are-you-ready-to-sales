import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { MasterProductsService } from "./master-products.service";
import { QueryMasterProductsDto } from "./dto/master-product.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@repo/db";

@ApiTags("Student Product Marketplace")
@Controller("api/v1/student/catalog")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN, UserRole.INSTITUTE_ADMIN)
@ApiBearerAuth()
export class StudentCatalogController {
  constructor(private readonly productsService: MasterProductsService) {}

  @Get()
  @ApiOperation({
    summary:
      "Browse active master catalog items available for import into student store",
  })
  @ApiResponse({
    status: 200,
    description: "Paginated list of available products with wholesale base price",
  })
  async getStudentCatalog(@Query() query: QueryMasterProductsDto) {
    return this.productsService.findStudentCatalog(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Inspect master product before importing" })
  @ApiResponse({ status: 200, description: "Master product detail" })
  @ApiResponse({ status: 404, description: "Product not found" })
  async getProductDetail(@Param("id") id: string) {
    return this.productsService.findById(id);
  }
}
