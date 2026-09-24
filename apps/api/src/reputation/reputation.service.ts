import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StoresService } from "../stores/stores.service";
import { OrderStatus } from "@repo/db";

@Injectable()
export class ReputationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
  ) {}

  /**
   * Calculate detailed reputation scorecard and composite trust metrics for a store.
   */
  async calculateStoreReputation(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store) {
      throw new NotFoundException(`Store "${storeId}" not found`);
    }

    // 1. Calculate Repeat Customer Rate
    const totalCustomers = await this.prisma.customer.count({
      where: { storeId },
    });

    const repeatCustomers = await this.prisma.customer.count({
      where: {
        storeId,
        totalOrdersCount: { gte: 2 },
      },
    });

    const repeatCustomerPercent =
      totalCustomers > 0
        ? Number(((repeatCustomers / totalCustomers) * 100).toFixed(2))
        : 0;

    // 2. Calculate Order Completion Rate
    const [allOrdersCount, completedOrdersCount, cancelledOrdersCount] =
      await Promise.all([
        this.prisma.order.count({ where: { storeId } }),
        this.prisma.order.count({
          where: {
            storeId,
            status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
          },
        }),
        this.prisma.order.count({
          where: { storeId, status: OrderStatus.CANCELLED },
        }),
      ]);

    const nonCancelledOrders = allOrdersCount - cancelledOrdersCount;
    const completionRatePercent =
      nonCancelledOrders > 0
        ? Number(((completedOrdersCount / nonCancelledOrders) * 100).toFixed(2))
        : 100;

    // 3. Review dimensions average
    const reviews = await this.prisma.review.findMany({
      where: { storeId, isPublished: true },
      select: { productRating: true, storeRating: true, deliveryRating: true },
    });

    const totalReviews = reviews.length;
    let avgStoreRating = Number(store.ratingAvg);
    let avgDeliveryRating = 5.0;
    let avgProductRating = 5.0;

    if (totalReviews > 0) {
      let sumStore = 0, sumDeliv = 0, sumProd = 0;
      for (const r of reviews) {
        sumStore += r.storeRating;
        sumDeliv += r.deliveryRating;
        sumProd += r.productRating;
      }
      avgStoreRating = Number((sumStore / totalReviews).toFixed(2));
      avgDeliveryRating = Number((sumDeliv / totalReviews).toFixed(2));
      avgProductRating = Number((sumProd / totalReviews).toFixed(2));
    }

    // 4. Composite Score: (StoreRating * 0.5) + (CompletionRate/20 * 0.3) + (RepeatCustomerRate/20 * 0.2)
    const baseStoreScore = avgStoreRating > 0 ? avgStoreRating : 5.0;
    const completionScore = completionRatePercent / 20; // 100% -> 5.0
    const repeatScore = Math.min(5.0, (repeatCustomerPercent / 20) * 2.5 + 2.5); // normalized

    const compositeScore = Number(
      (baseStoreScore * 0.5 + completionScore * 0.3 + repeatScore * 0.2).toFixed(2),
    );

    // Update store cache
    await this.prisma.store.update({
      where: { id: storeId },
      data: {
        completedOrdersCount,
        repeatCustomerPercent,
      },
    });

    // Generate actionable improvement tips
    const tips: string[] = [];
    if (completionRatePercent < 90) {
      tips.push("Your order completion rate is below 90%. Dispatching on time avoids customer cancellations.");
    }
    if (avgDeliveryRating < 4.0 && totalReviews > 0) {
      tips.push("Delivery speed rating is 4.0★ or below. Partner with reliable couriers for faster transit times.");
    }
    if (totalReviews < 5) {
      tips.push("Collect at least 5 verified customer reviews to build strong social proof for new buyers.");
    }
    if (repeatCustomerPercent > 20) {
      tips.push("Outstanding customer retention! Over 20% of your shoppers return for more purchases.");
    } else {
      tips.push("Follow up with existing customers via order SMS/notes to encourage repeat purchases.");
    }

    return {
      storeId: store.id,
      storeName: store.storeName,
      slug: store.slug,
      ratingAvg: avgStoreRating,
      totalReviewsCount: store.totalReviewsCount,
      completedOrdersCount,
      responseRatePercent: Number(store.responseRatePercent),
      repeatCustomerPercent,
      completionRatePercent,
      compositeScore,
      trustBadge: {
        badgeText: `Rated ${avgStoreRating > 0 ? avgStoreRating : "5.0"}★ by verified shoppers • ${Math.round(completionRatePercent)}% Delivery Success`,
        ratingText: `${avgStoreRating > 0 ? avgStoreRating : "5.0"} / 5.0`,
        fulfillmentRateText: `${Math.round(completionRatePercent)}% Order Completion`,
      },
      dimensionAverages: {
        product: avgProductRating,
        storeService: avgStoreRating,
        delivery: avgDeliveryRating,
      },
      tips,
    };
  }

  /**
   * Get public reputation data by store slug.
   */
  async getBySlug(slug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug: slug.toLowerCase() },
    });
    if (!store) {
      throw new NotFoundException(`Store "${slug}" not found`);
    }
    return this.calculateStoreReputation(store.id);
  }

  /**
   * Get reputation scorecard for authenticated student.
   */
  async getStudentScorecard(userId: string) {
    const store = await this.storesService.getMyStore(userId);
    return this.calculateStoreReputation(store.id);
  }
}
