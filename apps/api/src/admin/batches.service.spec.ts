import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { BatchStatus, EnrollmentStatus, OrderStatus, UserRole } from "@repo/db";
import { BatchesService, BatchStateMachine } from "./batches.service";

describe("BatchesService (Unit)", () => {
  let prisma: any;
  let service: BatchesService;
  let lockSql: string;

  const students = (ids: string[], overrides: any = {}) =>
    ids.map((id) => ({ id, role: UserRole.STUDENT, isActive: true, ...overrides }));

  beforeEach(() => {
    lockSql = "";
    prisma = {
      studentBatch: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(async ({ data }: any) => ({ id: "b-1", ...data })),
        update: vi.fn(async ({ data }: any) => ({ id: "b-1", ...data })),
      },
      user: { findMany: vi.fn() },
      batchEnrollment: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        createMany: vi.fn(),
        updateMany: vi.fn(),
      },
      store: { findMany: vi.fn().mockResolvedValue([]) },
      order: { findMany: vi.fn().mockResolvedValue([]) },
      $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
        lockSql = strings.join("?");
        return [{ id: "b-1", status: BatchStatus.ACTIVE, max_capacity: 2 }];
      }),
      $transaction: vi.fn(async (cb: any) => cb(prisma)),
    };
    service = new BatchesService(prisma);
  });

  describe("state machine", () => {
    it("allows UPCOMING -> ACTIVE -> COMPLETED", () => {
      expect(() => BatchStateMachine.validate(BatchStatus.UPCOMING, BatchStatus.ACTIVE)).not.toThrow();
      expect(() => BatchStateMachine.validate(BatchStatus.ACTIVE, BatchStatus.COMPLETED)).not.toThrow();
    });

    it("rejects backwards or skipped transitions", () => {
      expect(() => BatchStateMachine.validate(BatchStatus.COMPLETED, BatchStatus.ACTIVE)).toThrow(BadRequestException);
      expect(() => BatchStateMachine.validate(BatchStatus.UPCOMING, BatchStatus.COMPLETED)).toThrow(BadRequestException);
    });
  });

  describe("listBatches", () => {
    it("lists batches with optional branchId and status filters", async () => {
      prisma.studentBatch.findMany.mockResolvedValue([
        {
          id: "b-1",
          name: "Cohort 1",
          batchCode: "C1",
          branch: { id: "br-1", name: "Dhaka", code: "DHK" },
          instructor: { id: "u-inst", fullName: "Instructor", email: "inst@example.com" },
          startDate: new Date(),
          endDate: null,
          maxCapacity: 50,
          status: BatchStatus.ACTIVE,
          _count: { enrollments: 12 },
          createdAt: new Date(),
        },
      ]);

      const batches = await service.listBatches({ branchId: "br-1", status: BatchStatus.ACTIVE });
      expect(prisma.studentBatch.findMany).toHaveBeenCalledWith({
        where: { branchId: "br-1", status: BatchStatus.ACTIVE },
        orderBy: { startDate: "desc" },
        include: expect.any(Object),
      });
      expect(batches[0].enrolledStudentsCount).toBe(12);
    });
  });

  describe("getBatchById", () => {
    it("returns batch with details when found", async () => {
      prisma.studentBatch.findUnique.mockResolvedValue({ id: "b-1", name: "Cohort 1" });
      const batch = await service.getBatchById("b-1");
      expect(batch.id).toBe("b-1");
    });

    it("throws NotFoundException when batch is missing", async () => {
      prisma.studentBatch.findUnique.mockResolvedValue(null);
      await expect(service.getBatchById("missing")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("createBatch", () => {
    it("throws ConflictException if batch code is already in use", async () => {
      prisma.studentBatch.findUnique.mockResolvedValue({ id: "existing" });
      await expect(
        service.createBatch({
          name: "Batch 1",
          batchCode: "B1",
          startDate: new Date().toISOString(),
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("creates batch with status UPCOMING if startDate is in the future", async () => {
      prisma.studentBatch.findUnique.mockResolvedValue(null);
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      await service.createBatch({
        name: "Future Batch",
        batchCode: "FB-01",
        startDate: futureDate,
      } as any);

      expect(prisma.studentBatch.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            batchCode: "FB-01",
            status: BatchStatus.UPCOMING,
            maxCapacity: 50,
          }),
        }),
      );
    });

    it("creates batch with status ACTIVE if startDate is in the past", async () => {
      prisma.studentBatch.findUnique.mockResolvedValue(null);
      const pastDate = new Date(Date.now() - 86400000).toISOString();

      await service.createBatch({
        name: "Active Batch",
        batchCode: "AB-01",
        startDate: pastDate,
        maxCapacity: 30,
        endDate: new Date().toISOString(),
      } as any);

      expect(prisma.studentBatch.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: BatchStatus.ACTIVE,
            maxCapacity: 30,
          }),
        }),
      );
    });
  });

  describe("updateBatch", () => {
    it("throws NotFoundException when updating missing batch", async () => {
      prisma.studentBatch.findUnique.mockResolvedValue(null);
      await expect(service.updateBatch("b-missing", { name: "New" })).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws BadRequestException when reducing capacity below currently enrolled count", async () => {
      prisma.studentBatch.findUnique.mockResolvedValue({ id: "b-1", batchCode: "B1", status: BatchStatus.ACTIVE });
      prisma.batchEnrollment.count.mockResolvedValue(25);

      await expect(service.updateBatch("b-1", { maxCapacity: 20 })).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws ConflictException when updating batch code to an already taken code", async () => {
      prisma.studentBatch.findUnique
        .mockResolvedValueOnce({ id: "b-1", batchCode: "OLD-CODE", status: BatchStatus.ACTIVE })
        .mockResolvedValueOnce({ id: "b-2", batchCode: "NEW-CODE" });

      await expect(service.updateBatch("b-1", { batchCode: "NEW-CODE" })).rejects.toBeInstanceOf(ConflictException);
    });

    it("updates batch details successfully", async () => {
      prisma.studentBatch.findUnique
        .mockResolvedValueOnce({ id: "b-1", batchCode: "B1", status: BatchStatus.UPCOMING })
        .mockResolvedValueOnce(null);
      prisma.batchEnrollment.count.mockResolvedValue(5);

      await service.updateBatch("b-1", {
        name: "Updated Batch",
        batchCode: "B1-NEW",
        branchId: "br-2",
        instructorId: "inst-2",
        startDate: "2026-05-01",
        endDate: "2026-08-01",
        maxCapacity: 40,
        status: BatchStatus.ACTIVE,
      });

      expect(prisma.studentBatch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "b-1" },
          data: expect.objectContaining({
            name: "Updated Batch",
            batchCode: "B1-NEW",
            branchId: "br-2",
            instructorId: "inst-2",
            maxCapacity: 40,
            status: BatchStatus.ACTIVE,
          }),
        }),
      );
    });

    it("handles partial updates with empty dto", async () => {
      prisma.studentBatch.findUnique.mockResolvedValue({ id: "b-1", batchCode: "B1", status: BatchStatus.UPCOMING });
      await service.updateBatch("b-1", {});
      expect(prisma.studentBatch.update).toHaveBeenCalledWith({ where: { id: "b-1" }, data: {} });
    });
  });

  describe("bulkEnrollStudents()", () => {
    it("locks the batch row with SELECT ... FOR UPDATE inside one transaction", async () => {
      prisma.user.findMany.mockResolvedValue(students(["s1"]));
      await service.bulkEnrollStudents("b-1", ["s1"]);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(lockSql).toMatch(/FOR UPDATE/);
      expect(prisma.batchEnrollment.createMany).toHaveBeenCalledWith({
        data: [{ batchId: "b-1", studentId: "s1", status: EnrollmentStatus.ENROLLED }],
      });
    });

    it("rejects enrollment into a COMPLETED batch", async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: "b-1", status: BatchStatus.COMPLETED, max_capacity: 50 }]);
      await expect(service.bulkEnrollStudents("b-1", ["s1"])).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws NotFound for an unknown batch", async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      await expect(service.bulkEnrollStudents("nope", ["s1"])).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects when enrolled + new students exceed max capacity", async () => {
      prisma.batchEnrollment.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue(students(["s1", "s2"]));
      await expect(service.bulkEnrollStudents("b-1", ["s1", "s2"])).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.batchEnrollment.createMany).not.toHaveBeenCalled();
    });

    it("does not count students who are already enrolled against capacity", async () => {
      prisma.batchEnrollment.count.mockResolvedValue(2);
      prisma.batchEnrollment.findMany.mockResolvedValue([{ studentId: "s1", status: EnrollmentStatus.ENROLLED }]);
      prisma.user.findMany.mockResolvedValue(students(["s1"]));
      const result = await service.bulkEnrollStudents("b-1", ["s1"]);
      expect(result).toMatchObject({ enrolledCount: 1, newlyEnrolled: 0 });
    });

    it("re-enrolls students previously marked DROPPED", async () => {
      prisma.batchEnrollment.count.mockResolvedValue(1);
      prisma.batchEnrollment.findMany.mockResolvedValue([{ studentId: "s1", status: EnrollmentStatus.DROPPED }]);
      prisma.user.findMany.mockResolvedValue(students(["s1"]));
      await service.bulkEnrollStudents("b-1", ["s1"]);
      expect(prisma.batchEnrollment.updateMany).toHaveBeenCalledWith({
        where: { batchId: "b-1", studentId: { in: ["s1"] } },
        data: { status: EnrollmentStatus.ENROLLED },
      });
    });

    it("rejects inactive or non-student accounts", async () => {
      prisma.user.findMany.mockResolvedValue([
        ...students(["s1"]),
        { id: "s2", role: UserRole.SELLER, isActive: true },
      ]);
      await expect(service.bulkEnrollStudents("b-1", ["s1", "s2"])).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects an empty student list", async () => {
      await expect(service.bulkEnrollStudents("b-1", [])).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("getBatchAnalytics", () => {
    it("maps raw query occupancy and graduation analytics", async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          id: "b-1",
          name: "Cohort 1",
          batch_code: "C1",
          start_date: new Date(),
          end_date: null,
          max_capacity: 50,
          status: BatchStatus.ACTIVE,
          branch_name: "Dhaka",
          instructor_name: "Instructor A",
          enrolled_count: "25",
          occupancy_rate_percent: "50.0",
          graduated_count: "5",
        },
        {
          id: "b-2",
          name: "Cohort 2",
          batch_code: "C2",
          start_date: new Date(),
          max_capacity: 0,
          occupancy_rate_percent: null,
          graduated_count: "0",
        },
      ]);

      const analytics = await service.getBatchAnalytics();
      expect(analytics[0]).toEqual(
        expect.objectContaining({
          id: "b-1",
          enrolledCount: 25,
          occupancyRatePercent: 50,
          graduatedCount: 5,
        }),
      );
      expect(analytics[1].occupancyRatePercent).toBe(0);
    });
  });

  describe("getBatchLeaderboard", () => {
    it("calculates commercial leaderboard and rankings sorted by GMV desc", async () => {
      prisma.studentBatch.findUnique.mockResolvedValue({
        id: "b-1",
        name: "Cohort 1",
        batchCode: "C1",
        enrollments: [
          { studentId: "s-1", student: { id: "s-1", fullName: "Student One", email: "s1@example.com" }, status: EnrollmentStatus.ENROLLED },
          { studentId: "s-3", student: { id: "s-3", fullName: "Student Three", email: "s3@example.com" }, status: EnrollmentStatus.ENROLLED },
          { studentId: "s-2", student: { id: "s-2", fullName: "Student Two", email: "s2@example.com" }, status: EnrollmentStatus.ENROLLED },
        ],
      });

      prisma.store.findMany.mockResolvedValue([
        { id: "store-1", studentId: "s-1", storeName: "Store 1", slug: "store-1", ratingAvg: "4.8" },
        { id: "store-3", studentId: "s-3", storeName: "Store 3", slug: "store-3", ratingAvg: null },
      ]);

      prisma.order.findMany.mockResolvedValue([
        { storeId: "store-1", totalAmount: "5000", studentNetProfit: "1000" },
      ]);

      const leaderboard = await service.getBatchLeaderboard("b-1");
      expect(leaderboard.rankings).toHaveLength(3);
      expect(leaderboard.rankings[0]).toMatchObject({
        rank: 1,
        studentId: "s-1",
        gmv: 5000,
        studentProfit: 1000,
        ordersCount: 1,
      });
      expect(leaderboard.rankings[1]).toMatchObject({
        rank: 2,
        studentId: "s-3",
        storeName: "Store 3",
        gmv: 0,
        studentProfit: 0,
        ordersCount: 0,
      });
      expect(leaderboard.rankings[2]).toMatchObject({
        rank: 3,
        studentId: "s-2",
        storeName: "No Store Yet",
        gmv: 0,
        studentProfit: 0,
      });
    });
  });
});
