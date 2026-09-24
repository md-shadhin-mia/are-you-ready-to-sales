import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { GamificationService } from "./gamification.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class GamificationListener {
  private readonly logger = new Logger(GamificationListener.name);

  constructor(
    private readonly gamificationService: GamificationService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent("store.created")
  async handleStoreCreated(payload: { storeId: string; studentId: string }) {
    try {
      this.logger.log(`Handling store.created for student ${payload.studentId}`);
      await this.gamificationService.recordEventProgress(
        payload.studentId,
        "store.created",
        1,
      );
    } catch (err: any) {
      this.logger.error(`Error in store.created listener: ${err.message}`);
    }
  }

  @OnEvent("store.product.added")
  async handleProductAdded(payload: { storeId: string; studentId?: string }) {
    try {
      let studentId = payload.studentId;
      if (!studentId && payload.storeId) {
        const store = await this.prisma.store.findUnique({
          where: { id: payload.storeId },
          select: { studentId: true },
        });
        studentId = store?.studentId;
      }

      if (studentId) {
        this.logger.log(`Handling store.product.added for student ${studentId}`);
        await this.gamificationService.recordEventProgress(
          studentId,
          "store.product.added",
          1,
        );
      }
    } catch (err: any) {
      this.logger.error(`Error in store.product.added listener: ${err.message}`);
    }
  }

  @OnEvent("store.published")
  async handleStorePublished(payload: { storeId: string; studentId?: string }) {
    try {
      let studentId = payload.studentId;
      if (!studentId && payload.storeId) {
        const store = await this.prisma.store.findUnique({
          where: { id: payload.storeId },
          select: { studentId: true },
        });
        studentId = store?.studentId;
      }

      if (studentId) {
        this.logger.log(`Handling store.published for student ${studentId}`);
        await this.gamificationService.recordEventProgress(
          studentId,
          "store.published",
          1,
        );
      }
    } catch (err: any) {
      this.logger.error(`Error in store.published listener: ${err.message}`);
    }
  }

  @OnEvent("order.delivered")
  async handleOrderDelivered(payload: {
    storeId: string;
    studentId?: string;
    orderId?: string;
    discountAmount?: number;
  }) {
    try {
      const store = await this.prisma.store.findUnique({
        where: { id: payload.storeId },
        include: {
          orders: {
            where: { status: { in: ["DELIVERED", "COMPLETED"] } },
            select: { totalAmount: true },
          },
        },
      });

      const studentId = payload.studentId || store?.studentId;
      if (!studentId) return;

      this.logger.log(`Handling order.delivered for student ${studentId}`);

      // 1. Increment completed order count challenge
      await this.gamificationService.recordEventProgress(
        studentId,
        "order.delivered",
        1,
      );

      // 2. Check if a promo discount coupon was used
      if (payload.discountAmount && payload.discountAmount > 0) {
        await this.gamificationService.recordEventProgress(
          studentId,
          "promo.redeemed",
          1,
        );
      }

      // 3. Update cumulative gross revenue milestones
      const totalRevenue = store?.orders
        ? store.orders.reduce((sum, ord) => sum + Number(ord.totalAmount), 0)
        : 0;

      await this.gamificationService.recordEventProgress(
        studentId,
        "revenue.threshold",
        0,
        { grossRevenue: totalRevenue },
      );
    } catch (err: any) {
      this.logger.error(`Error in order.delivered listener: ${err.message}`);
    }
  }

  @OnEvent("review.received")
  async handleReviewReceived(payload: { storeId: string; orderId?: string }) {
    try {
      const store = await this.prisma.store.findUnique({
        where: { id: payload.storeId },
        select: { studentId: true, ratingAvg: true },
      });

      if (!store) return;

      const studentId = store.studentId;
      this.logger.log(`Handling review.received for student ${studentId}`);

      // 1. First review received challenge
      await this.gamificationService.recordEventProgress(
        studentId,
        "review.received",
        1,
      );

      // 2. Rating milestone (e.g. >= 4.5)
      await this.gamificationService.recordEventProgress(
        studentId,
        "rating.milestone",
        0,
        { rating: Number(store.ratingAvg) },
      );
    } catch (err: any) {
      this.logger.error(`Error in review.received listener: ${err.message}`);
    }
  }
}
