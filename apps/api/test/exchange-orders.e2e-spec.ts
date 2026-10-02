import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { ExchangeStatus, OrderStatus, ReturnGrading, StockMovementType, StoreStatus, UserRole } from "@repo/db";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapApp, createMasterProduct, createUser, loginAs, uid } from "./helpers/e2e-app";

describe("Exchange Orders Suite (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let support: string;
  let seller: string;
  let store: { id: string };
  let customer: { id: string };
  let returned: { id: string };
  let replacement: { id: string };
  let ownerId: string;

  const api = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${support}` });

  async function deliveredOrder() {
    return prisma.order.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        orderNumber: `ORD-EX-${uid()}`.toUpperCase(),
        subtotal: 1000,
        totalAmount: 1080,
        status: OrderStatus.DELIVERED,
        shippingAddress: {},
        items: { create: [{ masterProductId: returned.id, quantity: 1, unitBasePrice: 600, unitSellingPrice: 1000, totalPrice: 1000 }] },
      },
    });
  }

  async function openExchange(key = `idem-${uid()}-${uid()}`) {
    const order = await deliveredOrder();
    return api()
      .post("/api/v1/admin/exchanges")
      .set(auth())
      .set("Idempotency-Key", key)
      .send({
        originalOrderId: order.id,
        returnedProductId: returned.id,
        replacementProductId: replacement.id,
        reason: "Size too small",
        proofPhotos: ["https://cdn.example.com/proof/1.jpg"],
        returnDeliveryFee: 60,
      });
  }

  const stock = async (id: string) =>
    prisma.masterProduct.findUniqueOrThrow({ where: { id }, select: { stockQuantity: true, reservedQuantity: true } });

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    support = await loginAs(app, "supportAgent");
    seller = await loginAs(app, "seller");
    const owner = await createUser(app, { role: UserRole.STUDENT });
    ownerId = owner.id;
    store = await prisma.store.create({
      data: { studentId: owner.id, storeName: "Exchange Store", slug: `ex-${uid()}`, status: StoreStatus.ACTIVE },
    });
    customer = await prisma.customer.create({ data: { storeId: store.id, fullName: "Tania", phone: `+8801${uid()}` } });
    returned = await createMasterProduct(prisma, { stockQuantity: 5, basePrice: 600 });
    replacement = await createMasterProduct(prisma, { stockQuantity: 5, basePrice: 1300 });
  });

  afterAll(async () => {
    await prisma.exchangeOrder.deleteMany({ where: { originalOrder: { storeId: store.id } } });
    await prisma.order.deleteMany({ where: { storeId: store.id } });
    await prisma.customer.deleteMany({ where: { storeId: store.id } });
    await prisma.store.delete({ where: { id: store.id } });
    await prisma.stockMovement.deleteMany({ where: { masterProductId: { in: [returned.id, replacement.id] } } });
    await prisma.masterProduct.deleteMany({ where: { id: { in: [returned.id, replacement.id] } } });
    await prisma.user.delete({ where: { id: ownerId } });
    await app.close();
  });

  it("POST /exchanges creates a #EX-YYYY-XXXX ticket with a differential invoice", async () => {
    const res = await openExchange().then((r) => r);
    expect(res.status).toBe(201);
    expect(res.body.exchangeNumber).toMatch(/^EX-\d{4}-\d{4,}$/);
    expect(res.body).toMatchObject({ status: ExchangeStatus.NEW, differenceAmount: 300, amountDue: 360, settlementType: "INVOICE" });
  });

  it("POST /exchanges requires an Idempotency-Key and replays the original response", async () => {
    const order = await deliveredOrder();
    const body = { originalOrderId: order.id, returnedProductId: returned.id, replacementProductId: replacement.id, reason: "Colour" };
    await api().post("/api/v1/admin/exchanges").set(auth()).send(body).expect(400);

    const key = `idem-${uid()}-${uid()}`;
    const first = await api().post("/api/v1/admin/exchanges").set(auth()).set("Idempotency-Key", key).send(body).expect(201);
    const replay = await api().post("/api/v1/admin/exchanges").set(auth()).set("Idempotency-Key", key).send(body).expect(201);
    expect(replay.body.id).toBe(first.body.id);
    expect(await prisma.exchangeOrder.count({ where: { originalOrderId: order.id } })).toBe(1);
  });

  it("full lifecycle: approve reserves, dispatch ships, inspect RESELLABLE restocks, complete closes", async () => {
    const created = await openExchange();
    const id = created.body.id;
    const before = { returned: await stock(returned.id), replacement: await stock(replacement.id) };

    await api().post(`/api/v1/admin/exchanges/${id}/approve`).set(auth()).expect(200);
    expect(await stock(replacement.id)).toEqual({
      stockQuantity: before.replacement.stockQuantity - 1,
      reservedQuantity: before.replacement.reservedQuantity + 1,
    });

    await api()
      .post(`/api/v1/admin/exchanges/${id}/dispatch`)
      .set(auth())
      .send({ courierName: "Pathao", reverseTrackingNumber: `REV-${uid()}`, forwardTrackingNumber: `FWD-${uid()}` })
      .expect(200);
    expect((await stock(replacement.id)).reservedQuantity).toBe(before.replacement.reservedQuantity);

    await api().patch(`/api/v1/admin/exchanges/${id}/inspect`).set(auth()).send({ grading: ReturnGrading.RESELLABLE }).expect(200);
    expect((await stock(returned.id)).stockQuantity).toBe(before.returned.stockQuantity + 1);
    expect(
      await prisma.stockMovement.count({ where: { referenceId: id, movementType: StockMovementType.RETURN_RESTOCK } }),
    ).toBe(1);

    const done = await api().post(`/api/v1/admin/exchanges/${id}/complete`).set(auth()).expect(200);
    expect(done.body.status).toBe(ExchangeStatus.COMPLETE);
  });

  it("rejecting an approved exchange releases the reserved replacement stock", async () => {
    const created = await openExchange();
    const before = await stock(replacement.id);
    await api().post(`/api/v1/admin/exchanges/${created.body.id}/approve`).set(auth()).expect(200);
    await api()
      .post(`/api/v1/admin/exchanges/${created.body.id}/reject`)
      .set(auth())
      .send({ reason: "Customer withdrew request" })
      .expect(200);
    expect(await stock(replacement.id)).toEqual(before);
  });

  it("approving on a zero-stock SKU returns 409 and leaves the ticket NEW", async () => {
    const created = await openExchange();
    await prisma.masterProduct.update({ where: { id: replacement.id }, data: { stockQuantity: 0 } });
    try {
      const res = await api().post(`/api/v1/admin/exchanges/${created.body.id}/approve`).set(auth()).expect(409);
      expect(res.body.message).toMatch(/out of stock/i);
      expect((await prisma.exchangeOrder.findUniqueOrThrow({ where: { id: created.body.id } })).status).toBe(ExchangeStatus.NEW);
    } finally {
      await prisma.masterProduct.update({ where: { id: replacement.id }, data: { stockQuantity: 5 } });
    }
  });

  it("GET /exchanges lists tickets with turnaround days; GET /exchanges/overview counts queues; sellers get 403", async () => {
    const created = await openExchange();
    const list = await api().get("/api/v1/admin/exchanges").query({ status: ExchangeStatus.NEW }).set(auth()).expect(200);
    const row = list.body.data.find((e: any) => e.id === created.body.id);
    expect(row).toMatchObject({ customerName: "Tania", replacementProductTitle: expect.any(String), daysInProcess: 0 });

    const overview = await api().get("/api/v1/admin/exchanges/overview").set(auth()).expect(200);
    expect(overview.body.NEW).toBeGreaterThanOrEqual(1);

    await api().get("/api/v1/admin/exchanges").set("Authorization", `Bearer ${seller}`).expect(403);
  });
});
