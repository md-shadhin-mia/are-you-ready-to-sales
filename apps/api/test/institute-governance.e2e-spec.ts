import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { StoreStatus } from "@repo/db";

describe("Institute Executive Operations & Governance (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let studentToken: string;
  let studentStore: any;
  let createdRoleId: string;

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

    // Login student
    const studentLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "student1@platform.local",
        password: "Password123!",
      });
    studentToken = studentLogin.body.accessToken;

    studentStore = await prisma.store.findFirst({
      where: { slug: "apex-gadgets" },
    });
  });

  afterAll(async () => {
    // Restore store status
    if (studentStore) {
      await prisma.store.update({
        where: { id: studentStore.id },
        data: { status: StoreStatus.ACTIVE },
      });
    }

    // Clean up created role
    if (createdRoleId) {
      await prisma.rolePermission.deleteMany({
        where: { roleId: createdRoleId },
      });
      await prisma.userRoleAssignment.deleteMany({
        where: { roleId: createdRoleId },
      });
      await prisma.role.delete({
        where: { id: createdRoleId },
      });
    }

    await app.close();
  });

  it("1. Should return executive dashboard KPIs with GMV, net margins, and liabilities", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/admin/dashboard/kpis")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.platformGMV).toBeDefined();
    expect(typeof res.body.platformGMV).toBe("number");
    expect(res.body.instituteNetRevenue).toBeDefined();
    expect(res.body.outstandingStudentLiabilities).toBeDefined();
    expect(res.body.warehouseBacklogCount).toBeDefined();
    expect(res.body.students.total).toBeGreaterThanOrEqual(1);
    expect(res.body.stores.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.dailyTrends)).toBe(true);
    expect(res.body.dailyTrends.length).toBe(30);
  });

  it("2. Should retrieve filterable list of students with store, level, and subscription", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/admin/students")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.students).toBeDefined();
    expect(Array.isArray(res.body.students)).toBe(true);
    const student = res.body.students.find(
      (s: any) => s.email === "student1@platform.local",
    );
    expect(student).toBeDefined();
    expect(student.store).toBeDefined();
    expect(student.store.name).toBe("Apex Gadgets");
    expect(student.level).toBeDefined();
    expect(student.subscription).toBeDefined();
  });

  it("3. Should suspend student store, blocking storefront traffic via Tenant Middleware", async () => {
    // 1. Suspend store
    const suspendRes = await request(app.getHttpServer())
      .patch(`/api/v1/admin/students/${studentStore.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: StoreStatus.SUSPENDED,
        reason: "Audit policy violation",
      })
      .expect(200);

    expect(suspendRes.body.store.status).toBe(StoreStatus.SUSPENDED);

    // 2. Query storefront with tenant header - middleware must block with 403 Forbidden
    const storefrontRes = await request(app.getHttpServer())
      .get(`/api/v1/stores/${studentStore.slug}/meta`)
      .set("x-tenant-slug", studentStore.slug)
      .expect(403);

    expect(storefrontRes.body.message).toContain("This store has been suspended");

    // 3. Reactivate store
    const reactivateRes = await request(app.getHttpServer())
      .patch(`/api/v1/admin/students/${studentStore.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: StoreStatus.ACTIVE,
        reason: "Reactivated after compliance audit",
      })
      .expect(200);

    expect(reactivateRes.body.store.status).toBe(StoreStatus.ACTIVE);

    // 4. Verify storefront access restored
    await request(app.getHttpServer())
      .get(`/api/v1/stores/${studentStore.slug}/meta`)
      .set("x-tenant-slug", studentStore.slug)
      .expect(200);
  });

  it("4. Should return seller scorecard leaderboard ranked by gross sales", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/admin/sellers/scorecard")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("storeName");
      expect(res.body[0]).toHaveProperty("studentName");
      expect(res.body[0]).toHaveProperty("grossSales");
      expect(res.body[0]).toHaveProperty("ratingAvg");
    }
  });

  it("5. Should create custom staff role and manage dynamic permissions", async () => {
    // 1. Get all available permissions
    const permsRes = await request(app.getHttpServer())
      .get("/api/v1/admin/roles/permissions")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(permsRes.body.all).toBeDefined();
    const orderReadPerm = permsRes.body.all.find(
      (p: any) => p.slug === "orders:read",
    );
    expect(orderReadPerm).toBeDefined();

    // 2. Create custom role "Junior Support Specialist"
    const roleRes = await request(app.getHttpServer())
      .post("/api/v1/admin/roles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: `Junior Support Specialist ${Date.now()}`,
        description: "Frontline customer and order inquiry handler",
        permissionIds: [orderReadPerm.id],
      })
      .expect(201);

    expect(roleRes.body.id).toBeDefined();
    createdRoleId = roleRes.body.id;
    expect(roleRes.body.rolePermissions).toHaveLength(1);

    // 3. List roles to ensure newly created role is present
    const listRes = await request(app.getHttpServer())
      .get("/api/v1/admin/roles")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const created = listRes.body.find((r: any) => r.id === createdRoleId);
    expect(created).toBeDefined();
    expect(created.permissions.some((p: any) => p.slug === "orders:read")).toBe(true);
  });
});
