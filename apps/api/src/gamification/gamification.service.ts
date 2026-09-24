import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import {
  CAREER_LEVELS,
  StudentGamificationStatus,
  LevelTierConfig,
} from "./gamification.types";

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get or create student level record
   */
  async getOrCreateStudentLevel(studentId: string) {
    let studentLevel = await this.prisma.studentLevel.findUnique({
      where: { studentId },
    });

    if (!studentLevel) {
      const baseTier = CAREER_LEVELS[0];
      studentLevel = await this.prisma.studentLevel.create({
        data: {
          studentId,
          currentLevel: baseTier.level,
          totalXp: 0,
          levelTitle: baseTier.title,
          unlockedPerks: baseTier.perks,
        },
      });
    }

    return studentLevel;
  }

  /**
   * Calculate live metrics for student stores
   */
  async getStudentStoreMetrics(studentId: string) {
    const store = await this.prisma.store.findFirst({
      where: { studentId },
      include: {
        orders: {
          where: {
            status: { in: ["DELIVERED", "COMPLETED"] },
          },
          select: {
            totalAmount: true,
          },
        },
      },
    });

    if (!store) {
      return {
        completedOrders: 0,
        grossRevenue: 0,
        ratingAvg: 0,
        storeId: null,
        storeSlug: null,
      };
    }

    const completedOrders = store.orders.length;
    const grossRevenue = store.orders.reduce(
      (sum, ord) => sum + Number(ord.totalAmount),
      0,
    );
    const ratingAvg = Number(store.ratingAvg);

    return {
      completedOrders,
      grossRevenue,
      ratingAvg,
      storeId: store.id,
      storeSlug: store.slug,
    };
  }

  /**
   * Evaluates student metrics & XP against career tier criteria
   */
  async recalculateStudentLevel(studentId: string) {
    const studentLevel = await this.getOrCreateStudentLevel(studentId);
    const metrics = await this.getStudentStoreMetrics(studentId);

    // Evaluate qualification from Level 6 down to 1
    let qualifiedTier: LevelTierConfig = CAREER_LEVELS[0];

    for (let i = CAREER_LEVELS.length - 1; i >= 0; i--) {
      const tier = CAREER_LEVELS[i];
      const xpMet = studentLevel.totalXp >= tier.minXp;
      const ordersMet = metrics.completedOrders >= tier.minOrders;
      const revenueMet = metrics.grossRevenue >= tier.minRevenue;
      const ratingMet = metrics.ratingAvg >= tier.minRating;

      if (xpMet && ordersMet && revenueMet && ratingMet) {
        qualifiedTier = tier;
        break;
      }
    }

    if (qualifiedTier.level > studentLevel.currentLevel) {
      const previousLevel = studentLevel.currentLevel;
      const updated = await this.prisma.studentLevel.update({
        where: { studentId },
        data: {
          currentLevel: qualifiedTier.level,
          levelTitle: qualifiedTier.title,
          unlockedPerks: qualifiedTier.perks,
        },
      });

      this.logger.log(
        `🏆 Student ${studentId} leveled up from ${previousLevel} to ${qualifiedTier.level} (${qualifiedTier.title})`,
      );

      this.eventEmitter.emit("student.leveled_up", {
        studentId,
        previousLevel,
        newLevel: qualifiedTier.level,
        levelTitle: qualifiedTier.title,
      });

      return updated;
    }

    return studentLevel;
  }

  /**
   * Get full gamification status for student dashboard
   */
  async getStudentStatus(studentId: string): Promise<StudentGamificationStatus> {
    const studentLevel = await this.recalculateStudentLevel(studentId);
    const metrics = await this.getStudentStoreMetrics(studentId);

    // Fetch challenges and progress
    const allChallenges = await this.prisma.challenge.findMany({
      orderBy: [{ tierLevel: "asc" }, { xpReward: "asc" }],
    });

    const studentProgresses = await this.prisma.studentProgress.findMany({
      where: { studentId },
    });

    const progressMap = new Map(
      studentProgresses.map((p) => [p.challengeId, p]),
    );

    const challenges = allChallenges.map((chal) => {
      const prog = progressMap.get(chal.id);
      return {
        id: chal.id,
        code: chal.code,
        title: chal.title,
        description: chal.description,
        tierLevel: chal.tierLevel,
        xpReward: chal.xpReward,
        badgeIcon: chal.badgeIcon,
        threshold: chal.threshold,
        currentCount: prog ? prog.currentCount : 0,
        isCompleted: prog ? prog.isCompleted : false,
        isClaimed: prog ? prog.isClaimed : false,
        completedAt: prog?.completedAt || null,
      };
    });

    // Current tier config
    const currentTier =
      CAREER_LEVELS.find((t) => t.level === studentLevel.currentLevel) ||
      CAREER_LEVELS[0];

    // Next tier calculation
    const nextTier = CAREER_LEVELS.find(
      (t) => t.level === studentLevel.currentLevel + 1,
    );

    const nextLevelData = nextTier
      ? {
          level: nextTier.level,
          title: nextTier.title,
          xpNeeded: Math.max(0, nextTier.minXp - studentLevel.totalXp),
          ordersNeeded: Math.max(
            0,
            nextTier.minOrders - metrics.completedOrders,
          ),
          revenueNeeded: Math.max(
            0,
            nextTier.minRevenue - metrics.grossRevenue,
          ),
          ratingNeeded: nextTier.minRating,
          isMaxLevel: false,
        }
      : {
          level: studentLevel.currentLevel,
          title: currentTier.title,
          xpNeeded: 0,
          ordersNeeded: 0,
          revenueNeeded: 0,
          ratingNeeded: 0,
          isMaxLevel: true,
        };

    return {
      currentLevel: studentLevel.currentLevel,
      levelTitle: studentLevel.levelTitle,
      totalXp: studentLevel.totalXp,
      commissionRate: currentTier.commissionRate,
      unlockedPerks: studentLevel.unlockedPerks,
      nextLevel: nextLevelData,
      metrics: {
        completedOrders: metrics.completedOrders,
        grossRevenue: metrics.grossRevenue,
        ratingAvg: metrics.ratingAvg,
      },
      challenges,
    };
  }

  /**
   * Claim XP reward for a completed challenge
   */
  async claimChallengeReward(studentId: string, challengeId: string) {
    const progress = await this.prisma.studentProgress.findUnique({
      where: {
        studentId_challengeId: {
          studentId,
          challengeId,
        },
      },
      include: {
        challenge: true,
      },
    });

    if (!progress) {
      throw new NotFoundException("Challenge progress record not found.");
    }

    if (!progress.isCompleted) {
      throw new BadRequestException("Challenge has not been completed yet.");
    }

    if (progress.isClaimed) {
      throw new BadRequestException("Reward for this challenge has already been claimed.");
    }

    // Mark as claimed
    await this.prisma.studentProgress.update({
      where: { id: progress.id },
      data: {
        isClaimed: true,
        claimedAt: new Date(),
      },
    });

    // Award XP
    await this.prisma.studentLevel.update({
      where: { studentId },
      data: {
        totalXp: { increment: progress.challenge.xpReward },
      },
    });

    // Check level progression
    const updatedLevel = await this.recalculateStudentLevel(studentId);

    return {
      success: true,
      claimedXp: progress.challenge.xpReward,
      newTotalXp: updatedLevel.totalXp,
      currentLevel: updatedLevel.currentLevel,
      levelTitle: updatedLevel.levelTitle,
    };
  }

  /**
   * Intercept domain events and update challenge progress
   */
  async recordEventProgress(
    studentId: string,
    eventName: string,
    countDelta: number = 1,
    metadata: { grossRevenue?: number; rating?: number; discountUsed?: boolean } = {},
  ) {
    const challenges = await this.prisma.challenge.findMany({
      where: { requiredEvent: eventName },
    });

    if (challenges.length === 0) return;

    for (const chal of challenges) {
      const existing = await this.prisma.studentProgress.findUnique({
        where: {
          studentId_challengeId: {
            studentId,
            challengeId: chal.id,
          },
        },
      });

      if (existing && existing.isCompleted) {
        continue; // Already finished
      }

      let newCount = (existing?.currentCount || 0) + countDelta;

      if (eventName === "revenue.threshold" && metadata.grossRevenue !== undefined) {
        newCount = Math.floor(metadata.grossRevenue);
      } else if (eventName === "rating.milestone" && metadata.rating !== undefined) {
        newCount = metadata.rating >= 4.5 ? 1 : 0;
      }

      const isCompleted = newCount >= chal.threshold;
      const completedAt = isCompleted ? new Date() : null;

      await this.prisma.studentProgress.upsert({
        where: {
          studentId_challengeId: {
            studentId,
            challengeId: chal.id,
          },
        },
        update: {
          currentCount: newCount,
          ...(isCompleted ? { isCompleted: true, completedAt } : {}),
        },
        create: {
          studentId,
          challengeId: chal.id,
          currentCount: newCount,
          isCompleted,
          completedAt,
        },
      });

      if (isCompleted && !existing?.isCompleted) {
        this.logger.log(
          `✨ Challenge completed: ${chal.title} (${chal.code}) by student ${studentId}`,
        );
        this.eventEmitter.emit("challenge.completed", {
          studentId,
          challengeId: chal.id,
          code: chal.code,
          title: chal.title,
          xpReward: chal.xpReward,
        });
      }
    }

    // Re-evaluate student level in case non-XP metrics upgraded them
    await this.recalculateStudentLevel(studentId);
  }

  /**
   * Admin: List all challenges
   */
  async listAllChallenges() {
    return this.prisma.challenge.findMany({
      orderBy: [{ tierLevel: "asc" }, { xpReward: "asc" }],
    });
  }

  /**
   * Admin: Get gamification overview & student level distribution
   */
  async getGamificationOverview() {
    const studentLevels = await this.prisma.studentLevel.findMany();
    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
    };

    let totalXpAwarded = 0;
    studentLevels.forEach((sl) => {
      distribution[sl.currentLevel] = (distribution[sl.currentLevel] || 0) + 1;
      totalXpAwarded += sl.totalXp;
    });

    const totalChallenges = await this.prisma.challenge.count();
    const totalCompletions = await this.prisma.studentProgress.count({
      where: { isCompleted: true },
    });

    return {
      totalStudents: studentLevels.length,
      totalXpAwarded,
      totalChallenges,
      totalCompletions,
      levelDistribution: distribution,
      tiers: CAREER_LEVELS,
    };
  }
}
