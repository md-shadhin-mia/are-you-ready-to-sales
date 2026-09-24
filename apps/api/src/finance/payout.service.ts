import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LedgerService } from "./ledger.service";
import { PayoutMethod, PayoutStatus, OrderStatus } from "@repo/db";

import { IsNumber, IsEnum, IsObject, IsNotEmpty, IsString, IsOptional, Min } from "class-validator";

export class RequestPayoutDto {
  @IsNumber()
  @Min(500)
  amount!: number;

  @IsEnum(PayoutMethod)
  paymentMethod!: PayoutMethod;

  @IsObject()
  @IsNotEmpty()
  accountDetails!: Record<string, any>;
}

export class ApprovePayoutDto {
  @IsString()
  @IsNotEmpty()
  transactionReference!: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

@Injectable()
export class PayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

  /**
   * Retrieves student wallet summary with available balance and pending hold calculations.
   */
  async getWalletSummary(userId: string, storeId: string) {
    const currentBalance = await this.ledgerService.getStoreBalance(storeId);

    // Sum all pending or approved payouts holding funds
    const activeHolds = await this.prisma.payoutRequest.findMany({
      where: {
        storeId,
        status: { in: [PayoutStatus.PENDING, PayoutStatus.APPROVED] },
      },
      select: { amount: true },
    });

    const pendingHold = activeHolds.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    const availableBalance = Math.max(
      0,
      Math.round((currentBalance - pendingHold) * 100) / 100,
    );

    // Total withdrawn
    const processedPayouts = await this.prisma.payoutRequest.findMany({
      where: {
        storeId,
        status: PayoutStatus.PROCESSED,
      },
      select: { amount: true },
    });

    const totalWithdrawn = processedPayouts.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    // Total profits earned
    const profitEntries = await this.prisma.ledgerEntry.findMany({
      where: {
        storeId,
        entryType: "ORDER_PROFIT",
      },
      select: { amount: true },
    });

    const totalEarned = profitEntries.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    return {
      currentBalance,
      availableBalance,
      pendingHold,
      totalWithdrawn,
      totalEarned,
      minWithdrawalAmount: 500,
    };
  }

