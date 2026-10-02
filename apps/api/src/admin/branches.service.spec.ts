import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { BatchStatus, BranchType, UserRole } from "@repo/db";
import { BranchesService } from "./branches.service";

describe("BranchesService (Unit)", () => {
  let prisma: any;
  let service: BranchesService;

  beforeEach(() => {
    prisma = {
      branch: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(async ({ data }: any) => ({ id: "br-1", ...data })),
        update: vi.fn(async ({ data }: any) => ({ id: "br-1", ...data })),
        delete: vi.fn(),
      },
      user: { findUnique: vi.fn() },
      studentBatch: { count: vi.fn().mockResolvedValue(0) },
      batchEnrollment: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      },
      branchManagerAssignment: {
        create: vi.fn(),
        updateMany: vi.fn(),
        findMany: vi.fn(),
      },
      store: { findMany: vi.fn().mockResolvedValue([]) },
      order: { findMany: vi.fn().mockResolvedValue([]) },
      $queryRaw: vi.fn().mockResolvedValue([]),
      $transaction: vi.fn(async (cb: any) => cb(prisma)),
    };
    service = new BranchesService(prisma);
  });

  const physical = { name: "Dhaka Hub", code: "dhk-01", branchType: BranchType.PHYSICAL, address: "Road 1", city: "Dhaka" };

  describe("listBranches", () => {
    it("returns formatted branches with total students rolled up across batches", async () => {
      prisma.branch.findMany.mockResolvedValue([
        {
          id: "br-1",
          name: "Dhaka Campus",
          code: "DHK",
          branchType: BranchType.PHYSICAL,
          address: "Dhanmondi",
          city: "Dhaka",
          contactPhone: "01700000000",
          contactEmail: "dhaka@example.com",
          isActive: true,
          manager: { id: "m-1", fullName: "Manager One", email: "m1@example.com", phone: "01800000000" },
          batches: [
            { id: "b-1", name: "Batch 1", batchCode: "B1", status: BatchStatus.ACTIVE, _count: { enrollments: 15 } },
            { id: "b-2", name: "Batch 2", batchCode: "B2", status: BatchStatus.ACTIVE, _count: { enrollments: 20 } },
          ],
          createdAt: new Date(),
        },
      ]);

      const branches = await service.listBranches();
      expect(branches).toHaveLength(1);
      expect(branches[0]).toMatchObject({
        id: "br-1",
        batchesCount: 2,
        studentsCount: 35,
      });
    });
  });

  describe("getBranchById", () => {
    it("returns branch when found", async () => {
      prisma.branch.findUnique.mockResolvedValue({ id: "br-1", name: "Dhaka Hub" });
      const branch = await service.getBranchById("br-1");
      expect(branch.id).toBe("br-1");
    });

    it("throws NotFoundException when branch is missing", async () => {
      prisma.branch.findUnique.mockResolvedValue(null);
      await expect(service.getBranchById("br-missing")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("createBranch", () => {
    it("rejects a duplicate branch code", async () => {
      prisma.branch.findUnique.mockResolvedValue({ id: "existing" });
      await expect(service.createBranch(physical)).rejects.toBeInstanceOf(ConflictException);
    });

    it("requires address and city for PHYSICAL campuses", async () => {
      prisma.branch.findUnique.mockResolvedValue(null);
      await expect(service.createBranch({ ...physical, address: undefined })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.createBranch({ ...physical, city: "   " })).rejects.toBeInstanceOf(BadRequestException);
    });

    it("allows DIGITAL hubs without a physical address", async () => {
      prisma.branch.findUnique.mockResolvedValue(null);
      await service.createBranch({ name: "Online Hub", code: "web-01", branchType: BranchType.DIGITAL });
      expect(prisma.branch.create).toHaveBeenCalled();
    });

    it("only accepts BRANCH_MANAGER or INSTITUTE_ADMIN users as managers", async () => {
      prisma.branch.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: "u-1", role: UserRole.STUDENT });
      await expect(service.createBranch({ ...physical, managerId: "u-1" })).rejects.toBeInstanceOf(BadRequestException);
    });

    it("opens a manager assignment log on creation", async () => {
      prisma.branch.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: "m-1", role: UserRole.BRANCH_MANAGER });
      await service.createBranch({ ...physical, managerId: "m-1" }, "admin-1");
      expect(prisma.branchManagerAssignment.create).toHaveBeenCalledWith({
        data: { branchId: "br-1", managerId: "m-1", assignedById: "admin-1" },
      });
    });
  });

  describe("updateBranch", () => {
    it("throws NotFoundException when branch does not exist", async () => {
      prisma.branch.findUnique.mockResolvedValue(null);
      await expect(service.updateBranch("br-missing", { name: "New Name" })).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws ConflictException when updating to an already used branch code", async () => {
      prisma.branch.findUnique
        .mockResolvedValueOnce({ id: "br-1", code: "DHK-01" })
        .mockResolvedValueOnce({ id: "br-2", code: "CTG-01" });

      await expect(service.updateBranch("br-1", { code: "CTG-01" })).rejects.toBeInstanceOf(ConflictException);
    });

    it("disallows deactivation while ACTIVE batches exist", async () => {
      prisma.branch.findUnique.mockResolvedValue({ id: "br-1", code: "DHK-01", isActive: true, managerId: null });
      prisma.studentBatch.count.mockResolvedValue(2);
      await expect(service.updateBranch("br-1", { isActive: false })).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.studentBatch.count).toHaveBeenCalledWith({ where: { branchId: "br-1", status: BatchStatus.ACTIVE } });
    });

    it("allows deactivation when no active batches exist", async () => {
      prisma.branch.findUnique.mockResolvedValue({ id: "br-1", code: "DHK-01", isActive: true, managerId: null });
      prisma.studentBatch.count.mockResolvedValue(0);
      const res = await service.updateBranch("br-1", { isActive: false });
      expect(prisma.branch.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isActive: false }) }),
      );
      expect(res.isActive).toBe(false);
    });

    it("validates physical address when branchType or address/city is updated", async () => {
      prisma.branch.findUnique.mockResolvedValue({
        id: "br-1",
        code: "DHK-01",
        branchType: BranchType.DIGITAL,
        address: null,
        city: null,
      });

      await expect(
        service.updateBranch("br-1", { branchType: BranchType.PHYSICAL }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("closes the previous manager's assignment log when reassigning", async () => {
      prisma.branch.findUnique.mockResolvedValue({ id: "br-1", code: "DHK-01", isActive: true, managerId: "m-old" });
      prisma.user.findUnique.mockResolvedValue({ id: "m-new", role: UserRole.INSTITUTE_ADMIN });
      await service.updateBranch("br-1", { managerId: "m-new" }, "admin-1");
      expect(prisma.branchManagerAssignment.updateMany).toHaveBeenCalledWith({
        where: { branchId: "br-1", managerId: "m-old", unassignedAt: null },
        data: { unassignedAt: expect.any(Date) },
      });
      expect(prisma.branchManagerAssignment.create).toHaveBeenCalledWith({
        data: { branchId: "br-1", managerId: "m-new", assignedById: "admin-1" },
      });
    });

    it("unassigns manager when managerId is set to null", async () => {
      prisma.branch.findUnique.mockResolvedValue({ id: "br-1", code: "DHK-01", isActive: true, managerId: "m-old" });
      await service.updateBranch("br-1", { managerId: null as any }, "admin-1");
      expect(prisma.branchManagerAssignment.updateMany).toHaveBeenCalledWith({
        where: { branchId: "br-1", managerId: "m-old", unassignedAt: null },
        data: { unassignedAt: expect.any(Date) },
      });
      expect(prisma.branchManagerAssignment.create).not.toHaveBeenCalled();
    });

    it("updates contact, coordinates, and code fields", async () => {
      prisma.branch.findUnique
        .mockResolvedValueOnce({ id: "br-1", code: "DHK-01", branchType: BranchType.PHYSICAL, address: "Road 1", city: "Dhaka" })
        .mockResolvedValueOnce(null);
      await service.updateBranch("br-1", {
        code: "DHK-02",
        latitude: 23.81,
        longitude: 90.41,
        contactPhone: "01711223344",
        contactEmail: "info@dhaka.com",
        address: "Road 2",
        city: "Dhaka City",
      });
      expect(prisma.branch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: "DHK-02",
            latitude: 23.81,
            longitude: 90.41,
            contactPhone: "01711223344",
            contactEmail: "info@dhaka.com",
            address: "Road 2",
            city: "Dhaka City",
          }),
        }),
      );
    });
  });

  describe("deleteBranch", () => {
    it("throws NotFoundException when branch is missing", async () => {
      prisma.branch.findUnique.mockResolvedValue(null);
      await expect(service.deleteBranch("br-missing")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("refuses to delete a branch with dependent student enrollments", async () => {
      prisma.branch.findUnique.mockResolvedValue({ id: "br-1" });
      prisma.batchEnrollment.count.mockResolvedValue(4);
      await expect(service.deleteBranch("br-1")).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.branch.delete).not.toHaveBeenCalled();
    });

    it("deletes a branch with 0 dependent enrollments", async () => {
      prisma.branch.findUnique.mockResolvedValue({ id: "br-1" });
      prisma.batchEnrollment.count.mockResolvedValue(0);
      prisma.branch.delete.mockResolvedValue({ id: "br-1" });

      const result = await service.deleteBranch("br-1");
      expect(result).toEqual({ id: "br-1", deleted: true });
      expect(prisma.branch.delete).toHaveBeenCalledWith({ where: { id: "br-1" } });
    });
  });

  describe("getManagerHistory", () => {
    it("returns assignment history sorted by assignedAt desc", async () => {
      prisma.branch.findUnique.mockResolvedValue({ id: "br-1" });
      prisma.branchManagerAssignment.findMany.mockResolvedValue([{ id: "assign-1" }]);

      const history = await service.getManagerHistory("br-1");
      expect(history).toHaveLength(1);
      expect(prisma.branchManagerAssignment.findMany).toHaveBeenCalledWith({
        where: { branchId: "br-1" },
        orderBy: { assignedAt: "desc" },
      });
    });
  });

  describe("getBranchMetrics", () => {
    it("maps raw query rollup rows to structured metrics", async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          id: "br-1",
          name: "Dhaka Hub",
          code: "DHK",
          branch_type: BranchType.PHYSICAL,
          city: "Dhaka",
          is_active: true,
          manager_name: "Manager One",
          manager_phone: "01700000000",
          total_batches: "3",
          active_students_count: "50",
          total_revenue_generated: "150000.50",
        },
      ]);

      const metrics = await service.getBranchMetrics();
      expect(metrics[0]).toMatchObject({
        id: "br-1",
        totalBatches: 3,
        activeStudentsCount: 50,
        totalRevenueGenerated: 150000.5,
      });
    });
  });

  describe("getBranchAnalytics", () => {
    it("aggregates student enrollments, active stores, and gross sales for branch", async () => {
      prisma.branch.findUnique.mockResolvedValue({
        id: "br-1",
        name: "Dhaka Hub",
        batches: [{ id: "batch-1" }, { id: "batch-2" }],
      });
      prisma.batchEnrollment.findMany.mockResolvedValue([
        { studentId: "s1" },
        { studentId: "s2" },
        { studentId: "s1" }, // duplicate enrolled student
      ]);
      prisma.store.findMany.mockResolvedValue([
        { id: "store-1", status: "ACTIVE" },
        { id: "store-2", status: "SUSPENDED" },
      ]);
      prisma.order.findMany.mockResolvedValue([
        { totalAmount: "1200.50" },
        { totalAmount: "800.25" },
      ]);

      const analytics = await service.getBranchAnalytics("br-1");
      expect(analytics).toEqual({
        branchId: "br-1",
        branchName: "Dhaka Hub",
        totalBatches: 2,
        totalStudents: 2, // unique students s1, s2
        activeStores: 1,
        grossSales: 2000.75,
      });
    });
  });
});
