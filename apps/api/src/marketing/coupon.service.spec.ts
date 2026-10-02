import { describe, it, expect, beforeEach, vi } from "vitest";
import { CouponService } from "./coupon.service";
import { CouponDiscountType } from "@repo/db";
import { BadRequestException } from "@nestjs/common";

describe("CouponService Unit Tests", () => {
  let service: CouponService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      store: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      coupon: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new CouponService(mockPrisma);
  });

  it("1. Should calculate percentage discount accurately (10% off ৳1,500 = ৳150 discount)", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", slug: "apex-gadgets" });
    mockPrisma.coupon.findUnique.mockResolvedValue({
      id: "cpn-1",
      code: "EID10",
      discountType: CouponDiscountType.PERCENTAGE,
      discountValue: 10.0,
      minSpend: 500.0,
      maxUses: 100,
      usedCount: 5,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      isActive: true,
    });

    const result = await service.validateStorefrontCoupon("apex-gadgets", "eid10", 1500);
    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(150);
    expect(result.finalSubtotal).toBe(1350);
  });

  it("2. Should calculate fixed amount discount accurately (৳200 off ৳1,000 = ৳800 subtotal)", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", slug: "apex-gadgets" });
    mockPrisma.coupon.findUnique.mockResolvedValue({
      id: "cpn-2",
      code: "FLAT200",
      discountType: CouponDiscountType.FIXED_AMOUNT,
      discountValue: 200.0,
      minSpend: 800.0,
      maxUses: 50,
      usedCount: 0,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      isActive: true,
    });

    const result = await service.validateStorefrontCoupon("apex-gadgets", "FLAT200", 1000);
    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(200);
    expect(result.finalSubtotal).toBe(800);
  });

  it("3. Should reject expired coupon with BadRequestException", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", slug: "apex-gadgets" });
    mockPrisma.coupon.findUnique.mockResolvedValue({
      id: "cpn-3",
      code: "EXPIRED",
      discountType: CouponDiscountType.PERCENTAGE,
      discountValue: 15.0,
      minSpend: 0,
      maxUses: null,
      usedCount: 0,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-02-01"), // Expired in the past relative to current year
      isActive: true,
    });

    await expect(
      service.validateStorefrontCoupon("apex-gadgets", "EXPIRED", 1000),
    ).rejects.toThrow("Coupon has expired");
  });

  it("4. Should reject when cart subtotal is below minSpend", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", slug: "apex-gadgets" });
    mockPrisma.coupon.findUnique.mockResolvedValue({
      id: "cpn-4",
      code: "MIN1000",
      discountType: CouponDiscountType.PERCENTAGE,
      discountValue: 10.0,
      minSpend: 1000.0,
      maxUses: null,
      usedCount: 0,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2027-01-01"),
      isActive: true,
    });

    await expect(
      service.validateStorefrontCoupon("apex-gadgets", "MIN1000", 750),
    ).rejects.toThrow("Minimum cart spend of ৳1,000 required");
  });

  it("5. Should reject when coupon usage exceeds maxUses limit", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", slug: "apex-gadgets" });
    mockPrisma.coupon.findUnique.mockResolvedValue({
      id: "cpn-5",
      code: "MAX5",
      discountType: CouponDiscountType.FIXED_AMOUNT,
      discountValue: 100.0,
      minSpend: 0,
      maxUses: 5,
      usedCount: 5, // Fully exhausted
      startDate: new Date("2026-01-01"),
      endDate: new Date("2027-01-01"),
      isActive: true,
    });

    await expect(
      service.validateStorefrontCoupon("apex-gadgets", "MAX5", 500),
    ).rejects.toThrow("Coupon redemption limit has been reached");
  });

  it("6. Should throw NotFoundException if store is missing in validateStorefrontCoupon", async () => {
    mockPrisma.store.findUnique.mockResolvedValue(null);
    await expect(
      service.validateStorefrontCoupon("missing-store", "CODE", 500),
    ).rejects.toThrow('Store "missing-store" not found.');
  });

  it("7. Should reject when coupon is inactive or does not exist", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "s-1", slug: "store-1" });
    mockPrisma.coupon.findUnique.mockResolvedValue(null);
    await expect(
      service.validateStorefrontCoupon("store-1", "INVALID", 500),
    ).rejects.toThrow("Coupon code is invalid or has been deactivated.");

    mockPrisma.coupon.findUnique.mockResolvedValue({ id: "c-1", isActive: false });
    await expect(
      service.validateStorefrontCoupon("store-1", "INACTIVE", 500),
    ).rejects.toThrow("Coupon code is invalid or has been deactivated.");
  });

  it("8. Should reject when coupon startDate is in the future", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "s-1", slug: "store-1" });
    mockPrisma.coupon.findUnique.mockResolvedValue({
      id: "c-future",
      isActive: true,
      startDate: new Date(Date.now() + 86400000), // tomorrow
    });

    await expect(
      service.validateStorefrontCoupon("store-1", "FUTURE", 500),
    ).rejects.toThrow("Coupon is not active yet.");
  });

  it("9. Should update coupon details or throw NotFoundException", async () => {
    mockPrisma.store.findFirst.mockResolvedValue({ id: "s-1" });
    mockPrisma.coupon.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.updateCoupon("stu-1", "cpn-missing", { isActive: false }),
    ).rejects.toThrow("Coupon not found.");

    mockPrisma.coupon.findFirst.mockResolvedValueOnce({ id: "cpn-1", storeId: "s-1" });
    mockPrisma.coupon.update.mockResolvedValue({ id: "cpn-1", isActive: false });

    const updated = await service.updateCoupon("stu-1", "cpn-1", {
      isActive: false,
      maxUses: 10,
      endDate: "2026-12-31",
    });
    expect(updated.isActive).toBe(false);
  });

  it("10. Should create coupon or reject invalid discount / duplicates", async () => {
    mockPrisma.store.findFirst.mockResolvedValue({ id: "s-1" });

    // > 100% discount
    await expect(
      service.createCoupon("stu-1", {
        code: "SUPER",
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 150,
      } as any),
    ).rejects.toThrow("Percentage discount cannot exceed 100%.");

    // duplicate code
    mockPrisma.coupon.findUnique.mockResolvedValueOnce({ id: "cpn-dup" });
    await expect(
      service.createCoupon("stu-1", {
        code: "DUP",
        discountType: CouponDiscountType.FIXED_AMOUNT,
        discountValue: 50,
      } as any),
    ).rejects.toThrow('Coupon code "DUP" already exists for your store.');

    // successful creation
    mockPrisma.coupon.findUnique.mockResolvedValueOnce(null);
    mockPrisma.coupon.create.mockResolvedValueOnce({ id: "c-new", code: "VALID" });

    const created = await service.createCoupon("stu-1", {
      code: "VALID",
      discountType: CouponDiscountType.FIXED_AMOUNT,
      discountValue: 50,
      startDate: "2026-06-01",
      endDate: "2026-07-01",
      minSpend: 200,
      maxUses: 10,
    } as any);
    expect(created.id).toBe("c-new");
  });

  it("11. Should list student coupons", async () => {
    mockPrisma.store.findFirst.mockResolvedValue({ id: "s-1" });
    mockPrisma.coupon.findMany.mockResolvedValue([{ id: "c-1" }, { id: "c-2" }]);

    const list = await service.listStudentCoupons("stu-1");
    expect(list).toHaveLength(2);
  });

  it("12. Should throw NotFoundException if student has no active store", async () => {
    mockPrisma.store.findFirst.mockResolvedValue(null);
    await expect(service.listStudentCoupons("stu-none")).rejects.toThrow(
      "Student does not have an active store.",
    );
  });

  it("13. Should update coupon or throw NotFoundException if missing", async () => {
    mockPrisma.store.findFirst.mockResolvedValue({ id: "s-1" });
    mockPrisma.coupon.findFirst.mockResolvedValue(null);

    await expect(
      service.updateCoupon("stu-1", "cpn-missing", { isActive: false }),
    ).rejects.toThrow("Coupon not found.");

    mockPrisma.coupon.findFirst.mockResolvedValue({ id: "cpn-1", storeId: "s-1" });
    mockPrisma.coupon.update.mockResolvedValue({ id: "cpn-1", isActive: false, maxUses: 50 });

    const updated = await service.updateCoupon("stu-1", "cpn-1", {
      isActive: false,
      maxUses: 50,
      endDate: "2026-11-30",
    });
    expect(updated.id).toBe("cpn-1");
    expect(mockPrisma.coupon.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: false, maxUses: 50 }),
      }),
    );
  });

  it("14. Should reject storefront coupon that has not started yet or invalid store", async () => {
    mockPrisma.store.findUnique.mockResolvedValue(null);
    await expect(service.validateStorefrontCoupon("bad-slug", "CODE", 100)).rejects.toThrow(
      'Store "bad-slug" not found.',
    );

    mockPrisma.store.findUnique.mockResolvedValue({ id: "s-1", slug: "good-slug" });
    mockPrisma.coupon.findUnique.mockResolvedValue({
      id: "cpn-future",
      code: "FUTURE",
      isActive: true,
      startDate: new Date(Date.now() + 86400000), // tomorrow
    });
    await expect(service.validateStorefrontCoupon("good-slug", "FUTURE", 100)).rejects.toThrow(
      "Coupon is not active yet.",
    );
  });

  it("15. Should record coupon usage with and without transaction", async () => {
    mockPrisma.coupon.findUnique.mockResolvedValueOnce(null);
    const notFound = await service.recordCouponUsage("s-1", "UNKNOWN");
    expect(notFound).toBeNull();

    mockPrisma.coupon.findUnique.mockResolvedValueOnce({ id: "cpn-1", code: "USED1" });
    mockPrisma.coupon.update.mockResolvedValueOnce({ id: "cpn-1", usedCount: 1 });
    const used = await service.recordCouponUsage("s-1", "USED1");
    expect(used?.id).toBe("cpn-1");

    // With transaction client
    const txMock = {
      coupon: {
        findUnique: vi.fn().mockResolvedValue({ id: "cpn-tx", code: "TXCODE" }),
        update: vi.fn().mockResolvedValue({ id: "cpn-tx", usedCount: 2 }),
      },
    };
    const txUsed = await service.recordCouponUsage("s-1", "TXCODE", txMock);
    expect(txUsed?.id).toBe("cpn-tx");
    expect(txMock.coupon.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { usedCount: { increment: 1 } } }),
    );
  });

  it("16. Should create coupon with default values when optional fields are omitted", async () => {
    mockPrisma.store.findFirst.mockResolvedValue({ id: "s-1" });
    mockPrisma.coupon.findUnique.mockResolvedValueOnce(null);
    mockPrisma.coupon.create.mockResolvedValueOnce({ id: "c-defaults", code: "SIMPLE" });

    const created = await service.createCoupon("stu-1", {
      code: "SIMPLE",
      discountType: CouponDiscountType.FIXED_AMOUNT,
      discountValue: 20,
    } as any);
    expect(created.id).toBe("c-defaults");
    expect(mockPrisma.coupon.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          minSpend: 0,
          maxUses: null,
          endDate: null,
        }),
      }),
    );
  });
});
