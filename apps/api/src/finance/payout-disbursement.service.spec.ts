import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConflictException } from "@nestjs/common";
import { PayoutStatus } from "@repo/db";
import { InsufficientFundsException, PayoutService } from "./payout.service";

describe("Payout disbursement (Unit)", () => {
  let prisma: any;
  let sequences: any;
  let service: PayoutService;
  let lockStatements: string[];
  let payout: any;

  beforeEach(() => {
    lockStatements = [];
    payout = {
      id: "po-1",
      storeId: "s-1",
      amount: "600.00",
      status: PayoutStatus.PENDING,
      paymentMethod: "BKASH",
      createdAt: new Date("2026-01-02"),
    };
    prisma = {
      $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
        const sql = strings.join("?");
        lockStatements.push(sql);
        if (sql.includes("payout_requests")) return [{ id: payout.id }];
        return [{ id: "s-1" }];
      }),
      payoutRequest: {
        findUnique: vi.fn(async () => payout),
        aggregate: vi.fn().mockResolvedValue({ _sum: { amount: null } }),
        update: vi.fn(async ({ data }: any) => ({ ...payout, ...data })),
      },
      ledgerEntry: {
        findFirst: vi.fn().mockResolvedValue({ balanceAfter: "1000.00" }),
        create: vi.fn(async ({ data }: any) => ({ id: "le-1", ...data })),
      },
      journalEntry: { createMany: vi.fn(), findMany: vi.fn(async () => []) },
      $transaction: vi.fn(async (cb: any) => cb(prisma)),
    };
    sequences = { next: vi.fn().mockResolvedValue("PV-2026-000001") };
    service = new PayoutService(prisma, {} as any, sequences);
  });

  it("locks the payout and store rows with SELECT ... FOR UPDATE", async () => {
    await service.disburse("po-1", "admin-1", {});
    expect(lockStatements).toHaveLength(2);
    expect(lockStatements.every((sql) => /FOR UPDATE/.test(sql))).toBe(true);
  });

  it("appends a balanced double-entry pair and a wallet ledger debit", async () => {
    const result = await service.disburse("po-1", "admin-1", {});

    const [{ data: lines }] = prisma.journalEntry.createMany.mock.calls[0];
    expect(lines).toEqual([
      expect.objectContaining({ account: "STUDENT_WALLET:s-1", debit: 600, credit: 0, transactionId: "PV-2026-000001" }),
      expect.objectContaining({ account: "PLATFORM_DISBURSEMENT_CLEARING", debit: 0, credit: 600, transactionId: "PV-2026-000001" }),
    ]);
    const debits = lines.reduce((s: number, l: any) => s + l.debit, 0);
    const credits = lines.reduce((s: number, l: any) => s + l.credit, 0);
    expect(debits).toBe(credits);

    expect(prisma.ledgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ entryType: "PAYOUT_WITHDRAWAL", amount: -600, balanceAfter: 400 }),
    });
    expect(result.voucher).toMatchObject({ voucherNumber: "PV-2026-000001", amount: 600 });
    expect(prisma.payoutRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: PayoutStatus.PROCESSED, voucherNumber: "PV-2026-000001" }),
      }),
    );
  });

  it("fails with InsufficientFundsException when balance minus earlier pending withdrawals is short", async () => {
    prisma.payoutRequest.aggregate.mockResolvedValue({ _sum: { amount: "700.00" } });
    await expect(service.disburse("po-1", "admin-1", {})).rejects.toBeInstanceOf(InsufficientFundsException);
    expect(prisma.ledgerEntry.create).not.toHaveBeenCalled();
    expect(prisma.journalEntry.createMany).not.toHaveBeenCalled();
  });

  it("fails when the wallet itself is short", async () => {
    prisma.ledgerEntry.findFirst.mockResolvedValue({ balanceAfter: "599.99" });
    await expect(service.disburse("po-1", "admin-1", {})).rejects.toBeInstanceOf(InsufficientFundsException);
  });

  it("only counts withdrawals queued before this one against the balance", async () => {
    await service.disburse("po-1", "admin-1", {});
    expect(prisma.payoutRequest.aggregate).toHaveBeenCalledWith({
      where: {
        storeId: "s-1",
        id: { not: "po-1" },
        status: { in: [PayoutStatus.PENDING, PayoutStatus.APPROVED] },
        createdAt: { lt: payout.createdAt },
      },
      _sum: { amount: true },
    });
  });

  it("refuses to disburse quarantined or already processed payouts", async () => {
    payout.status = PayoutStatus.HOLD;
    await expect(service.disburse("po-1", "admin-1", {})).rejects.toBeInstanceOf(ConflictException);
    payout.status = PayoutStatus.PROCESSED;
    await expect(service.disburse("po-1", "admin-1", {})).rejects.toBeInstanceOf(ConflictException);
  });
});
