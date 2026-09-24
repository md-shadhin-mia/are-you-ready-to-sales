import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StoresService } from "../stores/stores.service";
import { OrderStatus } from "@repo/db";

@Injectable()
export class StudentDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
  ) {}

  /**
   * Get student executive summary metrics with period-over-period growth and training progress.
   */
  async getExecutiveSummary(userId: string) {
    const store = await this.storesService.getMyStore(userId);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const validStatuses = [
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.COMPLETED,
    ];

    // Current period all-time totals
    const [
      allOrders,
      currentPeriodOrders,
      priorPeriodOrders,
      totalCustomers,
      repeatCustomers,
      productsCount,
      recentOrders,
      recentReviews,
    ] = await Promise.all([
      // 1. All valid orders
      this.prisma.order.findMany({
        where: {
          storeId: store.id,
          status: { in: validStatuses },
        },
        select: {
          totalAmount: true,
          studentNetProfit: true,
          status: true,
        },
      }),

      // 2. Orders in the last 30 days
      this.prisma.order.findMany({
        where: {
          storeId: store.id,
          status: { in: validStatuses },
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { totalAmount: true },
      }),

      // 3. Orders between 30 and 60 days ago
      this.prisma.order.findMany({
        where: {
          storeId: store.id,
          status: { in: validStatuses },
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
        select: { totalAmount: true },
      }),

      // 4. Customer counts
      this.prisma.customer.count({ where: { storeId: store.id } }),

      // 5. Repeat customer count
      this.prisma.customer.count({
        where: { storeId: store.id, totalOrdersCount: { gte: 2 } },
      }),

      // 6. Store products count for training progress
      this.prisma.storeProduct.count({ where: { storeId: store.id } }),

      // 7. Recent 5 orders
      this.prisma.order.findMany({
        where: { storeId: store.id },
        include: { customer: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // 8. Recent 5 customer reviews
      this.prisma.review.findMany({
        where: { storeId: store.id, isPublished: true },
        include: { customer: true, masterProduct: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Financial math
    const grossSales = allOrders.reduce((acc, o) => acc + Number(o.totalAmount), 0);
    const netProfit = allOrders.reduce((acc, o) => acc + Number(o.studentNetProfit), 0);
    const totalOrdersCount = allOrders.length;
    const completedOrdersCount = allOrders.filter(
      (o) => o.status === OrderStatus.DELIVERED || o.status === OrderStatus.COMPLETED,
    ).length;

    const currentPeriodSales = currentPeriodOrders.reduce(
      (acc, o) => acc + Number(o.totalAmount),
      0,
    );
    const priorPeriodSales = priorPeriodOrders.reduce(
      (acc, o) => acc + Number(o.totalAmount),
      0,
    );

    let grossSalesGrowthPercent = 0;
    if (priorPeriodSales > 0) {
      grossSalesGrowthPercent = Number(
        (((currentPeriodSales - priorPeriodSales) / priorPeriodSales) * 100).toFixed(1),
      );
    } else if (currentPeriodSales > 0) {
      grossSalesGrowthPercent = 100.0;
    }

    const profitMarginPercent =
      grossSales > 0 ? Number(((netProfit / grossSales) * 100).toFixed(1)) : 0;

    const averageOrderValue =
      totalOrdersCount > 0 ? Number((grossSales / totalOrdersCount).toFixed(0)) : 0;

    const repeatCustomerPercent =
      totalCustomers > 0
        ? Number(((repeatCustomers / totalCustomers) * 100).toFixed(1))
        : 0;

    // Training curriculum progress simulation based on commercial milestones
    const module1 = store.status === "ACTIVE" ? 100 : 80;
    const module2 = productsCount >= 3 ? 100 : productsCount > 0 ? 60 : 20;
    const module3 = completedOrdersCount >= 1 ? 100 : totalOrdersCount > 0 ? 50 : 10;
    const module4 = store.totalReviewsCount >= 1 ? 100 : 0;
    const module5 = grossSales >= 10000 ? 100 : grossSales > 0 ? 40 : 0;

    const overallCompletionPercent = Math.round(
      (module1 + module2 + module3 + module4 + module5) / 5,
    );

    return {
      grossSales,
      grossSalesGrowthPercent,
      netProfit,
      profitMarginPercent,
      totalOrders: totalOrdersCount,
      completedOrders: completedOrdersCount,
      averageOrderValue,
      activeCustomersCount: totalCustomers,
      repeatCustomerPercent,
      storeRating: Number(store.ratingAvg),
      totalReviewsCount: store.totalReviewsCount,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customer.fullName,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        studentNetProfit: Number(o.studentNetProfit),
        createdAt: o.createdAt.toISOString(),
      })),
      recentReviews: recentReviews.map((r) => ({
        id: r.id,
        productTitle: r.masterProduct.title,
        customerName: r.customer.fullName,
        productRating: r.productRating,
        storeRating: r.storeRating,
        deliveryRating: r.deliveryRating,
        productComment: r.productComment,
        createdAt: r.createdAt.toISOString(),
      })),
      trainingProgress: {
        overallCompletionPercent,
        modules: [
          {
            id: "mod-1",
            title: "Store Setup & Brand Customization",
            status: module1 === 100 ? "COMPLETED" : "IN_PROGRESS",
            progressPercent: module1,
          },
          {
            id: "mod-2",
            title: "Catalog Curation & Reseller Pricing",
            status: module2 === 100 ? "COMPLETED" : "IN_PROGRESS",
            progressPercent: module2,
          },
          {
            id: "mod-3",
            title: "Order Fulfillment & Courier Logistics",
            status: module3 === 100 ? "COMPLETED" : "IN_PROGRESS",
            progressPercent: module3,
          },
          {
            id: "mod-4",
            title: "Customer Trust, Social Proof & Reviews",
            status: module4 === 100 ? "COMPLETED" : "IN_PROGRESS",
            progressPercent: module4,
          },
          {
            id: "mod-5",
            title: "Scaling Revenue & Repeat Shoppers",
            status: module5 === 100 ? "COMPLETED" : "IN_PROGRESS",
            progressPercent: module5,
          },
        ],
      },
    };
  }

  /**
   * Get daily time-series chart data points for revenue, profit, and order count.
   */
  async getChartData(userId: string, range: "7d" | "30d" | "1y" = "30d") {
    const store = await this.storesService.getMyStore(userId);

    const daysCount = range === "7d" ? 7 : range === "1y" ? 365 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (daysCount - 1));
    startDate.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: {
        storeId: store.id,
        createdAt: { gte: startDate },
        status: {
          in: [
            OrderStatus.PAID,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
            OrderStatus.COMPLETED,
          ],
        },
      },
      select: {
        totalAmount: true,
        studentNetProfit: true,
        createdAt: true,
      },
    });

    // Group by date YYYY-MM-DD
    const dateMap = new Map<string, { revenue: number; profit: number; ordersCount: number }>();

    // Pre-populate every day in range
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dateMap.set(key, { revenue: 0, profit: 0, ordersCount: 0 });
    }

    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      const entry = dateMap.get(key);
      if (entry) {
        entry.revenue += Number(order.totalAmount);
        entry.profit += Number(order.studentNetProfit);
        entry.ordersCount += 1;
      }
    }

    const chartPoints = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue),
      profit: Math.round(data.profit),
      ordersCount: data.ordersCount,
    }));

    return chartPoints;
  }
}
