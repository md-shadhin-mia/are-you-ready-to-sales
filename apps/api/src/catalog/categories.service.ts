import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllTree() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        parent: true,
      },
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    return category;
  }

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { slug: dto.slug.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException("Category slug already exists");
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException("Parent category not found");
      }
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug.toLowerCase(),
        parentId: dto.parentId || null,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findById(id);

    if (dto.slug) {
      const existing = await this.prisma.category.findUnique({
        where: { slug: dto.slug.toLowerCase() },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException("Category slug already in use");
      }
    }

    if (dto.parentId === id) {
      throw new BadRequestException("Category cannot be its own parent");
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug.toLowerCase() }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);

    // Prevent deletion if child categories or products exist
    const childCategories = await this.prisma.category.count({
      where: { parentId: id },
    });
    if (childCategories > 0) {
      throw new BadRequestException(
        "Cannot delete category that contains subcategories",
      );
    }

    const linkedProducts = await this.prisma.masterProduct.count({
      where: { categoryId: id },
    });
    if (linkedProducts > 0) {
      throw new BadRequestException(
        "Cannot delete category that has associated products",
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return { success: true, message: "Category deleted successfully" };
  }
}
