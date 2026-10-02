import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { DynamicPermissionsGuard } from "../auth/dynamic-permissions.guard";
import { StoreStatus, UserRole, OrderStatus, KycStatus, PayoutStatus, Prisma } from "@repo/db";
import { maskNationalId } from "../common/masking";
import { clampPagination, paginationMeta } from "../common/pagination";
import { CampusScope, ScopedUser, resolveCampusScope } from "./campus-scope";

export const MINIMUM_PAYOUT_BDT = 500;
const KYC_AUDIT_PERMISSION = "students:kyc_audit";

type Money = number | string | Prisma.Decimal;

export interface ProfitOrder {
  orderNumber: string;
  status: OrderStatus;
  platformCommission: Money;
  paymentFee: Money;
  refundDeductions?: Money;
  items: Array<{ unitSellingPrice: Money; unitBasePrice: Money; quantity: number }>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class StudentGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly permissions: DynamicPermissionsGuard,
  ) {}

  /**
   * Retrieves a filterable, paginated list of students with their store status and metrics.
   */
  async getStudentsList(filters?: {
    search?: string;
    status?: StoreStatus;
    page?: number;
    limit?: number;
    viewer?: ScopedUser;
  }) {
    const { page, limit, skip } = clampPagination({ page: filters?.page, limit: filters?.limit });

    const where: any = {
      role: UserRole.STUDENT,
    };

    const scope = await resolveCampusScope(this.prisma, filters?.viewer);
    if (scope) {
      where.batchEnrollments = { some: { batch: { branchId: { in: scope } } } };
    }

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

  async getStudentById(id: string, viewer?: ScopedUser) {
    const student = await this.prisma.user.findUnique({
      where: { id },
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
          include: { plan: true },
        },
        batchEnrollments: {
          include: {
            batch: {
              include: { branch: true },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID "${id}" not found`);
    }

    const scope = await resolveCampusScope(this.prisma, viewer);
    if (scope && !student.batchEnrollments.some((e: any) => scope.includes(e.batch?.branchId))) {
      throw new ForbiddenException("Student is not enrolled in a campus you manage");
    }

    const { passwordHash: _passwordHash, ...profile } = student as typeof student & { passwordHash?: string };
    const canAuditKyc = await this.canAuditKyc(viewer);
    return {
      ...profile,
      nationalId: canAuditKyc ? profile.nationalId : maskNationalId(profile.nationalId),
    };
  }

  private async canAuditKyc(viewer?: ScopedUser): Promise<boolean> {
    if (!viewer) return false;
    if (viewer.role === UserRole.SUPER_ADMIN) return true;
    const granted = await this.permissions.resolveUserPermissions(viewer.id, viewer.role);
    return granted.includes("*") || granted.includes(KYC_AUDIT_PERMISSION);
  }

  /** Mandatory storefront setup before a store may go live. */
  static isStoreSetupComplete(store: { storeName?: string | null; slug?: string | null; _count?: { storeProducts: number } }) {
    return Boolean(store.storeName && store.slug && (store._count?.storeProducts ?? 0) > 0);
  }

  /**
   * KYC lifecycle PENDING -> VERIFIED | REJECTED. Verification activates DRAFT stores whose setup is complete.
   */
  async verifyKyc(studentId: string, status: KycStatus, _reviewerId?: string) {
    if (status !== KycStatus.VERIFIED && status !== KycStatus.REJECTED) {
      throw new BadRequestException("KYC decision must be VERIFIED or REJECTED");
    }

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: { stores: { include: { _count: { select: { storeProducts: true } } } } },
    });
    if (!student || student.role !== UserRole.STUDENT) {
      throw new NotFoundException(`Student with ID "${studentId}" not found`);
    }

    const verified = status === KycStatus.VERIFIED;
    const activatable = verified
      ? student.stores.filter(
          (store) => store.status === StoreStatus.DRAFT && StudentGovernanceService.isStoreSetupComplete(store),
        )
      : [];

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: studentId },
        data: { isVerified: verified, kycStatus: status },
      });
      for (const store of activatable) {
        await tx.store.update({ where: { id: store.id }, data: { status: StoreStatus.ACTIVE } });
      }
      return user;
    });

    await this.invalidateStoreCaches(activatable);

    return {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      isVerified: updated.isVerified,
      kycStatus: updated.kycStatus,
      activatedStoreIds: activatable.map((s) => s.id),
    };
  }

  /**
   * Suspension cascade, atomically: stores SUSPENDED, products hidden, pending payouts quarantined to HOLD.
   * Cart sessions are invalidated after commit by bumping each store's cart version.
   */
  async suspendStudent(studentId: string, reason: string, adminUserId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: { stores: { select: { id: true, slug: true, customDomain: true } } },
    });
    if (!student || student.role !== UserRole.STUDENT) {
      throw new NotFoundException(`Student with ID "${studentId}" not found`);
    }
    if (student.stores.length === 0) {
      throw new NotFoundException("Student has no store to suspend");
    }

    const storeIds = student.stores.map((s) => s.id);
    const { productsHidden, payoutsQuarantined } = await this.prisma.$transaction(async (tx) => {
      await tx.store.updateMany({ where: { id: { in: storeIds } }, data: { status: StoreStatus.SUSPENDED } });
      const hidden = await tx.storeProduct.updateMany({
        where: { storeId: { in: storeIds }, isVisible: true },
        data: { isVisible: false },
      });
      const held = await tx.payoutRequest.updateMany({
        where: { storeId: { in: storeIds }, status: { in: [PayoutStatus.PENDING, PayoutStatus.APPROVED] } },
        data: { status: PayoutStatus.HOLD, adminNotes: `Quarantined on suspension: ${reason}` },
      });
      return { productsHidden: hidden.count, payoutsQuarantined: held.count };
    });

    await this.invalidateStoreCaches(student.stores);
    const client = this.redis.getClient();
    await Promise.all(storeIds.map((id) => client.incr(`store:cart_version:${id}`)));

    return { studentId, suspendedStoreIds: storeIds, productsHidden, payoutsQuarantined, reason, suspendedBy: adminUserId };
  }

  /** Lifts a suspension: stores return to ACTIVE and quarantined payouts re-enter the PENDING queue. */
  async reinstateStudent(studentId: string, adminUserId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: { stores: { where: { status: StoreStatus.SUSPENDED }, select: { id: true, slug: true, customDomain: true } } },
    });
    if (!student || student.role !== UserRole.STUDENT) {
      throw new NotFoundException(`Student with ID "${studentId}" not found`);
    }
    if (student.stores.length === 0) {
      throw new BadRequestException("Student has no suspended store to reinstate");
    }

    const storeIds = student.stores.map((s) => s.id);
    const payoutsReleased = await this.prisma.$transaction(async (tx) => {
      await tx.store.updateMany({ where: { id: { in: storeIds } }, data: { status: StoreStatus.ACTIVE } });
      const released = await tx.payoutRequest.updateMany({
        where: { storeId: { in: storeIds }, status: PayoutStatus.HOLD },
        data: { status: PayoutStatus.PENDING },
      });
      return released.count;
    });

    await this.invalidateStoreCaches(student.stores);
    return { studentId, reinstatedStoreIds: storeIds, payoutsReleased, reinstatedBy: adminUserId };
  }

  private async invalidateStoreCaches(stores: Array<{ slug: string; customDomain: string | null }>) {
    for (const store of stores) {
      await this.redis.del(`tenant:slug:${store.slug}`);
      if (store.customDomain) {
        await this.redis.del(`domain_map:${store.customDomain}`);
      }
    }
  }

  /**
   * Net Profit = Σ(selling - base) - platform fee - payment fee - refund deductions, over COMPLETE orders only.
   */
  calculateNetProfit(orders: ProfitOrder[]): number {
    const uncompleted = orders.filter((o) => o.status !== OrderStatus.COMPLETE);
    if (uncompleted.length > 0) {
      throw new BadRequestException(
        `Profit can only be derived from COMPLETE orders; received ${uncompleted.map((o) => `${o.orderNumber} (${o.status})`).join(", ")}`,
      );
    }

    const total = orders.reduce((sum, order) => {
      const margin = order.items.reduce(
        (acc, item) => acc + (Number(item.unitSellingPrice) - Number(item.unitBasePrice)) * item.quantity,
        0,
      );
      return (
        sum + margin - Number(order.platformCommission) - Number(order.paymentFee) - Number(order.refundDeductions ?? 0)
      );
    }, 0);
    return round2(total);
  }

  async getProfitSummary(studentId: string, viewer?: ScopedUser) {
    await this.getStudentById(studentId, viewer);
    const student = await this.prisma.user.findUniqueOrThrow({
      where: { id: studentId },
      include: { stores: { select: { id: true } } },
    });
    const storeIds = student.stores.map((s) => s.id);

    const [completedOrders, payouts] = await Promise.all([
      this.prisma.order.findMany({
        where: { storeId: { in: storeIds }, status: OrderStatus.COMPLETE },
        include: { items: true },
      }),
      this.prisma.payoutRequest.groupBy({
        by: ["status"],
        where: { studentId },
        _sum: { amount: true },
      }),
    ]);

    const payoutTotal = (statuses: PayoutStatus[]) =>
      round2(payouts.filter((p) => statuses.includes(p.status)).reduce((sum, p) => sum + Number(p._sum.amount ?? 0), 0));

    const netProfit = this.calculateNetProfit(completedOrders);
    const totalPaidOut = payoutTotal([PayoutStatus.PROCESSED]);
    const pendingPayouts = payoutTotal([PayoutStatus.PENDING, PayoutStatus.APPROVED, PayoutStatus.HOLD]);
    const availableForPayout = round2(netProfit - totalPaidOut - pendingPayouts);
    const kycVerified = student.isVerified && student.kycStatus === KycStatus.VERIFIED;

    const ineligibilityReasons: string[] = [];
    if (!kycVerified) ineligibilityReasons.push("KYC verification is incomplete");
    if (availableForPayout < MINIMUM_PAYOUT_BDT) {
      ineligibilityReasons.push(`Available profit is below the BDT ${MINIMUM_PAYOUT_BDT} minimum payout`);
    }

    return {
      studentId,
      completedOrders: completedOrders.length,
      netProfit,
      totalPaidOut,
      pendingPayouts,
      availableForPayout,
      minimumPayout: MINIMUM_PAYOUT_BDT,
      kycVerified,
      eligibleForPayout: ineligibilityReasons.length === 0,
      ineligibilityReasons,
    };
  }

  /**
   * Consolidated student performance in a single aggregate query (see API-ARCH-TDD Module 1).
   */
  async getStudentPerformance(filters: {
    isVerified?: boolean;
    storeStatus?: StoreStatus;
    search?: string;
    page?: number | string;
    limit?: number | string;
    viewer?: ScopedUser;
  }) {
    const { page, limit, skip } = clampPagination(filters);
    const scope: CampusScope = await resolveCampusScope(this.prisma, filters.viewer);
    const search = filters.search?.trim() ? `%${filters.search.trim()}%` : null;

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        u.id, u.full_name, u.email, u.phone, u.is_verified, u.kyc_status,
        s.id AS store_id, s.store_name, s.status AS store_status,
        COALESCE(SUM(o.total_amount), 0) AS gross_sales,
        COALESCE(SUM(o.student_net_profit), 0) AS net_profit_earned,
        COALESCE((
          SELECT SUM(p.amount) FROM payout_requests p
          WHERE p.student_id = u.id AND p.status = 'PROCESSED'
        ), 0) AS total_paid_out,
        COUNT(DISTINCT o.id) AS completed_orders_count,
        COUNT(*) OVER () AS total_count
      FROM users u
      LEFT JOIN stores s ON s.student_id = u.id
      LEFT JOIN orders o ON o.store_id = s.id AND o.status = 'COMPLETE'
      WHERE u.role = 'STUDENT'
        ${filters.isVerified === undefined ? Prisma.empty : Prisma.sql`AND u.is_verified = ${filters.isVerified}`}
        ${filters.storeStatus ? Prisma.sql`AND s.status = ${filters.storeStatus}::"StoreStatus"` : Prisma.empty}
        ${search ? Prisma.sql`AND (u.full_name ILIKE ${search} OR u.email ILIKE ${search} OR u.phone ILIKE ${search})` : Prisma.empty}
        ${
          scope
            ? Prisma.sql`AND EXISTS (
                SELECT 1 FROM batch_enrollments be
                JOIN student_batches sb ON sb.id = be.batch_id
                WHERE be.student_id = u.id AND sb.branch_id = ANY(${scope}::text[]))`
            : Prisma.empty
        }
      GROUP BY u.id, s.id
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
    return {
      data: rows.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        email: r.email,
        phone: r.phone,
        isVerified: r.is_verified,
        kycStatus: r.kyc_status,
        storeId: r.store_id,
        storeName: r.store_name,
        storeStatus: r.store_status,
        grossSales: Number(r.gross_sales),
        netProfitEarned: Number(r.net_profit_earned),
        totalPaidOut: Number(r.total_paid_out),
        completedOrdersCount: Number(r.completed_orders_count),
      })),
      meta: paginationMeta(page, limit, total),
    };
  }
}
