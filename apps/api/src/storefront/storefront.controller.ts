import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { StorefrontService } from "./storefront.service";
import { QueryStorefrontProductsDto } from "./dto/storefront.dto";

@ApiTags("Public Storefront")
@Controller("api/v1/stores")
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get(":slug/meta")
  @ApiOperation({ summary: "Get public store metadata, branding, and theme" })
  @ApiResponse({ status: 200, description: "Store metadata returned" })
  getStoreMeta(@Param("slug") slug: string) {
    return this.storefrontService.getStoreMeta(slug);
  }

  @Get(":slug/products")
  @ApiOperation({ summary: "Get paginated public product catalog for the store" })
  @ApiResponse({ status: 200, description: "Store products returned" })
  getStoreProducts(
    @Param("slug") slug: string,
    @Query() query: QueryStorefrontProductsDto,
  ) {
    return this.storefrontService.getStoreProducts(slug, query);
  }

  @Get(":slug/products/:productId")
  @ApiOperation({ summary: "Get public details for a single store product" })
  @ApiResponse({ status: 200, description: "Store product details returned" })
  getStoreProductDetail(
    @Param("slug") slug: string,
    @Param("productId") productId: string,
  ) {
    return this.storefrontService.getStoreProductDetail(slug, productId);
  }
}
