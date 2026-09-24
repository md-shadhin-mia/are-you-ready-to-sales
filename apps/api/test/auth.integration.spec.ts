import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Auth Flow Integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testEmail = `test_student_${Date.now()}@example.com`;

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
  });

  afterAll(async () => {
    // Cleanup test user
    await prisma.user.deleteMany({
      where: { email: { contains: "test_student_" } },
    });
    await app.close();
  });

  let accessToken: string;
  let refreshToken: string;

  it("should register a new student successfully", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email: testEmail,
        password: "Password123!",
        fullName: "Integration Test Student",
        phone: "+8801811223344",
      })
      .expect(201);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.role).toBe("STUDENT");
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it("should reject duplicate email registration with 409 Conflict", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email: testEmail,
        password: "Password123!",
        fullName: "Duplicate Student",
      })
      .expect(409);
  });

  it("should login with registered credentials", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: testEmail,
        password: "Password123!",
      })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it("should retrieve profile with valid access token", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.email).toBe(testEmail);
    expect(res.body.fullName).toBe("Integration Test Student");
  });

  it("should rotate tokens via refresh endpoint", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it("should logout and invalidate refresh token", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    // Old refresh token should now fail
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken })
      .expect(401);
  });
});
