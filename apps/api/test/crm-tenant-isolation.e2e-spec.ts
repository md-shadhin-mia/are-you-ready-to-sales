import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { PasswordService } from "../src/auth/password.service";
import { UserRole, StoreStatus } from "@repo/db";

describe("Multi-Tenant CRM Data Isolation (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordService: PasswordService;

  let studentAToken: string;
  let studentBToken: string;

  let storeA: any;
  let storeB: any;
  let userBId: string;
  let categoryId: string;
  let masterProductId: string;
  let storeAProductId: string;
  let storeBProductId: string;

  let customerAId: string;
  let customerBId: string;

  const sharedCustomerPhone = `0179988${Math.floor(1000 + Math.random() * 9000)}`;

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

    // 1. Login as Student A (seeded student1@platform.local with store apex-gadgets)
    const studentALogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "student1@platform.local",
        password: "Password123!",
      });
    studentAToken = studentALogin.body.accessToken;

    storeA = await prisma.store.findFirst({
      where: { slug: "apex-gadgets" },
    });

    // 2. Create Student B & Store B
    const hash = await passwordService.hash("Password123!");
    const userB = await prisma.user.create({
      data: {
        email: `student_crm_b_${Date.now()}@platform.local`,
        passwordHash: hash,
        fullName: "Student B CRM Test",
        role: UserRole.STUDENT,
      },
    });
    userBId = userB.id;

    storeB = await prisma.store.create({
      data: {
        studentId: userB.id,
        storeName: "Store B CRM Test",
        slug: `store-b-${Date.now()}`,
        status: StoreStatus.ACTIVE,
      },
    });

    const studentBLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: userB.email,
        password: "Password123!",
      });
    studentBToken = studentBLogin.body.accessToken;

    // 3. Create shared Category & MasterProduct
    const cat = await prisma.category.create({
      data: {
        name: `CRM Test Cat ${Date.now()}`,
        slug: `crm-cat-${Date.now()}`,
      },
    });
    categoryId = cat.id;

    const mp = await prisma.masterProduct.create({
      data: {
        sku: `CRM-SKU-${Date.now()}`,
        title: "CRM Isolation Master Gadget",
        categoryId: cat.id,
        basePrice: 500,
        masterDescription: "CRM Isolation Master Gadget Description",
        stockQuantity: 100,
        isActive: true,
      },
    });
    masterProductId = mp.id;

    // Reseller product in Store A
    const spA = await prisma.storeProduct.create({
      data: {
        storeId: storeA.id,
        masterProductId: mp.id,
        sellingPrice: 800,
        isVisible: true,
      },
    });
    storeAProductId = spA.id;

    // Reseller product in Store B
    const spB = await prisma.storeProduct.create({
      data: {
        storeId: storeB.id,
        masterProductId: mp.id,
        sellingPrice: 850,
        isVisible: true,
      },
    });
    storeBProductId = spB.id;

    // 4. Place order in Store A with shared phone number
    const orderARes = await request(app.getHttpServer())
      .post(`/api/v1/stores/${storeA.slug}/checkout`)
      .send({
        customerName: "Buyer Alpha",
        customerPhone: sharedCustomerPhone,
        customerEmail: "shared@example.com",
        shippingAddress: {
          recipientName: "Buyer Alpha",
          phone: sharedCustomerPhone,
          addressLine: "Store A Street",
          city: "Dhaka",
          district: "Dhaka",
          isInsideDhaka: true,
        },
        items: [{ storeProductId: storeAProductId, quantity: 1 }],
        paymentMethod: "COD",
      })
      .expect(201);

    customerAId = orderARes.body.customer.id;

    // 5. Place order in Store B with same phone number
    const orderBRes = await request(app.getHttpServer())
      .post(`/api/v1/stores/${storeB.slug}/checkout`)
      .send({
        customerName: "Buyer Beta",
        customerPhone: sharedCustomerPhone,
        customerEmail: "shared@example.com",
        shippingAddress: {
          recipientName: "Buyer Beta",
          phone: sharedCustomerPhone,
          addressLine: "Store B Street",
          city: "Chittagong",
          district: "Chittagong",
          isInsideDhaka: false,
        },
        items: [{ storeProductId: storeBProductId, quantity: 1 }],
        paymentMethod: "COD",
      })
      .expect(201);

    customerBId = orderBRes.body.customer.id;
  });

  afterAll(async () => {
    // Cleanup Store B
    if (storeB?.id) {
      await prisma.ledgerEntry.deleteMany({ where: { storeId: storeB.id } });
      await prisma.orderItem.deleteMany({
        where: { order: { storeId: storeB.id } },
      });
      await prisma.order.deleteMany({ where: { storeId: storeB.id } });
      await prisma.customer.deleteMany({ where: { storeId: storeB.id } });
      await prisma.storeProduct.deleteMany({ where: { storeId: storeB.id } });
      await prisma.store.deleteMany({ where: { id: storeB.id } });
    }
    if (userBId) {
      await prisma.user.deleteMany({ where: { id: userBId } });
    }

    // Cleanup test artifacts for Store A
    if (customerAId) {
      await prisma.ledgerEntry.deleteMany({
        where: { order: { customerId: customerAId } },
      });
      await prisma.orderItem.deleteMany({
        where: { order: { customerId: customerAId } },
      });
      await prisma.order.deleteMany({ where: { customerId: customerAId } });
      await prisma.customer.deleteMany({ where: { id: customerAId } });
    }
    if (storeAProductId) {
      await prisma.storeProduct.deleteMany({ where: { id: storeAProductId } });
    }
    if (masterProductId) {
      await prisma.masterProduct.deleteMany({ where: { id: masterProductId } });
    }
    if (categoryId) {
      await prisma.category.deleteMany({ where: { id: categoryId } });
    }

    await app.close();
  });

  it("should create two distinct customer records with separate storeId references for the same phone number", async () => {
    expect(customerAId).toBeDefined();
    expect(customerBId).toBeDefined();
    expect(customerAId).not.toBe(customerBId);

    const custA = await prisma.customer.findUnique({
      where: { id: customerAId },
    });
    const custB = await prisma.customer.findUnique({
      where: { id: customerBId },
    });

    expect(custA!.storeId).toBe(storeA.id);
    expect(custB!.storeId).toBe(storeB.id);
    expect(custA!.phone).toBe(sharedCustomerPhone);
    expect(custB!.phone).toBe(sharedCustomerPhone);
  });

  it("should return only Store A customers when authenticated as Student A", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/student/customers?search=${sharedCustomerPhone}`)
      .set("Authorization", `Bearer ${studentAToken}`)
      .expect(200);

    expect(res.body.items).toBeDefined();
    const customerIds = res.body.items.map((c: any) => c.id);
    expect(customerIds).toContain(customerAId);
    expect(customerIds).not.toContain(customerBId);
  });

  it("should prevent Student A from viewing Store B customer details (404/403 isolation)", async () => {
    // Attempting to access Store B's customer using Student A's credentials
    await request(app.getHttpServer())
      .get(`/api/v1/student/customers/${customerBId}`)
      .set("Authorization", `Bearer ${studentAToken}`)
      .expect(404);
  });
});
