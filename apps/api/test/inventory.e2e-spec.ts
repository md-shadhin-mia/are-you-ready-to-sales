import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { StockMovementType } from "@repo/db";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapApp, createMasterProduct, loginAs } from "./helpers/e2e-app";

describe("Physical Inventory & Stock Ledger (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tokens: Record<string, string> = {};
  const productIds: string[] = [];

  const api = () => request(app.getHttpServer());
  const fixture = async (stockQuantity = 10) => {
    const p = await createMasterProduct(prisma, { stockQuantity, basePrice: 400, averageCost: 250 });
    productIds.push(p.id);
    return p;
  };

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    for (const persona of ["productManager", "student", "seller", "orderManager"] as const) {
      tokens[persona] = await loginAs(app, persona);
    }
  });

  afterAll(async () => {
    await prisma.stockMovement.deleteMany({ where: { masterProductId: { in: productIds } } });
    await prisma.masterProduct.deleteMany({ where: { id: { in: productIds } } });
    await app.close();
  });

  it("POST /inventory/adjustments records the supervisor and notes in the ledger", async () => {
    const product = await fixture();
    const res = await api()
      .post("/api/v1/admin/inventory/adjustments")
      .set("Authorization", `Bearer ${tokens.productManager}`)
      .send({ masterProductId: product.id, quantity: -2, notes: "Cycle count: 2 units water damaged" })
      .expect(201);

    const manager = await prisma.user.findUniqueOrThrow({ where: { email: "manager@platform.local" } });
    expect(res.body).toMatchObject({
      movementType: StockMovementType.AUDIT_ADJUSTMENT,
      quantity: -2,
      balanceAfter: 8,
      performedById: manager.id,
    });
    expect((await prisma.masterProduct.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity).toBe(8);
  });

  it("POST /inventory/adjustments validates notes (400) and RBAC (403)", async () => {
    const product = await fixture();
    await api()
      .post("/api/v1/admin/inventory/adjustments")
      .set("Authorization", `Bearer ${tokens.productManager}`)
      .send({ masterProductId: product.id, quantity: 1 })
      .expect(400);
    for (const persona of ["student", "seller", "orderManager"]) {
      await api()
        .post("/api/v1/admin/inventory/adjustments")
        .set("Authorization", `Bearer ${tokens[persona]}`)
        .send({ masterProductId: product.id, quantity: 1, notes: "Found under shelf" })
        .expect(403);
    }
  });

  it("serializes concurrent adjustments with row locks so available stock never goes negative", async () => {
    const product = await fixture(10);
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        api()
          .post("/api/v1/admin/inventory/adjustments")
          .set("Authorization", `Bearer ${tokens.productManager}`)
          .send({ masterProductId: product.id, quantity: -3, notes: "Concurrent shrinkage probe" }),
      ),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(3);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    expect((await prisma.masterProduct.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity).toBe(1);

    const ledger = await api()
      .get("/api/v1/admin/inventory/ledger")
      .query({ masterProductId: product.id })
      .set("Authorization", `Bearer ${tokens.orderManager}`)
      .expect(200);
    expect(ledger.body.data.map((m: any) => m.balanceAfter).sort()).toEqual([1, 4, 7]);
  });

  it("GET /inventory/stock reports on hand, reserved and available", async () => {
    const product = await fixture(6);
    await prisma.masterProduct.update({ where: { id: product.id }, data: { reservedQuantity: 2 } });
    const res = await api()
      .get("/api/v1/admin/inventory/stock")
      .query({ search: product.sku })
      .set("Authorization", `Bearer ${tokens.productManager}`)
      .expect(200);
    expect(res.body.data[0]).toMatchObject({ id: product.id, onHand: 8, reserved: 2, available: 6, averageCost: 250 });
  });

  it("GET /inventory/reorder-forecast flags low stock with division-by-zero safe velocity", async () => {
    const product = await fixture(3);
    await prisma.masterProduct.update({ where: { id: product.id }, data: { reorderLevel: 5 } });
    const res = await api()
      .get("/api/v1/admin/inventory/reorder-forecast")
      .set("Authorization", `Bearer ${tokens.productManager}`)
      .expect(200);
    const row = res.body.find((r: any) => r.id === product.id);
    expect(row).toMatchObject({ available: 3, reorderLevel: 5, salesVelocity30d: 0, daysOfStockRemaining: null, needsReorder: true });
  });

  it("never exposes landed cost or reservation internals through the public wholesale catalog", async () => {
    const product = await fixture();
    const res = await api().get("/api/v1/wholesale/catalog").query({ search: product.sku }).expect(200);
    expect(JSON.stringify(res.body)).toContain(product.sku);
    expect(JSON.stringify(res.body)).not.toContain("averageCost");
    expect(JSON.stringify(res.body)).not.toContain("reservedQuantity");
  });
});
