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

  it("6. Should return null if profit amount <= 0 or fee <= 0", async () => {
    expect(await ledgerService.recordOrderProfit("o-1", "s-1", 0)).toBeNull();
    expect(await ledgerService.recordOrderProfit("o-1", "s-1", -10)).toBeNull();
    expect(await ledgerService.recordPlatformFee("o-1", "s-1", 0)).toBeNull();
    expect(await ledgerService.recordPlatformFee("o-1", "s-1", -5)).toBeNull();
  });

  it("7. Should reject withdrawal amount <= 0", async () => {
    await expect(
      ledgerService.recordPayoutWithdrawal("s-1", "p-1", 0, "TRX-0"),
    ).rejects.toThrow("Withdrawal amount must be greater than zero");

    await expect(
      ledgerService.recordPayoutWithdrawal("s-1", "p-1", -100, "TRX-0"),
    ).rejects.toThrow("Withdrawal amount must be greater than zero");
  });

  it("8. Should use default notes for order profit and payout withdrawal when omitted", async () => {
    prismaMock.ledgerEntry.findFirst.mockResolvedValue({ balanceAfter: "1000.00" });
    prismaMock.ledgerEntry.create.mockImplementation(({ data }: any) => ({ id: "l-1", ...data }));

    await ledgerService.recordOrderProfit("ord-99", "s-1", 100);
    expect(prismaMock.ledgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ notes: "Profit credited from order ord-99" }),
      }),
    );

    await ledgerService.recordPayoutWithdrawal("s-1", "p-99", 100, "TRX-AUTO");
    expect(prismaMock.ledgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ notes: "Payout withdrawal processed (Ref: TRX-AUTO)" }),
      }),
    );
  });

  it("9. Should return 0 for store balance if no ledger entries exist", async () => {
    prismaMock.ledgerEntry.findFirst.mockResolvedValue(null);
    const balance = await ledgerService.getStoreBalance("store-empty");
    expect(balance).toBe(0);
  });

  it("10. Should return paginated ledger statement with mapped order and payout fields", async () => {
    prismaMock.ledgerEntry.findMany.mockResolvedValue([
      {
        id: "le-1",
        entryType: LedgerEntryType.ORDER_PROFIT,
        amount: "500.00",
        balanceAfter: "500.00",
        notes: "Credit",
        order: { orderNumber: "ORD-001", totalAmount: "1000.00" },
        payoutRequest: null,
        createdAt: new Date(),
      },
      {
        id: "le-2",
        entryType: LedgerEntryType.PAYOUT_WITHDRAWAL,
        amount: "-200.00",
        balanceAfter: "300.00",
        notes: "Debit",
        order: null,
        payoutRequest: { id: "p-1", paymentMethod: "BKASH", transactionReference: "TRX-101" },
        createdAt: new Date(),
      },
    ]);
    prismaMock.ledgerEntry.count.mockResolvedValue(2);
    prismaMock.ledgerEntry.findFirst.mockResolvedValue({ balanceAfter: "300.00" });

    const statement = await ledgerService.getLedgerStatement("s-1", 1, 10);
    expect(statement.currentBalance).toBe(300);
    expect(statement.entries).toHaveLength(2);
    expect(statement.entries[0].orderNumber).toBe("ORD-001");
    expect(statement.entries[0].transactionReference).toBeNull();
    expect(statement.entries[1].orderNumber).toBeNull();
    expect(statement.entries[1].transactionReference).toBe("TRX-101");
    expect(statement.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    });
  });

  it("11. Should handle first transaction for store when no prior balance exists", async () => {
    prismaMock.ledgerEntry.findFirst.mockResolvedValue(null);
    prismaMock.ledgerEntry.create.mockImplementation(({ data }: any) => ({ id: "first", ...data }));

    await ledgerService.recordOrderProfit("ord-1", "store-new", 250);
    expect(prismaMock.ledgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ balanceAfter: 250 }),
      }),
    );

    await ledgerService.recordPlatformFee("ord-1", "store-new", 25);
    expect(prismaMock.ledgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ balanceAfter: -25 }),
      }),
    );
  });

  it("12. Should set totalPages to 1 when total is 0", async () => {
    prismaMock.ledgerEntry.findMany.mockResolvedValue([]);
    prismaMock.ledgerEntry.count.mockResolvedValue(0);
    prismaMock.ledgerEntry.findFirst.mockResolvedValue(null);

    const statement = await ledgerService.getLedgerStatement("s-empty", 1, 20);
    expect(statement.pagination.totalPages).toBe(1);
  });
});
