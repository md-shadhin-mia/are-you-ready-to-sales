import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@repo/db";

@ApiTags("Categories")
@Controller("api/v1/categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: "Get category hierarchical tree" })
  @ApiResponse({ status: 200, description: "Category list returned" })
  async getCategories() {
    return this.categoriesService.findAllTree();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get category details by ID" })
  @ApiResponse({ status: 200, description: "Category details" })
  @ApiResponse({ status: 404, description: "Category not found" })
  async getCategoryById(@Param("id") id: string) {
    return this.categoriesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.INSTITUTE_ADMIN, UserRole.PRODUCT_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new product category" })
  @ApiResponse({ status: 201, description: "Category created" })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.INSTITUTE_ADMIN, UserRole.PRODUCT_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update an existing category" })
  @ApiResponse({ status: 200, description: "Category updated" })
  async updateCategory(
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.INSTITUTE_ADMIN, UserRole.PRODUCT_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Delete category (prevented if linked products exist)",
  })
  @ApiResponse({ status: 200, description: "Category deleted" })
  async deleteCategory(@Param("id") id: string) {
    return this.categoriesService.remove(id);
  }
}
