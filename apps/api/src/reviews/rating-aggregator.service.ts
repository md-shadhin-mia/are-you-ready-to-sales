import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@repo/db";

@Injectable()
export class RatingAggregatorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Atomically recalculates rating aggregates for both MasterProduct and Store.
   * Can accept an existing Prisma transaction client for atomicity.
   */
  async recalculateAggregates(
    masterProductId: string,
    storeId: string,
    txClient?: Prisma.TransactionClient,
  ): Promise<{ productAvg: number; storeAvg: number; totalProductReviews: number; totalStoreReviews: number }> {
    const db = txClient || this.prisma;

    // 1. Recalculate Master Product Rating
    const productStats = await db.review.aggregate({
      where: {
        masterProductId,
        isPublished: true,
      },
      _avg: {
        productRating: true,
      },
      _count: {
        id: true,
      },
    });

    const productAvg = Number((productStats._avg.productRating || 0).toFixed(2));
    const totalProductReviews = productStats._count.id;

    await db.masterProduct.update({
      where: { id: masterProductId },
      data: {
        ratingAvg: productAvg,
        totalReviewsCount: totalProductReviews,
      },
    });

    // 2. Recalculate Store Rating (evaluating storeRating)
    const storeStats = await db.review.aggregate({
      where: {
        storeId,
        isPublished: true,
      },
      _avg: {
        storeRating: true,
      },
      _count: {
        id: true,
      },
    });

    const storeAvg = Number((storeStats._avg.storeRating || 0).toFixed(2));
    const totalStoreReviews = storeStats._count.id;

    await db.store.update({
      where: { id: storeId },
      data: {
        ratingAvg: storeAvg,
        totalReviewsCount: totalStoreReviews,
      },
    });

    return {
      productAvg,
      storeAvg,
      totalProductReviews,
      totalStoreReviews,
    };
  }

  /**
   * Get tri-dimensional breakdown (Product, Store, Delivery) and star meter for a given product or store.
   */
  async getProductBreakdown(masterProductId: string, storeId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        masterProductId,
        storeId,
        isPublished: true,
      },
      select: {
        productRating: true,
        storeRating: true,
        deliveryRating: true,
      },
    });

    const total = reviews.length;
    if (total === 0) {
      return {
        totalReviews: 0,
        averageProductRating: 0,
        averageStoreRating: 0,
        averageDeliveryRating: 0,
        starDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const starDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sumProduct = 0;
    let sumStore = 0;
    let sumDelivery = 0;

    for (const r of reviews) {
      sumProduct += r.productRating;
      sumStore += r.storeRating;
      sumDelivery += r.deliveryRating;
      const rounded = Math.round(r.productRating);
      if (starDistribution[rounded] !== undefined) {
        starDistribution[rounded]++;
      }
    }

    return {
      totalReviews: total,
      averageProductRating: Number((sumProduct / total).toFixed(1)),
      averageStoreRating: Number((sumStore / total).toFixed(1)),
      averageDeliveryRating: Number((sumDelivery / total).toFixed(1)),
      starDistribution,
    };
  }
}
