import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AdjustmentStatus, SellerStatus, StoreStatus, TicketStatus, UserRole } from "@repo/db";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapApp, createMasterProduct, createUser, loginAs, uid } from "./helpers/e2e-app";

describe("External Seller Panel (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let institute: string;
  let superAdmin: string;
  let orderManager: string;
  const sellerIds: string[] = [];
  const userIds: string[] = [];
  const productIds: string[] = [];
  const storeIds: string[] = [];

  const api = () => request(app.getHttpServer());
  const base = "/api/v1/admin/seller-panel";

  async function seller() {
    const user = await createUser(app, { role: UserRole.SELLER });
    userIds.push(user.id);
    const profile = await prisma.sellerProfile.create({
      data: { userId: user.id, companyName: `Vendor ${uid()}`, status: SellerStatus.APPROVED, balance: 2000 },
    });
    sellerIds.push(profile.id);
    return profile;
  }

  const adjust = (sellerId: string, amount: number, token = institute) =>
    api()
      .post(`${base}/sellers/${sellerId}/adjustments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "CREDIT", amount, reasonCode: "COMMISSION_CORRECTION", documentUrl: "https://docs.example.com/memo.pdf" });

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    institute = await loginAs(app, "instituteAdmin");
    superAdmin = await loginAs(app, "superAdmin");
    orderManager = await loginAs(app, "orderManager");
  });

  afterAll(async () => {
    await prisma.sellerAdjustment.deleteMany({ where: { sellerId: { in: sellerIds } } });
    await prisma.storeProduct.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
    await prisma.masterProduct.deleteMany({ where: { id: { in: productIds } } });
    await prisma.sellerProfile.deleteMany({ where: { id: { in: sellerIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  it("small adjustments apply immediately; large ones wait for a different second approver", async () => {
    const s = await seller();
    const small = await adjust(s.id, 500).expect(201);
    expect(small.body).toMatchObject({ status: AdjustmentStatus.APPROVED, balanceAfter: 2500 });

    const large = await adjust(s.id, 12000).expect(201);
    expect(large.body.status).toBe(AdjustmentStatus.PENDING_APPROVAL);
    expect(Number((await prisma.sellerProfile.findUniqueOrThrow({ where: { id: s.id } })).balance)).toBe(2500);

    await api().post(`${base}/adjustments/${large.body.id}/approve`).set("Authorization", `Bearer ${institute}`).expect(403);
    const approved = await api()
      .post(`${base}/adjustments/${large.body.id}/approve`)
      .set("Authorization", `Bearer ${superAdmin}`)
      .expect(200);
    expect(approved.body).toMatchObject({ status: AdjustmentStatus.APPROVED, balanceAfter: 14500 });
  });

  it("adjustments require a reason code and supporting document (400) and sellers:manage (403)", async () => {
    const s = await seller();
    await api()
      .post(`${base}/sellers/${s.id}/adjustments`)
      .set("Authorization", `Bearer ${institute}`)
      .send({ type: "CREDIT", amount: 100 })
      .expect(400);
    await adjust(s.id, 100, orderManager).expect(403);
  });

  it("deactivating a seller unpublishes their catalog items and store listings", async () => {
    const s = await seller();
    const product = await createMasterProduct(prisma);
    productIds.push(product.id);
    await prisma.masterProduct.update({ where: { id: product.id }, data: { sellerId: s.id } });
    const owner = await createUser(app, { role: UserRole.STUDENT });
    userIds.push(owner.id);
    const store = await prisma.store.create({
      data: {
        studentId: owner.id,
        storeName: "Reseller",
        slug: `sel-${uid()}`,
        status: StoreStatus.ACTIVE,
        storeProducts: { create: [{ masterProductId: product.id, sellingPrice: 900 }] },
      },
    });
    storeIds.push(store.id);

    const res = await api()
      .post(`${base}/sellers/${s.id}/deactivate`)
      .set("Authorization", `Bearer ${institute}`)
      .send({ reason: "Repeated counterfeit complaints" })
      .expect(200);
    expect(res.body).toMatchObject({ status: SellerStatus.SUSPENDED, productsDeactivated: 1, listingsHidden: 1 });
    expect((await prisma.masterProduct.findUniqueOrThrow({ where: { id: product.id } })).isActive).toBe(false);
    expect(await prisma.storeProduct.count({ where: { storeId: store.id, isVisible: true } })).toBe(0);
  });

  it("support tickets can be opened, filtered and resolved", async () => {
    const s = await seller();
    const ticket = await api()
      .post(`${base}/tickets`)
      .set("Authorization", `Bearer ${institute}`)
      .send({ sellerId: s.id, subject: "Payout delay", message: "Settlement for last week is missing", priority: "HIGH" })
      .expect(201);
    const open = await api().get(`${base}/tickets`).query({ status: TicketStatus.OPEN }).set("Authorization", `Bearer ${institute}`).expect(200);
    expect(open.body.data.map((t: any) => t.id)).toContain(ticket.body.id);

    const resolved = await api()
      .patch(`${base}/tickets/${ticket.body.id}`)
      .set("Authorization", `Bearer ${institute}`)
      .send({ status: TicketStatus.RESOLVED, resolution: "Payout re-queued" })
      .expect(200);
    expect(resolved.body.status).toBe(TicketStatus.RESOLVED);
    expect(resolved.body.resolvedAt).toBeTruthy();
  });

  it("scorecards recompute compliance scores; overview summarizes the panel", async () => {
    const s = await seller();
    const res = await api().post(`${base}/scorecards/recompute`).set("Authorization", `Bearer ${institute}`).expect(200);
    const card = res.body.find((c: any) => c.sellerId === s.id);
    expect(card).toMatchObject({ onTimeDispatchRate: 1, qualityReviewAvg: 5, disputeResolutionRate: 1, score: 100 });

    const overview = await api().get(`${base}/overview`).set("Authorization", `Bearer ${institute}`).expect(200);
    expect(overview.body).toMatchObject({
      totalSellers: expect.any(Number),
      activeSellers: expect.any(Number),
      pendingAdjustments: expect.any(Number),
      openTickets: expect.any(Number),
    });
  });
});
