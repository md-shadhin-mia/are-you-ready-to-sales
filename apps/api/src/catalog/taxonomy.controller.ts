import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DynamicPermissionsGuard } from "../auth/dynamic-permissions.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import { TaxonomyService } from "./taxonomy.service";
import {
  CreateBrandDto,
  CreateColorDto,
  CreateSizeDto,
  GenerateVariantsDto,
  UpdateBrandDto,
  UpdateColorDto,
  UpdateSizeDto,
} from "./taxonomy.dto";

@Controller("api/v1/admin/catalog")
@UseGuards(JwtAuthGuard, DynamicPermissionsGuard)
export class TaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Get("brands")
  @RequirePermission("catalog:view")
  listBrands() {
    return this.taxonomy.listBrands();
  }

  @Post("brands")
  @RequirePermission("catalog:create")
  createBrand(@Body() dto: CreateBrandDto) {
    return this.taxonomy.createBrand(dto);
  }

  @Put("brands/:id")
  @RequirePermission("catalog:update")
  updateBrand(@Param("id") id: string, @Body() dto: UpdateBrandDto) {
    return this.taxonomy.updateBrand(id, dto);
  }

  @Delete("brands/:id")
  @RequirePermission("catalog:update")
  deleteBrand(@Param("id") id: string) {
    return this.taxonomy.deleteBrand(id);
  }

  @Get("sizes")
  @RequirePermission("catalog:view")
  listSizes() {
    return this.taxonomy.listSizes();
  }

  @Post("sizes")
  @RequirePermission("catalog:create")
  createSize(@Body() dto: CreateSizeDto) {
    return this.taxonomy.createSize(dto);
  }

  @Put("sizes/:id")
  @RequirePermission("catalog:update")
  updateSize(@Param("id") id: string, @Body() dto: UpdateSizeDto) {
    return this.taxonomy.updateSize(id, dto);
  }

  @Get("colors")
  @RequirePermission("catalog:view")
  listColors() {
    return this.taxonomy.listColors();
  }

  @Post("colors")
  @RequirePermission("catalog:create")
  createColor(@Body() dto: CreateColorDto) {
    return this.taxonomy.createColor(dto);
  }

  @Put("colors/:id")
  @RequirePermission("catalog:update")
  updateColor(@Param("id") id: string, @Body() dto: UpdateColorDto) {
    return this.taxonomy.updateColor(id, dto);
  }

  @Get("products/:id/variants")
  @RequirePermission("catalog:view")
  listVariants(@Param("id") id: string) {
    return this.taxonomy.listVariants(id);
  }

  @Post("products/:id/variants/generate")
  @RequirePermission("catalog:create")
  generateVariants(@Param("id") id: string, @Body() dto: GenerateVariantsDto) {
    return this.taxonomy.generateVariants(id, dto.sizeIds, dto.colorIds);
  }
}
