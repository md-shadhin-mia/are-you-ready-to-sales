import { describe, it, expect, beforeEach, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { LedgerService } from "./ledger.service";
import { LedgerEntryType } from "@repo/db";

describe("LedgerService Invariants (Unit)", () => {
  let ledgerService: LedgerService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      ledgerEntry: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(prismaMock);
      }),
    };

    ledgerService = new LedgerService(prismaMock as any);
  });

  it("1. Should correctly credit order profit and increment balance", async () => {
    prismaMock.ledgerEntry.findFirst.mockResolvedValue({
      balanceAfter: "1200.00",
    });

    prismaMock.ledgerEntry.create.mockImplementation(({ data }: any) => ({
      id: "ledger-1",
      ...data,
      createdAt: new Date(),
    }));

    const result = await ledgerService.recordOrderProfit(
      "order-101",
      "store-1",
      350.5,
      "Profit from order",
    );

    expect(result).toBeDefined();
    expect(prismaMock.ledgerEntry.create).toHaveBeenCalledWith({
      data: {
        storeId: "store-1",
        orderId: "order-101",
        entryType: LedgerEntryType.ORDER_PROFIT,
        amount: 350.5,
        balanceAfter: 1550.5,
        notes: "Profit from order",
      },
    });
  });

  it("2. Should debit platform fee and decrement balance", async () => {
    prismaMock.ledgerEntry.findFirst.mockResolvedValue({
      balanceAfter: "2000.00",
    });

    prismaMock.ledgerEntry.create.mockImplementation(({ data }: any) => ({
      id: "ledger-2",
      ...data,
      createdAt: new Date(),
    }));

    await ledgerService.recordPlatformFee("order-102", "store-1", 50.0);

    expect(prismaMock.ledgerEntry.create).toHaveBeenCalledWith({
      data: {
        storeId: "store-1",
        orderId: "order-102",
        entryType: LedgerEntryType.PLATFORM_FEE,
        amount: -50.0,
        balanceAfter: 1950.0,
        notes: "Platform commission for order order-102",
      },
    });
  });

  it("3. Should reject payout withdrawal when amount exceeds current balance", async () => {
    prismaMock.ledgerEntry.findFirst.mockResolvedValue({
      balanceAfter: "500.00",
    });

    await expect(
      ledgerService.recordPayoutWithdrawal(
        "store-1",
        "payout-1",
        1000.0,
        "TRX-001",
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      ledgerService.recordPayoutWithdrawal(
        "store-1",
        "payout-1",
        1000.0,
        "TRX-001",
      ),
    ).rejects.toThrow("Insufficient ledger balance");
  });

  it("4. Should record approved withdrawal debit with linked payoutRequestId", async () => {
    prismaMock.ledgerEntry.findFirst.mockResolvedValue({
      balanceAfter: "5000.00",
    });

    prismaMock.ledgerEntry.create.mockImplementation(({ data }: any) => ({
      id: "ledger-3",
      ...data,
    }));

    await ledgerService.recordPayoutWithdrawal(
      "store-1",
      "payout-99",
      2000.0,
      "BKASH-12345",
      "Processed via bKash",
    );

    expect(prismaMock.ledgerEntry.create).toHaveBeenCalledWith({
      data: {
        storeId: "store-1",
        payoutRequestId: "payout-99",
        entryType: LedgerEntryType.PAYOUT_WITHDRAWAL,
        amount: -2000.0,
        balanceAfter: 3000.0,
        notes: "Processed via bKash",
      },
    });
  });

  it("5. Strict Invariant: Ledger entries cannot be updated or deleted", () => {
    // Verified that LedgerService exposes no update or delete operations on ledgerEntry
    expect((ledgerService as any).updateLedgerEntry).toBeUndefined();
    expect((ledgerService as any).deleteLedgerEntry).toBeUndefined();
  });
});
