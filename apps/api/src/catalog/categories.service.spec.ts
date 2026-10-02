import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { CategoriesService, validateCategoryPlacement, CircularDependencyException } from "./categories.service";

describe("CategoriesService (Unit)", () => {
  let prisma: any;
  let service: CategoriesService;

  beforeEach(() => {
    prisma = {
      category: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      masterProduct: {
        count: vi.fn(),
      },
    };
    service = new CategoriesService(prisma);
  });

  describe("validateCategoryPlacement", () => {
    it("throws CircularDependencyException if parent is the category itself", async () => {
      const parentOf = vi.fn().mockResolvedValue(null);
      const childrenOf = vi.fn().mockResolvedValue([]);

      await expect(
        validateCategoryPlacement("cat-1", "cat-1", parentOf, childrenOf),
      ).rejects.toBeInstanceOf(CircularDependencyException);
    });

    it("throws CircularDependencyException if cursor reaches the category via ancestors", async () => {
      const parentOf = vi.fn().mockImplementation(async (id: string) => {
        if (id === "cat-3") return "cat-2";
        if (id === "cat-2") return "cat-1";
        return null;
      });
      const childrenOf = vi.fn().mockResolvedValue([]);

      await expect(
        validateCategoryPlacement("cat-1", "cat-3", parentOf, childrenOf),
      ).rejects.toBeInstanceOf(CircularDependencyException);
    });

    it("throws BadRequestException when placing a category deeper than MAX_CATEGORY_DEPTH (3 levels)", async () => {
      const parentOf = vi.fn().mockImplementation(async (id: string) => {
        if (id === "cat-3") return "cat-2";
        if (id === "cat-2") return "cat-1";
        if (id === "cat-1") return "cat-0";
        return null;
      });
      const childrenOf = vi.fn().mockResolvedValue([]);

      await expect(
        validateCategoryPlacement(null, "cat-3", parentOf, childrenOf),
      ).rejects.toThrow("Category hierarchy cannot exceed 3 levels");
    });

    it("throws BadRequestException if subtree height would exceed MAX_CATEGORY_DEPTH", async () => {
      const parentOf = vi.fn().mockImplementation(async (id: string) => {
        if (id === "cat-2") return "cat-1";
        return null;
      });
      const childrenOf = vi.fn().mockImplementation(async (id: string) => {
        if (id === "cat-new") return ["child-1"];
        if (id === "child-1") return ["grandchild-1"];
        return [];
      });

      await expect(
        validateCategoryPlacement("cat-new", "cat-2", parentOf, childrenOf),
      ).rejects.toThrow("Category hierarchy cannot exceed 3 levels");
    });

    it("returns correct level when placement is valid", async () => {
      const parentOf = vi.fn().mockImplementation(async (id: string) => {
        if (id === "cat-2") return "cat-1";
        return null;
      });
      const childrenOf = vi.fn().mockResolvedValue([]);

      const level = await validateCategoryPlacement("cat-3", "cat-2", parentOf, childrenOf);
      expect(level).toBe(3);
    });

    it("returns level 1 when parentId is null (root category)", async () => {
      const parentOf = vi.fn();
      const childrenOf = vi.fn().mockResolvedValue([]);

      const level = await validateCategoryPlacement("cat-1", null, parentOf, childrenOf);
      expect(level).toBe(1);
    });
  });

  describe("findAllTree", () => {
    it("queries root categories with nested children sorted by name", async () => {
      const mockCategories = [{ id: "cat-1", name: "Electronics", parentId: null, children: [] }];
      prisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await service.findAllTree();
      expect(prisma.category.findMany).toHaveBeenCalledWith({
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
      expect(result).toEqual(mockCategories);
    });
  });

  describe("findById", () => {
    it("returns category when found", async () => {
      const category = { id: "cat-1", name: "Laptops", parent: null, children: [] };
      prisma.category.findUnique.mockResolvedValue(category);

      const result = await service.findById("cat-1");
      expect(result).toEqual(category);
    });

    it("throws NotFoundException when category is missing", async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findById("cat-missing")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("create", () => {
    it("throws ConflictException if slug already exists", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: "cat-existing", slug: "shoes" });

      await expect(
        service.create({ name: "Shoes", slug: "SHOES" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("throws NotFoundException if parentId does not exist", async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(
        service.create({ name: "Sneakers", slug: "sneakers", parentId: "parent-missing" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("creates a root category when parentId is not provided", async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue({
        id: "cat-new",
        name: "Clothing",
        slug: "clothing",
        parentId: null,
      });

      const result = await service.create({ name: "Clothing", slug: "Clothing" });
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          name: "Clothing",
          slug: "clothing",
          parentId: null,
        },
      });
      expect(result.id).toBe("cat-new");
    });

    it("creates a subcategory when parentId is valid", async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "parent-1", name: "Fashion", parentId: null })
        .mockResolvedValueOnce(null);
      prisma.category.findMany.mockResolvedValue([]);
      prisma.category.create.mockResolvedValue({
        id: "cat-new",
        name: "Shirts",
        slug: "shirts",
        parentId: "parent-1",
      });

      const result = await service.create({ name: "Shirts", slug: "Shirts", parentId: "parent-1" });
      expect(result.parentId).toBe("parent-1");
    });
  });

  describe("update", () => {
    it("throws ConflictException if updating to a slug already used by another category", async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce({ id: "cat-1", slug: "original-slug" })
        .mockResolvedValueOnce({ id: "cat-other", slug: "taken-slug" });

      await expect(
        service.update("cat-1", { slug: "taken-slug" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("allows updating when slug matches the same category", async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce({ id: "cat-1", slug: "my-slug" })
        .mockResolvedValueOnce({ id: "cat-1", slug: "my-slug" });
      prisma.category.update.mockResolvedValue({ id: "cat-1", name: "Updated Name", slug: "my-slug" });

      const result = await service.update("cat-1", { name: "Updated Name", slug: "my-slug" });
      expect(result.name).toBe("Updated Name");
    });

    it("validates hierarchy placement when parentId is updated", async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce({ id: "cat-1", slug: "my-slug" })
        .mockResolvedValueOnce(null);
      prisma.category.findMany.mockResolvedValue([]);
      prisma.category.update.mockResolvedValue({ id: "cat-1", parentId: "new-parent" });

      const result = await service.update("cat-1", { parentId: "new-parent" });
      expect(prisma.category.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ parentId: "new-parent" }),
        }),
      );
      expect(result.parentId).toBe("new-parent");
    });
  });

  describe("remove", () => {
    it("throws BadRequestException if category has child subcategories", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: "cat-1" });
      prisma.category.count.mockResolvedValue(2);

      await expect(service.remove("cat-1")).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it("throws ConflictException if category has linked products", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: "cat-1" });
      prisma.category.count.mockResolvedValue(0);
      prisma.masterProduct.count.mockResolvedValue(5);

      await expect(service.remove("cat-1")).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it("deletes category successfully when no children or products exist", async () => {
      prisma.category.findUnique.mockResolvedValue({ id: "cat-1" });
      prisma.category.count.mockResolvedValue(0);
      prisma.masterProduct.count.mockResolvedValue(0);
      prisma.category.delete.mockResolvedValue({ id: "cat-1" });

      const result = await service.remove("cat-1");
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: "cat-1" } });
      expect(result).toEqual({ success: true, message: "Category deleted successfully" });
    });
  });
});
