import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { MasterProductsService } from "./master-products.service";
import {
  CreateMasterProductDto,
  UpdateMasterProductDto,
  AdjustStockDto,
  QueryMasterProductsDto,
} from "./dto/master-product.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@repo/db";

@ApiTags("Admin Master Products")
@Controller("api/v1/admin/master-products")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.INSTITUTE_ADMIN, UserRole.PRODUCT_MANAGER)
@ApiBearerAuth()
export class AdminMasterProductsController {
  constructor(private readonly productsService: MasterProductsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new master catalog product" })
  @ApiResponse({ status: 201, description: "Master product created" })
  async createProduct(@Body() dto: CreateMasterProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List master catalog products with filters" })
  @ApiResponse({ status: 200, description: "Paginated list of master products" })
  async getProducts(@Query() query: QueryMasterProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get master product details by ID" })
  @ApiResponse({ status: 200, description: "Master product details" })
  @ApiResponse({ status: 404, description: "Product not found" })
  async getProductById(@Param("id") id: string) {
    return this.productsService.findById(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update master product details" })
  @ApiResponse({ status: 200, description: "Master product updated" })
  async updateProduct(
    @Param("id") id: string,
    @Body() dto: UpdateMasterProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Patch(":id/stock")
  @ApiOperation({ summary: "Adjust stock quantity with audit note" })
  @ApiResponse({ status: 200, description: "Stock adjusted" })
  async adjustStock(
    @Param("id") id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.productsService.adjustStock(id, dto);
  }
}
