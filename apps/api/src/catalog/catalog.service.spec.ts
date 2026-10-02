import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { CategoriesService, CircularDependencyException, validateCategoryPlacement } from "./categories.service";
import { ean13CheckDigit, generateVariantMatrix } from "./taxonomy.service";

describe("Catalog taxonomy (Unit)", () => {
  // root -> electronics -> phones
  const tree: Record<string, string | null> = { root: null, electronics: "root", phones: "electronics", other: null };
  const parentOf = async (id: string) => tree[id] ?? null;
  const children: Record<string, string[]> = { root: ["electronics"], electronics: ["phones"], phones: [], other: [] };
  const childrenOf = async (id: string) => children[id] ?? [];

  describe("validateCategoryPlacement()", () => {
    it("allows up to three levels (Root -> Category -> Subcategory)", async () => {
      await expect(validateCategoryPlacement(null, "electronics", parentOf, childrenOf)).resolves.toBe(3);
    });

    it("rejects a fourth level", async () => {
      await expect(validateCategoryPlacement(null, "phones", parentOf, childrenOf)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("rejects moving a subtree where it would exceed the depth limit", async () => {
      // electronics (with child phones) under "other" => other/electronics/phones = 3 (ok); under electronics's own child = cycle
      await expect(validateCategoryPlacement("electronics", "other", parentOf, childrenOf)).resolves.toBe(2);
      await expect(validateCategoryPlacement("root", "other", parentOf, childrenOf)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("throws CircularDependencyException when A is parent of B and B becomes parent of A", async () => {
      await expect(validateCategoryPlacement("root", "phones", parentOf, childrenOf)).rejects.toBeInstanceOf(
        CircularDependencyException,
      );
      await expect(validateCategoryPlacement("root", "root", parentOf, childrenOf)).rejects.toBeInstanceOf(
        CircularDependencyException,
      );
    });
  });

  describe("CategoriesService.remove()", () => {
    it("refuses to delete a category with active products and asks for deactivation", async () => {
      const prisma: any = {
        category: { findUnique: vi.fn().mockResolvedValue({ id: "c1" }), delete: vi.fn() },
        masterProduct: { count: vi.fn().mockResolvedValue(2) },
      };
      prisma.category.count = vi.fn().mockResolvedValue(0);
      const service = new CategoriesService(prisma);
      await expect(service.remove("c1")).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });
  });

  describe("generateVariantMatrix()", () => {
    const sizes = [
      { id: "s", code: "S" },
      { id: "m", code: "M" },
      { id: "l", code: "L" },
    ];
    const colors = [
      { id: "r", code: "RED" },
      { id: "b", code: "BLUE" },
    ];

    it("creates one SKU per size x color combination", () => {
      const matrix = generateVariantMatrix("TEE-01", sizes, colors);
      expect(matrix).toHaveLength(6);
      expect(matrix.map((v) => v.sku)).toEqual([
        "TEE-01-S-RED",
        "TEE-01-S-BLUE",
        "TEE-01-M-RED",
        "TEE-01-M-BLUE",
        "TEE-01-L-RED",
        "TEE-01-L-BLUE",
      ]);
    });

    it("produces collision-free SKUs even when option codes normalize to the same token", () => {
      const matrix = generateVariantMatrix("TEE-01", [{ id: "a", code: "x-l" }, { id: "b", code: "XL" }], colors);
      const skus = matrix.map((v) => v.sku);
      expect(new Set(skus).size).toBe(skus.length);
    });

    it("skips combinations that already exist and avoids taken SKUs", () => {
      const matrix = generateVariantMatrix("TEE-01", sizes, colors, {
        existingCombos: new Set(["s|r"]),
        takenSkus: new Set(["TEE-01-M-RED"]),
      });
      expect(matrix).toHaveLength(5);
      expect(matrix.map((v) => v.sku)).not.toContain("TEE-01-M-RED");
      expect(matrix.find((v) => v.sizeId === "m" && v.colorId === "r")?.sku).toBe("TEE-01-M-RED-2");
    });

    it("supports a single dimension", () => {
      expect(generateVariantMatrix("CAP", [], colors).map((v) => v.sku)).toEqual(["CAP-RED", "CAP-BLUE"]);
      expect(() => generateVariantMatrix("CAP", [], [])).toThrow(BadRequestException);
    });
  });

  it("computes EAN-13 check digits", () => {
    expect(ean13CheckDigit("400638133393")).toBe(1);
    expect(ean13CheckDigit("590123412345")).toBe(7);
  });
});
