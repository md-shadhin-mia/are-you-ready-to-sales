import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StoresService } from "../stores/stores.service";
import { PricingService } from "../pricing/pricing.service";
import {
  ImportProductDto,
  UpdateStoreProductDto,
  QueryStoreProductsDto,
} from "./dto/store-product.dto";
import { Prisma } from "@repo/db";

import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class StoreProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
    private readonly pricingService: PricingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async importProduct(userId: string, dto: ImportProductDto) {
    const store = await this.storesService.getMyStore(userId);

    const masterProduct = await this.prisma.masterProduct.findUnique({
      where: { id: dto.masterProductId },
    });

    if (!masterProduct || !masterProduct.isActive) {
      throw new NotFoundException("Master catalog product not found or inactive");
    }

    const basePriceNum = Number(masterProduct.basePrice);
    this.pricingService.validateSellingPrice(basePriceNum, dto.sellingPrice);

    const storeProduct = await this.prisma.storeProduct.upsert({
      where: {
        storeId_masterProductId: {
          storeId: store.id,
          masterProductId: masterProduct.id,
        },
      },
      update: {
        sellingPrice: new Prisma.Decimal(dto.sellingPrice),
        compareAtPrice: dto.compareAtPrice
          ? new Prisma.Decimal(dto.compareAtPrice)
          : null,
        customTitle: dto.customTitle ?? null,
        customDescription: dto.customDescription ?? null,
        customImages: dto.customImages ?? masterProduct.masterImages,
        tags: dto.tags ?? [],
        isFeatured: dto.isFeatured ?? false,
        isVisible: true,
      },
      create: {
        storeId: store.id,
        masterProductId: masterProduct.id,
        sellingPrice: new Prisma.Decimal(dto.sellingPrice),
        compareAtPrice: dto.compareAtPrice
          ? new Prisma.Decimal(dto.compareAtPrice)
          : null,
        customTitle: dto.customTitle ?? null,
        customDescription: dto.customDescription ?? null,
        customImages: dto.customImages ?? masterProduct.masterImages,
        tags: dto.tags ?? [],
        isFeatured: dto.isFeatured ?? false,
        isVisible: true,
      },
      include: {
        masterProduct: {
          include: { category: true },
        },
      },
    });

    const breakdown = this.pricingService.calculateBreakdown({
      basePrice: basePriceNum,
      sellingPrice: dto.sellingPrice,
    });

    this.eventEmitter.emit("store.product.added", {
      storeId: store.id,
      studentId: userId,
      productId: storeProduct.id,
    });

    return {
      storeProduct,
      breakdown,
    };
  }

  async listStoreProducts(userId: string, query: QueryStoreProductsDto) {
    const store = await this.storesService.getMyStore(userId);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.StoreProductWhereInput = {
      storeId: store.id,
    };

    if (query.isVisible !== undefined) {
      where.isVisible = query.isVisible;
    }

    if (query.search) {
      where.OR = [
        { customTitle: { contains: query.search, mode: "insensitive" } },
        { masterProduct: { title: { contains: query.search, mode: "insensitive" } } },
        { masterProduct: { sku: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.storeProduct.findMany({
        where,
        skip,
        take: limit,
        include: {
          masterProduct: {
            include: { category: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.storeProduct.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStoreProduct(userId: string, id: string) {
    const store = await this.storesService.getMyStore(userId);

    const storeProduct = await this.prisma.storeProduct.findFirst({
      where: { id, storeId: store.id },
      include: {
        masterProduct: {
          include: { category: true },
        },
      },
    });

    if (!storeProduct) {
      throw new NotFoundException("Product not found in your store");
    }

    return storeProduct;
  }

  async updateStoreProduct(
    userId: string,
    id: string,
    dto: UpdateStoreProductDto,
  ) {
    const existing = await this.getStoreProduct(userId, id);

    if (dto.sellingPrice !== undefined) {
      const basePriceNum = Number(existing.masterProduct.basePrice);
      this.pricingService.validateSellingPrice(basePriceNum, dto.sellingPrice);
    }

    return this.prisma.storeProduct.update({
      where: { id },
      data: {
        ...(dto.sellingPrice !== undefined && {
          sellingPrice: new Prisma.Decimal(dto.sellingPrice),
        }),
        ...(dto.compareAtPrice !== undefined && {
          compareAtPrice: dto.compareAtPrice
            ? new Prisma.Decimal(dto.compareAtPrice)
            : null,
        }),
        ...(dto.customTitle !== undefined && { customTitle: dto.customTitle }),
        ...(dto.customDescription !== undefined && {
          customDescription: dto.customDescription,
        }),
        ...(dto.customImages && { customImages: dto.customImages }),
        ...(dto.tags && { tags: dto.tags }),
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
      },
      include: {
        masterProduct: {
          include: { category: true },
        },
      },
    });
  }

  async deleteStoreProduct(userId: string, id: string) {
    await this.getStoreProduct(userId, id);

    await this.prisma.storeProduct.delete({
      where: { id },
    });

    return { success: true, message: "Product removed from store" };
  }
}
