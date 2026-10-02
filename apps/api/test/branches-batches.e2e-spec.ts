import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { BranchType, BatchStatus, SellerType } from "@repo/db";

describe("Campus Branches, Batches & Sellers Management (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let createdBranchId: string;
  let createdBatchId: string;
  let createdSellerId: string;
  let studentUser: any;

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

    studentUser = await prisma.user.findFirst({
      where: { email: "student1@platform.local" },
    });
  });

  afterAll(async () => {
    if (createdBatchId) {
      await prisma.batchEnrollment.deleteMany({ where: { batchId: createdBatchId } });
      await prisma.studentBatch.delete({ where: { id: createdBatchId } }).catch(() => {});
    }
    if (createdBranchId) {
      await prisma.branch.delete({ where: { id: createdBranchId } }).catch(() => {});
    }
    if (createdSellerId) {
      await prisma.sellerProfile.delete({ where: { id: createdSellerId } }).catch(() => {});
    }
    await app.close();
  });

  it("1. Should create physical campus branch with regional hub mapping", async () => {
    const uniqueCode = `CTG-HUB-${Date.now().toString().slice(-4)}`;
    const res = await request(app.getHttpServer())
      .post("/api/v1/admin/branches")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Chittagong Regional Hub",
        code: uniqueCode,
        branchType: BranchType.PHYSICAL,
        address: "Agrabad Commercial Area",
        city: "Chittagong",
        contactPhone: "01811223344",
        contactEmail: "chittagong@platform.local",
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe("Chittagong Regional Hub");
    expect(res.body.code).toBe(uniqueCode);
    expect(res.body.branchType).toBe(BranchType.PHYSICAL);
    createdBranchId = res.body.id;
  });

  it("2. Should retrieve branches list with student totals and analytics", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/admin/branches")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const branch = res.body.find((b: any) => b.id === createdBranchId);
    expect(branch).toBeDefined();
    expect(branch.name).toBe("Chittagong Regional Hub");

    const analyticsRes = await request(app.getHttpServer())
      .get(`/api/v1/admin/branches/${createdBranchId}/analytics`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(analyticsRes.body.branchId).toBe(createdBranchId);
    expect(analyticsRes.body.totalStudents).toBeDefined();
    expect(analyticsRes.body.grossSales).toBeDefined();
  });

  it("3. Should create student batch cohort tied to campus branch", async () => {
    const uniqueBatchCode = `BATCH-${Date.now().toString().slice(-4)}`;
    const res = await request(app.getHttpServer())
      .post("/api/v1/admin/batches")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Cohort 2026 Spring Sales Champions",
        batchCode: uniqueBatchCode,
        branchId: createdBranchId,
        startDate: new Date().toISOString(),
        maxCapacity: 60,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.batchCode).toBe(uniqueBatchCode);
    expect(res.body.maxCapacity).toBe(60);
    createdBatchId = res.body.id;
  });

  it("4. Should bulk enroll student into batch and prevent duplicates", async () => {
    if (!studentUser) return;

    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/batches/${createdBatchId}/enrollments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        studentIds: [studentUser.id],
      })
      .expect(201);

    expect(res.body.enrolledCount).toBe(1);

    // Enrolling same student again should upsert cleanly
    const resDuplicate = await request(app.getHttpServer())
      .post(`/api/v1/admin/batches/${createdBatchId}/enrollments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        studentIds: [studentUser.id],
      })
      .expect(201);

    expect(resDuplicate.body.enrolledCount).toBe(1);
  });

  it("5. Should return cohort commercial sales leaderboard", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/admin/batches/${createdBatchId}/leaderboard`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.batchId).toBe(createdBatchId);
    expect(res.body.batchCode).toBeDefined();
    expect(Array.isArray(res.body.rankings)).toBe(true);
  });

  it("6. Should onboard and list external merchant / seller partner", async () => {
    const uniqueEmail = `seller-${Date.now()}@wholesaler.com`;
    const res = await request(app.getHttpServer())
      .post("/api/v1/admin/sellers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        companyName: "Prime Electronics Wholesale Ltd",
        sellerType: SellerType.MERCHANT,
        fullName: "Kamal Hossain",
        email: uniqueEmail,
        phone: "01999887766",
        tradeLicenseNumber: "TL-DHAKA-88129",
        commissionRate: 7.5,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.companyName).toBe("Prime Electronics Wholesale Ltd");
    expect(res.body.commissionRate).toBe(7.5);
    createdSellerId = res.body.id;

    // List sellers
    const listRes = await request(app.getHttpServer())
      .get("/api/v1/admin/sellers")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);
    const seller = listRes.body.find((s: any) => s.id === createdSellerId);
    expect(seller).toBeDefined();
  });
});
