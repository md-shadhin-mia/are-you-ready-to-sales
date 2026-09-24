import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Marketing Tools & Coupons (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let studentToken: string;
  let studentId: string;
  let storeSlug: string;
  let storeProductId: string;

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
      where: { studentId, storeProducts: { some: {} } },
      include: { storeProducts: true },
    });
    storeSlug = store!.slug;
    storeProductId = store!.storeProducts[0].id;

    // Clean up test coupon if exists
    await prisma.coupon.deleteMany({
      where: {
        storeId: store!.id,
        code: "EIDTEST",
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("1. Should allow student to create a discount coupon", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/student/coupons")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        code: "EIDTEST",
        discountType: "PERCENTAGE",
        discountValue: 10,
        minSpend: 1000,
        maxUses: 50,
      })
      .expect(201);

    expect(res.body.code).toBe("EIDTEST");
    expect(res.body.discountType).toBe("PERCENTAGE");
    expect(Number(res.body.discountValue)).toBe(10);
    expect(Number(res.body.minSpend)).toBe(1000);
    expect(res.body.usedCount).toBe(0);
    expect(res.body.isActive).toBe(true);
  });

  it("2. Should list student coupons", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/student/coupons")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body).toBeInstanceOf(Array);
    const created = res.body.find((c: any) => c.code === "EIDTEST");
    expect(created).toBeDefined();
  });

  it("3. Should validate coupon via public storefront endpoint", async () => {
    // 3a. Below min spend
    const resFail = await request(app.getHttpServer())
      .post(`/api/v1/stores/${storeSlug}/coupons/validate`)
      .send({
        code: "EIDTEST",
        subtotal: 500, // below 1000 min spend
      })
      .expect(400);

    expect(resFail.body.message).toContain("Minimum cart spend");

    // 3b. Valid subtotal
    const resSuccess = await request(app.getHttpServer())
      .post(`/api/v1/stores/${storeSlug}/coupons/validate`)
      .send({
        code: "EIDTEST",
        subtotal: 2000,
      })
      .expect(200);

    expect(resSuccess.body.valid).toBe(true);
    expect(resSuccess.body.discountAmount).toBe(200); // 10% of 2000 = 200
    expect(resSuccess.body.finalSubtotal).toBe(1800);
  });

  it("4. Should apply coupon during checkout and deduct from subtotal and totalAmount", async () => {
    const checkoutRes = await request(app.getHttpServer())
      .post(`/api/v1/stores/${storeSlug}/checkout`)
      .send({
        customerName: "Sakib Al Hasan",
        customerPhone: "01799887766",
        shippingAddress: {
          recipientName: "Sakib Al Hasan",
          phone: "01799887766",
          addressLine: "Mirpur 2",
          city: "Dhaka",
          district: "Dhaka",
          isInsideDhaka: true,
        },
        items: [
          {
            storeProductId,
            quantity: 1,
          },
        ],
        paymentMethod: "COD",
        couponCode: "EIDTEST",
        utmSource: "facebook",
        utmCampaign: "eid_promo",
      })
      .expect(201);

    expect(checkoutRes.body.orderNumber).toBeDefined();
    expect(Number(checkoutRes.body.discountAmount)).toBeGreaterThan(0);
    expect(checkoutRes.body.couponCode).toBe("EIDTEST");

    // Verify coupon usedCount incremented
    const updatedCoupon = await prisma.coupon.findFirst({
      where: { code: "EIDTEST" },
    });
    expect(updatedCoupon!.usedCount).toBe(1);
  });

  it("5. Should update and fetch storefront promotional announcement banner", async () => {
    const updateRes = await request(app.getHttpServer())
      .patch("/api/v1/student/marketing/banner")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        bannerText: "Flash Deal: Extra 15% off today only!",
        bannerBgColor: "#059669",
        bannerActive: true,
      })
      .expect(200);

    expect(updateRes.body.bannerText).toBe("Flash Deal: Extra 15% off today only!");
    expect(updateRes.body.bannerBgColor).toBe("#059669");
    expect(updateRes.body.bannerActive).toBe(true);

    const publicRes = await request(app.getHttpServer())
      .get(`/api/v1/stores/${storeSlug}/banner`)
      .expect(200);

    expect(publicRes.body.bannerText).toBe("Flash Deal: Extra 15% off today only!");
    expect(publicRes.body.bannerActive).toBe(true);
  });
});
