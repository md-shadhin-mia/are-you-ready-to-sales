import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { OrderStatus, PurchaseOrderStatus, StoreStatus, UserRole } from "@repo/db";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapApp, createMasterProduct, createUser, loginAs, uid } from "./helpers/e2e-app";

describe("Operational Reports & Analytics (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: string;
  let orderManager: string;
  let supplierId: string;
  let productId: string;
  let storeId: string;
  let ownerId: string;

  const api = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${admin}` });

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    admin = await loginAs(app, "instituteAdmin");
    orderManager = await loginAs(app, "orderManager");

    const product = await createMasterProduct(prisma, { stockQuantity: 0 });
    productId = product.id;
    const supplier = await prisma.supplier.create({
      data: { name: "Report Supplier", tinNumber: String(Math.floor(1e11 + Math.random() * 9e11)), businessAddress: "Chattogram EPZ, Sector 4" },
    });
    supplierId = supplier.id;
    await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-RPT-${uid()}`,
        supplierId,
        status: PurchaseOrderStatus.RECEIVED,
        totalCost: 2000,
        items: { create: [{ masterProductId: productId, quantityOrdered: 20, quantityReceived: 20, unitCost: 100 }] },
      },
    });

    const owner = await createUser(app, { role: UserRole.STUDENT });
    ownerId = owner.id;
    const store = await prisma.store.create({
      data: { studentId: owner.id, storeName: "Report Store", slug: `rpt-${uid()}`, status: StoreStatus.ACTIVE },
    });
    storeId = store.id;
    const customer = await prisma.customer.create({ data: { storeId, fullName: "R", phone: `+8801${uid()}` } });
    const sell = (status: OrderStatus, qty: number) =>
      prisma.order.create({
        data: {
          storeId,
          customerId: customer.id,
          orderNumber: `ORD-RPT-${uid()}`.toUpperCase(),
          subtotal: 250 * qty,
          totalAmount: 250 * qty,
          status,
          courierName: "RedX",
          trackingNumber: `RX-${uid()}`,
          shippingAddress: {},
          items: { create: [{ masterProductId: productId, quantity: qty, unitBasePrice: 100, unitSellingPrice: 250, totalPrice: 250 * qty }] },
        },
      });
    await sell(OrderStatus.COMPLETE, 10);
    await sell(OrderStatus.RETURNED, 2);
    await sell(OrderStatus.IN_COURIER, 1);
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { storeId } });
    await prisma.customer.deleteMany({ where: { storeId } });
    await prisma.store.delete({ where: { id: storeId } });
    await prisma.purchaseOrder.deleteMany({ where: { supplierId } });
    await prisma.supplier.delete({ where: { id: supplierId } });
    await prisma.masterProduct.delete({ where: { id: productId } });
    await prisma.user.delete({ where: { id: ownerId } });
    await api().post("/api/v1/admin/reports/refresh").set(auth());
    await app.close();
  });

  it("POST /reports/refresh refreshes both materialized views", async () => {
    const res = await api().post("/api/v1/admin/reports/refresh").set(auth()).expect(200);
    expect(res.body.refreshed.sort()).toEqual(["mv_daily_courier_stats", "mv_supplier_lifecycle"]);
    expect(res.body.failed).toEqual([]);
  });

  it("GET /reports/supplier-profit-lifecycle nets COGS, RTO loss and packaging", async () => {
    await api().post("/api/v1/admin/reports/refresh").set(auth()).expect(200);
    const res = await api().get("/api/v1/admin/reports/supplier-profit-lifecycle").set(auth()).expect(200);
    expect(res.body.source).toBe("materialized_view");
    const row = res.body.data.find((r: any) => r.masterProductId === productId);
    expect(row).toMatchObject({
      supplierId,
      unitsPurchased: 20,
      avgUnitCost: 100,
      unitsSold: 10,
      salesRevenue: 2500,
      unitsRto: 2,
      avgSellingPrice: 250,
    });
  });

  it("GET /reports/product-courier-status pivots units per courier and status", async () => {
    await api().post("/api/v1/admin/reports/refresh").set(auth()).expect(200);
    const res = await api().get("/api/v1/admin/reports/product-courier-status").set(auth()).expect(200);
    const row = res.body.data.find((r: any) => r.masterProductId === productId);
    expect(row.statuses).toMatchObject({ COMPLETE: 10, RETURNED: 2, IN_COURIER: 1 });
    expect(row.couriers).toContain("RedX");
  });

  it("GET /reports/supplier-products lists purchase volumes per supplier; RBAC enforced", async () => {
    const res = await api().get("/api/v1/admin/reports/supplier-products").set(auth()).expect(200);
    expect(res.body.find((r: any) => r.supplierId === supplierId && r.masterProductId === productId)).toMatchObject({
      unitsPurchased: 20,
      totalCost: 2000,
    });
    await api().get("/api/v1/admin/reports/supplier-products").set("Authorization", `Bearer ${orderManager}`).expect(403);
  });
});
