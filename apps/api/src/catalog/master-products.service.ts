import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateMasterProductDto,
  UpdateMasterProductDto,
  AdjustStockDto,
  QueryMasterProductsDto,
} from "./dto/master-product.dto";
import { Prisma } from "@repo/db";

@Injectable()
export class MasterProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMasterProductDto) {
    const existingSku = await this.prisma.masterProduct.findUnique({
      where: { sku: dto.sku.toUpperCase() },
    });

    if (existingSku) {
      throw new ConflictException(
        `Master product with SKU '${dto.sku}' already exists`,
      );
    }

    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    return this.prisma.masterProduct.create({
      data: {
        sku: dto.sku.toUpperCase(),
        title: dto.title,
        categoryId: dto.categoryId,
        basePrice: new Prisma.Decimal(dto.basePrice),
        stockQuantity: dto.stockQuantity ?? 0,
        masterDescription: dto.masterDescription,
        masterImages: dto.masterImages ?? [],
        isActive: true,
      },
      include: {
        category: true,
      },
    });
  }

  async findAll(query: QueryMasterProductsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.MasterProductWhereInput = {};

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { sku: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.masterProduct.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.masterProduct.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const product = await this.prisma.masterProduct.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException("Master product not found");
    }

    return product;
  }

  async update(id: string, dto: UpdateMasterProductDto) {
    await this.findById(id);

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException("Target category not found");
      }
    }

    return this.prisma.masterProduct.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.basePrice !== undefined && {
          basePrice: new Prisma.Decimal(dto.basePrice),
        }),
        ...(dto.stockQuantity !== undefined && {
          stockQuantity: dto.stockQuantity,
        }),
        ...(dto.masterDescription && {
          masterDescription: dto.masterDescription,
        }),
        ...(dto.masterImages && { masterImages: dto.masterImages }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        category: true,
      },
    });
  }

  async adjustStock(id: string, dto: AdjustStockDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.masterProduct.findUnique({
        where: { id },
      });

      if (!product) {
        throw new NotFoundException("Master product not found");
      }

      const newStock = product.stockQuantity + dto.quantityChange;
      if (newStock < 0) {
        throw new BadRequestException(
          `Insufficient stock. Current: ${product.stockQuantity}, attempted change: ${dto.quantityChange}`,
        );
      }

      return tx.masterProduct.update({
        where: { id },
        data: { stockQuantity: newStock },
      });
    });
  }

  async findStudentCatalog(query: QueryMasterProductsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.MasterProductWhereInput = {
      isActive: true,
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { sku: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.masterProduct.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          sku: true,
          title: true,
          basePrice: true,
          stockQuantity: true,
          masterDescription: true,
          masterImages: true,
          ratingAvg: true,
          totalReviewsCount: true,
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.masterProduct.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
