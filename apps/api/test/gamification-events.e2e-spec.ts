import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Domain Event Gamification & Level Progression (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;
  let studentToken: string;
  let adminToken: string;
  let studentId: string;
  let storeId: string;

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
    eventEmitter = app.get(EventEmitter2);

    // Login student
    const studentLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "student1@platform.local",
        password: "Password123!",
      });
    studentToken = studentLogin.body.accessToken;
    studentId = studentLogin.body.user.id;

    // Login admin
    const adminLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "admin@platform.local",
        password: "Password123!",
      });
    adminToken = adminLogin.body.accessToken;

    const store = await prisma.store.findFirst({
      where: { studentId, slug: "apex-gadgets" },
    });
    storeId = store!.id;

    // Reset test challenge progress for student
    await prisma.studentProgress.deleteMany({
      where: {
        studentId,
        challenge: {
          code: { in: ["CH_FIRST_PRODUCT", "CH_PROMO_CAMPAIGN"] },
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("1. Should fetch initial student gamification status and challenges list", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/student/gamification/status")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.currentLevel).toBeGreaterThanOrEqual(1);
    expect(res.body.levelTitle).toBeDefined();
    expect(res.body.totalXp).toBeDefined();
    expect(res.body.commissionRate).toBe(0.05);
    expect(res.body.challenges).toBeInstanceOf(Array);
    expect(res.body.challenges.length).toBeGreaterThanOrEqual(10);
    expect(res.body.nextLevel).toBeDefined();
  });

  it("2. Should increment challenge progress when store.product.added event fires", async () => {
    // Fire event for student
    eventEmitter.emit("store.product.added", {
      storeId,
      studentId,
    });

    const productChal = await prisma.challenge.findUnique({
      where: { code: "CH_FIRST_PRODUCT" },
    });
    expect(productChal).toBeDefined();

    // Poll until async event listener writes progress to DB (up to 2.5s)
    let progress: any = null;
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 100));
      progress = await prisma.studentProgress.findUnique({
        where: {
          studentId_challengeId: {
            studentId,
            challengeId: productChal!.id,
          },
        },
      });
      if (progress) break;
    }

    expect(progress).toBeDefined();
    expect(progress!.currentCount).toBeGreaterThanOrEqual(1);
    expect(progress!.isCompleted).toBe(true);
  });

  it("3. Should claim XP reward for completed challenge and update student total XP", async () => {
    const productChal = await prisma.challenge.findUnique({
      where: { code: "CH_FIRST_PRODUCT" },
    });

    const statusBefore = await request(app.getHttpServer())
      .get("/api/v1/student/gamification/status")
      .set("Authorization", `Bearer ${studentToken}`);
    const xpBefore = statusBefore.body.totalXp;

    const claimRes = await request(app.getHttpServer())
      .post(`/api/v1/student/gamification/claim/${productChal!.id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    expect(claimRes.body.success).toBe(true);
    expect(claimRes.body.claimedXp).toBe(productChal!.xpReward);
    expect(claimRes.body.newTotalXp).toBe(xpBefore + productChal!.xpReward);

    // Verify claiming a second time throws 400
    await request(app.getHttpServer())
      .post(`/api/v1/student/gamification/claim/${productChal!.id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(400);
  });

  it("4. Should advance challenge and trigger revenue milestone when order.delivered fires", async () => {
    eventEmitter.emit("order.delivered", {
      storeId,
      studentId,
      orderId: "mock-order-id",
      discountAmount: 150,
      totalAmount: 1800,
    });

    const promoChal = await prisma.challenge.findUnique({
      where: { code: "CH_PROMO_CAMPAIGN" },
    });
    expect(promoChal).toBeDefined();

    // Poll until async event listener writes progress to DB (up to 2.5s)
    let progress: any = null;
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 100));
      progress = await prisma.studentProgress.findUnique({
        where: {
          studentId_challengeId: {
            studentId,
            challengeId: promoChal!.id,
          },
        },
      });
      if (progress) break;
    }

    expect(progress).toBeDefined();
    expect(progress!.currentCount).toBeGreaterThanOrEqual(1);
    expect(progress!.isCompleted).toBe(true);
  });

  it("5. Should allow Admin to view platform challenges and gamification overview", async () => {
    const challengesRes = await request(app.getHttpServer())
      .get("/api/v1/admin/gamification/challenges")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(challengesRes.body).toBeInstanceOf(Array);
    expect(challengesRes.body.length).toBeGreaterThanOrEqual(10);

    const overviewRes = await request(app.getHttpServer())
      .get("/api/v1/admin/gamification/overview")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(overviewRes.body.totalStudents).toBeGreaterThanOrEqual(1);
    expect(overviewRes.body.levelDistribution).toBeDefined();
    expect(overviewRes.body.levelDistribution[1]).toBeDefined();
    expect(overviewRes.body.tiers).toHaveLength(6);
  });
});
