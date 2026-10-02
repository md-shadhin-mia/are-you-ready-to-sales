import { describe, it, expect } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { assertCreditAvailable, priceWholesaleOrder, resolveTierDiscount } from "./wholesale.service";

describe("Wholesale B2B rules (Unit)", () => {
  it("resolves volume tiers: 50+ units = 15%, 200+ units = 25%", () => {
    expect(resolveTierDiscount(49)).toBe(0);
    expect(resolveTierDiscount(50)).toBe(15);
    expect(resolveTierDiscount(199)).toBe(15);
    expect(resolveTierDiscount(200)).toBe(25);
  });

  it("applies the earned tier automatically across all lines", () => {
    const pricing = priceWholesaleOrder([
      { quantity: 30, unitPrice: 100 },
      { quantity: 30, unitPrice: 50 },
    ]);
    expect(pricing).toEqual({ totalUnits: 60, subtotal: 4500, discountPercent: 15, discountAmount: 675, discountedSubtotal: 3825 });
  });

  it("ordering below the tier minimum rejects a discount override", () => {
    expect(() => priceWholesaleOrder([{ quantity: 40, unitPrice: 100 }], 15)).toThrow(BadRequestException);
    expect(() => priceWholesaleOrder([{ quantity: 60, unitPrice: 100 }], 25)).toThrow(BadRequestException);
  });

  it("allows an override at or below the earned tier", () => {
    expect(priceWholesaleOrder([{ quantity: 60, unitPrice: 100 }], 10).discountPercent).toBe(10);
  });

  it("checks institutional credit before issuing an unpaid order", () => {
    const account = { creditLimit: 10000, outstandingBalance: 7000, isActive: true };
    expect(() => assertCreditAvailable(account, 3000)).not.toThrow();
    expect(() => assertCreditAvailable(account, 3000.01)).toThrow(BadRequestException);
    expect(() => assertCreditAvailable({ ...account, isActive: false }, 1)).toThrow(BadRequestException);
    expect(() => assertCreditAvailable(null, 1)).toThrow(BadRequestException);
  });
});
