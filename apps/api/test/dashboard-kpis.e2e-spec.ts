import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Student Executive Dashboard KPIs (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let studentToken: string;

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

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "student1@platform.local",
        password: "Password123!",
      });
    studentToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("1. Should return executive dashboard summary with KPIs and training modules", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/student/dashboard/summary")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.grossSales).toBeDefined();
    expect(typeof res.body.grossSales).toBe("number");
    expect(res.body.netProfit).toBeDefined();
    expect(typeof res.body.netProfit).toBe("number");
    expect(res.body.profitMarginPercent).toBeDefined();
    expect(res.body.totalOrders).toBeDefined();
    expect(res.body.completedOrders).toBeDefined();
    expect(res.body.activeCustomersCount).toBeDefined();
    expect(res.body.storeRating).toBeDefined();
    expect(res.body.recentOrders).toBeInstanceOf(Array);
    expect(res.body.recentReviews).toBeInstanceOf(Array);
    expect(res.body.trainingProgress).toBeDefined();
    expect(res.body.trainingProgress.modules).toHaveLength(5);
  });

  it("2. Should return daily chart-data for 7d, 30d, 1y time ranges", async () => {
    const res7d = await request(app.getHttpServer())
      .get("/api/v1/student/dashboard/chart-data?range=7d")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    expect(res7d.body).toHaveLength(7);
    expect(res7d.body[0]).toHaveProperty("date");
    expect(res7d.body[0]).toHaveProperty("revenue");
    expect(res7d.body[0]).toHaveProperty("profit");
    expect(res7d.body[0]).toHaveProperty("ordersCount");

    const res30d = await request(app.getHttpServer())
      .get("/api/v1/student/dashboard/chart-data?range=30d")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    expect(res30d.body).toHaveLength(30);
  });
});
