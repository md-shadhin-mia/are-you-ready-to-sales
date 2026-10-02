import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all publicly available subscription plan tiers.
   */
  async getPublicPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: "asc" },
    });
  }

  /**
   * Retrieves active subscription and quota metrics for a student.
   */
  async getStudentSubscription(studentId: string) {
    let sub = await this.prisma.studentSubscription.findUnique({
      where: { studentId },
      include: { plan: true },
    });

    // Auto-provision FREE tier if not present
    if (!sub) {
      const freePlan = await this.prisma.subscriptionPlan.findUnique({
        where: { code: "FREE" },
      });

      if (freePlan) {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        sub = await this.prisma.studentSubscription.create({
          data: {
            studentId,
            planId: freePlan.id,
            status: "ACTIVE",
            currentPeriodStart: new Date(),
            currentPeriodEnd: oneYearFromNow,
          },
          include: { plan: true },
        });
      }
    }

    if (!sub) {
      throw new NotFoundException("Subscription plan configuration not found");
    }

    // Determine current usage metrics
    const store = await this.prisma.store.findFirst({
      where: { studentId },
    });

    const currentProductCount = store
      ? await this.prisma.storeProduct.count({ where: { storeId: store.id } })
      : 0;

    return {
      subscription: {
        id: sub.id,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
      },
      plan: sub.plan,
      usage: {
        currentProductCount,
        maxProducts: sub.plan.maxProducts,
        allowCustomDomain: sub.plan.allowCustomDomain,
        platformCommissionPercent: Number(sub.plan.platformCommissionPercent),
      },
    };
  }

  /**
   * Upgrades student subscription tier.
   */
  async upgradeSubscription(studentId: string, planCode: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { code: planCode.toUpperCase() },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription plan "${planCode}" not found`);
    }

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const subscription = await this.prisma.studentSubscription.upsert({
      where: { studentId },
      update: {
        planId: plan.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: oneYearFromNow,
      },
      create: {
        studentId,
        planId: plan.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: oneYearFromNow,
      },
      include: { plan: true },
    });

    return {
      success: true,
      message: `Successfully upgraded to ${plan.name}`,
      subscription,
    };
  }

  /**
   * Validates if a student's store has product slots remaining under active subscription plan.
   */
  async checkProductQuota(studentId: string, storeId: string) {
    const subData = await this.getStudentSubscription(studentId);
    const plan = subData.plan;

    const count = await this.prisma.storeProduct.count({
      where: { storeId },
    });

    if (count >= plan.maxProducts) {
      throw new ForbiddenException(
        `Plan product limit reached (${plan.maxProducts} max products on ${plan.name}). Please upgrade your plan to import more products.`,
      );
    }

    return true;
  }

  /**
   * Validates if custom domain mapping is unlocked by student's active subscription tier.
   */
  async checkCustomDomainAllowed(studentId: string) {
    const subData = await this.getStudentSubscription(studentId);
    if (!subData.plan.allowCustomDomain) {
      throw new ForbiddenException(
        `Custom domain mapping is not allowed on ${subData.plan.name}. Please upgrade to Professional or Business plan.`,
      );
    }

    return true;
  }
}
