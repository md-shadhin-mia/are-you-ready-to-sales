import { describe, it, expect, beforeEach, vi } from "vitest";
import { GamificationService } from "./gamification.service";
import { CAREER_LEVELS } from "./gamification.types";

describe("GamificationService Unit Tests", () => {
  let service: GamificationService;
  let mockPrisma: any;
  let mockEventEmitter: any;

  beforeEach(() => {
    mockPrisma = {
      studentLevel: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      store: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      challenge: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      studentProgress: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
    };

    mockEventEmitter = {
      emit: vi.fn(),
    };

    service = new GamificationService(mockPrisma, mockEventEmitter);
  });

  it("1. Should award Level 1 Store Starter by default with 0 requirements", async () => {
    mockPrisma.studentLevel.findUnique.mockResolvedValue(null);
    mockPrisma.studentLevel.create.mockResolvedValue({
      studentId: "student-1",
      currentLevel: 1,
      totalXp: 0,
      levelTitle: "Store Starter",
      unlockedPerks: CAREER_LEVELS[0].perks,
    });
    mockPrisma.store.findFirst.mockResolvedValue(null);

    const level = await service.recalculateStudentLevel("student-1");
    expect(level.currentLevel).toBe(1);
    expect(level.levelTitle).toBe("Store Starter");
  });

  it("2. Should promote student from Level 1 to Level 2 when XP >= 500, orders >= 1, revenue >= 1,000", async () => {
    mockPrisma.studentLevel.findUnique.mockResolvedValue({
      studentId: "student-1",
      currentLevel: 1,
      totalXp: 600,
      levelTitle: "Store Starter",
      unlockedPerks: [],
    });
    mockPrisma.store.findFirst.mockResolvedValue({
      id: "store-1",
      ratingAvg: 0,
      orders: [{ totalAmount: 1500 }],
    });
    mockPrisma.studentLevel.update.mockResolvedValue({
      studentId: "student-1",
      currentLevel: 2,
      totalXp: 600,
      levelTitle: "Product Seller",
      unlockedPerks: CAREER_LEVELS[1].perks,
    });

    const level = await service.recalculateStudentLevel("student-1");
    expect(level.currentLevel).toBe(2);
    expect(level.levelTitle).toBe("Product Seller");
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      "student.leveled_up",
      expect.objectContaining({
        studentId: "student-1",
        previousLevel: 1,
        newLevel: 2,
      }),
    );
  });

  it("3. Should DENY promotion to Level 3 if rating requirement (< 4.0) is not met", async () => {
    mockPrisma.studentLevel.findUnique.mockResolvedValue({
      studentId: "student-1",
      currentLevel: 2,
      totalXp: 3000, // Meets Level 3 XP (2000)
      levelTitle: "Product Seller",
      unlockedPerks: [],
    });
    mockPrisma.store.findFirst.mockResolvedValue({
      id: "store-1",
      ratingAvg: 3.8, // FAILS rating threshold for Level 3 (>= 4.0)
      orders: Array(15).fill({ totalAmount: 1000 }), // 15 orders, 15,000 revenue
    });

    const level = await service.recalculateStudentLevel("student-1");
    // Should remain Level 2 because rating is 3.8 (< 4.0)
    expect(level.currentLevel).toBe(2);
    expect(mockPrisma.studentLevel.update).not.toHaveBeenCalled();
  });

  it("4. Should promote to Level 3 if rating >= 4.0, orders >= 10, revenue >= 10,000, XP >= 2,000", async () => {
    mockPrisma.studentLevel.findUnique.mockResolvedValue({
      studentId: "student-1",
      currentLevel: 2,
      totalXp: 2500,
      levelTitle: "Product Seller",
      unlockedPerks: [],
    });
    mockPrisma.store.findFirst.mockResolvedValue({
      id: "store-1",
      ratingAvg: 4.6, // >= 4.0
      orders: Array(12).fill({ totalAmount: 1000 }), // 12,000 revenue
    });
    mockPrisma.studentLevel.update.mockResolvedValue({
      studentId: "student-1",
      currentLevel: 3,
      totalXp: 2500,
      levelTitle: "Active Reseller",
      unlockedPerks: CAREER_LEVELS[2].perks,
    });

    const level = await service.recalculateStudentLevel("student-1");
    expect(level.currentLevel).toBe(3);
    expect(level.levelTitle).toBe("Active Reseller");
  });

  it("5. Should claim challenge reward and prevent claiming twice", async () => {
    mockPrisma.studentProgress.findUnique.mockResolvedValue({
      id: "prog-1",
      studentId: "student-1",
      challengeId: "chal-1",
      isCompleted: true,
      isClaimed: false,
      challenge: {
        id: "chal-1",
        xpReward: 350,
      },
    });

    mockPrisma.studentProgress.updateMany.mockResolvedValue({ count: 1 });

    mockPrisma.studentLevel.findUnique.mockResolvedValue({
      studentId: "student-1",
      currentLevel: 1,
      totalXp: 450,
      levelTitle: "Store Starter",
      unlockedPerks: [],
    });

    mockPrisma.store.findFirst.mockResolvedValue(null);

    const result = await service.claimChallengeReward("student-1", "chal-1");
    expect(result.success).toBe(true);
    expect(result.claimedXp).toBe(350);

    // Second claim should throw BadRequestException
    mockPrisma.studentProgress.findUnique.mockResolvedValue({
      id: "prog-1",
      studentId: "student-1",
      challengeId: "chal-1",
      isCompleted: true,
      isClaimed: true, // Already claimed
      challenge: { id: "chal-1", xpReward: 350 },
    });

    await expect(
      service.claimChallengeReward("student-1", "chal-1"),
    ).rejects.toThrow("already been claimed");
  });
});
