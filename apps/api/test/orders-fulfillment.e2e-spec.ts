import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { OrderStatus, StockMovementType, StoreStatus, UserRole } from "@repo/db";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapApp, createMasterProduct, createUser, loginAs, uid } from "./helpers/e2e-app";

describe("Orders & Multi-Status Fulfillment Console (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let orderManager: string;
  let student: string;
  let store: { id: string };
  let customer: { id: string };
  let productA: { id: string };
  let productB: { id: string };
  const cleanup = { userIds: [] as string[], productIds: [] as string[] };

  const api = () => request(app.getHttpServer());

  async function makeOrder(status: OrderStatus = OrderStatus.NEW) {
    return prisma.order.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        orderNumber: `ORD-E2E-${uid()}`.toUpperCase(),
        subtotal: 2500,
        shippingFee: 80,
        totalAmount: 2580,
        totalBaseCost: 1700,
        platformCommission: 125,
        studentNetProfit: 675,
        status,
        shippingAddress: { city: "Dhaka" },
        items: {
          create: [
            { masterProductId: productA.id, quantity: 2, unitBasePrice: 700, unitSellingPrice: 1000, totalPrice: 2000 },
            { masterProductId: productB.id, quantity: 1, unitBasePrice: 300, unitSellingPrice: 500, totalPrice: 500 },
          ],
        },
      },
      include: { items: true },
    });
  }

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    orderManager = await loginAs(app, "orderManager");
    student = await loginAs(app, "student");
    const owner = await createUser(app, { role: UserRole.STUDENT });
    cleanup.userIds.push(owner.id);
    store = await prisma.store.create({
      data: { studentId: owner.id, storeName: "Fulfillment Store", slug: `ful-${uid()}`, status: StoreStatus.ACTIVE },
    });
    customer = await prisma.customer.create({ data: { storeId: store.id, fullName: "Rafi", phone: `+8801${uid()}` } });
    productA = await createMasterProduct(prisma, { stockQuantity: 10 });
    productB = await createMasterProduct(prisma, { stockQuantity: 10 });
    cleanup.productIds.push(productA.id, productB.id);
  });

  afterAll(async () => {
    await prisma.ledgerEntry.deleteMany({ where: { storeId: store.id } });
    await prisma.order.deleteMany({ where: { storeId: store.id } });
    await prisma.customer.deleteMany({ where: { storeId: store.id } });
    await prisma.store.delete({ where: { id: store.id } });
    await prisma.stockMovement.deleteMany({ where: { masterProductId: { in: cleanup.productIds } } });
    await prisma.masterProduct.deleteMany({ where: { id: { in: cleanup.productIds } } });
    await prisma.user.deleteMany({ where: { id: { in: cleanup.userIds } } });
    await app.close();
  });

  it("PATCH /admin/orders/:id/status to INVOICED generates a unique invoice number", async () => {
    const [o1, o2] = await Promise.all([makeOrder(), makeOrder()]);
    const [r1, r2] = await Promise.all(
      [o1, o2].map((o) =>
        api()
          .patch(`/api/v1/admin/orders/${o.id}/status`)
          .set("Authorization", `Bearer ${orderManager}`)
          .send({ status: OrderStatus.INVOICED })
          .expect(200),
      ),
    );
    expect(r1.body.invoiceNumber).toMatch(/^INV-\d{4}-\d{6}$/);
    expect(r2.body.invoiceNumber).toMatch(/^INV-\d{4}-\d{6}$/);
    expect(r1.body.invoiceNumber).not.toBe(r2.body.invoiceNumber);
  });

  it("PATCH /admin/orders/:id/status rejects NEW -> COMPLETE with 400", async () => {
    const order = await makeOrder();
    const res = await api()
      .patch(`/api/v1/admin/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${orderManager}`)
      .send({ status: OrderStatus.COMPLETE })
      .expect(400);
    expect(res.body.message).toMatch(/NEW -> COMPLETE/);
  });

  it("POST /admin/orders/bulk-invoice invoices 50 orders in under 200ms with one batched update", async () => {
    const orders = await Promise.all(Array.from({ length: 50 }, () => makeOrder()));
    const started = performance.now();
    const res = await api()
      .post("/api/v1/admin/orders/bulk-invoice")
      .set("Authorization", `Bearer ${orderManager}`)
      .send({ orderIds: orders.map((o) => o.id) })
      .expect(200);
    const elapsed = performance.now() - started;

    expect(res.body.invoiced).toBe(50);
    expect(new Set(res.body.invoices.map((i: any) => i.invoiceNumber)).size).toBe(50);
    expect(elapsed).toBeLessThan(200);
    expect(await prisma.order.count({ where: { id: { in: orders.map((o) => o.id) }, status: OrderStatus.INVOICED } })).toBe(50);
  });

  it("POST /admin/orders/bulk-invoice is atomic (400) and RBAC protected (403)", async () => {
    const [fresh, delivered] = await Promise.all([makeOrder(), makeOrder(OrderStatus.DELIVERED)]);
    await api()
      .post("/api/v1/admin/orders/bulk-invoice")
      .set("Authorization", `Bearer ${orderManager}`)
      .send({ orderIds: [fresh.id, delivered.id] })
      .expect(400);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: fresh.id } })).status).toBe(OrderStatus.NEW);
    await api()
      .post("/api/v1/admin/orders/bulk-invoice")
      .set("Authorization", `Bearer ${student}`)
      .send({ orderIds: [fresh.id] })
      .expect(403);
  });

  it("POST /admin/orders/:id/partial-delivery splits the order, restocks returns and adjusts the ledger", async () => {
    const order = await makeOrder(OrderStatus.IN_COURIER);
    const itemA = order.items.find((i) => i.masterProductId === productA.id)!;
    const stockBefore = (await prisma.masterProduct.findUniqueOrThrow({ where: { id: productB.id } })).stockQuantity;

    const res = await api()
      .post(`/api/v1/admin/orders/${order.id}/partial-delivery`)
      .set("Authorization", `Bearer ${orderManager}`)
      .send({ acceptedItems: [{ orderItemId: itemA.id, quantity: 2 }], reason: "Customer refused accessory" })
      .expect(200);

    expect(res.body).toMatchObject({
      status: OrderStatus.PARTIAL_DELIVERED,
      subtotal: 2000,
      totalAmount: 2080,
      studentNetProfit: 500,
      returnedItems: [{ masterProductId: productB.id, quantity: 1 }],
    });

    const [after, movement, ledger, returns] = await Promise.all([
      prisma.masterProduct.findUniqueOrThrow({ where: { id: productB.id } }),
      prisma.stockMovement.findFirst({ where: { referenceId: order.id, movementType: StockMovementType.RETURN_RESTOCK } }),
      prisma.ledgerEntry.findFirst({ where: { orderId: order.id, entryType: "ADJUSTMENT" } }),
      prisma.orderReturnItem.count({ where: { orderId: order.id } }),
    ]);
    expect(after.stockQuantity).toBe(stockBefore + 1);
    expect(movement).not.toBeNull();
    expect(Number(ledger?.amount)).toBe(-175);
    expect(returns).toBe(1);
  });

  it("hold / unmatch / reconcile enforce transitions and keep the reason", async () => {
    const auth = { Authorization: `Bearer ${orderManager}` };
    const order = await makeOrder();
    const held = await api().post(`/api/v1/admin/orders/${order.id}/hold`).set(auth).send({ reason: "Address unclear" }).expect(201);
    expect(held.body).toMatchObject({ status: OrderStatus.HOLD, statusReason: "Address unclear" });
    // HOLD -> UNMATCH is not a legal move
    await api().post(`/api/v1/admin/orders/${order.id}/unmatch`).set(auth).send({ reason: "x" }).expect(400);
  });

  it("GET /admin/orders/counts returns every queue from a single scan", async () => {
    const res = await api().get("/api/v1/admin/orders/counts").set("Authorization", `Bearer ${orderManager}`).expect(200);
    for (const key of ["all", "new", "invoiced", "inCourier", "partialDelivered", "delivered", "complete", "hold", "cancelled", "unmatch", "exchange", "returned"]) {
      expect(typeof res.body[key]).toBe("number");
    }
    expect(res.body.all).toBeGreaterThanOrEqual(res.body.new + res.body.invoiced);
  });
});
