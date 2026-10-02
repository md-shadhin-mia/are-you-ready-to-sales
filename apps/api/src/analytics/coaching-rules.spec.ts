import { describe, it, expect } from "vitest";
import { AnalyticsService } from "./analytics.service";

describe("Business Coaching Engine Unit Tests", () => {
  const service = new AnalyticsService({} as any);

  it("1. Should trigger High Cart Abandonment diagnosis when cart-to-checkout < 20%", () => {
    const advice = service.generateCoachingAdvice({
      visitors: 150,
      productViews: 80,
      addToCarts: 20,
      checkoutsInitiated: 2, // 2 / 20 = 10% (< 20%)
      completedOrders: 1,
      conversionRatePercent: 0.67,
      cartAbandonmentPercent: 90,
    });

    expect(advice.diagnosis).toBe("High Cart Abandonment");
    expect(advice.actionType).toBe("CREATE_COUPON");
    expect(advice.priority).toBe("HIGH");
  });

  it("2. Should trigger Low Product Engagement diagnosis when view-to-cart < 5%", () => {
    const advice = service.generateCoachingAdvice({
      visitors: 200,
      productViews: 100,
      addToCarts: 2, // 2 / 100 = 2% (< 5%)
      checkoutsInitiated: 1,
      completedOrders: 1,
      conversionRatePercent: 0.5,
      cartAbandonmentPercent: 50,
    });

    expect(advice.diagnosis).toBe("Low Engagement on Product Details");
    expect(advice.actionType).toBe("OPTIMIZE_PRODUCTS");
    expect(advice.priority).toBe("HIGH");
  });

  it("3. Should trigger Price Competitiveness Review when visitors >= 100 and conversion < 1%", () => {
    const advice = service.generateCoachingAdvice({
      visitors: 250,
      productViews: 120,
      addToCarts: 30,
      checkoutsInitiated: 15,
      completedOrders: 1, // 1 / 250 = 0.4% (< 1%)
      conversionRatePercent: 0.4,
      cartAbandonmentPercent: 50,
    });

    expect(advice.diagnosis).toBe("Price Competitiveness Review");
    expect(advice.actionType).toBe("REVIEW_PRICING");
    expect(advice.priority).toBe("HIGH");
  });

  it("4. Should trigger Customer Loyalty diagnosis when repeat customer rate > 25%", () => {
    const advice = service.generateCoachingAdvice({
      visitors: 80,
      productViews: 50,
      addToCarts: 15,
      checkoutsInitiated: 10,
      completedOrders: 8,
      conversionRatePercent: 10.0,
      cartAbandonmentPercent: 33.3,
      repeatCustomerPercent: 30.0, // > 25%
    });

    expect(advice.diagnosis).toBe("Outstanding Customer Loyalty");
    expect(advice.actionType).toBe("REFERRAL_CAMPAIGN");
    expect(advice.priority).toBe("MEDIUM");
  });

  it("5. Should trigger Top-of-Funnel Traffic Needed when visitors < 30", () => {
    const advice = service.generateCoachingAdvice({
      visitors: 12, // < 30
      productViews: 6,
      addToCarts: 2,
      checkoutsInitiated: 1,
      completedOrders: 1,
      conversionRatePercent: 8.33,
      cartAbandonmentPercent: 50,
    });

    expect(advice.diagnosis).toBe("Top-of-Funnel Traffic Needed");
    expect(advice.actionType).toBe("SHARE_STORE");
    expect(advice.priority).toBe("MEDIUM");
  });

  it("6. Should return Balanced Funnel Performance when metrics are healthy", () => {
    const advice = service.generateCoachingAdvice({
      visitors: 80,
      productViews: 60,
      addToCarts: 25,
      checkoutsInitiated: 18, // 18/25 = 72%
      completedOrders: 12, // 12/80 = 15%
      conversionRatePercent: 15.0,
      cartAbandonmentPercent: 28.0,
      repeatCustomerPercent: 15.0,
    });

    expect(advice.diagnosis).toBe("Balanced Funnel Performance");
    expect(advice.actionType).toBe("ADD_PRODUCTS");
    expect(advice.priority).toBe("LOW");
  });

  it("7. Should handle zero addToCarts and zero productViews gracefully", () => {
    const adviceZeroCarts = service.generateCoachingAdvice({
      visitors: 50,
      productViews: 20,
      addToCarts: 0,
      checkoutsInitiated: 0,
      completedOrders: 0,
      conversionRatePercent: 0,
      cartAbandonmentPercent: 0,
    });
    // With 20 views and 0 carts, viewToCartRate is 0% (< 5%), so it triggers Low Engagement
    expect(adviceZeroCarts.diagnosis).toBe("Low Engagement on Product Details");

    const adviceZeroViews = service.generateCoachingAdvice({
      visitors: 50,
      productViews: 0,
      addToCarts: 0,
      checkoutsInitiated: 0,
      completedOrders: 0,
      conversionRatePercent: 0,
      cartAbandonmentPercent: 0,
    });
    // productViews < 20, visitors between 30 and 100, falls back to Balanced Funnel
    expect(adviceZeroViews.diagnosis).toBe("Balanced Funnel Performance");
  });
});
