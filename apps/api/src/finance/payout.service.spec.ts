import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PayoutMethod, PayoutStatus, OrderStatus } from "@repo/db";
import { PayoutService } from "./payout.service";

describe("PayoutService (Unit)", () => {
  let prisma: any;
  let ledgerService: any;
  let sequences: any;
  let service: PayoutService;

  beforeEach(() => {
    prisma = {
      payoutRequest: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
      },
      ledgerEntry: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      journalEntry: {
        createMany: vi.fn(),
      },
      order: {
        findMany: vi.fn(),
      },
      store: {
        findMany: vi.fn(),
      },
      $queryRaw: vi.fn().mockResolvedValue([{ id: "p-1" }]),
      $transaction: vi.fn(async (cb: any) => cb(prisma)),
    };
    ledgerService = {
      getStoreBalance: vi.fn().mockResolvedValue(1500),
    };
    sequences = {
      next: vi.fn().mockResolvedValue("PV-2026-000001"),
    };
    service = new PayoutService(prisma, ledgerService, sequences);
  });

  describe("getWalletSummary", () => {
    it("calculates balances, pending holds, total withdrawn and total earned", async () => {
      ledgerService.getStoreBalance.mockResolvedValue(5000);
      prisma.payoutRequest.findMany
        .mockResolvedValueOnce([{ amount: "1000" }, { amount: "500" }]) // active holds
        .mockResolvedValueOnce([{ amount: "2000" }]); // processed payouts
      prisma.ledgerEntry.findMany.mockResolvedValueOnce([
        { amount: "4000" },
        { amount: "3000" },
      ]); // order profits

      const summary = await service.getWalletSummary("u-1", "s-1");
      expect(summary).toEqual({
        currentBalance: 5000,
        availableBalance: 3500, // 5000 - 1500
        pendingHold: 1500,
        totalWithdrawn: 2000,
        totalEarned: 7000,
        minWithdrawalAmount: 500,
      });
    });

    it("clamps availableBalance to 0 if pending holds exceed current balance", async () => {
      ledgerService.getStoreBalance.mockResolvedValue(1000);
      prisma.payoutRequest.findMany
        .mockResolvedValueOnce([{ amount: "1500" }]) // active holds > currentBalance
        .mockResolvedValueOnce([]);
      prisma.ledgerEntry.findMany.mockResolvedValueOnce([]);

      const summary = await service.getWalletSummary("u-1", "s-1");
      expect(summary.availableBalance).toBe(0);
      expect(summary.pendingHold).toBe(1500);
    });
  });

  describe("requestPayout", () => {
    it("throws BadRequestException if amount is less than 500", async () => {
      await expect(
        service.requestPayout("u-1", "s-1", {
          amount: 400,
          paymentMethod: PayoutMethod.BKASH,
          accountDetails: { walletNumber: "01711223344" },
        }),
      ).rejects.toThrow("Minimum withdrawal amount is ৳500");
    });

    it("throws BadRequestException if requested amount exceeds available balance", async () => {
      prisma.ledgerEntry.findFirst.mockResolvedValue({ balanceAfter: "1000.00" });
      prisma.payoutRequest.findMany.mockResolvedValue([{ amount: "600.00" }]); // available = 400

      await expect(
        service.requestPayout("u-1", "s-1", {
          amount: 500,
          paymentMethod: PayoutMethod.BKASH,
          accountDetails: { walletNumber: "01711223344" },
        }),
      ).rejects.toThrow("Insufficient available balance");
    });

    it("creates payout request in PENDING state when balance is sufficient", async () => {
      prisma.ledgerEntry.findFirst.mockResolvedValue({ balanceAfter: "2000.00" });
      prisma.payoutRequest.findMany.mockResolvedValue([]);
      prisma.payoutRequest.create.mockResolvedValue({
        id: "po-new",
        storeId: "s-1",
        studentId: "u-1",
        amount: 800,
        status: PayoutStatus.PENDING,
      });

      const result = await service.requestPayout("u-1", "s-1", {
        amount: 800,
        paymentMethod: PayoutMethod.NAGAD,
        accountDetails: { walletNumber: "01811223344" },
      });

      expect(prisma.payoutRequest.create).toHaveBeenCalledWith({
        data: {
          storeId: "s-1",
          studentId: "u-1",
          amount: 800,
          paymentMethod: PayoutMethod.NAGAD,
          accountDetails: { walletNumber: "01811223344" },
          status: PayoutStatus.PENDING,
        },
      });
      expect(result.id).toBe("po-new");
    });
  });

  describe("approvePayout", () => {
    it("throws BadRequestException when transaction reference is missing or empty", async () => {
      await expect(
        service.approvePayout("po-1", "admin-1", { transactionReference: "" }),
      ).rejects.toThrow("Transaction reference (TrxID) is required");

      await expect(
        service.approvePayout("po-1", "admin-1", { transactionReference: "   " }),
      ).rejects.toThrow("Transaction reference (TrxID) is required");
    });

    it("delegates to disburse when transaction reference is provided", async () => {
      const disburseSpy = vi.spyOn(service, "disburse").mockResolvedValue({
        payout: { id: "po-1", status: PayoutStatus.PROCESSED } as any,
        ledgerEntry: {} as any,
        voucher: {} as any,
      });

      const res = await service.approvePayout("po-1", "admin-1", {
        transactionReference: "TRX-123",
        adminNotes: "Approved",
      });

      expect(disburseSpy).toHaveBeenCalledWith("po-1", "admin-1", {
        transactionReference: "TRX-123",
        adminNotes: "Approved",
      });
      expect(res.payout.status).toBe(PayoutStatus.PROCESSED);
    });
  });

  describe("rejectPayout", () => {
    it("throws NotFoundException if payout request does not exist", async () => {
      prisma.payoutRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectPayout("po-missing", "admin-1", "Invalid account"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws BadRequestException if payout is already processed", async () => {
      prisma.payoutRequest.findUnique.mockResolvedValue({
        id: "po-1",
        status: PayoutStatus.PROCESSED,
      });

      await expect(
        service.rejectPayout("po-1", "admin-1", "Too late"),
      ).rejects.toThrow("Cannot reject an already processed payout");
    });

    it("updates status to REJECTED with default or custom reason", async () => {
      prisma.payoutRequest.findUnique.mockResolvedValue({
        id: "po-1",
        status: PayoutStatus.PENDING,
      });
      prisma.payoutRequest.update.mockResolvedValue({
        id: "po-1",
        status: PayoutStatus.REJECTED,
        adminNotes: "Rejected by administrator",
      });

      const res = await service.rejectPayout("po-1", "admin-1");
      expect(prisma.payoutRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "po-1" },
          data: expect.objectContaining({
            status: PayoutStatus.REJECTED,
            adminNotes: "Rejected by administrator",
            reviewedById: "admin-1",
          }),
        }),
      );
      expect(res.status).toBe(PayoutStatus.REJECTED);
    });
  });

  describe("getAdminPayoutQueue", () => {
    it("lists payouts with status filter and computes pagination", async () => {
      prisma.payoutRequest.findMany.mockResolvedValue([{ id: "po-1" }]);
      prisma.payoutRequest.count
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1); // pending count

      const queue = await service.getAdminPayoutQueue({
        status: PayoutStatus.PENDING,
        page: 2,
        limit: 10,
      });

      expect(prisma.payoutRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: PayoutStatus.PENDING },
          skip: 10,
          take: 10,
        }),
      );
      expect(queue.pendingCount).toBe(1);
      expect(queue.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it("lists all payouts with default page and limit when filters are omitted", async () => {
      prisma.payoutRequest.findMany.mockResolvedValue([]);
      prisma.payoutRequest.count.mockResolvedValue(0);

      const queue = await service.getAdminPayoutQueue();
      expect(prisma.payoutRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          skip: 0,
          take: 20,
        }),
      );
      expect(queue.pagination.page).toBe(1);
      expect(queue.pagination.limit).toBe(20);
    });
  });

  describe("getStudentPayouts", () => {
    it("returns payout requests belonging to student and store", async () => {
      prisma.payoutRequest.findMany.mockResolvedValue([{ id: "po-1" }]);

      const payouts = await service.getStudentPayouts("u-1", "s-1");
      expect(prisma.payoutRequest.findMany).toHaveBeenCalledWith({
        where: { studentId: "u-1", storeId: "s-1" },
        orderBy: { createdAt: "desc" },
      });
      expect(payouts).toHaveLength(1);
    });
  });

  describe("getFinanceSummary", () => {
    it("calculates platform financial metrics and liabilities correctly", async () => {
      prisma.order.findMany.mockResolvedValue([
        {
          totalAmount: "1000",
          platformCommission: "100",
          studentNetProfit: "200",
          totalBaseCost: "600",
        },
        {
          totalAmount: "2000",
          platformCommission: "200",
          studentNetProfit: "400",
          totalBaseCost: "1200",
        },
      ]);
      prisma.payoutRequest.findMany.mockResolvedValue([
        { amount: "500" },
        { amount: "300" },
      ]);
      prisma.store.findMany.mockResolvedValue([{ id: "s-1" }, { id: "s-2" }]);
      ledgerService.getStoreBalance
        .mockResolvedValueOnce(1200)
        .mockResolvedValueOnce(-50); // negative liability ignored

      const summary = await service.getFinanceSummary();
      expect(summary).toEqual({
        platformGMV: 3000,
        instituteNetRevenue: 300 + 300 + 300, // commissions (300) + wholesaleMargin (200 + 400 = 600? wait: totalAmount (1000) - totalBaseCost (600) - studentNetProfit (200) = 200; order 2: 2000 - 1200 - 400 = 400; wholesaleMargin = 600; 300 + 600 = 900)
        totalPlatformCommissions: 300,
        totalSettledPayouts: 800,
        outstandingStudentLiabilities: 1200,
        totalOrdersProcessed: 2,
      });
    });
  });
});
