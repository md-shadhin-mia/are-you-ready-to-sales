import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { LedgerEntryType, PayoutStatus, StoreStatus, UserRole } from "@repo/db";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapApp, createUser, loginAs, uid } from "./helpers/e2e-app";

describe("Payments & Settlements (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: string;
  let orderManager: string;
  const storeIds: string[] = [];
  const userIds: string[] = [];

  const api = () => request(app.getHttpServer());
  const key = () => `disburse-${uid()}-${uid()}`;

  async function walletWithBalance(balance: number) {
    const student = await createUser(app, { role: UserRole.STUDENT });
    userIds.push(student.id);
    const store = await prisma.store.create({
      data: {
        studentId: student.id,
        storeName: "Payout Store",
        slug: `pay-${uid()}`,
        status: StoreStatus.ACTIVE,
        ledgerEntries: { create: [{ entryType: LedgerEntryType.ORDER_PROFIT, amount: balance, balanceAfter: balance }] },
      },
    });
    storeIds.push(store.id);
    const payout = (amount: number, status: PayoutStatus = PayoutStatus.PENDING) =>
      prisma.payoutRequest.create({
        data: { storeId: store.id, studentId: student.id, amount, status, paymentMethod: "BKASH", accountDetails: { number: "017" } },
      });
    return { store, payout };
  }

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    admin = await loginAs(app, "instituteAdmin");
    orderManager = await loginAs(app, "orderManager");
  });

  afterAll(async () => {
    const payouts = await prisma.payoutRequest.findMany({ where: { storeId: { in: storeIds } }, select: { id: true } });
    await prisma.journalEntry.deleteMany({ where: { referenceId: { in: payouts.map((p) => p.id) } } });
    await prisma.ledgerEntry.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.payoutRequest.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.paymentGatewayConfig.deleteMany({ where: { provider: { startsWith: "E2E" } } });
    await app.close();
  });

  it("POST /payouts/:id/disburse appends ledger + journal entries and returns a voucher", async () => {
    const { store, payout } = await walletWithBalance(1000);
    const p = await payout(600);

    const res = await api()
      .post(`/api/v1/admin/finance/payouts/${p.id}/disburse`)
      .set("Authorization", `Bearer ${admin}`)
      .set("Idempotency-Key", key())
      .send({ adminNotes: "Weekly settlement" })
      .expect(200);

    expect(res.body.voucher.voucherNumber).toMatch(/^PV-\d{4}-\d{6}$/);
    expect(res.body.payout.status).toBe(PayoutStatus.PROCESSED);
    const last = await prisma.ledgerEntry.findFirstOrThrow({ where: { storeId: store.id }, orderBy: { createdAt: "desc" } });
    expect(Number(last.balanceAfter)).toBe(400);

    const journal = await prisma.journalEntry.findMany({ where: { transactionId: res.body.voucher.voucherNumber } });
    expect(journal).toHaveLength(2);
    const debit = journal.reduce((s, j) => s + Number(j.debit), 0);
    const credit = journal.reduce((s, j) => s + Number(j.credit), 0);
    expect(debit).toBe(600);
    expect(credit).toBe(600);
  });

  it("requires an Idempotency-Key and replays retries without paying twice", async () => {
    const { store, payout } = await walletWithBalance(2000);
    const p = await payout(700);
    const url = `/api/v1/admin/finance/payouts/${p.id}/disburse`;

    await api().post(url).set("Authorization", `Bearer ${admin}`).send({}).expect(400);

    const k = key();
    const first = await api().post(url).set("Authorization", `Bearer ${admin}`).set("Idempotency-Key", k).send({}).expect(200);
    const retry = await api().post(url).set("Authorization", `Bearer ${admin}`).set("Idempotency-Key", k).send({}).expect(200);
    expect(retry.body.voucher.voucherNumber).toBe(first.body.voucher.voucherNumber);
    expect(
      await prisma.ledgerEntry.count({ where: { storeId: store.id, entryType: LedgerEntryType.PAYOUT_WITHDRAWAL } }),
    ).toBe(1);
  });

  it("concurrent disbursements exceeding the wallet let exactly one through (409 InsufficientFunds)", async () => {
    const { store, payout } = await walletWithBalance(1000);
    const a = await payout(700);
    const b = await payout(700);

    const results = await Promise.all(
      [a, b].map((p) =>
        api()
          .post(`/api/v1/admin/finance/payouts/${p.id}/disburse`)
          .set("Authorization", `Bearer ${admin}`)
          .set("Idempotency-Key", key())
          .send({}),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(results.find((r) => r.status === 409)!.body.message).toMatch(/insufficient funds/i);
    const last = await prisma.ledgerEntry.findFirstOrThrow({ where: { storeId: store.id }, orderBy: { createdAt: "desc" } });
    expect(Number(last.balanceAfter)).toBe(300);
  });

  it("quarantined (HOLD) payouts cannot be disbursed; order managers are forbidden", async () => {
    const { payout } = await walletWithBalance(5000);
    const held = await payout(600, PayoutStatus.HOLD);
    await api()
      .post(`/api/v1/admin/finance/payouts/${held.id}/disburse`)
      .set("Authorization", `Bearer ${admin}`)
      .set("Idempotency-Key", key())
      .send({})
      .expect(409);
    await api()
      .post(`/api/v1/admin/finance/payouts/${held.id}/disburse`)
      .set("Authorization", `Bearer ${orderManager}`)
      .set("Idempotency-Key", key())
      .send({})
      .expect(403);
  });

  it("payment methods: credentials are encrypted at rest and write-only over the API", async () => {
    const provider = `E2E_${uid()}`.toUpperCase();
    const saved = await api()
      .put(`/api/v1/admin/finance/payment-methods/${provider}`)
      .set("Authorization", `Bearer ${admin}`)
      .send({ displayName: "E2E Gateway", mode: "SANDBOX", isActive: true, credentials: { apiKey: "pk_live_abc", apiSecret: "sk_live_xyz" } })
      .expect(200);
    expect(saved.body).toMatchObject({ provider, credentialKeys: ["apiKey", "apiSecret"], isActive: true });

    const row = await prisma.paymentGatewayConfig.findUniqueOrThrow({ where: { provider } });
    expect(row.encryptedCredentials).not.toContain("sk_live_xyz");

    const list = await api().get("/api/v1/admin/finance/payment-methods").set("Authorization", `Bearer ${admin}`).expect(200);
    expect(JSON.stringify(list.body)).not.toContain("sk_live_xyz");
    expect(JSON.stringify(list.body)).not.toContain("encryptedCredentials");

    await api().get("/api/v1/admin/finance/payment-methods").set("Authorization", `Bearer ${orderManager}`).expect(403);
  });
});
