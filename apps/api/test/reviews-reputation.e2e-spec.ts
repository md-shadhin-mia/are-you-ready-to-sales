import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { PasswordService } from "../src/auth/password.service";
import { UserRole, OrderStatus, StoreStatus } from "@repo/db";

describe("Reviews & Reputation E2E Flow", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordService: PasswordService;

  let studentToken: string;
  let adminToken: string;
  let store: any;
  let category: any;
  let masterProduct: any;
  let customer: any;
  let order: any;

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
    passwordService = app.get(PasswordService);

    // 1. Login as Student
    const studentLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "student1@platform.local",
        password: "Password123!",
      });
    studentToken = studentLogin.body.accessToken;

    // 2. Login as Admin
    const adminLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "admin@platform.local",
        password: "Password123!",
      });
    adminToken = adminLogin.body.accessToken;

    store = await prisma.store.findFirst({
      where: { slug: "apex-gadgets" },
    });

    category = await prisma.category.findFirst();

    // Create unique master product
    masterProduct = await prisma.masterProduct.create({
      data: {
        sku: `REV-TEST-SKU-${Date.now()}`,
        title: "Trust Review Wireless Earbuds",
        categoryId: category.id,
        basePrice: 1200.0,
        stockQuantity: 50,
        masterDescription: "Earbuds for trust test",
        masterImages: ["https://example.com/earbuds.jpg"],
      },
    });

    // Create unique customer
    const phone = `01899${Math.floor(100000 + Math.random() * 900000)}`;
    customer = await prisma.customer.create({
      data: {
        storeId: store.id,
        fullName: "Sultana Razia",
        phone,
      },
    });

    // Create order initially in PROCESSING status
    const orderNumber = `ORD-REV-${Date.now()}`;
    order = await prisma.order.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        orderNumber,
        subtotal: 1600.0,
        shippingFee: 80.0,
        totalAmount: 1680.0,
        totalBaseCost: 1200.0,
        platformCommission: 64.0,
        studentNetProfit: 336.0,
        status: OrderStatus.PROCESSING,
        paymentMethod: "COD",
        shippingAddress: {
          recipientName: "Sultana Razia",
          phone,
          addressLine: "House 12, Road 4",
          city: "Dhaka",
          district: "Dhaka",
        },
        items: {
          create: [
            {
              masterProductId: masterProduct.id,
              quantity: 1,
              unitBasePrice: 1200.0,
              unitSellingPrice: 1600.0,
              totalPrice: 1600.0,
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up
    if (order) {
      await prisma.review.deleteMany({ where: { orderId: order.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
      await prisma.order.deleteMany({ where: { id: order.id } });
    }
    if (customer) {
      await prisma.customer.deleteMany({ where: { id: customer.id } });
    }
    if (masterProduct) {
      await prisma.masterProduct.deleteMany({ where: { id: masterProduct.id } });
    }
    await app.close();
  });

  it("1. Should generate reviewToken when order is marked DELIVERED", async () => {
    // Dispatch order to SHIPPED
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/orders/${order.id}/dispatch`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courierName: "Steadfast",
        trackingNumber: "TRK-REV-001",
      })
      .expect(200);

    // Update status to DELIVERED
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: OrderStatus.DELIVERED })
      .expect(200);

    expect(res.body.status).toBe(OrderStatus.DELIVERED);
    expect(res.body.reviewToken).toBeDefined();
    expect(res.body.reviewToken.startsWith("tok_")).toBe(true);

    order.reviewToken = res.body.reviewToken;
  });

  it("2. Should verify 1-click token for customer", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/stores/${store.slug}/reviews/verify-token?token=${order.reviewToken}`)
      .expect(200);

    expect(res.body.valid).toBe(true);
    expect(res.body.orderNumber).toBe(order.orderNumber);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].masterProductId).toBe(masterProduct.id);
    expect(res.body.items[0].alreadyReviewed).toBe(false);
  });

  it("3. Should submit verified 3D review via token and atomically update ratings", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/stores/${store.slug}/reviews`)
      .send({
        reviewToken: order.reviewToken,
        masterProductId: masterProduct.id,
        productRating: 5,
        storeRating: 4,
        deliveryRating: 5,
        productComment: "Crisp highs and punchy bass, highly recommended!",
        storeComment: "Responsive student merchant.",
        deliveryComment: "Delivered next day in perfect bubble wrap.",
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.review.isVerified).toBe(true);
    expect(res.body.review.productRating).toBe(5);

    // Check database aggregates updated
    const updatedProduct = await prisma.masterProduct.findUnique({
      where: { id: masterProduct.id },
    });
    expect(Number(updatedProduct?.ratingAvg)).toBe(5.0);
    expect(updatedProduct?.totalReviewsCount).toBe(1);

    const updatedStore = await prisma.store.findUnique({
      where: { id: store.id },
    });
    expect(Number(updatedStore?.ratingAvg)).toBeGreaterThan(0);
    expect(updatedStore?.totalReviewsCount).toBeGreaterThan(0);
  });

  it("4. Should reject duplicate review submission on the same order item with 409 Conflict", async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/stores/${store.slug}/reviews`)
      .send({
        reviewToken: order.reviewToken,
        masterProductId: masterProduct.id,
        productRating: 5,
        storeRating: 5,
        deliveryRating: 5,
      })
      .expect(409);
  });

  it("5. Should retrieve public product reviews with 3D breakdown pills", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/stores/${store.slug}/products/${masterProduct.id}/reviews`)
      .expect(200);

    expect(res.body.breakdown.totalReviews).toBe(1);
    expect(res.body.breakdown.averageProductRating).toBe(5.0);
    expect(res.body.breakdown.averageStoreRating).toBe(4.0);
    expect(res.body.breakdown.averageDeliveryRating).toBe(5.0);
    expect(res.body.reviews).toHaveLength(1);
    expect(res.body.reviews[0].isVerified).toBe(true);
  });

  it("6. Should compute store reputation scorecard and trust badge", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/stores/${store.slug}/reputation`)
      .expect(200);

    expect(res.body.storeName).toBe(store.storeName);
    expect(res.body.compositeScore).toBeGreaterThan(0);
    expect(res.body.trustBadge).toBeDefined();
    expect(res.body.trustBadge.badgeText).toContain("Delivery Success");
    expect(res.body.tips).toBeDefined();
  });

  it("7. Should list reviews in student dashboard with filtering", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/student/reviews?ratingFilter=ALL`)
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.breakdown).toBeDefined();
  });
});
