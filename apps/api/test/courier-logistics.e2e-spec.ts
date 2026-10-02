import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createHmac } from "crypto";
import { OrderStatus, RtoInspectionStatus, StockMovementType, StoreStatus, UserRole } from "@repo/db";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapApp, createMasterProduct, createUser, loginAs, uid } from "./helpers/e2e-app";

const DEV_SECRET = process.env.COURIER_WEBHOOK_SECRET || "dev-courier-webhook-secret";

describe("In Courier Tracking & 3PL Webhooks (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let orderManager: string;
  let seller: string;
  let store: { id: string };
  let customer: { id: string };
  let product: { id: string };
  let ownerId: string;

  const api = () => request(app.getHttpServer());

  function webhook(provider: string, payload: object, secret = DEV_SECRET) {
    const body = JSON.stringify(payload);
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    return api()
      .post(`/api/v1/webhooks/courier/${provider}`)
      .set("Content-Type", "application/json")
      .set("X-Courier-Signature", signature)
      .send(body);
  }

  async function inCourierOrder() {
    const trackingNumber = `TRK-${uid()}`.toUpperCase();
    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        orderNumber: `ORD-CR-${uid()}`.toUpperCase(),
        subtotal: 1000,
        totalAmount: 1080,
        shippingFee: 80,
        status: OrderStatus.IN_COURIER,
        courierName: "Steadfast",
        trackingNumber,
        shippingAddress: {},
        items: { create: [{ masterProductId: product.id, quantity: 2, unitBasePrice: 300, unitSellingPrice: 500, totalPrice: 1000 }] },
      },
    });
    return { order, trackingNumber };
  }

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    orderManager = await loginAs(app, "orderManager");
    seller = await loginAs(app, "seller");
    const owner = await createUser(app, { role: UserRole.STUDENT });
    ownerId = owner.id;
    store = await prisma.store.create({
      data: { studentId: owner.id, storeName: "Courier Store", slug: `cr-${uid()}`, status: StoreStatus.ACTIVE },
    });
    customer = await prisma.customer.create({ data: { storeId: store.id, fullName: "Nadia", phone: "+8801711223344" } });
    product = await createMasterProduct(prisma, { stockQuantity: 10 });
  });

  afterAll(async () => {
    await prisma.courierEvent.deleteMany({ where: { order: { storeId: store.id } } });
    await prisma.ledgerEntry.deleteMany({ where: { storeId: store.id } });
    await prisma.order.deleteMany({ where: { storeId: store.id } });
    await prisma.customer.deleteMany({ where: { storeId: store.id } });
    await prisma.store.delete({ where: { id: store.id } });
    await prisma.stockMovement.deleteMany({ where: { masterProductId: product.id } });
    await prisma.masterProduct.delete({ where: { id: product.id } });
    await prisma.user.delete({ where: { id: ownerId } });
    await app.close();
  });

  it("applies a signed delivered webhook and ignores an identical replay", async () => {
    const { order, trackingNumber } = await inCourierOrder();
    const event = { eventId: `evt-${uid()}`, trackingNumber, status: "delivered" };

    const first = await webhook("steadfast", event).expect(200);
    expect(first.body).toMatchObject({ received: true, duplicate: false, applied: true, orderStatus: OrderStatus.DELIVERED });

    const replay = await webhook("steadfast", event).expect(200);
    expect(replay.body).toMatchObject({ received: true, duplicate: true });

    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(OrderStatus.DELIVERED);
    expect(await prisma.courierEvent.count({ where: { eventId: event.eventId } })).toBe(1);
  });

  it("rejects a forged signature with 401", async () => {
    const { trackingNumber } = await inCourierOrder();
    await webhook("pathao", { eventId: `evt-${uid()}`, trackingNumber, status: "delivered" }, "wrong-secret").expect(401);
  });

  it("returns 400 for an unsupported courier provider", async () => {
    await webhook("dhl", { eventId: "x", trackingNumber: "y", status: "delivered" }).expect(400);
  });

  it("RTO: returned parcel restocks, opens a seal inspection, and a DAMAGED verdict writes stock off", async () => {
    const { order, trackingNumber } = await inCourierOrder();
    const before = (await prisma.masterProduct.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity;

    await webhook("redx", { eventId: `evt-${uid()}`, trackingNumber, status: "returned_to_origin" }).expect(200);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(OrderStatus.RETURNED);
    expect((await prisma.masterProduct.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity).toBe(before + 2);

    const queue = await api()
      .get("/api/v1/admin/logistics/rto-inspections")
      .query({ status: RtoInspectionStatus.PENDING })
      .set("Authorization", `Bearer ${orderManager}`)
      .expect(200);
    const inspection = queue.body.data.find((i: any) => i.orderId === order.id);
    expect(inspection).toBeDefined();

    await api()
      .post(`/api/v1/admin/logistics/rto-inspections/${inspection.id}/resolve`)
      .set("Authorization", `Bearer ${orderManager}`)
      .send({ result: RtoInspectionStatus.DAMAGED, notes: "Seal broken, screen cracked" })
      .expect(200);

    expect((await prisma.masterProduct.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity).toBe(before);
    const writeOff = await prisma.stockMovement.findFirst({
      where: { masterProductId: product.id, movementType: StockMovementType.WRITE_OFF, referenceId: inspection.id },
    });
    expect(writeOff?.quantity).toBe(-2);

    await api()
      .post(`/api/v1/admin/logistics/rto-inspections/${inspection.id}/resolve`)
      .set("Authorization", `Bearer ${orderManager}`)
      .send({ result: RtoInspectionStatus.SEAL_VERIFIED })
      .expect(409);
  });

  it("GET /admin/logistics/in-courier masks customer phones in the transit report", async () => {
    const { order } = await inCourierOrder();
    const res = await api()
      .get("/api/v1/admin/logistics/in-courier")
      .query({ limit: 100, search: order.orderNumber })
      .set("Authorization", `Bearer ${orderManager}`)
      .expect(200);
    const row = res.body.data.find((o: any) => o.id === order.id);
    expect(row.customerPhone).toBe("+8801******344");
    expect(JSON.stringify(res.body)).not.toContain("+8801711223344");

    await api().get("/api/v1/admin/logistics/in-courier").set("Authorization", `Bearer ${seller}`).expect(403);
  });
});
