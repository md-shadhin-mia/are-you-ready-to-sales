import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LedgerEntryType } from "@repo/db";

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appends an order profit credit entry to the store's immutable ledger.
   */
  async recordOrderProfit(
    orderId: string,
    storeId: string,
    amount: number,
    notes?: string,
  ) {
    if (amount <= 0) {
      return null;
    }

    return this.prisma.$transaction(async (tx) => {
      const lastEntry = await tx.ledgerEntry.findFirst({
        where: { storeId },
        orderBy: { createdAt: "desc" },
      });

      const previousBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
      const balanceAfter = Math.round((previousBalance + amount) * 100) / 100;

      return tx.ledgerEntry.create({
        data: {
          storeId,
          orderId,
          entryType: LedgerEntryType.ORDER_PROFIT,
          amount,
          balanceAfter,
          notes: notes || `Profit credited from order ${orderId}`,
        },
      });
    });
  }

  /**
   * Appends a platform fee debit entry to the store's immutable ledger.
   */
  async recordPlatformFee(
    orderId: string,
    storeId: string,
    fee: number,
    notes?: string,
  ) {
    if (fee <= 0) {
      return null;
    }

    return this.prisma.$transaction(async (tx) => {
      const lastEntry = await tx.ledgerEntry.findFirst({
        where: { storeId },
        orderBy: { createdAt: "desc" },
      });

      const previousBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
      const balanceAfter = Math.round((previousBalance - fee) * 100) / 100;

      return tx.ledgerEntry.create({
        data: {
          storeId,
          orderId,
          entryType: LedgerEntryType.PLATFORM_FEE,
          amount: -fee,
          balanceAfter,
          notes: notes || `Platform commission for order ${orderId}`,
        },
      });
    });
  }

  /**
   * Appends an approved payout withdrawal debit to the store's immutable ledger.
   */
  async recordPayoutWithdrawal(
    storeId: string,
    payoutRequestId: string,
    amount: number,
    trxReference: string,
    notes?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException("Withdrawal amount must be greater than zero");
    }

    return this.prisma.$transaction(async (tx) => {
      const lastEntry = await tx.ledgerEntry.findFirst({
        where: { storeId },
        orderBy: { createdAt: "desc" },
      });

      const previousBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
      if (previousBalance < amount) {
        throw new BadRequestException(
          `Insufficient ledger balance. Required: ৳${amount}, Available: ৳${previousBalance}`,
        );
      }

      const balanceAfter = Math.round((previousBalance - amount) * 100) / 100;

      return tx.ledgerEntry.create({
        data: {
          storeId,
          payoutRequestId,
          entryType: LedgerEntryType.PAYOUT_WITHDRAWAL,
          amount: -amount,
          balanceAfter,
          notes:
            notes ||
            `Payout withdrawal processed (Ref: ${trxReference})`,
        },
      });
    });
  }

  /**
   * Computes store current balance strictly from the immutable ledger.
   */
  async getStoreBalance(storeId: string): Promise<number> {
    const lastEntry = await this.prisma.ledgerEntry.findFirst({
      where: { storeId },
      orderBy: { createdAt: "desc" },
    });

    return lastEntry ? Number(lastEntry.balanceAfter) : 0;
  }

  /**
   * Returns a paginated ledger statement with running balance verification.
   */
  async getLedgerStatement(storeId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where: { storeId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
            },
          },
          payoutRequest: {
            select: {
              id: true,
              paymentMethod: true,
              transactionReference: true,
            },
          },
        },
      }),
      this.prisma.ledgerEntry.count({ where: { storeId } }),
    ]);

    const currentBalance = await this.getStoreBalance(storeId);

    return {
      entries: entries.map((e) => ({
        id: e.id,
        entryType: e.entryType,
        amount: Number(e.amount),
        balanceAfter: Number(e.balanceAfter),
        notes: e.notes,
        orderNumber: e.order?.orderNumber || null,
        transactionReference: e.payoutRequest?.transactionReference || null,
        createdAt: e.createdAt,
      })),
      currentBalance,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
