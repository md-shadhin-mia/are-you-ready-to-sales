import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Master Catalog & Permissions Integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let studentToken: string;
  let createdCategoryId: string;
  const testSku = `SKU-INT-${Date.now()}`;

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

    // Login as seeded Super Admin
    const adminLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "admin@platform.local",
        password: "Password123!",
      });
    adminToken = adminLogin.body.accessToken;

    // Login as seeded Student
    const studentLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "student1@platform.local",
        password: "Password123!",
      });
    studentToken = studentLogin.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.masterProduct.deleteMany({
      where: { sku: testSku },
    });
    if (createdCategoryId) {
      await prisma.category.deleteMany({
        where: { id: createdCategoryId },
      });
    }
    await app.close();
  });

  it("should create a category as Super Admin", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Wearable Tech",
        slug: `wearable-tech-${Date.now()}`,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    createdCategoryId = res.body.id;
  });

  it("should create a master product as Admin/Product Manager", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/admin/master-products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        sku: testSku,
        title: "Smart Fitness Tracker Band",
        categoryId: createdCategoryId,
        basePrice: 2100,
        stockQuantity: 75,
        masterDescription: "Waterproof fitness band with heart rate monitor.",
      })
      .expect(201);

    expect(res.body.sku).toBe(testSku);
    expect(res.body.stockQuantity).toBe(75);
  });

  it("should block a STUDENT from creating master products with 403 Forbidden", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/admin/master-products")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        sku: `SKU-UNAUTH-${Date.now()}`,
        title: "Hacked Product",
        categoryId: createdCategoryId,
        basePrice: 100,
        masterDescription: "Unauthorized",
      })
      .expect(403);
  });

  it("should allow a STUDENT to browse the marketplace catalog", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/student/catalog")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.items).toBeDefined();
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);

    const found = res.body.items.find((p: any) => p.sku === testSku);
    expect(found).toBeDefined();
    expect(Number(found.basePrice)).toBe(2100);
  });

  it("should verify store slug availability check", async () => {
    // apex-gadgets was seeded, so it must be unavailable
    const takenRes = await request(app.getHttpServer())
      .get("/api/v1/stores/check-slug?slug=apex-gadgets")
      .expect(200);

    expect(takenRes.body.available).toBe(false);

    // unique slug should be available
    const freeRes = await request(app.getHttpServer())
      .get(`/api/v1/stores/check-slug?slug=new-store-${Date.now()}`)
      .expect(200);

    expect(freeRes.body.available).toBe(true);
  });
});
