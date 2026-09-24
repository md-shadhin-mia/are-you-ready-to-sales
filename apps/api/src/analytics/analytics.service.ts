import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FunnelEventDto } from "./dto/analytics.dto";

export interface CoachingAdvice {
  diagnosis: string;
  message: string;
  actionType: string;
  actionLabel: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface FunnelMetricsResult {
  visitors: number;
  productViews: number;
  addToCarts: number;
  checkoutsInitiated: number;
  completedOrders: number;
  conversionRatePercent: number;
  averageOrderValue: number;
  cartAbandonmentPercent: number;
  stageDropOffs: {
    visitorToViewDropOff: number;
    viewToCartDropOff: number;
    cartToCheckoutDropOff: number;
    checkoutToOrderDropOff: number;
  };
  range: string;
  coachingAdvice: CoachingAdvice;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to fetch student store
   */
  private async getStudentStore(studentId: string) {
    const store = await this.prisma.store.findFirst({
      where: { studentId },
    });

    if (!store) {
      throw new NotFoundException("Student does not have an active store.");
    }

    return store;
  }

  /**
   * Public beacon: record visitor funnel action
   */
  async recordFunnelEvent(storeSlug: string, dto: FunnelEventDto) {
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug },
      select: { id: true },
    });

    if (!store) {
      throw new NotFoundException(`Store "${storeSlug}" not found.`);
    }

    const event = await this.prisma.storeFunnelEvent.create({
      data: {
        storeId: store.id,
        sessionId: dto.sessionId,
        eventType: dto.eventType,
        entityId: dto.entityId || null,
        metadata: dto.metadata || {},
      },
    });

    return { success: true, eventId: event.id };
  }

  /**
   * Calculate date range boundary
   */
  private getStartDate(range: string = "30d"): Date {
    const now = new Date();
    if (range === "7d") {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    if (range === "90d") {
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  /**
   * Get funnel metrics and coaching diagnosis for student store
   */
  async getFunnelMetrics(
    studentId: string,
    range: string = "30d",
  ): Promise<FunnelMetricsResult> {
    const store = await this.getStudentStore(studentId);
    const startDate = this.getStartDate(range);

    // Fetch funnel events
    const events = await this.prisma.storeFunnelEvent.findMany({
      where: {
        storeId: store.id,
        createdAt: { gte: startDate },
      },
      select: {
        sessionId: true,
        eventType: true,
      },
    });

    // Count distinct visitors (sessions with at least 1 PAGE_VIEW)
    const visitorSessions = new Set<string>();
    let productViews = 0;
    let addToCarts = 0;
    let checkoutsInitiated = 0;
    let completedOrdersFromEvents = 0;

    events.forEach((ev) => {
      if (ev.eventType === "PAGE_VIEW") {
        visitorSessions.add(ev.sessionId);
      } else if (ev.eventType === "PRODUCT_VIEW") {
        productViews++;
      } else if (ev.eventType === "ADD_TO_CART") {
        addToCarts++;
      } else if (ev.eventType === "CHECKOUT_INITIATED") {
        checkoutsInitiated++;
      } else if (ev.eventType === "ORDER_COMPLETED") {
        completedOrdersFromEvents++;
      }
    });

    // Also count completed orders in this range from orders table
    const orders = await this.prisma.order.findMany({
      where: {
        storeId: store.id,
        createdAt: { gte: startDate },
        status: { notIn: ["CANCELLED", "REFUNDED", "RETURNED"] },
      },
      select: {
        totalAmount: true,
        status: true,
      },
    });

    const completedOrders = Math.max(orders.length, completedOrdersFromEvents);
    const totalRevenue = orders.reduce(
      (sum, ord) => sum + Number(ord.totalAmount),
      0,
    );

    const visitors = Math.max(visitorSessions.size, completedOrders > 0 ? 1 : 0);

    // Calculate rates
    const conversionRatePercent =
      visitors > 0
        ? Math.round(((completedOrders / visitors) * 100) * 100) / 100
        : 0;

    const averageOrderValue =
      completedOrders > 0
        ? Math.round((totalRevenue / completedOrders) * 100) / 100
        : 0;

    const cartAbandonmentPercent =
      addToCarts > 0
        ? Math.round(
            (Math.max(0, addToCarts - checkoutsInitiated) / addToCarts) * 100 * 100,
          ) / 100
        : 0;

    // Drop-offs
    const visitorToViewDropOff =
      visitors > 0
        ? Math.max(0, Math.round(((visitors - Math.min(visitors, productViews)) / visitors) * 100))
        : 0;

    const viewToCartDropOff =
      productViews > 0
        ? Math.max(0, Math.round(((productViews - Math.min(productViews, addToCarts)) / productViews) * 100))
        : 0;

    const cartToCheckoutDropOff =
      addToCarts > 0
        ? Math.max(0, Math.round(((addToCarts - Math.min(addToCarts, checkoutsInitiated)) / addToCarts) * 100))
        : 0;

    const checkoutToOrderDropOff =
      checkoutsInitiated > 0
        ? Math.max(0, Math.round(((checkoutsInitiated - Math.min(checkoutsInitiated, completedOrders)) / checkoutsInitiated) * 100))
        : 0;

    const coachingAdvice = this.generateCoachingAdvice({
      visitors,
      productViews,
      addToCarts,
      checkoutsInitiated,
      completedOrders,
      conversionRatePercent,
      cartAbandonmentPercent,
      repeatCustomerPercent: Number(store.repeatCustomerPercent || 0),
    });

    return {
      visitors,
      productViews,
      addToCarts,
      checkoutsInitiated,
      completedOrders,
      conversionRatePercent,
      averageOrderValue,
      cartAbandonmentPercent,
      stageDropOffs: {
        visitorToViewDropOff,
        viewToCartDropOff,
        cartToCheckoutDropOff,
        checkoutToOrderDropOff,
      },
      range,
      coachingAdvice,
    };
  }

  /**
   * Rule-based diagnostic engine
   */
  generateCoachingAdvice(metrics: {
    visitors: number;
    productViews: number;
    addToCarts: number;
    checkoutsInitiated: number;
    completedOrders: number;
    conversionRatePercent: number;
    cartAbandonmentPercent: number;
    repeatCustomerPercent?: number;
  }): CoachingAdvice {
    const {
      visitors,
      productViews,
      addToCarts,
      checkoutsInitiated,
      completedOrders,
      conversionRatePercent,
      repeatCustomerPercent = 0,
    } = metrics;

    // Rule 1: High cart abandonment (Cart-to-Checkout < 20% with >= 5 carts)
    const cartToCheckoutRate =
      addToCarts > 0 ? (checkoutsInitiated / addToCarts) * 100 : 100;

    if (addToCarts >= 5 && cartToCheckoutRate < 20) {
      return {
        diagnosis: "High Cart Abandonment",
        message:
          "High cart abandonment detected. Shoppers are adding items to their bag but stopping before checkout. Consider creating a promo coupon or offering free shipping to bridge the gap.",
        actionType: "CREATE_COUPON",
        actionLabel: "Create a Discount Coupon",
        priority: "HIGH",
      };
    }

    // Rule 2: Low product page engagement (View-to-Cart < 5% with >= 20 views)
    const viewToCartRate =
      productViews > 0 ? (addToCarts / productViews) * 100 : 100;

    if (productViews >= 20 && viewToCartRate < 5) {
      return {
        diagnosis: "Low Engagement on Product Details",
        message:
          "Visitors are viewing your products but rarely adding them to their cart. Enhance your product titles, add detailed specifications, and highlight fast delivery.",
        actionType: "OPTIMIZE_PRODUCTS",
        actionLabel: "Optimize Product Descriptions",
        priority: "HIGH",
      };
    }

    // Rule 3: High traffic but low conversion (< 1% with > 100 visitors)
    if (visitors >= 100 && conversionRatePercent < 1.0) {
      return {
        diagnosis: "Price Competitiveness Review",
        message:
          "Your store has healthy visitor traffic, but few completed orders. Inspect your selling prices against competitor benchmarks to ensure your markup is appealing.",
        actionType: "REVIEW_PRICING",
        actionLabel: "Review Selling Prices",
        priority: "HIGH",
      };
    }

    // Rule 4: Outstanding loyalty (Repeat customer rate > 25%)
    if (repeatCustomerPercent > 25.0) {
      return {
        diagnosis: "Outstanding Customer Loyalty",
        message:
          "Over 25% of your buyers are returning customers! Capitalize on this trust by launching tracked referral links and loyalty discount codes.",
        actionType: "REFERRAL_CAMPAIGN",
        actionLabel: "Generate Referral Links",
        priority: "MEDIUM",
      };
    }

    // Rule 5: Low overall traffic (< 30 visitors)
    if (visitors < 30) {
      return {
        diagnosis: "Top-of-Funnel Traffic Needed",
        message:
          "Your store has low traffic volume. Drive targeted potential buyers by sharing your store link with friends, social networks, and community groups.",
        actionType: "SHARE_STORE",
        actionLabel: "Copy Store Link & Share",
        priority: "MEDIUM",
      };
    }

    // Rule 6: Balanced healthy funnel
    return {
      diagnosis: "Balanced Funnel Performance",
      message:
        "Your conversion funnel is performing steadily across all stages. Keep building momentum by adding trending items from the wholesale catalog and running seasonal banners.",
      actionType: "ADD_PRODUCTS",
      actionLabel: "Explore Wholesale Catalog",
      priority: "LOW",
    };
  }
}
