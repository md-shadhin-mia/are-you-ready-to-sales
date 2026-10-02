import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { KycStatus, OrderStatus, PayoutStatus, StoreStatus, UserRole } from "@repo/db";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapApp, createMasterProduct, createUser, loginAs, uid } from "./helpers/e2e-app";

describe("Student Governance (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tokens: Record<string, string> = {};
  const created = { userIds: [] as string[], storeIds: [] as string[], productIds: [] as string[], branchIds: [] as string[] };

  async function createStudentWithStore(status: StoreStatus = StoreStatus.DRAFT) {
    const student = await createUser(app, { role: UserRole.STUDENT, nationalId: "1990123456789" });
    const product = await createMasterProduct(prisma);
    const store = await prisma.store.create({
      data: {
        studentId: student.id,
        storeName: `Governance Store ${uid()}`,
        slug: `gov-${uid()}`,
        status,
        storeProducts: { create: [{ masterProductId: product.id, sellingPrice: 800, isVisible: true }] },
      },
    });
    created.userIds.push(student.id);
    created.storeIds.push(store.id);
    created.productIds.push(product.id);
    return { student, store, product };
  }

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    for (const persona of ["superAdmin", "instituteAdmin", "student", "seller", "branchManager"] as const) {
      tokens[persona] = await loginAs(app, persona);
    }
  });

  afterAll(async () => {
    const storeIds = created.storeIds;
    await prisma.ledgerEntry.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.payoutRequest.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.orderItem.deleteMany({ where: { order: { storeId: { in: storeIds } } } });
    await prisma.order.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.customer.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
    await prisma.branch.deleteMany({ where: { id: { in: created.branchIds } } });
    await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
    await prisma.masterProduct.deleteMany({ where: { id: { in: created.productIds } } });
    await app.close();
  });

  it("PATCH /students/:id/kyc verifies the student and activates a set-up DRAFT store (INSTITUTE_ADMIN)", async () => {
    const { student, store } = await createStudentWithStore();

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/students/${student.id}/kyc`)
      .set("Authorization", `Bearer ${tokens.instituteAdmin}`)
      .send({ status: KycStatus.VERIFIED })
      .expect(200);

    expect(res.body.kycStatus).toBe(KycStatus.VERIFIED);
    expect(res.body.isVerified).toBe(true);
    expect(res.body.activatedStoreIds).toEqual([store.id]);
    const refreshed = await prisma.store.findUniqueOrThrow({ where: { id: store.id } });
    expect(refreshed.status).toBe(StoreStatus.ACTIVE);
  });

  it("PATCH /students/:id/kyc rejects invalid payloads with 400", async () => {
    const { student } = await createStudentWithStore();
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/students/${student.id}/kyc`)
      .set("Authorization", `Bearer ${tokens.instituteAdmin}`)
      .send({ status: "APPROVED_BY_MAGIC" })
      .expect(400);
  });

  it.each(["student", "seller"])("PATCH /students/:id/kyc returns 403 for %s", async (persona) => {
    const { student } = await createStudentWithStore();
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/students/${student.id}/kyc`)
      .set("Authorization", `Bearer ${tokens[persona]}`)
      .send({ status: KycStatus.VERIFIED })
      .expect(403);
  });

  it("GET /students/:id redacts NID for institute admins but not for KYC auditors (super admin)", async () => {
    const { student } = await createStudentWithStore();
    const masked = await request(app.getHttpServer())
      .get(`/api/v1/admin/students/${student.id}`)
      .set("Authorization", `Bearer ${tokens.instituteAdmin}`)
      .expect(200);
    expect(masked.body.nationalId).toBe("*********6789");
    expect(masked.body.passwordHash).toBeUndefined();

    const full = await request(app.getHttpServer())
      .get(`/api/v1/admin/students/${student.id}`)
      .set("Authorization", `Bearer ${tokens.superAdmin}`)
      .expect(200);
    expect(full.body.nationalId).toBe("1990123456789");
  });

  it("POST /students/:id/suspend cascades: store SUSPENDED, products hidden, pending payouts on HOLD", async () => {
    const { student, store } = await createStudentWithStore(StoreStatus.ACTIVE);
    const payout = await prisma.payoutRequest.create({
      data: { storeId: store.id, studentId: student.id, amount: 600, paymentMethod: "BKASH", accountDetails: {} },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/students/${student.id}/suspend`)
      .set("Authorization", `Bearer ${tokens.instituteAdmin}`)
      .send({ reason: "Counterfeit listings reported" })
      .expect(200);

    expect(res.body.suspendedStoreIds).toEqual([store.id]);
    expect(res.body.productsHidden).toBe(1);
    expect(res.body.payoutsQuarantined).toBe(1);

    const [s, visible, p] = await Promise.all([
      prisma.store.findUniqueOrThrow({ where: { id: store.id } }),
      prisma.storeProduct.count({ where: { storeId: store.id, isVisible: true } }),
      prisma.payoutRequest.findUniqueOrThrow({ where: { id: payout.id } }),
    ]);
    expect(s.status).toBe(StoreStatus.SUSPENDED);
    expect(visible).toBe(0);
    expect(p.status).toBe(PayoutStatus.HOLD);
  });

  it("POST /students/:id/reinstate reactivates the store and releases quarantined payouts", async () => {
    const { student, store } = await createStudentWithStore(StoreStatus.ACTIVE);
    const payout = await prisma.payoutRequest.create({
      data: { storeId: store.id, studentId: student.id, amount: 700, paymentMethod: "NAGAD", accountDetails: {} },
    });
    const auth = { Authorization: `Bearer ${tokens.instituteAdmin}` };
    await request(app.getHttpServer()).post(`/api/v1/admin/students/${student.id}/reinstate`).set(auth).expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/students/${student.id}/suspend`)
      .set(auth)
      .send({ reason: "Temporary review" })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/students/${student.id}/reinstate`)
      .set(auth)
      .expect(200);
    expect(res.body).toMatchObject({ reinstatedStoreIds: [store.id], payoutsReleased: 1 });
    expect((await prisma.store.findUniqueOrThrow({ where: { id: store.id } })).status).toBe(StoreStatus.ACTIVE);
    expect((await prisma.payoutRequest.findUniqueOrThrow({ where: { id: payout.id } })).status).toBe(PayoutStatus.PENDING);
  });

  it("POST /students/:id/suspend rolls back the store suspension if hiding products fails", async () => {
    const { student, store } = await createStudentWithStore(StoreStatus.ACTIVE);
    const original = prisma.$transaction.bind(prisma);
    const spy = vi.spyOn(prisma, "$transaction").mockImplementationOnce(((cb: any, opts: any) =>
      original(async (tx: any) => {
        const failingTx = new Proxy(tx, {
          get(target, prop) {
            if (prop === "storeProduct") {
              return { ...target.storeProduct, updateMany: async () => { throw new Error("forced product failure"); } };
            }
            return target[prop];
          },
        });
        return cb(failingTx);
      }, opts)) as any);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/students/${student.id}/suspend`)
      .set("Authorization", `Bearer ${tokens.instituteAdmin}`)
      .send({ reason: "Rollback probe" })
      .expect(500);
    spy.mockRestore();

    const s = await prisma.store.findUniqueOrThrow({ where: { id: store.id } });
    expect(s.status).toBe(StoreStatus.ACTIVE);
    expect(await prisma.storeProduct.count({ where: { storeId: store.id, isVisible: true } })).toBe(1);
  });

  it("GET /students/:id/profit-summary counts only COMPLETE orders and enforces the BDT 500 threshold", async () => {
    const { student, store, product } = await createStudentWithStore(StoreStatus.ACTIVE);
    await prisma.user.update({ where: { id: student.id }, data: { isVerified: true, kycStatus: KycStatus.VERIFIED } });
    const customer = await prisma.customer.create({ data: { storeId: store.id, fullName: "Buyer", phone: `+8801${uid()}` } });
    const makeOrder = (status: OrderStatus, qty: number) =>
      prisma.order.create({
        data: {
          storeId: store.id,
          customerId: customer.id,
          orderNumber: `ORD-GOV-${uid()}`,
          subtotal: 800 * qty,
          totalAmount: 800 * qty,
          platformCommission: 40 * qty,
          paymentFee: 0,
          studentNetProfit: 260 * qty,
          status,
          shippingAddress: {},
          items: {
            create: [{ masterProductId: product.id, quantity: qty, unitBasePrice: 500, unitSellingPrice: 800, totalPrice: 800 * qty }],
          },
        },
      });
    await makeOrder(OrderStatus.COMPLETE, 2); // (300*2) - 80 = 520
    await makeOrder(OrderStatus.DELIVERED, 5); // not yet complete: excluded

    const res = await request(app.getHttpServer())
      .get(`/api/v1/admin/students/${student.id}/profit-summary`)
      .set("Authorization", `Bearer ${tokens.instituteAdmin}`)
      .expect(200);

    expect(res.body.completedOrders).toBe(1);
    expect(res.body.netProfit).toBe(520);
    expect(res.body.minimumPayout).toBe(500);
    expect(res.body.eligibleForPayout).toBe(true);
  });

  it("GET /students/performance aggregates gross sales, profit and payouts in one query", async () => {
    const { student } = await createStudentWithStore(StoreStatus.ACTIVE);
    const res = await request(app.getHttpServer())
      .get(`/api/v1/admin/students/performance`)
      .query({ search: student.email, limit: 500 })
      .set("Authorization", `Bearer ${tokens.instituteAdmin}`)
      .expect(200);

    expect(res.body.meta.limit).toBe(100);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: student.id, grossSales: 0, netProfitEarned: 0, totalPaidOut: 0 });
  });

  it("branch managers only see students enrolled in their own campus", async () => {
    const { student } = await createStudentWithStore();
    const manager = await prisma.user.findUniqueOrThrow({ where: { email: "branchmanager@platform.local" } });
    const branch = await prisma.branch.create({
      data: { name: "Scope Campus", code: `SCOPE-${uid()}`.toUpperCase(), managerId: manager.id, address: "Road 1", city: "Dhaka" },
    });
    created.branchIds.push(branch.id);
    await prisma.studentBatch.create({
      data: {
        name: "Scope Batch",
        batchCode: `SB-${uid()}`.toUpperCase(),
        branchId: branch.id,
        startDate: new Date(),
        enrollments: { create: [{ studentId: student.id }] },
      },
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/admin/students`)
      .query({ limit: 100 })
      .set("Authorization", `Bearer ${tokens.branchManager}`)
      .expect(200);
    const ids = res.body.students.map((s: any) => s.id);
    expect(ids).toContain(student.id);
    expect(res.body.students.every((s: any) => created.userIds.includes(s.id))).toBe(true);

    const outsider = await createStudentWithStore();
    await request(app.getHttpServer())
      .get(`/api/v1/admin/students/${outsider.student.id}`)
      .set("Authorization", `Bearer ${tokens.branchManager}`)
      .expect(403);
  });
});
