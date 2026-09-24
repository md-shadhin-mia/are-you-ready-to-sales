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
});
