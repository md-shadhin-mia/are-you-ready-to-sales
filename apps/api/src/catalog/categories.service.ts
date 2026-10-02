import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";

export const MAX_CATEGORY_DEPTH = 3;

export class CircularDependencyException extends BadRequestException {
  constructor() {
    super("Circular category hierarchy: a category cannot be placed under itself or its descendants");
  }
}

type ParentLookup = (id: string) => Promise<string | null>;
type ChildrenLookup = (id: string) => Promise<string[]>;

async function subtreeHeight(id: string, childrenOf: ChildrenLookup): Promise<number> {
  const children = await childrenOf(id);
  if (children.length === 0) return 1;
  const heights = await Promise.all(children.map((c) => subtreeHeight(c, childrenOf)));
  return 1 + Math.max(...heights);
}

/**
 * Validates placing `categoryId` (null for a new category) under `parentId`.
 * Rejects cycles and any placement that makes the tree deeper than Root -> Category -> Subcategory.
 * Returns the level the category will occupy (1 = root).
 */
export async function validateCategoryPlacement(
  categoryId: string | null,
  parentId: string | null,
  parentOf: ParentLookup,
  childrenOf: ChildrenLookup,
): Promise<number> {
  let parentLevel = 0;
  for (let cursor = parentId; cursor; cursor = await parentOf(cursor)) {
    if (cursor === categoryId) throw new CircularDependencyException();
    if (++parentLevel > MAX_CATEGORY_DEPTH) break;
  }

  const level = parentLevel + 1;
  const height = categoryId ? await subtreeHeight(categoryId, childrenOf) : 1;
  if (level + height - 1 > MAX_CATEGORY_DEPTH) {
    throw new BadRequestException(`Category hierarchy cannot exceed ${MAX_CATEGORY_DEPTH} levels`);
  }
  return level;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private parentOf = async (id: string) =>
    (await this.prisma.category.findUnique({ where: { id }, select: { parentId: true } }))?.parentId ?? null;

  private childrenOf = async (id: string) =>
    (await this.prisma.category.findMany({ where: { parentId: id }, select: { id: true } })).map((c) => c.id);

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
      await validateCategoryPlacement(null, dto.parentId, this.parentOf, this.childrenOf);
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

    if (dto.parentId) {
      await validateCategoryPlacement(id, dto.parentId, this.parentOf, this.childrenOf);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug.toLowerCase() }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
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
      throw new ConflictException(
        `Category has ${linkedProducts} linked product(s); deactivate it instead of deleting`,
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return { success: true, message: "Category deleted successfully" };
  }
}
