import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { StoreStatus, UserRole, OrderStatus } from "@repo/db";

@Injectable()
export class StudentGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Retrieves a filterable, paginated list of students with their store status and metrics.
   */
  async getStudentsList(filters?: {
    search?: string;
    status?: StoreStatus;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      role: UserRole.STUDENT,
    };

    if (filters?.search) {
      const q = filters.search.trim();
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        {
          stores: {
            some: {
              storeName: { contains: q, mode: "insensitive" },
            },
          },
        },
      ];
    }

    if (filters?.status) {
      where.stores = {
        some: { status: filters.status },
      };
    }

    const [students, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          stores: {
            include: {
              _count: {
                select: {
                  storeProducts: true,
                  orders: true,
                  reviews: true,
                },
              },
            },
          },
          studentLevel: true,
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const formatted = students.map((s) => {
      const primaryStore = s.stores[0] || null;
      return {
        id: s.id,
        fullName: s.fullName,
        email: s.email,
        phone: s.phone,
        isVerified: s.isVerified,
        createdAt: s.createdAt,
        level: s.studentLevel
          ? {
              level: s.studentLevel.currentLevel,
              title: s.studentLevel.levelTitle,
              xp: s.studentLevel.totalXp,
            }
          : { level: 1, title: "Store Starter", xp: 0 },
        subscription: s.subscription
          ? {
              planName: s.subscription.plan.name,
              planCode: s.subscription.plan.code,
              status: s.subscription.status,
            }
          : { planName: "Free Plan", planCode: "FREE", status: "ACTIVE" },
        store: primaryStore
          ? {
              id: primaryStore.id,
              name: primaryStore.storeName,
              slug: primaryStore.slug,
              customDomain: primaryStore.customDomain,
              status: primaryStore.status,
              ratingAvg: Number(primaryStore.ratingAvg),
              totalReviews: primaryStore.totalReviewsCount,
              completedOrders: primaryStore.completedOrdersCount,
              productsCount: primaryStore._count.storeProducts,
            }
          : null,
      };
    });

    return {
      students: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Suspends, reactivates, or changes status of a student store.
   */
  async updateStoreStatus(
    storeId: string,
    status: StoreStatus,
    reason?: string,
    adminUserId?: string,
  ) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException("Store not found");
    }

    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: { status },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Invalidate Redis tenant cache
    await this.redis.del(`tenant:slug:${store.slug}`);
    if (store.customDomain) {
      await this.redis.del(`domain_map:${store.customDomain}`);
    }

    return {
      store: updated,
      reason: reason || `Store status changed to ${status}`,
      updatedBy: adminUserId,
    };
  }

  /**
   * Evaluates seller scorecard and platform leaderboard.
   */
  async getSellerScorecard() {
    const validStatuses = [
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.COMPLETED,
    ];

    const stores = await this.prisma.store.findMany({
      where: { status: { in: [StoreStatus.ACTIVE, StoreStatus.SUSPENDED] } },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        orders: {
          where: { status: { in: validStatuses } },
          select: {
            totalAmount: true,
            status: true,
          },
        },
        reviews: {
          select: {
            storeRating: true,
          },
        },
      },
    });

    const leaderboard = stores.map((s) => {
      const grossSales = s.orders.reduce(
        (sum, o) => sum + Number(o.totalAmount),
        0,
      );

      return {
        storeId: s.id,
        storeName: s.storeName,
        slug: s.slug,
        studentName: s.student.fullName,
        studentEmail: s.student.email,
        status: s.status,
        ratingAvg: Number(s.ratingAvg),
        totalReviewsCount: s.totalReviewsCount,
        completedOrdersCount: s.completedOrdersCount,
        grossSales: Math.round(grossSales * 100) / 100,
        responseRatePercent: Number(s.responseRatePercent),
      };
    });

    // Sort by gross sales descending
    leaderboard.sort((a, b) => b.grossSales - a.grossSales);

    return leaderboard;
  }
}
