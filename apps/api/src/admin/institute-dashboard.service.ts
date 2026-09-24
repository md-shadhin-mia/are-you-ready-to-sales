import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OrderStatus, StoreStatus, UserRole } from "@repo/db";

@Injectable()
export class InstituteDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes executive-level KPIs for the Institute command center.
   */
  async getExecutiveKpis() {
    const validStatuses = [
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.COMPLETED,
    ];

    const [
      validOrders,
      allStores,
      students,
      backlogOrdersCount,
      processedPayouts,
    ] = await Promise.all([
      // 1. All commercially valid orders
      this.prisma.order.findMany({
        where: { status: { in: validStatuses } },
        select: {
          totalAmount: true,
          totalBaseCost: true,
          platformCommission: true,
          studentNetProfit: true,
          status: true,
          createdAt: true,
        },
      }),

      // 2. All stores for status counts
      this.prisma.store.findMany({
        select: {
          id: true,
          status: true,
          ratingAvg: true,
        },
      }),

      // 3. Students
      this.prisma.user.findMany({
        where: { role: UserRole.STUDENT },
        select: { id: true, isVerified: true },
      }),

      // 4. Warehouse order backlog count (paid or processing pending fulfillment)
      this.prisma.order.count({
        where: {
          status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] },
        },
      }),

      // 5. Total processed payouts
      this.prisma.payoutRequest.findMany({
        where: { status: "PROCESSED" },
        select: { amount: true },
      }),
    ]);

    const platformGMV = validOrders.reduce(
      (sum, o) => sum + Number(o.totalAmount),
      0,
    );

    const platformCommissions = validOrders.reduce(
      (sum, o) => sum + Number(o.platformCommission),
      0,
    );

    const wholesaleMargins = validOrders.reduce(
      (sum, o) =>
        sum +
        Math.max(
          0,
          Number(o.totalAmount) -
            Number(o.totalBaseCost) -
            Number(o.studentNetProfit),
        ),
      0,
    );

    const instituteNetRevenue = platformCommissions + wholesaleMargins;

    const activeStoresCount = allStores.filter(
      (s) => s.status === StoreStatus.ACTIVE,
    ).length;
    const suspendedStoresCount = allStores.filter(
      (s) => s.status === StoreStatus.SUSPENDED,
    ).length;
    const draftStoresCount = allStores.filter(
      (s) => s.status === StoreStatus.DRAFT,
    ).length;

    // Calculate total student liabilities (sum of positive balanceAfter from latest ledger entries)
    const latestLedgers = await this.prisma.ledgerEntry.findMany({
      distinct: ["storeId"],
      orderBy: { createdAt: "desc" },
      select: { storeId: true, balanceAfter: true },
    });

    const totalLiabilities = latestLedgers.reduce((sum, l) => {
      const bal = Number(l.balanceAfter);
      return bal > 0 ? sum + bal : sum;
    }, 0);

    const totalSettledPayouts = processedPayouts.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    // 30-day daily GMV chart
    const dailyMap: Record<string, { gmv: number; orders: number }> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split("T")[0];
      dailyMap[dateKey] = { gmv: 0, orders: 0 };
    }

    for (const order of validOrders) {
      const dateKey = order.createdAt.toISOString().split("T")[0];
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].gmv += Number(order.totalAmount);
        dailyMap[dateKey].orders += 1;
      }
    }

    const dailyTrends = Object.entries(dailyMap).map(([date, data]) => ({
      date,
      gmv: Math.round(data.gmv * 100) / 100,
      orders: data.orders,
    }));

    return {
      platformGMV: Math.round(platformGMV * 100) / 100,
      instituteNetRevenue: Math.round(instituteNetRevenue * 100) / 100,
      platformCommissions: Math.round(platformCommissions * 100) / 100,
      wholesaleMargins: Math.round(wholesaleMargins * 100) / 100,
      totalOrdersCount: validOrders.length,
      warehouseBacklogCount: backlogOrdersCount,
      outstandingStudentLiabilities: Math.round(totalLiabilities * 100) / 100,
      totalSettledPayouts: Math.round(totalSettledPayouts * 100) / 100,
      students: {
        total: students.length,
        verified: students.filter((s) => s.isVerified).length,
      },
      stores: {
        total: allStores.length,
        active: activeStoresCount,
        suspended: suspendedStoresCount,
        draft: draftStoresCount,
      },
      dailyTrends,
    };
  }
}
