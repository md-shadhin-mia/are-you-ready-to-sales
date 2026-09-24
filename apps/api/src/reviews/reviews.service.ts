import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import { StoresService } from "../stores/stores.service";
import { RatingAggregatorService } from "./rating-aggregator.service";
import { SubmitReviewDto, QueryReviewsDto } from "./dto/review.dto";
import { OrderStatus, Prisma } from "@repo/db";

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
    private readonly ratingAggregator: RatingAggregatorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Helper to mask customer phone for public display (e.g. 01711223344 -> 017****3344)
   */
  private maskPhone(phone?: string | null): string {
    if (!phone || phone.length < 8) return phone || "";
    const start = phone.slice(0, 3);
    const end = phone.slice(-4);
    return `${start}****${end}`;
  }

  /**
   * Mask full name (e.g. 'Tanvir Hossain' -> 'Tanvir H.')
   */
  private maskName(name?: string | null): string {
    if (!name) return "Verified Customer";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }

  /**
   * Verify 1-click passwordless review token
   */
  async verifyReviewToken(storeSlug: string, token: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug.toLowerCase() },
    });
    if (!store) {
      throw new NotFoundException(`Store "${storeSlug}" not found`);
    }

    const order = await this.prisma.order.findUnique({
      where: { reviewToken: token },
      include: {
        customer: true,
        items: {
          include: {
            masterProduct: true,
          },
        },
        reviews: true,
      },
    });

    if (!order || order.storeId !== store.id) {
      throw new NotFoundException("Invalid or expired review invitation token");
    }

    if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.COMPLETED) {
      throw new ForbiddenException("Reviews can only be submitted for delivered or completed orders");
    }

    const reviewedMasterProductIds = new Set(order.reviews.map((r) => r.masterProductId));

    return {
      valid: true,
      orderNumber: order.orderNumber,
      customerName: this.maskName(order.customer.fullName),
      items: order.items.map((item) => ({
        masterProductId: item.masterProductId,
        title: item.masterProduct.title,
        image: item.masterProduct.masterImages?.[0] || "",
        alreadyReviewed: reviewedMasterProductIds.has(item.masterProductId),
      })),
    };
  }

  /**
   * Verify manual lookup by order number and phone
   */
  async verifyOrderForReview(storeSlug: string, orderNumber: string, phone: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug.toLowerCase() },
    });
    if (!store) {
      throw new NotFoundException(`Store "${storeSlug}" not found`);
    }

    const cleanOrderNumber = orderNumber.trim().toUpperCase();
    const cleanPhone = phone.trim();

    const order = await this.prisma.order.findFirst({
      where: {
        orderNumber: cleanOrderNumber,
        storeId: store.id,
        customer: { phone: cleanPhone },
      },
      include: {
        customer: true,
        items: {
          include: {
            masterProduct: true,
          },
        },
        reviews: true,
      },
    });

    if (!order) {
      throw new NotFoundException("No matching delivered order found for this phone and order number");
    }

    if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.COMPLETED) {
      throw new ForbiddenException("Order has not been delivered yet. Reviews are restricted to delivered purchases.");
    }

    const reviewedMasterProductIds = new Set(order.reviews.map((r) => r.masterProductId));

    return {
      valid: true,
      orderNumber: order.orderNumber,
      customerName: this.maskName(order.customer.fullName),
      items: order.items.map((item) => ({
        masterProductId: item.masterProductId,
        title: item.masterProduct.title,
        image: item.masterProduct.masterImages?.[0] || "",
        alreadyReviewed: reviewedMasterProductIds.has(item.masterProductId),
      })),
    };
  }

  /**
   * Submit tri-dimensional review with strict purchase verification and atomic aggregation
   */
  async submitReview(storeSlug: string, dto: SubmitReviewDto) {
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug.toLowerCase() },
    });
    if (!store) {
      throw new NotFoundException(`Store "${storeSlug}" not found`);
    }

    let order: any;

    if (dto.reviewToken) {
      order = await this.prisma.order.findUnique({
        where: { reviewToken: dto.reviewToken },
        include: { customer: true, items: true },
      });
    } else if (dto.orderNumber && dto.customerPhone) {
      order = await this.prisma.order.findFirst({
        where: {
          orderNumber: dto.orderNumber.trim().toUpperCase(),
          storeId: store.id,
          customer: { phone: dto.customerPhone.trim() },
        },
        include: { customer: true, items: true },
      });
    } else {
      throw new BadRequestException("Either reviewToken or both orderNumber and customerPhone must be provided");
    }

    if (!order || order.storeId !== store.id) {
      throw new NotFoundException("Order not found for review submission");
    }

    if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.COMPLETED) {
      throw new ForbiddenException("Order must be delivered to submit a review");
    }

    // Verify item was in the order
    const hasItem = order.items.some(
      (item: any) => item.masterProductId === dto.masterProductId,
    );
    if (!hasItem) {
      throw new BadRequestException("Product was not purchased in this order");
    }

    // Prevent duplicate reviews
    const existing = await this.prisma.review.findUnique({
      where: {
        orderId_masterProductId: {
          orderId: order.id,
          masterProductId: dto.masterProductId,
        },
      },
    });

    if (existing) {
      throw new ConflictException("You have already reviewed this product for this order");
    }

    // Execute review creation and atomic aggregates recalculation inside transaction
    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          orderId: order.id,
          masterProductId: dto.masterProductId,
          storeId: store.id,
          customerId: order.customerId,
          productRating: dto.productRating,
          storeRating: dto.storeRating,
          deliveryRating: dto.deliveryRating,
          productComment: dto.productComment?.trim() || null,
          storeComment: dto.storeComment?.trim() || null,
          deliveryComment: dto.deliveryComment?.trim() || null,
          isVerified: true,
          isPublished: true,
        },
        include: {
          customer: true,
          masterProduct: true,
        },
      });

      await this.ratingAggregator.recalculateAggregates(dto.masterProductId, store.id, tx);

      return created;
    });

    // Emit domain event for gamification / notification triggers
    this.eventEmitter.emit("review.received", {
      reviewId: review.id,
      storeId: store.id,
      productRating: review.productRating,
      storeRating: review.storeRating,
      deliveryRating: review.deliveryRating,
    });

    return {
      success: true,
      review: {
        id: review.id,
        orderId: review.orderId,
        masterProductId: review.masterProductId,
        storeId: review.storeId,
        customerId: review.customerId,
        productRating: review.productRating,
        storeRating: review.storeRating,
        deliveryRating: review.deliveryRating,
        productComment: review.productComment,
        storeComment: review.storeComment,
        deliveryComment: review.deliveryComment,
        isVerified: review.isVerified,
        isPublished: review.isPublished,
        createdAt: review.createdAt.toISOString(),
        customer: {
          fullName: this.maskName(order.customer.fullName),
          phone: this.maskPhone(order.customer.phone),
        },
      },
    };
  }

  /**
   * Get public reviews for a product with 3D breakdown
   */
  async getProductReviews(
    storeSlug: string,
    productId: string,
    query: { page?: number; limit?: number },
  ) {
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug.toLowerCase() },
    });
    if (!store) {
      throw new NotFoundException(`Store "${storeSlug}" not found`);
    }

    // Determine if productId is a storeProductId or masterProductId
    let masterProductId = productId;
    const storeProduct = await this.prisma.storeProduct.findFirst({
      where: { id: productId, storeId: store.id },
    });
    if (storeProduct) {
      masterProductId = storeProduct.masterProductId;
    }

    const page = query?.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query?.limit ? Math.max(1, Number(query.limit)) : 10;
    const skip = (page - 1) * limit;

    const [breakdown, reviews, total] = await Promise.all([
      this.ratingAggregator.getProductBreakdown(masterProductId),
      this.prisma.review.findMany({
        where: {
          masterProductId,
          isPublished: true,
        },
        include: {
          customer: true,
          store: { select: { storeName: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.review.count({
        where: { masterProductId, isPublished: true },
      }),
    ]);

    return {
      breakdown,
      reviews: reviews.map((r) => ({
        id: r.id,
        productRating: r.productRating,
        storeRating: r.storeRating,
        deliveryRating: r.deliveryRating,
        productComment: r.productComment,
        storeComment: r.storeComment,
        deliveryComment: r.deliveryComment,
        isVerified: r.isVerified,
        createdAt: r.createdAt.toISOString(),
        customer: {
          fullName: this.maskName(r.customer.fullName),
          phone: this.maskPhone(r.customer.phone),
        },
        store: r.store,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Public store reviews (ratings given to store service & delivery)
   */
  async getStoreReviews(storeSlug: string, query: { page?: number; limit?: number }) {
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug.toLowerCase() },
    });
    if (!store) {
      throw new NotFoundException(`Store "${storeSlug}" not found`);
    }

    const page = query?.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query?.limit ? Math.max(1, Number(query.limit)) : 10;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          storeId: store.id,
          isPublished: true,
        },
        include: {
          customer: true,
          masterProduct: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.review.count({
        where: { storeId: store.id, isPublished: true },
      }),
    ]);

    return {
      reviews: reviews.map((r) => ({
        id: r.id,
        productRating: r.productRating,
        storeRating: r.storeRating,
        deliveryRating: r.deliveryRating,
        storeComment: r.storeComment,
        deliveryComment: r.deliveryComment,
        productComment: r.productComment,
        isVerified: r.isVerified,
        createdAt: r.createdAt.toISOString(),
        customer: {
          fullName: this.maskName(r.customer.fullName),
          phone: this.maskPhone(r.customer.phone),
        },
        product: r.masterProduct,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Authenticated student review list with filtering (All, 5-Star, Critical <3-Star)
   */
  async listStudentReviews(userId: string, query: QueryReviewsDto) {
    const store = await this.storesService.getMyStore(userId);
    const { page = 1, limit = 20, ratingFilter, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      storeId: store.id,
      ...(ratingFilter === "5_STAR" ? { storeRating: 5 } : {}),
      ...(ratingFilter === "CRITICAL"
        ? {
            OR: [{ storeRating: { lte: 2 } }, { deliveryRating: { lte: 2 } }, { productRating: { lte: 2 } }],
          }
        : {}),
      ...(search
        ? {
            OR: [
              { storeComment: { contains: search, mode: "insensitive" } },
              { productComment: { contains: search, mode: "insensitive" } },
              { customer: { fullName: { contains: search, mode: "insensitive" } } },
              { order: { orderNumber: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [reviews, total, allStoreReviews] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          customer: true,
          masterProduct: true,
          order: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where: { storeId: store.id },
        select: { productRating: true, storeRating: true, deliveryRating: true },
      }),
    ]);

    const breakdownTotal = allStoreReviews.length;
    let sumP = 0, sumS = 0, sumD = 0;
    const starDist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of allStoreReviews) {
      sumP += r.productRating;
      sumS += r.storeRating;
      sumD += r.deliveryRating;
      const rounded = Math.round(r.storeRating);
      if (starDist[rounded] !== undefined) starDist[rounded]++;
    }

    const breakdown = {
      totalReviews: breakdownTotal,
      averageProductRating: breakdownTotal > 0 ? Number((sumP / breakdownTotal).toFixed(1)) : 0,
      averageStoreRating: breakdownTotal > 0 ? Number((sumS / breakdownTotal).toFixed(1)) : 0,
      averageDeliveryRating: breakdownTotal > 0 ? Number((sumD / breakdownTotal).toFixed(1)) : 0,
      starDistribution: starDist,
    };

    return {
      items: reviews.map((r) => ({
        id: r.id,
        orderId: r.orderId,
        masterProductId: r.masterProductId,
        storeId: r.storeId,
        customerId: r.customerId,
        productRating: r.productRating,
        storeRating: r.storeRating,
        deliveryRating: r.deliveryRating,
        productComment: r.productComment,
        storeComment: r.storeComment,
        deliveryComment: r.deliveryComment,
        isVerified: r.isVerified,
        isPublished: r.isPublished,
        createdAt: r.createdAt.toISOString(),
        customer: {
          id: r.customer.id,
          fullName: r.customer.fullName,
          phone: r.customer.phone,
        },
        product: {
          id: r.masterProduct.id,
          title: r.masterProduct.title,
          images: r.masterProduct.masterImages,
        },
        order: {
          orderNumber: r.order.orderNumber,
          createdAt: r.order.createdAt.toISOString(),
        },
      })),
      breakdown,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Institute admin platform-wide review list
   */
  async listAdminReviews(query: QueryReviewsDto) {
    const { page = 1, limit = 20, search, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      ...(status === "PUBLISHED" ? { isPublished: true } : {}),
      ...(status === "UNPUBLISHED" ? { isPublished: false } : {}),
      ...(search
        ? {
            OR: [
              { storeComment: { contains: search, mode: "insensitive" } },
              { productComment: { contains: search, mode: "insensitive" } },
              { customer: { fullName: { contains: search, mode: "insensitive" } } },
              { store: { storeName: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          customer: true,
          masterProduct: true,
          store: true,
          order: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      items: reviews.map((r) => ({
        id: r.id,
        orderId: r.orderId,
        masterProductId: r.masterProductId,
        storeId: r.storeId,
        customerId: r.customerId,
        productRating: r.productRating,
        storeRating: r.storeRating,
        deliveryRating: r.deliveryRating,
        productComment: r.productComment,
        storeComment: r.storeComment,
        deliveryComment: r.deliveryComment,
        isVerified: r.isVerified,
        isPublished: r.isPublished,
        createdAt: r.createdAt.toISOString(),
        customer: {
          id: r.customer.id,
          fullName: r.customer.fullName,
          phone: r.customer.phone,
        },
        masterProduct: {
          id: r.masterProduct.id,
          title: r.masterProduct.title,
          sku: r.masterProduct.sku,
        },
        store: {
          id: r.store.id,
          storeName: r.store.storeName,
          slug: r.store.slug,
        },
        order: {
          orderNumber: r.order.orderNumber,
          createdAt: r.order.createdAt.toISOString(),
        },
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Institute admin moderation: toggle isPublished status
   */
  async togglePublishStatus(reviewId: string, isPublished: boolean) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException(`Review "${reviewId}" not found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const rec = await tx.review.update({
        where: { id: reviewId },
        data: { isPublished },
      });

      await this.ratingAggregator.recalculateAggregates(review.masterProductId, review.storeId, tx);

      return rec;
    });

    return updated;
  }
}
