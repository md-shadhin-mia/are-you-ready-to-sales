import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus } from "@repo/db";
import { ReviewsService } from "./reviews.service";

describe("ReviewsService (Unit)", () => {
  let prisma: any;
  let storesService: any;
  let ratingAggregator: any;
  let eventEmitter: any;
  let service: ReviewsService;

  const mockStore = {
    id: "store-1",
    slug: "gadget-hub",
    storeName: "Gadget Hub",
  };

  const mockOrder = {
    id: "order-1",
    orderNumber: "ORD-2026-001",
    storeId: "store-1",
    status: OrderStatus.DELIVERED,
    customerId: "cust-1",
    customer: { id: "cust-1", fullName: "Tanvir Hossain", phone: "01711223344" },
    items: [
      {
        masterProductId: "p-1",
        quantity: 1,
        masterProduct: { id: "p-1", title: "Wireless Mouse", masterImages: ["mouse.jpg"] },
      },
    ],
    reviews: [],
  };

  beforeEach(() => {
    prisma = {
      store: {
        findUnique: vi.fn().mockResolvedValue(mockStore),
      },
      storeProduct: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      order: {
        findUnique: vi.fn().mockResolvedValue(mockOrder),
        findFirst: vi.fn().mockResolvedValue(mockOrder),
      },
      review: {
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(async ({ data }: any) => ({
          id: "rev-1",
          ...data,
          createdAt: new Date(),
          customer: { fullName: "Tanvir Hossain", phone: "01711223344" },
          masterProduct: { id: "p-1", title: "Wireless Mouse", sku: "WM-01" },
        })),
        update: vi.fn(async ({ data }: any) => ({
          id: "rev-1",
          masterProductId: "p-1",
          storeId: "store-1",
          ...data,
        })),
      },
      $transaction: vi.fn(async (cb: any) => cb(prisma)),
    };

    storesService = {
      getMyStore: vi.fn().mockResolvedValue(mockStore),
    };

    ratingAggregator = {
      recalculateAggregates: vi.fn().mockResolvedValue(undefined),
      getProductBreakdown: vi.fn().mockResolvedValue({ averageRating: 4.8, count: 12 }),
    };

    eventEmitter = {
      emit: vi.fn(),
    };

    service = new ReviewsService(prisma, storesService, ratingAggregator, eventEmitter);
  });

  describe("verifyReviewToken()", () => {
    it("throws NotFoundException if store does not exist", async () => {
      prisma.store.findUnique.mockResolvedValueOnce(null);
      await expect(service.verifyReviewToken("bad-store", "tok-1")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("throws NotFoundException if order does not match token or store", async () => {
      prisma.order.findUnique.mockResolvedValueOnce(null);
      await expect(service.verifyReviewToken("gadget-hub", "bad-token")).rejects.toBeInstanceOf(
        NotFoundException,
      );

      prisma.order.findUnique.mockResolvedValueOnce({ ...mockOrder, storeId: "other-store" });
      await expect(service.verifyReviewToken("gadget-hub", "tok-1")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("throws ForbiddenException if order is not delivered/completed", async () => {
      prisma.order.findUnique.mockResolvedValueOnce({ ...mockOrder, status: OrderStatus.PENDING });
      await expect(service.verifyReviewToken("gadget-hub", "tok-1")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("returns reviewable items and marks already reviewed products", async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        ...mockOrder,
        reviews: [{ masterProductId: "p-1" }],
      });
      const res = await service.verifyReviewToken("gadget-hub", "tok-1");
      expect(res.valid).toBe(true);
      expect(res.orderNumber).toBe("ORD-2026-001");
      expect(res.customerName).toBe("Tanvir H.");
      expect(res.items[0].alreadyReviewed).toBe(true);
    });
  });

  describe("verifyOrderForReview()", () => {
    it("validates delivered purchase by order number and phone", async () => {
      const res = await service.verifyOrderForReview("gadget-hub", "ORD-2026-001", "01711223344");
      expect(res.valid).toBe(true);
      expect(res.customerName).toBe("Tanvir H.");

      prisma.store.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.verifyOrderForReview("bad-store", "ORD-1", "01700000000"),
      ).rejects.toBeInstanceOf(NotFoundException);

      prisma.order.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.verifyOrderForReview("gadget-hub", "ORD-1", "01700000000"),
      ).rejects.toBeInstanceOf(NotFoundException);

      prisma.order.findFirst.mockResolvedValueOnce({ ...mockOrder, status: OrderStatus.PROCESSING });
      await expect(
        service.verifyOrderForReview("gadget-hub", "ORD-1", "01700000000"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("submitReview()", () => {
    const validDto = {
      reviewToken: "valid-tok",
      masterProductId: "p-1",
      productRating: 5,
      storeRating: 5,
      deliveryRating: 4,
      productComment: "Great quality!",
    };

    it("rejects when store is missing or neither token nor order/phone is passed", async () => {
      prisma.store.findUnique.mockResolvedValueOnce(null);
      await expect(service.submitReview("bad-store", validDto as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      await expect(
        service.submitReview("gadget-hub", { masterProductId: "p-1" } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("verifies order status, items, and duplicate submissions", async () => {
      // Order not delivered
      prisma.order.findUnique.mockResolvedValueOnce({ ...mockOrder, status: OrderStatus.PAID });
      await expect(service.submitReview("gadget-hub", validDto as any)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      // Product not in order
      prisma.order.findUnique.mockResolvedValueOnce({ ...mockOrder, items: [] });
      await expect(service.submitReview("gadget-hub", validDto as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      // Already reviewed
      prisma.review.findUnique.mockResolvedValueOnce({ id: "rev-existing" });
      await expect(service.submitReview("gadget-hub", validDto as any)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it("successfully creates review, recalculates aggregates, and emits domain event", async () => {
      const res = await service.submitReview("gadget-hub", validDto as any);
      expect(res.success).toBe(true);
      expect(res.review.id).toBe("rev-1");
      expect(ratingAggregator.recalculateAggregates).toHaveBeenCalledWith(
        "p-1",
        "store-1",
        expect.anything(),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "review.received",
        expect.objectContaining({ storeId: "store-1" }),
      );

      // Using orderNumber and customerPhone instead of token
      const byPhoneDto = {
        orderNumber: "ORD-2026-001",
        customerPhone: "01711223344",
        masterProductId: "p-1",
        productRating: 4,
        storeRating: 4,
        deliveryRating: 4,
      };
      const res2 = await service.submitReview("gadget-hub", byPhoneDto as any);
      expect(res2.success).toBe(true);
    });
  });

  describe("getProductReviews() & getStoreReviews()", () => {
    it("fetches product reviews resolving storeProductId if applicable", async () => {
      prisma.storeProduct.findFirst.mockResolvedValueOnce({
        id: "sp-1",
        masterProductId: "p-master-1",
      });
      prisma.review.findMany.mockResolvedValueOnce([
        {
          id: "r-1",
          productRating: 5,
          storeRating: 4,
          deliveryRating: 5,
          createdAt: new Date(),
          customer: { fullName: "SingleName", phone: "123" },
          store: { storeName: "Gadget Hub", slug: "gadget-hub" },
        },
      ]);
      prisma.review.count.mockResolvedValueOnce(1);

      const res = await service.getProductReviews("gadget-hub", "sp-1", { page: 1, limit: 10 });
      expect(res.reviews).toHaveLength(1);
      expect(res.breakdown).toBeDefined();

      prisma.store.findUnique.mockResolvedValueOnce(null);
      await expect(service.getProductReviews("missing", "p-1", {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("fetches store reviews with pagination", async () => {
      prisma.review.findMany.mockResolvedValueOnce([]);
      prisma.review.count.mockResolvedValueOnce(0);

      const res = await service.getStoreReviews("gadget-hub", { page: 1, limit: 10 });
      expect(res.reviews).toEqual([]);
      expect(res.meta.total).toBe(0);

      prisma.store.findUnique.mockResolvedValueOnce(null);
      await expect(service.getStoreReviews("missing", {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("listStudentReviews() & listAdminReviews()", () => {
    it("filters student reviews by ratingFilter (5_STAR, CRITICAL) and search", async () => {
      prisma.review.findMany
        .mockResolvedValueOnce([]) // for paginated reviews
        .mockResolvedValueOnce([
          { productRating: 5, storeRating: 5, deliveryRating: 4 },
          { productRating: 2, storeRating: 1, deliveryRating: 2 },
        ]); // for allStoreReviews breakdown
      prisma.review.count.mockResolvedValueOnce(0);

      const res5Star = await service.listStudentReviews("user-1", {
        ratingFilter: "5_STAR",
        search: "keyword",
      } as any);
      expect(res5Star.breakdown.totalReviews).toBe(2);
      expect(res5Star.breakdown.averageProductRating).toBe(3.5);

      // Critical filter
      prisma.review.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prisma.review.count.mockResolvedValueOnce(0);

      const resCritical = await service.listStudentReviews("user-1", {
        ratingFilter: "CRITICAL",
      } as any);
      expect(resCritical.breakdown.totalReviews).toBe(0);
      expect(resCritical.breakdown.averageStoreRating).toBe(0);
    });

    it("lists admin reviews with moderation filters and pagination", async () => {
      prisma.review.findMany.mockResolvedValueOnce([
        {
          id: "r-admin",
          productRating: 5,
          storeRating: 5,
          deliveryRating: 5,
          createdAt: new Date(),
          customer: { id: "c-1", fullName: "Admin Viewer", phone: "017" },
          masterProduct: { id: "p-1", title: "Phone", sku: "PH-1" },
          store: { id: "s-1", storeName: "Store", slug: "store" },
          order: { orderNumber: "ORD-1", createdAt: new Date() },
        },
      ]);
      prisma.review.count.mockResolvedValueOnce(1);

      const res = await service.listAdminReviews({ status: "PUBLISHED", search: "Admin" } as any);
      expect(res.items).toHaveLength(1);
      expect(res.total).toBe(1);

      // Test UNPUBLISHED status
      prisma.review.findMany.mockResolvedValueOnce([]);
      prisma.review.count.mockResolvedValueOnce(0);
      const resUnpublished = await service.listAdminReviews({ status: "UNPUBLISHED" } as any);
      expect(resUnpublished.items).toHaveLength(0);
    });
  });

  describe("togglePublishStatus()", () => {
    it("toggles review isPublished and updates aggregates", async () => {
      prisma.review.findUnique.mockResolvedValueOnce(null);
      await expect(service.togglePublishStatus("rev-none", false)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      prisma.review.findUnique.mockResolvedValueOnce({
        id: "rev-1",
        masterProductId: "p-1",
        storeId: "store-1",
      });

      const updated = await service.togglePublishStatus("rev-1", false);
      expect(updated.id).toBe("rev-1");
      expect(ratingAggregator.recalculateAggregates).toHaveBeenCalledWith(
        "p-1",
        "store-1",
        expect.anything(),
      );
    });
  });

  describe("Customer masking and edge branches", () => {
    it("handles customer masking with null/empty names and short phones", async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        ...mockOrder,
        customer: { id: "c-anon", fullName: null, phone: null },
        items: [{ masterProductId: "p-1", masterProduct: { title: "Title", masterImages: null } }],
      });
      const res = await service.verifyReviewToken("gadget-hub", "tok-1");
      expect(res.customerName).toBe("Verified Customer");
      expect(res.items[0].image).toBe("");
    });

    it("verifies COMPLETED order status and single-word names", async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        ...mockOrder,
        status: OrderStatus.COMPLETED,
        customer: { id: "c-1", fullName: "Shadhin", phone: "017123" },
      });
      const res = await service.verifyReviewToken("gadget-hub", "tok-1");
      expect(res.valid).toBe(true);
      expect(res.customerName).toBe("Shadhin");

      // Verify order by phone for COMPLETED status
      prisma.order.findFirst.mockResolvedValueOnce({
        ...mockOrder,
        status: OrderStatus.COMPLETED,
        customer: { id: "c-1", fullName: "Shadhin", phone: "017123" },
      });
      const res2 = await service.verifyOrderForReview("gadget-hub", "ORD-2026-001", "017123");
      expect(res2.valid).toBe(true);
    });

    it("submits review with all comments and COMPLETED order status", async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        ...mockOrder,
        status: OrderStatus.COMPLETED,
      });

      const res = await service.submitReview("gadget-hub", {
        reviewToken: "tok-1",
        masterProductId: "p-1",
        productRating: 5,
        storeRating: 5,
        deliveryRating: 5,
        productComment: "Great",
        storeComment: "Responsive seller",
        deliveryComment: "Fast delivery",
      } as any);
      expect(res.success).toBe(true);
      expect(res.review.storeComment).toBe("Responsive seller");
      expect(res.review.deliveryComment).toBe("Fast delivery");
    });

    it("populates star distribution for 1, 2, 3, 4, and 5 star ratings", async () => {
      prisma.review.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { productRating: 5, storeRating: 5, deliveryRating: 5 },
          { productRating: 4, storeRating: 4, deliveryRating: 4 },
          { productRating: 3, storeRating: 3, deliveryRating: 3 },
          { productRating: 2, storeRating: 2, deliveryRating: 2 },
          { productRating: 1, storeRating: 1, deliveryRating: 1 },
        ]);
      prisma.review.count.mockResolvedValueOnce(5);

      const res = await service.listStudentReviews("user-1", {});
      expect(res.breakdown.totalReviews).toBe(5);
      expect(res.breakdown.starDistribution[5]).toBe(1);
      expect(res.breakdown.starDistribution[4]).toBe(1);
      expect(res.breakdown.starDistribution[3]).toBe(1);
      expect(res.breakdown.starDistribution[2]).toBe(1);
      expect(res.breakdown.starDistribution[1]).toBe(1);
    });

    it("lists admin reviews without status or search filters", async () => {
      prisma.review.findMany.mockResolvedValueOnce([]);
      prisma.review.count.mockResolvedValueOnce(0);

      const res = await service.listAdminReviews({});
      expect(res.items).toHaveLength(0);
      expect(res.total).toBe(0);
    });
  });
});
