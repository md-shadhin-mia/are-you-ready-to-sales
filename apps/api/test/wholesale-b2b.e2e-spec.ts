import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { OrderStatus, StockMovementType, UserRole } from "@repo/db";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapApp, createMasterProduct, createUser, loginAs } from "./helpers/e2e-app";

describe("Wholesale B2B Operations (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: string;
  let orderManager: string;
  let buyer: { id: string };
  let product: { id: string };

  const api = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${admin}` });
  const address = { recipientName: "Campus Store", phone: "+8801700000099", city: "Dhaka" };
  const order = (quantity: number, extra: Record<string, unknown> = {}) =>
    api()
      .post("/api/v1/admin/wholesale/orders")
      .set(auth())
      .send({ userId: buyer.id, items: [{ masterProductId: product.id, quantity }], shippingAddress: address, paymentMethod: "COD", ...extra });

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    admin = await loginAs(app, "instituteAdmin");
    orderManager = await loginAs(app, "orderManager");
    buyer = await createUser(app, { role: UserRole.STUDENT });
    product = await createMasterProduct(prisma, { stockQuantity: 1000, basePrice: 100 });
  });

  afterAll(async () => {
    await prisma.wholesaleOrder.deleteMany({ where: { userId: buyer.id } });
    await prisma.wholesaleCreditAccount.deleteMany({ where: { userId: buyer.id } });
    await prisma.stockMovement.deleteMany({ where: { masterProductId: product.id } });
    await prisma.masterProduct.delete({ where: { id: product.id } });
    await prisma.user.delete({ where: { id: buyer.id } });
    await app.close();
  });

  it("applies 15% at 50+ units and 25% at 200+ units, posting stock movements", async () => {
    const mid = await order(60).expect(201);
    expect(mid.body).toMatchObject({ discountPercent: 15, subtotal: 6000, discountAmount: 900, totalAmount: 5220 });
    const bulk = await order(200).expect(201);
    expect(bulk.body.discountPercent).toBe(25);
    expect(
      await prisma.stockMovement.count({ where: { masterProductId: product.id, movementType: StockMovementType.ORDER_FULFILLMENT } }),
    ).toBe(2);
  });

  it("rejects a discount override the order volume has not earned", async () => {
    await order(40, { discountPercent: 15 }).expect(400);
    await order(60, { discountPercent: 25 }).expect(400);
  });

  it("issues CREDIT orders only within the institutional credit limit", async () => {
    await order(10, { paymentMethod: "CREDIT" }).expect(400); // no credit account yet

    await api()
      .put(`/api/v1/admin/wholesale/credit-accounts/${buyer.id}`)
      .set(auth())
      .send({ creditLimit: 5000, isActive: true })
      .expect(200);

    const ok = await order(30, { paymentMethod: "CREDIT" }).expect(201); // 3000 + 120 shipping
    expect(ok.body).toMatchObject({ status: OrderStatus.INVOICED, paymentStatus: "CREDIT", totalAmount: 3120 });
    await order(30, { paymentMethod: "CREDIT" }).expect(400); // would reach 6240 > 5000

    const account = await api().get("/api/v1/admin/wholesale/credit-accounts").set(auth()).expect(200);
    expect(account.body.find((a: any) => a.userId === buyer.id)).toMatchObject({ creditLimit: 5000, outstandingBalance: 3120, availableCredit: 1880 });
  });

  it("product-wise report aggregates units, revenue and discounts", async () => {
    const res = await api().get("/api/v1/admin/wholesale/reports/product-wise").set(auth()).expect(200);
    const row = res.body.find((r: any) => r.masterProductId === product.id);
    expect(row.unitsSold).toBeGreaterThanOrEqual(290);
    expect(row.ordersCount).toBeGreaterThanOrEqual(3);
    await api().get("/api/v1/admin/wholesale/reports/product-wise").set("Authorization", `Bearer ${orderManager}`).expect(403);
  });
});
