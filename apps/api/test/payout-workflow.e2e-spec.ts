import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { LedgerEntryType, PayoutMethod, PayoutStatus } from "@repo/db";

describe("Student Payout & Admin Settlement Lifecycle (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let studentToken: string;
  let studentId: string;
  let adminToken: string;
  let storeId: string;
  let createdPayoutId: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    // Login student
    const studentLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "student1@platform.local",
        password: "Password123!",
      });
    studentToken = studentLogin.body.accessToken;
    studentId = studentLogin.body.user.id;

    // Login super admin
    const adminLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "admin@platform.local",
        password: "Password123!",
      });
    adminToken = adminLogin.body.accessToken;

    const store = await prisma.store.findFirst({
      where: { studentId },
    });
    storeId = store!.id;

    // Ensure store has at least ৳10,000 ledger balance for test
    const lastLedger = await prisma.ledgerEntry.findFirst({
      where: { storeId },
      orderBy: { createdAt: "desc" },
    });
    const currentBal = lastLedger ? Number(lastLedger.balanceAfter) : 0;
    if (currentBal < 10000) {
      await prisma.ledgerEntry.create({
        data: {
          storeId,
          entryType: LedgerEntryType.ORDER_PROFIT,
          amount: 10000,
          balanceAfter: currentBal + 10000,
          notes: "Initial seed profit for payout testing",
        },
      });
    }
  });

  afterAll(async () => {
    // Clean up created payout requests
    if (storeId) {
      await prisma.ledgerEntry.deleteMany({
        where: {
          storeId,
          payoutRequest: { isNot: null },
        },
      });
      await prisma.payoutRequest.deleteMany({
        where: { storeId },
      });
    }

    await app.close();
  });

  it("1. Should retrieve student wallet summary with available balance", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/student/wallet/summary")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.availableBalance).toBeGreaterThanOrEqual(10000);
    expect(res.body.pendingHold).toBe(0);
    expect(res.body.minWithdrawalAmount).toBe(500);
  });

  it("2. Should reject payout below min amount (৳500) with 400 Bad Request", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/student/wallet/withdraw")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        amount: 250,
        paymentMethod: PayoutMethod.BKASH,
        accountDetails: { phoneNumber: "01700000000" },
      })
      .expect(400);

    expect(res.body.message).toBeDefined();
  });

  it("3. Should submit valid payout request and immediately reserve available balance hold", async () => {
    const summaryBefore = await request(app.getHttpServer())
      .get("/api/v1/student/wallet/summary")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    const initialAvailable = summaryBefore.body.availableBalance;

    const res = await request(app.getHttpServer())
      .post("/api/v1/student/wallet/withdraw")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        amount: 2000,
        paymentMethod: PayoutMethod.BKASH,
        accountDetails: { phoneNumber: "01711223344" },
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe(PayoutStatus.PENDING);
    expect(Number(res.body.amount)).toBe(2000);
    createdPayoutId = res.body.id;

    // Check that available balance dropped by 2000
    const summaryAfter = await request(app.getHttpServer())
      .get("/api/v1/student/wallet/summary")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    expect(summaryAfter.body.availableBalance).toBe(initialAvailable - 2000);
    expect(summaryAfter.body.pendingHold).toBe(2000);
  });

  it("4. Should reject payout request exceeding available balance", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/student/wallet/withdraw")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        amount: 999999,
        paymentMethod: PayoutMethod.BANK_TRANSFER,
        accountDetails: { accountNumber: "12345678" },
      })
      .expect(400);

    expect(res.body.message).toContain("Insufficient available balance");
  });

  it("5. Should allow Admin to view pending payout request in queue", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/admin/finance/payouts?status=PENDING")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.requests).toBeDefined();
    const found = res.body.requests.find((r: any) => r.id === createdPayoutId);
    expect(found).toBeDefined();
    expect(found.student.email).toBe("student1@platform.local");
  });

  it("6. Should allow Admin to approve payout, append ledger debit, and mark PROCESSED", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/finance/payouts/${createdPayoutId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        transactionReference: "BKASH-TX-2026-8812",
        adminNotes: "Disbursed via corporate bKash merchant account",
      })
      .expect(201);

    expect(res.body.payout.status).toBe(PayoutStatus.PROCESSED);
    expect(res.body.payout.transactionReference).toBe("BKASH-TX-2026-8812");

    // Ledger debit entry created
    expect(res.body.ledgerEntry).toBeDefined();
    expect(res.body.ledgerEntry.entryType).toBe(LedgerEntryType.PAYOUT_WITHDRAWAL);
    expect(Number(res.body.ledgerEntry.amount)).toBe(-2000);

    // Verify wallet summary: pending hold removed, total withdrawn increased
    const summary = await request(app.getHttpServer())
      .get("/api/v1/student/wallet/summary")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    expect(summary.body.pendingHold).toBe(0);
    expect(summary.body.totalWithdrawn).toBeGreaterThanOrEqual(2000);
  });

  it("7. Should verify student ledger statement includes withdrawal debit", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/student/wallet/statement")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.entries).toBeDefined();
    const withdrawalEntry = res.body.entries.find(
      (e: any) => e.transactionReference === "BKASH-TX-2026-8812",
    );
    expect(withdrawalEntry).toBeDefined();
    expect(withdrawalEntry.entryType).toBe(LedgerEntryType.PAYOUT_WITHDRAWAL);
    expect(withdrawalEntry.amount).toBe(-2000);
  });

  it("8. Should release hold when Admin rejects a payout request", async () => {
    // 1. Student requests ৳1,000
    const reqRes = await request(app.getHttpServer())
      .post("/api/v1/student/wallet/withdraw")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        amount: 1000,
        paymentMethod: PayoutMethod.NAGAD,
        accountDetails: { phoneNumber: "01811998877" },
      })
      .expect(201);

    const payoutToRejectId = reqRes.body.id;

    const summaryDuringHold = await request(app.getHttpServer())
      .get("/api/v1/student/wallet/summary")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);
    const availDuringHold = summaryDuringHold.body.availableBalance;

    // 2. Admin rejects request
    const rejectRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/finance/payouts/${payoutToRejectId}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        reason: "Invalid Nagad wallet number provided",
      })
      .expect(201);

    expect(rejectRes.body.status).toBe(PayoutStatus.REJECTED);

    // 3. Verify available balance is restored (hold released)
    const summaryAfterReject = await request(app.getHttpServer())
      .get("/api/v1/student/wallet/summary")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    expect(summaryAfterReject.body.availableBalance).toBe(availDuringHold + 1000);
    expect(summaryAfterReject.body.pendingHold).toBe(0);
  });
});
