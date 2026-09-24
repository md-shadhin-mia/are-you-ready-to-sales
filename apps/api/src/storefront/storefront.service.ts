import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { QueryStorefrontProductsDto } from "./dto/storefront.dto";
import { StoreStatus, Prisma } from "@repo/db";

@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Fetch public store metadata for storefront theming and layout.
   */
  async getStoreMeta(slug: string) {
    const normalizedSlug = slug.toLowerCase().trim();
    const cacheKey = `storefront:meta:${normalizedSlug}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const store = await this.prisma.store.findUnique({
      where: { slug: normalizedSlug },
      select: {
        id: true,
        storeName: true,
        slug: true,
        customDomain: true,
        logoUrl: true,
        faviconUrl: true,
        themeConfig: true,
        brandingInfo: true,
        status: true,
        ratingAvg: true,
        totalReviewsCount: true,
      },
    });

    if (!store) {
      throw new NotFoundException(`Store "${slug}" not found`);
    }

    if (store.status === StoreStatus.SUSPENDED) {
      throw new ForbiddenException(`Store "${slug}" is currently suspended`);
    }

    const response = {
      ...store,
      ratingAvg: Number(store.ratingAvg),
    };

    // Cache metadata for 2 minutes
    await this.redis.set(cacheKey, JSON.stringify(response), 120);

    return response;
  }

  /**
   * Fetch paginated products for the storefront.
   */
  async getStoreProducts(slug: string, query: QueryStorefrontProductsDto) {
    const normalizedSlug = slug.toLowerCase().trim();
    const store = await this.prisma.store.findUnique({
      where: { slug: normalizedSlug },
    });

    if (!store) {
      throw new NotFoundException(`Store "${slug}" not found`);
    }

    if (store.status === StoreStatus.SUSPENDED) {
      throw new ForbiddenException(`Store "${slug}" is suspended`);
    }

    const { page = 1, limit = 20, categorySlug, search, sortBy = "newest" } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StoreProductWhereInput = {
      storeId: store.id,
      isVisible: true,
      masterProduct: {
        isActive: true,
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      },
      ...(search
        ? {
            OR: [
              { customTitle: { contains: search, mode: "insensitive" } },
              { masterProduct: { title: { contains: search, mode: "insensitive" } } },
              { tags: { has: search.toLowerCase() } },
            ],
          }
        : {}),
    };

    let orderBy: Prisma.StoreProductOrderByWithRelationInput = { createdAt: "desc" };
    if (sortBy === "price_asc") {
      orderBy = { sellingPrice: "asc" };
    } else if (sortBy === "price_desc") {
      orderBy = { sellingPrice: "desc" };
    }

    const [products, total] = await Promise.all([
      this.prisma.storeProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          masterProduct: {
            include: {
              category: true,
            },
          },
        },
      }),
      this.prisma.storeProduct.count({ where }),
    ]);

    return {
      data: products.map((sp) => {
        const title = sp.customTitle || sp.masterProduct.title;
        const description = sp.customDescription || sp.masterProduct.masterDescription;
        const images = sp.customImages.length > 0 ? sp.customImages : sp.masterProduct.masterImages;
        const inStock = sp.masterProduct.stockQuantity > 0;

        return {
          id: sp.id,
          masterProductId: sp.masterProductId,
          title,
          description,
          images,
          sellingPrice: Number(sp.sellingPrice),
          compareAtPrice: sp.compareAtPrice ? Number(sp.compareAtPrice) : null,
          category: {
            id: sp.masterProduct.category.id,
            name: sp.masterProduct.category.name,
            slug: sp.masterProduct.category.slug,
          },
          inStock,
          stockQuantity: sp.masterProduct.stockQuantity,
          isFeatured: sp.isFeatured,
          ratingAvg: Number(sp.masterProduct.ratingAvg),
          totalReviewsCount: sp.masterProduct.totalReviewsCount,
          createdAt: sp.createdAt,
        };
      }),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetch single product details for the storefront product detail page.
   */
  async getStoreProductDetail(slug: string, productId: string) {
    const normalizedSlug = slug.toLowerCase().trim();
    const store = await this.prisma.store.findUnique({
      where: { slug: normalizedSlug },
    });

    if (!store) {
      throw new NotFoundException(`Store "${slug}" not found`);
    }

    const sp = await this.prisma.storeProduct.findFirst({
      where: {
        id: productId,
        storeId: store.id,
        isVisible: true,
      },
      include: {
        masterProduct: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!sp || !sp.masterProduct.isActive) {
      throw new NotFoundException(`Product not found in store "${slug}"`);
    }

    const title = sp.customTitle || sp.masterProduct.title;
    const description = sp.customDescription || sp.masterProduct.masterDescription;
    const images = sp.customImages.length > 0 ? sp.customImages : sp.masterProduct.masterImages;
    const inStock = sp.masterProduct.stockQuantity > 0;

    return {
      id: sp.id,
      masterProductId: sp.masterProductId,
      title,
      description,
      images,
      sellingPrice: Number(sp.sellingPrice),
      compareAtPrice: sp.compareAtPrice ? Number(sp.compareAtPrice) : null,
      tags: sp.tags,
      isFeatured: sp.isFeatured,
      category: {
        id: sp.masterProduct.category.id,
        name: sp.masterProduct.category.name,
        slug: sp.masterProduct.category.slug,
      },
      inStock,
      stockQuantity: sp.masterProduct.stockQuantity,
      ratingAvg: Number(sp.masterProduct.ratingAvg),
      totalReviewsCount: sp.masterProduct.totalReviewsCount,
      createdAt: sp.createdAt,
    };
  }
}
