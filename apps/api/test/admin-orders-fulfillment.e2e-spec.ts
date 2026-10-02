import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { OrderStatus } from "@repo/db";

describe("Admin Orders Multi-Status Fulfillment (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testOrderId: string;

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

    // Login super admin
    const adminLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "admin@platform.local",
        password: "Password123!",
      });
    adminToken = adminLogin.body.accessToken;

    // Find or create an order for testing
    const store = await prisma.store.findFirst({
      where: { slug: "apex-gadgets" },
    });
    if (!store) throw new Error("Store not found");

    const customerPhone = `01799${Math.floor(100000 + Math.random() * 900000)}`;
    const customer = await prisma.customer.create({
      data: {
        storeId: store.id,
        fullName: "Rahim Chowdhury",
        phone: customerPhone,
      },
    });

    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        orderNumber: `TEST-ORD-${Date.now()}`,
        status: OrderStatus.NEW,
        totalAmount: 1850,
        subtotal: 1700,
        shippingFee: 150,
        shippingAddress: {
          recipientName: "Rahim Chowdhury",
          phone: customerPhone,
          addressLine: "House 12, Road 4, Dhanmondi, Dhaka",
          city: "Dhaka",
          district: "Dhaka",
        },
        paymentMethod: "COD",
      },
    });
    testOrderId = order.id;
  });

  afterAll(async () => {
    if (testOrderId) {
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.delete({ where: { id: testOrderId } }).catch(() => {});
    }
    await app.close();
  });

  it("1. Should return aggregated counts for all 11 order queues", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/admin/orders/counts")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toBeDefined();
    expect(res.body.all).toBeGreaterThanOrEqual(1);
    expect(res.body.new).toBeGreaterThanOrEqual(1);
    expect(res.body.complete).toBeDefined();
    expect(res.body.partialDelivered).toBeDefined();
    expect(res.body.unmatch).toBeDefined();
    expect(res.body.invoiced).toBeDefined();
    expect(res.body.hold).toBeDefined();
    expect(res.body.cancelled).toBeDefined();
    expect(res.body.inCourier).toBeDefined();
    expect(res.body.exchange).toBeDefined();
  });

  it("2. Should put order on hold with documented reason", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${testOrderId}/hold`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Customer requested 3-day delivery delay" })
      .expect(201);

    expect(res.body.status).toBe(OrderStatus.HOLD);
  });

  it("3. Should invoice order and transition status to INVOICED", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${testOrderId}/invoice`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(201);

    expect(res.body.status).toBe(OrderStatus.INVOICED);
  });

  it("4. Should quarantine order into UNMATCH status for discrepancy audit", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${testOrderId}/unmatch`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Barcode mismatch on packaging depot scan" })
      .expect(201);

    expect(res.body.status).toBe(OrderStatus.UNMATCH);
  });

  it("5. Should reconcile unmatch discrepancy and return order to INVOICED", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${testOrderId}/reconcile`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ toStatus: OrderStatus.INVOICED })
      .expect(201);

    expect(res.body.status).toBe(OrderStatus.INVOICED);
  });

  it("6. Should dispatch order with 3PL courier tracking and transition to IN_COURIER / SHIPPED", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/orders/${testOrderId}/dispatch`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courierName: "Pathao",
        trackingNumber: "PTH-TRK-998811",
      })
      .expect(200);

    expect(res.body.courierName).toBe("Pathao");
    expect(res.body.trackingNumber).toBe("PTH-TRK-998811");
    expect([OrderStatus.IN_COURIER, OrderStatus.SHIPPED]).toContain(res.body.status);
  });

  it("7. Should initiate product/course exchange transaction after delivery", async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/orders/${testOrderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: OrderStatus.DELIVERED })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${testOrderId}/exchange`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ notes: "Defective item swap replacement" })
      .expect(201);

    expect(res.body.status).toBe(OrderStatus.EXCHANGE);
  });
});
