import { describe, it, expect, beforeEach } from "vitest";
import { PricingService } from "./pricing.service";
import { BadRequestException } from "@nestjs/common";

describe("PricingService", () => {
  let pricingService: PricingService;

  beforeEach(() => {
    pricingService = new PricingService();
  });

  it("should calculate correct fee breakdown for Cash on Delivery (COD) inside Dhaka", () => {
    const result = pricingService.calculateBreakdown({
      basePrice: 1800,
      sellingPrice: 2400,
      isOnlinePayment: false,
      isInsideDhaka: true,
    });

    expect(result.basePrice).toBe(1800);
    expect(result.sellingPrice).toBe(2400);
    expect(result.grossMargin).toBe(600);
    expect(result.platformCommission).toBe(120); // 5% of 2400
    expect(result.paymentFee).toBe(0); // 0% for COD
    expect(result.shippingFee).toBe(80); // 80 BDT inside Dhaka
    expect(result.studentNetProfit).toBe(480); // 600 - 120 = 480
    expect(result.totalCustomerAmount).toBe(2480); // 2400 + 80
  });

  it("should calculate correct fee breakdown for Online MFS payment outside Dhaka", () => {
    const result = pricingService.calculateBreakdown({
      basePrice: 1800,
      sellingPrice: 2400,
      isOnlinePayment: true,
      isInsideDhaka: false,
    });

    expect(result.grossMargin).toBe(600);
    expect(result.platformCommission).toBe(120); // 5% of 2400
    expect(result.paymentFee).toBe(48); // 2% of 2400
    expect(result.shippingFee).toBe(150); // 150 BDT outside Dhaka
    expect(result.studentNetProfit).toBe(432); // 600 - 120 - 48 = 432
    expect(result.totalCustomerAmount).toBe(2550); // 2400 + 150
  });

  it("should throw BadRequestException if selling price is below wholesale base price", () => {
    expect(() =>
      pricingService.calculateBreakdown({
        basePrice: 1800,
        sellingPrice: 1500,
      }),
    ).toThrow(BadRequestException);
  });
});
