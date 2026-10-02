import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import {
  TaxonomyService,
  generateVariantMatrix,
  ean13CheckDigit,
  comboKey,
} from "./taxonomy.service";

describe("Taxonomy (Unit)", () => {
  describe("generateVariantMatrix()", () => {
    it("throws BadRequestException if neither sizes nor colors are provided", () => {
      expect(() => generateVariantMatrix("SKU", [], [])).toThrow(BadRequestException);
    });

    it("generates variants with sizes only", () => {
      const plans = generateVariantMatrix("TSHIRT", [{ id: "s-m", code: "M" }], []);
      expect(plans).toHaveLength(1);
      expect(plans[0]).toEqual({ sizeId: "s-m", colorId: null, sku: "TSHIRT-M" });
    });

    it("generates variants with colors only", () => {
      const plans = generateVariantMatrix("TSHIRT", [], [{ id: "c-red", code: "RED" }]);
      expect(plans).toHaveLength(1);
      expect(plans[0]).toEqual({ sizeId: null, colorId: "c-red", sku: "TSHIRT-RED" });
    });

    it("generates 2x2 matrix and handles SKU collisions with numeric suffixes", () => {
      const sizes = [
        { id: "s-m", code: "M" },
        { id: "s-l", code: "L" },
      ];
      const colors = [
        { id: "c-blk", code: "BLK" },
        { id: "c-wht", code: "WHT" },
      ];
      const takenSkus = new Set(["TSHIRT-M-BLK"]);
      const existingCombos = new Set([comboKey("s-l", "c-wht")]);

      const plans = generateVariantMatrix("TSHIRT", sizes, colors, { takenSkus, existingCombos });
      expect(plans).toHaveLength(3);
      // Collision should append -2
      expect(plans[0].sku).toBe("TSHIRT-M-BLK-2");
    });
  });

  describe("ean13CheckDigit()", () => {
    it("computes the correct check digit for a 12-digit string", () => {
      // 400638133393 -> 1
      expect(ean13CheckDigit("400638133393")).toBe(1);
    });
  });

  describe("TaxonomyService", () => {
    let prisma: any;
    let sequences: any;
    let service: TaxonomyService;

    beforeEach(() => {
      prisma = {
        brand: {
          findMany: vi.fn().mockResolvedValue([{ id: "b-1", name: "Nike", _count: { masterProducts: 3 } }]),
          findUnique: vi.fn(),
          create: vi.fn(async ({ data }: any) => ({ id: "b-1", ...data })),
          update: vi.fn(async ({ data }: any) => ({ id: "b-1", ...data })),
          delete: vi.fn(),
        },
        masterProduct: {
          count: vi.fn().mockResolvedValue(0),
          findUnique: vi.fn().mockResolvedValue({ id: "mp-1", sku: "TSHIRT" }),
          findMany: vi.fn().mockResolvedValue([]),
        },
        size: {
          findMany: vi.fn().mockResolvedValue([{ id: "s-1", code: "M", isActive: true, sortOrder: 1 }]),
          findUnique: vi.fn(),
          create: vi.fn(async ({ data }: any) => ({ id: "s-1", ...data })),
          update: vi.fn(async ({ data }: any) => ({ id: "s-1", ...data })),
        },
        color: {
          findMany: vi.fn().mockResolvedValue([{ id: "c-1", code: "RED", isActive: true }]),
          findUnique: vi.fn(),
          create: vi.fn(async ({ data }: any) => ({ id: "c-1", ...data })),
          update: vi.fn(async ({ data }: any) => ({ id: "c-1", ...data })),
        },
        productVariant: {
          findMany: vi.fn().mockResolvedValue([]),
          createMany: vi.fn(),
        },
        $transaction: vi.fn(async (cb: any) => cb(prisma)),
      };
      sequences = {
        nextRange: vi.fn().mockResolvedValue(["BARCODE-2026-000000001"]),
      };
      service = new TaxonomyService(prisma, sequences);
    });

    describe("Brands", () => {
      it("lists brands and calculates productsCount", async () => {
        const brands = await service.listBrands();
        expect(brands).toHaveLength(1);
        expect(brands[0].productsCount).toBe(3);
      });

      it("creates brand or throws ConflictException on duplicate slug", async () => {
        prisma.brand.findUnique.mockResolvedValueOnce({ id: "b-1" });
        await expect(service.createBrand({ name: "Nike", slug: "nike" } as any)).rejects.toBeInstanceOf(
          ConflictException,
        );

        prisma.brand.findUnique.mockResolvedValueOnce(null);
        const created = await service.createBrand({ name: "Nike", slug: "nike" } as any);
        expect(created.id).toBe("b-1");
      });

      it("updates brand or throws NotFoundException when missing", async () => {
        prisma.brand.findUnique.mockResolvedValueOnce(null);
        await expect(service.updateBrand("b-missing", { name: "New" })).rejects.toBeInstanceOf(
          NotFoundException,
        );

        prisma.brand.findUnique.mockResolvedValueOnce({ id: "b-1" });
        const updated = await service.updateBrand("b-1", { name: "Updated" });
        expect(updated.name).toBe("Updated");
      });

      it("deletes brand or rejects when products are linked", async () => {
        prisma.brand.findUnique.mockResolvedValueOnce({ id: "b-1" });
        prisma.masterProduct.count.mockResolvedValueOnce(2);
        await expect(service.deleteBrand("b-1")).rejects.toBeInstanceOf(ConflictException);

        prisma.brand.findUnique.mockResolvedValueOnce({ id: "b-1" });
        prisma.masterProduct.count.mockResolvedValueOnce(0);
        const res = await service.deleteBrand("b-1");
        expect(res.deleted).toBe(true);
      });
    });

    describe("Sizes & Colors", () => {
      it("creates, lists, and updates sizes with duplicate code check", async () => {
        expect(await service.listSizes()).toHaveLength(1);

        prisma.size.findUnique.mockResolvedValueOnce({ id: "s-1" });
        await expect(service.createSize({ name: "Medium", code: "m" } as any)).rejects.toBeInstanceOf(
          ConflictException,
        );

        prisma.size.findUnique.mockResolvedValueOnce(null);
        const created = await service.createSize({ name: "Medium", code: "m" } as any);
        expect(created.code).toBe("M");

        prisma.size.findUnique.mockResolvedValueOnce({ id: "s-1" });
        const updated = await service.updateSize("s-1", { name: "Med" });
        expect(updated.name).toBe("Med");
      });

      it("creates, lists, and updates colors with duplicate code check", async () => {
        expect(await service.listColors()).toHaveLength(1);

        prisma.color.findUnique.mockResolvedValueOnce({ id: "c-1" });
        await expect(
          service.createColor({ name: "Red", code: "red", hexCode: "#ff0000" } as any),
        ).rejects.toBeInstanceOf(ConflictException);

        prisma.color.findUnique.mockResolvedValueOnce(null);
        const created = await service.createColor({ name: "Red", code: "red", hexCode: "#ff0000" } as any);
        expect(created.code).toBe("RED");
        expect(created.hexCode).toBe("#FF0000");

        prisma.color.findUnique.mockResolvedValueOnce({ id: "c-1" });
        const updated = await service.updateColor("c-1", { hexCode: "#cc0000" });
        expect(updated.hexCode).toBe("#CC0000");
      });
    });

    describe("Variants", () => {
      it("lists variants for master product", async () => {
        prisma.productVariant.findMany.mockResolvedValueOnce([{ id: "v-1", sku: "TSHIRT-M-RED" }]);
        const list = await service.listVariants("mp-1");
        expect(list).toHaveLength(1);
      });

      it("generates variants with barcodes or validates missing products and inactive options", async () => {
        // Missing master product
        prisma.masterProduct.findUnique.mockResolvedValueOnce(null);
        await expect(service.generateVariants("mp-none", ["s-1"], ["c-1"])).rejects.toBeInstanceOf(
          NotFoundException,
        );

        // Unknown size/color
        prisma.masterProduct.findUnique.mockResolvedValueOnce({ id: "mp-1", sku: "TSHIRT" });
        prisma.size.findMany.mockResolvedValueOnce([]); // missing size
        prisma.color.findMany.mockResolvedValueOnce([{ id: "c-1", code: "RED", isActive: true }]);
        await expect(service.generateVariants("mp-1", ["s-unknown"], ["c-1"])).rejects.toBeInstanceOf(
          BadRequestException,
        );

        // Successful variant generation
        prisma.masterProduct.findUnique.mockResolvedValueOnce({ id: "mp-1", sku: "TSHIRT" });
        prisma.size.findMany.mockResolvedValueOnce([{ id: "s-1", code: "M", isActive: true }]);
        prisma.color.findMany.mockResolvedValueOnce([{ id: "c-1", code: "RED", isActive: true }]);
        prisma.productVariant.findMany
          .mockResolvedValueOnce([]) // existing variant combinations
          .mockResolvedValueOnce([]) // takenVariant skus
          .mockResolvedValueOnce([{ id: "v-new", sku: "TSHIRT-M-RED" }]); // return created variants in listVariants

        const res = await service.generateVariants("mp-1", ["s-1"], ["c-1"]);
        expect(res.created).toBe(1);
        expect(res.variants).toHaveLength(1);
      });
    });
  });
});
