import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { StoreProductsService } from "./store-products.service";
import {
  ImportProductDto,
  UpdateStoreProductDto,
  QueryStoreProductsDto,
} from "./dto/store-product.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@repo/db";
import { Request } from "express";

@ApiTags("Student Store Products")
@Controller("api/v1/student/products")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class StoreProductsController {
  constructor(private readonly storeProductsService: StoreProductsService) {}

  @Post()
  @ApiOperation({ summary: "Import product from master catalog into student store" })
  @ApiResponse({ status: 201, description: "Product imported successfully" })
  importProduct(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: ImportProductDto,
  ) {
    return this.storeProductsService.importProduct(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List student's imported store products" })
  @ApiResponse({ status: 200, description: "Paginated list of store products" })
  listStoreProducts(
    @Req() req: Request & { user: { id: string } },
    @Query() query: QueryStoreProductsDto,
  ) {
    return this.storeProductsService.listStoreProducts(req.user.id, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get single store product details" })
  @ApiResponse({ status: 200, description: "Product details returned" })
  getStoreProduct(
    @Req() req: Request & { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.storeProductsService.getStoreProduct(req.user.id, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update store product pricing, copy, or visibility" })
  @ApiResponse({ status: 200, description: "Store product updated" })
  updateStoreProduct(
    @Req() req: Request & { user: { id: string } },
    @Param("id") id: string,
    @Body() dto: UpdateStoreProductDto,
  ) {
    return this.storeProductsService.updateStoreProduct(req.user.id, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Remove imported product from student store" })
  @ApiResponse({ status: 200, description: "Product removed" })
  deleteStoreProduct(
    @Req() req: Request & { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.storeProductsService.deleteStoreProduct(req.user.id, id);
  }
}
