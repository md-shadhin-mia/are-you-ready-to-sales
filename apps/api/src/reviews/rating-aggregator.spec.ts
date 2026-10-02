import { describe, it, expect, vi, beforeEach } from "vitest";
import { RatingAggregatorService } from "./rating-aggregator.service";

describe("RatingAggregatorService", () => {
  let service: RatingAggregatorService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      review: {
        aggregate: vi.fn(),
        findMany: vi.fn(),
      },
      masterProduct: {
        update: vi.fn(),
      },
      store: {
        update: vi.fn(),
      },
    };

    service = new RatingAggregatorService(mockPrisma);
  });

  it("should calculate and update master product rating and store rating independently", async () => {
    // 1st aggregate call for masterProduct, 2nd for store
    mockPrisma.review.aggregate
      .mockResolvedValueOnce({
        _avg: { productRating: 4.6666666 },
        _count: { id: 3 },
      })
      .mockResolvedValueOnce({
        _avg: { storeRating: 4.3333333 },
        _count: { id: 3 },
      });

    const result = await service.recalculateAggregates("prod-1", "store-1");

    expect(result.productAvg).toBe(4.67);
    expect(result.storeAvg).toBe(4.33);
    expect(result.totalProductReviews).toBe(3);
    expect(result.totalStoreReviews).toBe(3);

    expect(mockPrisma.masterProduct.update).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: {
        ratingAvg: 4.67,
        totalReviewsCount: 3,
      },
    });

    expect(mockPrisma.store.update).toHaveBeenCalledWith({
      where: { id: "store-1" },
      data: {
        ratingAvg: 4.33,
        totalReviewsCount: 3,
      },
    });
  });

  it("should return correct tri-dimensional breakdown and star distribution", async () => {
    mockPrisma.review.findMany.mockResolvedValue([
      { productRating: 5, storeRating: 4, deliveryRating: 5 },
      { productRating: 5, storeRating: 5, deliveryRating: 4 },
      { productRating: 4, storeRating: 4, deliveryRating: 3 },
    ]);

    const breakdown = await service.getProductBreakdown("prod-1");

    expect(breakdown.totalReviews).toBe(3);
    expect(breakdown.averageProductRating).toBe(4.7);
    expect(breakdown.averageStoreRating).toBe(4.3);
    expect(breakdown.averageDeliveryRating).toBe(4.0);
    expect(breakdown.starDistribution[5]).toBe(2);
    expect(breakdown.starDistribution[4]).toBe(1);
    expect(breakdown.starDistribution[1]).toBe(0);
  });

  it("should return zeroed breakdown when no reviews exist", async () => {
    mockPrisma.review.findMany.mockResolvedValue([]);

    const breakdown = await service.getProductBreakdown("prod-none");

    expect(breakdown.totalReviews).toBe(0);
    expect(breakdown.averageProductRating).toBe(0);
    expect(breakdown.starDistribution[5]).toBe(0);
  });

  it("should accept an optional transaction client and fallback to 0 when aggregates are null", async () => {
    const txMock: any = {
      review: {
        aggregate: vi.fn()
          .mockResolvedValueOnce({ _avg: { productRating: null }, _count: { id: 0 } })
          .mockResolvedValueOnce({ _avg: { storeRating: null }, _count: { id: 0 } }),
      },
      masterProduct: { update: vi.fn() },
      store: { update: vi.fn() },
    };

    const result = await service.recalculateAggregates("prod-2", "store-2", txMock);

    expect(result.productAvg).toBe(0);
    expect(result.storeAvg).toBe(0);
    expect(result.totalProductReviews).toBe(0);
    expect(result.totalStoreReviews).toBe(0);
    expect(txMock.masterProduct.update).toHaveBeenCalledWith({
      where: { id: "prod-2" },
      data: { ratingAvg: 0, totalReviewsCount: 0 },
    });
  });
});
