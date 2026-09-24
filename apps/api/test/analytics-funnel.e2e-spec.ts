import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { FunnelEventType } from "@repo/db";

describe("Store Analytics & Coaching Engine (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let studentToken: string;
  let studentId: string;
  let storeSlug: string;
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
      where: { studentId, slug: "apex-gadgets" },
    });
    storeId = store!.id;
    storeSlug = store!.slug;

    // Clean up test funnel events for clean metrics state
    await prisma.storeFunnelEvent.deleteMany({
      where: { storeId },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("1. Should reject invalid funnel event types with 400 Bad Request", async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/stores/${storeSlug}/events`)
      .send({
        sessionId: "test-sess-001",
        eventType: "INVALID_EVENT_TYPE",
      })
      .expect(400);
  });

  it("2. Should return 404 if store slug does not exist", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/stores/non-existent-store-slug/events")
      .send({
        sessionId: "test-sess-001",
        eventType: FunnelEventType.PAGE_VIEW,
      })
      .expect(404);
  });

  it("3. Should ingest public storefront funnel beacon events", async () => {
    const session1 = "test-session-101";
    const session2 = "test-session-102";

    // Session 1: Full funnel (PAGE_VIEW -> PRODUCT_VIEW -> ADD_TO_CART -> CHECKOUT_INITIATED)
    const pageViewRes = await request(app.getHttpServer())
      .post(`/api/v1/stores/${storeSlug}/events`)
      .send({
        sessionId: session1,
        eventType: FunnelEventType.PAGE_VIEW,
        metadata: { path: "/", referrer: "direct" },
      })
      .expect(201);

    expect(pageViewRes.body.success).toBe(true);
    expect(pageViewRes.body.eventId).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/v1/stores/${storeSlug}/events`)
      .send({
        sessionId: session1,
        eventType: FunnelEventType.PRODUCT_VIEW,
        metadata: { path: "/products/apex-headphones" },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/stores/${storeSlug}/events`)
      .send({
        sessionId: session1,
        eventType: FunnelEventType.ADD_TO_CART,
        metadata: { quantity: 1 },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/stores/${storeSlug}/events`)
      .send({
        sessionId: session1,
        eventType: FunnelEventType.CHECKOUT_INITIATED,
        metadata: { subtotal: 4200 },
      })
      .expect(201);

    // Session 2: Drop off after PAGE_VIEW
    await request(app.getHttpServer())
      .post(`/api/v1/stores/${storeSlug}/events`)
      .send({
        sessionId: session2,
        eventType: FunnelEventType.PAGE_VIEW,
        metadata: { path: "/" },
      })
      .expect(201);
  });

  it("4. Should reject unauthenticated funnel metrics request with 401 Unauthorized", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/student/analytics/funnel")
      .expect(401);
  });

  it("5. Should calculate and return funnel drop-offs, conversion rates, and coaching advice for student", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/student/analytics/funnel?range=30d")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    const body = res.body;

    // Verify raw counts
    expect(body.visitors).toBe(2); // session1 and session2
    expect(body.productViews).toBe(1);
    expect(body.addToCarts).toBe(1);
    expect(body.checkoutsInitiated).toBe(1);
    expect(body.completedOrders).toBeGreaterThanOrEqual(0);

    // Verify rates and calculations
    expect(typeof body.conversionRatePercent).toBe("number");
    expect(typeof body.averageOrderValue).toBe("number");
    expect(typeof body.cartAbandonmentPercent).toBe("number");

    // Verify stage drop-offs
    expect(body.stageDropOffs).toBeDefined();
    expect(body.stageDropOffs.visitorToViewDropOff).toBe(50); // (2 - 1) / 2 = 50%
    expect(body.stageDropOffs.viewToCartDropOff).toBe(0); // 1 view -> 1 cart = 0%
    expect(body.stageDropOffs.cartToCheckoutDropOff).toBe(0); // 1 cart -> 1 checkout = 0%

    // Verify rule-based coaching advice
    expect(body.coachingAdvice).toBeDefined();
    expect(body.coachingAdvice.diagnosis).toBeDefined();
    expect(body.coachingAdvice.message).toBeDefined();
    expect(body.coachingAdvice.actionType).toBeDefined();
    expect(body.coachingAdvice.actionLabel).toBeDefined();
    expect(["HIGH", "MEDIUM", "LOW"]).toContain(body.coachingAdvice.priority);
  });

  it("6. Should support alternate date ranges (7d, 90d)", async () => {
    const res7d = await request(app.getHttpServer())
      .get("/api/v1/student/analytics/funnel?range=7d")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    expect(res7d.body.range).toBe("7d");
    expect(res7d.body.visitors).toBe(2);

    const res90d = await request(app.getHttpServer())
      .get("/api/v1/student/analytics/funnel?range=90d")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    expect(res90d.body.range).toBe("90d");
    expect(res90d.body.visitors).toBe(2);
  });
});
