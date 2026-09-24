import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReviewsService } from "./reviews.service";
import { OrderStatus } from "@repo/db";
import {
  ForbiddenException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";

describe("Review Eligibility & Fraud Prevention", () => {
  let reviewsService: ReviewsService;
  let mockPrisma: any;
  let mockStoresService: any;
  let mockRatingAggregator: any;
  let mockEventEmitter: any;

  beforeEach(() => {
    mockPrisma = {
      store: { findUnique: vi.fn() },
      order: { findUnique: vi.fn(), findFirst: vi.fn() },
      review: { findUnique: vi.fn(), create: vi.fn() },
      $transaction: vi.fn((cb) => cb(mockPrisma)),
    };
    mockStoresService = {};
    mockRatingAggregator = { recalculateAggregates: vi.fn() };
    mockEventEmitter = { emit: vi.fn() };

    reviewsService = new ReviewsService(
      mockPrisma,
      mockStoresService,
      mockRatingAggregator,
      mockEventEmitter,
    );
  });

  it("should throw ForbiddenException if order is not DELIVERED or COMPLETED", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", slug: "test-store" });
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "ord-1",
      storeId: "store-1",
      status: OrderStatus.PROCESSING,
      items: [{ masterProductId: "mp-1" }],
    });

    await expect(
      reviewsService.submitReview("test-store", {
        reviewToken: "tok-abc",
        masterProductId: "mp-1",
        productRating: 5,
        storeRating: 5,
        deliveryRating: 5,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("should throw BadRequestException if product was not purchased in the order", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", slug: "test-store" });
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "ord-1",
      storeId: "store-1",
      status: OrderStatus.DELIVERED,
      items: [{ masterProductId: "mp-different" }],
    });

    await expect(
      reviewsService.submitReview("test-store", {
        reviewToken: "tok-abc",
        masterProductId: "mp-not-in-order",
        productRating: 5,
        storeRating: 5,
        deliveryRating: 5,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw ConflictException if review already exists for this order item", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", slug: "test-store" });
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "ord-1",
      storeId: "store-1",
      status: OrderStatus.DELIVERED,
      items: [{ masterProductId: "mp-1" }],
    });
    mockPrisma.review.findUnique.mockResolvedValue({ id: "existing-rev-id" });

    await expect(
      reviewsService.submitReview("test-store", {
        reviewToken: "tok-abc",
        masterProductId: "mp-1",
        productRating: 5,
        storeRating: 5,
        deliveryRating: 5,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("should throw NotFoundException if review token is invalid", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", slug: "test-store" });
    mockPrisma.order.findUnique.mockResolvedValue(null);

    await expect(
      reviewsService.verifyReviewToken("test-store", "non-existent-token"),
    ).rejects.toThrow(NotFoundException);
  });
});
