import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Subscription Quotas & Feature Gating (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let studentToken: string;
  let studentId: string;
  let storeId: string;
  const createdMasterProductIds: string[] = [];

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

    // Login student
    const studentLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "student1@platform.local",
        password: "Password123!",
      });
    studentToken = studentLogin.body.accessToken;
    studentId = studentLogin.body.user.id;

    const store = await prisma.store.findFirst({
      where: { studentId },
    });
    storeId = store!.id;

    // Reset student subscription to FREE plan
    const freePlan = await prisma.subscriptionPlan.findUnique({
      where: { code: "FREE" },
    });
    await prisma.studentSubscription.upsert({
      where: { studentId },
      update: { planId: freePlan!.id, status: "ACTIVE" },
      create: {
        studentId,
        planId: freePlan!.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    // Reset store custom domain
    await prisma.store.update({
      where: { id: storeId },
      data: { customDomain: null },
    });
  });

  afterAll(async () => {
    // Clean up created test master products and store products
    if (createdMasterProductIds.length > 0) {
      await prisma.storeProduct.deleteMany({
        where: { masterProductId: { in: createdMasterProductIds } },
      });
      await prisma.masterProduct.deleteMany({
        where: { id: { in: createdMasterProductIds } },
      });
    }

    // Reset to free plan
    const freePlan = await prisma.subscriptionPlan.findUnique({
      where: { code: "FREE" },
    });
    if (freePlan) {
      await prisma.studentSubscription.update({
        where: { studentId },
        data: { planId: freePlan.id },
      });
    }

    await app.close();
  });

  it("1. Should return public subscription plans with tier specs", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/subscriptions/plans")
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);
    const codes = res.body.map((p: any) => p.code);
    expect(codes).toContain("FREE");
    expect(codes).toContain("STARTER");
    expect(codes).toContain("PROFESSIONAL");
    expect(codes).toContain("BUSINESS");
  });

  it("2. Should fetch student active subscription and usage quotas", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/student/subscription")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.plan.code).toBe("FREE");
    expect(res.body.usage.maxProducts).toBe(10);
    expect(res.body.usage.allowCustomDomain).toBe(false);
  });

  it("3. Should block custom domain mapping on FREE plan with 403 Forbidden", async () => {
    const res = await request(app.getHttpServer())
      .patch("/api/v1/stores/me/domain")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ customDomain: "apex-exclusive.com" })
      .expect(403);

    expect(res.body.message).toContain("Custom domain mapping is not allowed");
  });

  it("4. Should enforce 10-product limit on FREE plan and reject 11th product", async () => {
    const category = await prisma.category.findFirst();

    // Find how many products currently in store
    const currentCount = await prisma.storeProduct.count({
      where: { storeId },
    });

    const neededToFill = 10 - currentCount;
    for (let i = 0; i < neededToFill; i++) {
      const mp = await prisma.masterProduct.create({
        data: {
          sku: `SKU-QUOTA-TEST-${Date.now()}-${i}`,
          title: `Quota Test Product ${i}`,
          categoryId: category!.id,
          basePrice: 500,
          stockQuantity: 50,
          masterDescription: "Test product description",
          masterImages: ["https://example.com/test.jpg"],
        },
      });
      createdMasterProductIds.push(mp.id);

      await request(app.getHttpServer())
        .post("/api/v1/student/products")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          masterProductId: mp.id,
          sellingPrice: 750,
        })
        .expect(201);
    }

    // Now store has 10 products. Attempt 11th product
    const mp11 = await prisma.masterProduct.create({
      data: {
        sku: `SKU-QUOTA-EXCEED-${Date.now()}`,
        title: "Excess Product",
        categoryId: category!.id,
        basePrice: 500,
        stockQuantity: 50,
        masterDescription: "Test product description",
        masterImages: ["https://example.com/test.jpg"],
      },
    });
    createdMasterProductIds.push(mp11.id);

    const res = await request(app.getHttpServer())
      .post("/api/v1/student/products")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        masterProductId: mp11.id,
        sellingPrice: 750,
      })
      .expect(403);

    expect(res.body.message).toContain("Plan product limit reached");
  });

  it("5. Should upgrade to PROFESSIONAL plan and unlock quota + custom domain", async () => {
    const upgradeRes = await request(app.getHttpServer())
      .post("/api/v1/student/subscription/upgrade")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ planCode: "PROFESSIONAL" })
      .expect(201);

    expect(upgradeRes.body.success).toBe(true);
    expect(upgradeRes.body.subscription.plan.code).toBe("PROFESSIONAL");

    // Now custom domain setting should succeed
    const domainRes = await request(app.getHttpServer())
      .patch("/api/v1/stores/me/domain")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ customDomain: "apex-exclusive.com" })
      .expect(200);

    expect(domainRes.body.customDomain).toBe("apex-exclusive.com");

    // Now importing the 11th product should succeed
    const mp11 = createdMasterProductIds[createdMasterProductIds.length - 1];
    const importRes = await request(app.getHttpServer())
      .post("/api/v1/student/products")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        masterProductId: mp11,
        sellingPrice: 750,
      })
      .expect(201);

    expect(importRes.body.storeProduct.masterProductId).toBe(mp11);
  });
});
