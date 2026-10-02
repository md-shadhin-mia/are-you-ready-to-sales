import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { InvoiceMatchStatus, PurchaseOrderStatus, StockMovementType } from "@repo/db";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapApp, createMasterProduct, loginAs, uid } from "./helpers/e2e-app";

describe("Purchases, Procurement & Suppliers (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let pm: string;
  let orderManager: string;
  const supplierIds: string[] = [];
  const productIds: string[] = [];

  const api = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${pm}` });
  const tin = () => String(Math.floor(1e11 + Math.random() * 9e11));
  const idem = () => `proc-${uid()}-${uid()}`;

  async function supplier(overrides: Record<string, unknown> = {}) {
    const res = await api()
      .post("/api/v1/admin/suppliers")
      .set(auth())
      .send({ name: `Supplier ${uid()}`, tinNumber: tin(), businessAddress: "12 Tejgaon Industrial Area, Dhaka", ...overrides });
    if (res.body.id) supplierIds.push(res.body.id);
    return res;
  }

  async function product(stockQuantity: number, averageCost: number) {
    const p = await createMasterProduct(prisma, { stockQuantity, averageCost });
    productIds.push(p.id);
    return p;
  }

  const costOf = async (id: string) =>
    prisma.masterProduct.findUniqueOrThrow({ where: { id }, select: { stockQuantity: true, averageCost: true } });

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    pm = await loginAs(app, "productManager");
    orderManager = await loginAs(app, "orderManager");
  });

  afterAll(async () => {
    await prisma.purchaseReturn.deleteMany({ where: { supplierId: { in: supplierIds } } });
    await prisma.goodsReceipt.deleteMany({ where: { purchaseOrder: { supplierId: { in: supplierIds } } } });
    await prisma.purchaseOrder.deleteMany({ where: { supplierId: { in: supplierIds } } });
    await prisma.supplier.deleteMany({ where: { id: { in: supplierIds } } });
    await prisma.stockMovement.deleteMany({ where: { masterProductId: { in: productIds } } });
    await prisma.masterProduct.deleteMany({ where: { id: { in: productIds } } });
    await app.close();
  });

  describe("Suppliers", () => {
    it("validates the 12-digit TIN and business address (400) and unique TIN (409)", async () => {
      expect((await supplier({ tinNumber: "12345" })).status).toBe(400);
      expect((await supplier({ businessAddress: "" })).status).toBe(400);
      const ok = await supplier();
      expect(ok.status).toBe(201);
      expect((await supplier({ tinNumber: ok.body.tinNumber })).status).toBe(409);
    });

    it("GET /suppliers/contract-alerts warns 30 days before expiry", async () => {
      const soon = new Date(Date.now() + 10 * 86400000).toISOString();
      const later = new Date(Date.now() + 90 * 86400000).toISOString();
      const a = await supplier({ contractEndDate: soon });
      const b = await supplier({ contractEndDate: later });
      const res = await api().get("/api/v1/admin/suppliers/contract-alerts").set(auth()).expect(200);
      const ids = res.body.map((s: any) => s.id);
      expect(ids).toContain(a.body.id);
      expect(ids).not.toContain(b.body.id);
      expect(res.body.find((s: any) => s.id === a.body.id)).toMatchObject({ contractState: "EXPIRING_SOON" });
    });

    it("order managers cannot manage suppliers", async () => {
      await api().get("/api/v1/admin/suppliers").set("Authorization", `Bearer ${orderManager}`).expect(403);
    });
  });

  describe("Purchase orders", () => {
    it("DRAFT -> ISSUED -> partial GRN -> full GRN updates stock and weighted average cost", async () => {
      const s = await supplier();
      const p = await product(10, 100);

      const created = await api()
        .post("/api/v1/admin/purchase-orders")
        .set(auth())
        .set("Idempotency-Key", idem())
        .send({ supplierId: s.body.id, items: [{ masterProductId: p.id, quantity: 30, unitCost: 140 }] })
        .expect(201);
      expect(created.body).toMatchObject({ status: PurchaseOrderStatus.DRAFT, totalCost: 4200 });
      expect(created.body.poNumber).toMatch(/^PO-\d{4}-\d{6}$/);
      const itemId = created.body.items[0].id;

      await api().post(`/api/v1/admin/purchase-orders/${created.body.id}/issue`).set(auth()).expect(200);

      const partial = await api()
        .post(`/api/v1/admin/purchase-orders/${created.body.id}/receive`)
        .set(auth())
        .send({ items: [{ purchaseOrderItemId: itemId, quantity: 10 }] })
        .expect(201);
      expect(partial.body.grnNumber).toMatch(/^GRN-\d{4}-\d{6}$/);
      // (10 * 100 + 10 * 140) / 20 = 120
      expect(await costOf(p.id)).toEqual({ stockQuantity: 20, averageCost: expect.anything() });
      expect(Number((await costOf(p.id)).averageCost)).toBe(120);

      await api()
        .post(`/api/v1/admin/purchase-orders/${created.body.id}/receive`)
        .set(auth())
        .send({ items: [{ purchaseOrderItemId: itemId, quantity: 20 }] })
        .expect(201);
      // (20 * 120 + 20 * 140) / 40 = 130
      expect(Number((await costOf(p.id)).averageCost)).toBe(130);
      const po = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: created.body.id } });
      expect(po.status).toBe(PurchaseOrderStatus.RECEIVED);
      expect(
        await prisma.stockMovement.count({ where: { masterProductId: p.id, movementType: StockMovementType.PURCHASE_RECEIPT } }),
      ).toBe(2);

      await api()
        .post(`/api/v1/admin/purchase-orders/${created.body.id}/receive`)
        .set(auth())
        .send({ items: [{ purchaseOrderItemId: itemId, quantity: 1 }] })
        .expect(409);
    });

    it("POST /purchase-orders/:id/match-invoice flags >1% variance for discrepancy review", async () => {
      const s = await supplier();
      const p = await product(0, 0);
      const res = await api()
        .post("/api/v1/admin/purchases")
        .set(auth())
        .set("Idempotency-Key", idem())
        .send({ supplierId: s.body.id, items: [{ masterProductId: p.id, quantity: 10, unitCost: 100 }] })
        .expect(201);
      expect(res.body.status).toBe(PurchaseOrderStatus.RECEIVED);

      const bad = await api()
        .post(`/api/v1/admin/purchase-orders/${res.body.id}/match-invoice`)
        .set(auth())
        .send({ invoiceNumber: "SUP-BILL-1", invoiceAmount: 1020 })
        .expect(200);
      expect(bad.body).toMatchObject({ matchStatus: InvoiceMatchStatus.DISCREPANCY, matchVariancePercent: 2 });

      const ok = await api()
        .post(`/api/v1/admin/purchase-orders/${res.body.id}/match-invoice`)
        .set(auth())
        .send({ invoiceNumber: "SUP-BILL-1R", invoiceAmount: 1005 })
        .expect(200);
      expect(ok.body.matchStatus).toBe(InvoiceMatchStatus.MATCHED);
    });

    it("POST /purchases (direct purchase) is idempotent", async () => {
      const s = await supplier();
      const p = await product(0, 0);
      const key = idem();
      const body = { supplierId: s.body.id, items: [{ masterProductId: p.id, quantity: 5, unitCost: 50 }] };
      await api().post("/api/v1/admin/purchases").set(auth()).send(body).expect(400);
      const a = await api().post("/api/v1/admin/purchases").set(auth()).set("Idempotency-Key", key).send(body).expect(201);
      const b = await api().post("/api/v1/admin/purchases").set(auth()).set("Idempotency-Key", key).send(body).expect(201);
      expect(b.body.id).toBe(a.body.id);
      expect((await costOf(p.id)).stockQuantity).toBe(5);
    });

    it("purchase returns deduct exact quantities; AP aging reports outstanding payables", async () => {
      const s = await supplier();
      const p = await product(0, 0);
      const po = await api()
        .post("/api/v1/admin/purchases")
        .set(auth())
        .set("Idempotency-Key", idem())
        .send({ supplierId: s.body.id, items: [{ masterProductId: p.id, quantity: 8, unitCost: 250 }] })
        .expect(201);

      const types = await api().get("/api/v1/admin/purchase-return-types").set(auth()).expect(200);
      const damaged = types.body.find((t: any) => t.code === "DAMAGED");
      const ret = await api()
        .post("/api/v1/admin/purchase-returns")
        .set(auth())
        .send({ supplierId: s.body.id, purchaseOrderId: po.body.id, masterProductId: p.id, quantity: 3, returnTypeId: damaged.id })
        .expect(201);
      expect(ret.body.returnNumber).toMatch(/^PR-\d{4}-\d{6}$/);
      expect((await costOf(p.id)).stockQuantity).toBe(5);

      await api()
        .post(`/api/v1/admin/purchase-orders/${po.body.id}/payments`)
        .set(auth())
        .send({ amount: 500 })
        .expect(200);

      const aging = await api().get("/api/v1/admin/purchases/ap-aging").set(auth()).expect(200);
      expect(aging.body.find((r: any) => r.supplierId === s.body.id)).toMatchObject({
        totalOutstanding: 1500,
        aging0To30: 1500,
        aging31To60: 0,
        agingOver60: 0,
      });
    });
  });
});