  /**
   * Submits a student withdrawal request with atomic available balance verification.
   */
  async requestPayout(userId: string, storeId: string, dto: RequestPayoutDto) {
    const amount = Number(dto.amount);
    if (!amount || amount < 500) {
      throw new BadRequestException("Minimum withdrawal amount is ৳500");
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Get current balance
      const lastEntry = await tx.ledgerEntry.findFirst({
        where: { storeId },
        orderBy: { createdAt: "desc" },
      });
      const currentBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;

      // 2. Get pending hold
      const activeHolds = await tx.payoutRequest.findMany({
        where: {
          storeId,
          status: { in: [PayoutStatus.PENDING, PayoutStatus.APPROVED] },
        },
        select: { amount: true },
      });

      const pendingHold = activeHolds.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );

      const availableBalance = Math.round((currentBalance - pendingHold) * 100) / 100;

      if (amount > availableBalance) {
        throw new BadRequestException(
          `Insufficient available balance. Requested: ৳${amount}, Available: ৳${availableBalance}`,
        );
      }

      // 3. Create payout request in PENDING state
      return tx.payoutRequest.create({
        data: {
          storeId,
          studentId: userId,
          amount,
          paymentMethod: dto.paymentMethod,
          accountDetails: dto.accountDetails || {},
          status: PayoutStatus.PENDING,
        },
      });
    });
  }

  /**
   * Approves and executes a student payout settlement with ledger debit append.
   */
  async approvePayout(
    payoutId: string,
    adminUserId: string,
    dto: ApprovePayoutDto,
  ) {
    if (!dto.transactionReference || dto.transactionReference.trim().length === 0) {
      throw new BadRequestException("Transaction reference (TrxID) is required");
    }

    const payout = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException("Payout request not found");
    }

    if (payout.status !== PayoutStatus.PENDING && payout.status !== PayoutStatus.APPROVED) {
      throw new BadRequestException(
        `Cannot approve payout with status "${payout.status}". Only PENDING or APPROVED requests can be settled.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Record immutable ledger debit
      const lastEntry = await tx.ledgerEntry.findFirst({
        where: { storeId: payout.storeId },
        orderBy: { createdAt: "desc" },
      });

      const previousBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
      const amount = Number(payout.amount);
      const balanceAfter = Math.round((previousBalance - amount) * 100) / 100;

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          storeId: payout.storeId,
          payoutRequestId: payout.id,
          entryType: "PAYOUT_WITHDRAWAL",
          amount: -amount,
          balanceAfter,
          notes: `Payout settled via ${payout.paymentMethod} (Ref: ${dto.transactionReference})`,
        },
      });

      // 2. Update payout request to PROCESSED
      const updatedPayout = await tx.payoutRequest.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.PROCESSED,
          transactionReference: dto.transactionReference,
          adminNotes: dto.adminNotes || payout.adminNotes,
          reviewedById: adminUserId,
        },
        include: {
          store: {
            select: {
              storeName: true,
              slug: true,
            },
          },
          student: {
            select: {
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      return {
        payout: updatedPayout,
        ledgerEntry,
      };
    });
  }

  /**
   * Rejects a student payout request and restores available balance.
   */
  async rejectPayout(payoutId: string, adminUserId: string, reason?: string) {
    const payout = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException("Payout request not found");
    }

    if (payout.status === PayoutStatus.PROCESSED) {
      throw new BadRequestException("Cannot reject an already processed payout");
    }

    return this.prisma.payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.REJECTED,
        adminNotes: reason || "Rejected by administrator",
        reviewedById: adminUserId,
      },
      include: {
        store: { select: { storeName: true, slug: true } },
        student: { select: { fullName: true, email: true } },
      },
    });
  }

  /**
   * Lists payout requests for administration queue.
   */
  async getAdminPayoutQueue(filters?: {
    status?: PayoutStatus;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where = filters?.status ? { status: filters.status } : {};

    const [requests, total] = await Promise.all([
      this.prisma.payoutRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          store: {
            select: {
              id: true,
              storeName: true,
              slug: true,
            },
          },
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          reviewedBy: {
            select: {
              fullName: true,
            },
          },
        },
      }),
      this.prisma.payoutRequest.count({ where }),
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves payout requests for a single student.
   */
  async getStudentPayouts(userId: string, storeId: string) {
    return this.prisma.payoutRequest.findMany({
      where: {
        studentId: userId,
        storeId,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Retrieves platform financial health overview: GMV, liabilities, fees, payouts.
   */
  async getFinanceSummary() {
    const validOrderStatuses = [
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.COMPLETED,
    ];

    const [orders, processedPayouts, stores] = await Promise.all([
      this.prisma.order.findMany({
        where: { status: { in: validOrderStatuses } },
        select: {
          totalAmount: true,
          platformCommission: true,
          studentNetProfit: true,
          totalBaseCost: true,
        },
      }),
      this.prisma.payoutRequest.findMany({
        where: { status: PayoutStatus.PROCESSED },
        select: { amount: true },
      }),
      this.prisma.store.findMany({
        select: { id: true },
      }),
    ]);

    const platformGMV = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const platformCommissions = orders.reduce(
      (sum, o) => sum + Number(o.platformCommission),
      0,
    );
    const wholesaleMargin = orders.reduce(
      (sum, o) => sum + (Number(o.totalAmount) - Number(o.totalBaseCost) - Number(o.studentNetProfit)),
      0,
    );
    const settledPayouts = processedPayouts.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    // Sum available balances across all stores as outstanding liabilities
    let totalLiabilities = 0;
    for (const s of stores) {
      const balance = await this.ledgerService.getStoreBalance(s.id);
      totalLiabilities += Math.max(0, balance);
    }

    return {
      platformGMV,
      instituteNetRevenue: platformCommissions + Math.max(0, wholesaleMargin),
      totalPlatformCommissions: platformCommissions,
      totalSettledPayouts: settledPayouts,
      outstandingStudentLiabilities: totalLiabilities,
      totalOrdersProcessed: orders.length,
    };
  }
}
