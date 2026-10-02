import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { BatchStatus, BranchType, UserRole } from "@repo/db";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapApp, createUser, loginAs, uid } from "./helpers/e2e-app";

describe("Campus Branches & Student Batches (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: string;
  let student: string;
  const branchIds: string[] = [];
  const userIds: string[] = [];

  const api = () => request(app.getHttpServer());
  const code = (p: string) => `${p}-${uid()}`.toUpperCase();

  async function createBranch(overrides: Record<string, unknown> = {}) {
    const res = await api()
      .post("/api/v1/admin/branches")
      .set("Authorization", `Bearer ${admin}`)
      .send({ name: "Sylhet Campus", code: code("SYL"), branchType: BranchType.PHYSICAL, address: "Zindabazar", city: "Sylhet", ...overrides });
    if (res.body?.id) branchIds.push(res.body.id);
    return res;
  }

  async function createBatch(branchId: string, overrides: Record<string, unknown> = {}) {
    return api()
      .post("/api/v1/admin/batches")
      .set("Authorization", `Bearer ${admin}`)
      .send({ name: "Cohort", batchCode: code("B"), branchId, startDate: new Date().toISOString(), ...overrides })
      .expect(201);
  }

  async function newStudents(n: number) {
    const users = await Promise.all(Array.from({ length: n }, () => createUser(app, { role: UserRole.STUDENT })));
    userIds.push(...users.map((u) => u.id));
    return users;
  }

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    admin = await loginAs(app, "instituteAdmin");
    student = await loginAs(app, "student");
  });

  afterAll(async () => {
    await prisma.studentBatch.deleteMany({ where: { branchId: { in: branchIds } } });
    await prisma.branch.deleteMany({ where: { id: { in: branchIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  describe("Branches", () => {
    it("POST /branches returns 201 with a sanitized entity", async () => {
      const manager = await prisma.user.findUniqueOrThrow({ where: { email: "branchmanager@platform.local" } });
      const res = await createBranch({ managerId: manager.id, latitude: 24.8949, longitude: 91.8687 }).then((r) => r);
      expect(res.status).toBe(201);
      expect(res.body.manager).toEqual({ id: manager.id, fullName: manager.fullName, email: manager.email });
      expect(JSON.stringify(res.body)).not.toContain("passwordHash");

      const history = await api()
        .get(`/api/v1/admin/branches/${res.body.id}/manager-history`)
        .set("Authorization", `Bearer ${admin}`)
        .expect(200);
      expect(history.body).toHaveLength(1);
      expect(history.body[0]).toMatchObject({ managerId: manager.id, unassignedAt: null });
    });

    it("POST /branches returns 400 for a PHYSICAL campus without an address", async () => {
      const res = await createBranch({ address: undefined });
      expect(res.status).toBe(400);
    });

    it("POST /branches returns 409 for a duplicate code and 403 for students", async () => {
      const first = await createBranch();
      const dup = await createBranch({ code: first.body.code });
      expect(dup.status).toBe(409);
      await api().post("/api/v1/admin/branches").set("Authorization", `Bearer ${student}`).send({}).expect(403);
    });

    it("PUT /branches/:id returns 409 when deactivating a campus with ACTIVE batches", async () => {
      const branch = await createBranch();
      await createBatch(branch.body.id);
      await api()
        .put(`/api/v1/admin/branches/${branch.body.id}`)
        .set("Authorization", `Bearer ${admin}`)
        .send({ isActive: false })
        .expect(409);
    });

    it("DELETE /branches/:id returns 409 with dependent enrollments and 200 when empty", async () => {
      const busy = await createBranch();
      const batch = await createBatch(busy.body.id);
      const [s] = await newStudents(1);
      await api()
        .post(`/api/v1/admin/batches/${batch.body.id}/enroll`)
        .set("Authorization", `Bearer ${admin}`)
        .send({ studentIds: [s.id] })
        .expect(201);
      await api().delete(`/api/v1/admin/branches/${busy.body.id}`).set("Authorization", `Bearer ${admin}`).expect(409);

      const empty = await createBranch();
      await api().delete(`/api/v1/admin/branches/${empty.body.id}`).set("Authorization", `Bearer ${admin}`).expect(200);
      expect(await prisma.branch.findUnique({ where: { id: empty.body.id } })).toBeNull();
    });

    it("GET /branches/metrics rolls up batches, active students and revenue per campus", async () => {
      const branch = await createBranch();
      const batch = await createBatch(branch.body.id);
      const users = await newStudents(2);
      await api()
        .post(`/api/v1/admin/batches/${batch.body.id}/enroll`)
        .set("Authorization", `Bearer ${admin}`)
        .send({ studentIds: users.map((u) => u.id) })
        .expect(201);

      const res = await api().get("/api/v1/admin/branches/metrics").set("Authorization", `Bearer ${admin}`).expect(200);
      const row = res.body.find((b: any) => b.id === branch.body.id);
      expect(row).toMatchObject({ totalBatches: 1, activeStudentsCount: 2, totalRevenueGenerated: 0 });
    });
  });

  describe("Batches", () => {
    it("POST /batches/:id/enroll returns 400 for a COMPLETED batch", async () => {
      const branch = await createBranch();
      const batch = await createBatch(branch.body.id);
      await api()
        .put(`/api/v1/admin/batches/${batch.body.id}`)
        .set("Authorization", `Bearer ${admin}`)
        .send({ status: BatchStatus.COMPLETED })
        .expect(200);
      const [s] = await newStudents(1);
      await api()
        .post(`/api/v1/admin/batches/${batch.body.id}/enroll`)
        .set("Authorization", `Bearer ${admin}`)
        .send({ studentIds: [s.id] })
        .expect(400);
    });

    it("PUT /batches/:id rejects illegal state transitions (COMPLETED -> ACTIVE)", async () => {
      const branch = await createBranch();
      const batch = await createBatch(branch.body.id);
      const auth = { Authorization: `Bearer ${admin}` };
      await api().put(`/api/v1/admin/batches/${batch.body.id}`).set(auth).send({ status: BatchStatus.COMPLETED }).expect(200);
      await api().put(`/api/v1/admin/batches/${batch.body.id}`).set(auth).send({ status: BatchStatus.ACTIVE }).expect(400);
    });

    it("5 simultaneous enrollments into a capacity-1 batch admit exactly one student", async () => {
      const branch = await createBranch();
      const batch = await createBatch(branch.body.id, { maxCapacity: 1 });
      const users = await newStudents(5);

      const results = await Promise.all(
        users.map((u) =>
          api()
            .post(`/api/v1/admin/batches/${batch.body.id}/enroll`)
            .set("Authorization", `Bearer ${admin}`)
            .send({ studentIds: [u.id] }),
        ),
      );

      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(results.filter((r) => r.status === 409)).toHaveLength(4);
      expect(await prisma.batchEnrollment.count({ where: { batchId: batch.body.id } })).toBe(1);
    });

    it("bulk-enrolls 50+ students atomically and rejects the whole batch if one is invalid", async () => {
      const branch = await createBranch();
      const batch = await createBatch(branch.body.id, { maxCapacity: 60 });
      const users = await newStudents(52);
      const seller = await prisma.user.findUniqueOrThrow({ where: { email: "seller@platform.local" } });

      await api()
        .post(`/api/v1/admin/batches/${batch.body.id}/enroll`)
        .set("Authorization", `Bearer ${admin}`)
        .send({ studentIds: [...users.map((u) => u.id), seller.id] })
        .expect(400);
      expect(await prisma.batchEnrollment.count({ where: { batchId: batch.body.id } })).toBe(0);

      const ok = await api()
        .post(`/api/v1/admin/batches/${batch.body.id}/enroll`)
        .set("Authorization", `Bearer ${admin}`)
        .send({ studentIds: users.map((u) => u.id) })
        .expect(201);
      expect(ok.body).toMatchObject({ enrolledCount: 52, newlyEnrolled: 52, capacityRemaining: 8 });
    });

    it("GET /batches/analytics reports occupancy and graduation per batch", async () => {
      const branch = await createBranch();
      const batch = await createBatch(branch.body.id, { maxCapacity: 4 });
      const users = await newStudents(2);
      await api()
        .post(`/api/v1/admin/batches/${batch.body.id}/enroll`)
        .set("Authorization", `Bearer ${admin}`)
        .send({ studentIds: users.map((u) => u.id) })
        .expect(201);
      await prisma.batchEnrollment.updateMany({ where: { batchId: batch.body.id, studentId: users[0].id }, data: { status: "GRADUATED" } });

      const res = await api().get("/api/v1/admin/batches/analytics").set("Authorization", `Bearer ${admin}`).expect(200);
      const row = res.body.find((b: any) => b.id === batch.body.id);
      expect(row).toMatchObject({ enrolledCount: 2, occupancyRatePercent: 50, graduatedCount: 1, branchName: "Sylhet Campus" });
    });
  });
});
