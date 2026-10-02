import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BatchStatus, BranchType, EnrollmentStatus, OrderStatus, UserRole } from "@repo/db";
import { CreateBranchDto, UpdateBranchDto } from "./dto/campus.dto";

export { CreateBranchDto, UpdateBranchDto };

const MANAGER_ROLES: string[] = [UserRole.BRANCH_MANAGER, UserRole.INSTITUTE_ADMIN];
const MANAGER_SELECT = { id: true, fullName: true, email: true } as const;

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async listBranches() {
    const branches = await this.prisma.branch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        manager: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        batches: {
          select: {
            id: true,
            name: true,
            batchCode: true,
            status: true,
            _count: { select: { enrollments: true } },
          },
        },
      },
    });

    return branches.map((b) => {
      const totalStudents = b.batches.reduce((acc, batch) => acc + batch._count.enrollments, 0);
      return {
        id: b.id,
        name: b.name,
        code: b.code,
        branchType: b.branchType,
        address: b.address,
        city: b.city,
        contactPhone: b.contactPhone,
        contactEmail: b.contactEmail,
        isActive: b.isActive,
        manager: b.manager,
        batchesCount: b.batches.length,
        studentsCount: totalStudents,
        createdAt: b.createdAt,
      };
    });
  }

  async getBranchById(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, fullName: true, email: true, phone: true } },
        batches: {
          include: {
            instructor: { select: { id: true, fullName: true, email: true } },
            _count: { select: { enrollments: true } },
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID "${id}" not found`);
    }

    return branch;
  }

  private assertPhysicalAddress(branchType: BranchType, address?: string | null, city?: string | null) {
    if (branchType === BranchType.PHYSICAL && (!address?.trim() || !city?.trim())) {
      throw new BadRequestException("PHYSICAL campuses require a street address and city");
    }
  }

  private async assertEligibleManager(managerId: string) {
    const manager = await this.prisma.user.findUnique({ where: { id: managerId } });
    if (!manager || !MANAGER_ROLES.includes(manager.role)) {
      throw new BadRequestException("Branch managers must hold the BRANCH_MANAGER or INSTITUTE_ADMIN role");
    }
  }

  async createBranch(dto: CreateBranchDto, assignedById?: string) {
    const code = dto.code.toUpperCase();
    if (await this.prisma.branch.findUnique({ where: { code } })) {
      throw new ConflictException(`Branch code "${dto.code}" is already in use`);
    }

    const branchType = dto.branchType || BranchType.PHYSICAL;
    this.assertPhysicalAddress(branchType, dto.address, dto.city);
    if (dto.managerId) await this.assertEligibleManager(dto.managerId);

    return this.prisma.$transaction(async (tx) => {
      const branch = await tx.branch.create({
        data: {
          name: dto.name,
          code,
          branchType,
          address: dto.address,
          city: dto.city,
          latitude: dto.latitude,
          longitude: dto.longitude,
          contactPhone: dto.contactPhone,
          contactEmail: dto.contactEmail,
          managerId: dto.managerId,
        },
        include: { manager: { select: MANAGER_SELECT } },
      });
      if (dto.managerId) {
        await tx.branchManagerAssignment.create({
          data: { branchId: branch.id, managerId: dto.managerId, assignedById },
        });
      }
      return branch;
    });
  }

  async updateBranch(id: string, dto: UpdateBranchDto, assignedById?: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Branch with ID "${id}" not found`);
    }

    if (dto.code && dto.code.toUpperCase() !== branch.code) {
      if (await this.prisma.branch.findUnique({ where: { code: dto.code.toUpperCase() } })) {
        throw new ConflictException(`Branch code "${dto.code}" is already in use`);
      }
    }

    if (dto.isActive === false && branch.isActive) {
      const activeBatches = await this.prisma.studentBatch.count({ where: { branchId: id, status: BatchStatus.ACTIVE } });
      if (activeBatches > 0) {
        throw new ConflictException(`Cannot deactivate a campus with ${activeBatches} ACTIVE batch(es)`);
      }
    }

    if (dto.branchType || dto.address !== undefined || dto.city !== undefined) {
      this.assertPhysicalAddress(
        dto.branchType ?? branch.branchType,
        dto.address !== undefined ? dto.address : branch.address,
        dto.city !== undefined ? dto.city : branch.city,
      );
    }

    const managerChanged = dto.managerId !== undefined && dto.managerId !== branch.managerId;
    if (managerChanged && dto.managerId) await this.assertEligibleManager(dto.managerId);

    return this.prisma.$transaction(async (tx) => {
      if (managerChanged) {
        if (branch.managerId) {
          await tx.branchManagerAssignment.updateMany({
            where: { branchId: id, managerId: branch.managerId, unassignedAt: null },
            data: { unassignedAt: new Date() },
          });
        }
        if (dto.managerId) {
          await tx.branchManagerAssignment.create({ data: { branchId: id, managerId: dto.managerId, assignedById } });
        }
      }

      return tx.branch.update({
        where: { id },
        data: {
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.code ? { code: dto.code.toUpperCase() } : {}),
          ...(dto.branchType ? { branchType: dto.branchType } : {}),
          ...(dto.address !== undefined ? { address: dto.address } : {}),
          ...(dto.city !== undefined ? { city: dto.city } : {}),
          ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
          ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
          ...(dto.contactPhone !== undefined ? { contactPhone: dto.contactPhone } : {}),
          ...(dto.contactEmail !== undefined ? { contactEmail: dto.contactEmail } : {}),
          ...(dto.managerId !== undefined ? { managerId: dto.managerId } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        include: { manager: { select: MANAGER_SELECT } },
      });
    });
  }

  async deleteBranch(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Branch with ID "${id}" not found`);
    }

    const enrollments = await this.prisma.batchEnrollment.count({
      where: { batch: { branchId: id }, status: { not: EnrollmentStatus.DROPPED } },
    });
    if (enrollments > 0) {
      throw new ConflictException(`Branch has ${enrollments} dependent student enrollment(s); deactivate it instead`);
    }

    await this.prisma.branch.delete({ where: { id } });
    return { id, deleted: true };
  }

  async getManagerHistory(id: string) {
    await this.getBranchById(id);
    return this.prisma.branchManagerAssignment.findMany({
      where: { branchId: id },
      orderBy: { assignedAt: "desc" },
    });
  }

  /**
   * Operational rollup for every campus. Enrollments are de-duplicated per student in a CTE
   * so revenue is not multiplied when a student sits in several batches of the same branch.
   */
  async getBranchMetrics() {
    const rows = await this.prisma.$queryRaw<any[]>`
      WITH branch_students AS (
        SELECT DISTINCT sb.branch_id, be.student_id
        FROM batch_enrollments be
        JOIN student_batches sb ON sb.id = be.batch_id
        WHERE be.status = 'ENROLLED' AND sb.branch_id IS NOT NULL
      ),
      branch_revenue AS (
        SELECT bs.branch_id, SUM(o.total_amount) AS total
        FROM branch_students bs
        JOIN stores s ON s.student_id = bs.student_id
        JOIN orders o ON o.store_id = s.id AND o.status = ${OrderStatus.COMPLETE}::"OrderStatus"
        GROUP BY bs.branch_id
      )
      SELECT
        b.id, b.name, b.code, b.branch_type, b.city, b.is_active,
        u.full_name AS manager_name, u.phone AS manager_phone,
        (SELECT COUNT(*) FROM student_batches sb WHERE sb.branch_id = b.id) AS total_batches,
        (SELECT COUNT(*) FROM branch_students bs WHERE bs.branch_id = b.id) AS active_students_count,
        COALESCE(r.total, 0) AS total_revenue_generated
      FROM branches b
      LEFT JOIN users u ON b.manager_id = u.id
      LEFT JOIN branch_revenue r ON r.branch_id = b.id
      ORDER BY b.created_at DESC
    `;

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      branchType: r.branch_type,
      city: r.city,
      isActive: r.is_active,
      managerName: r.manager_name,
      managerPhone: r.manager_phone,
      totalBatches: Number(r.total_batches),
      activeStudentsCount: Number(r.active_students_count),
      totalRevenueGenerated: Number(r.total_revenue_generated),
    }));
  }

  async getBranchAnalytics(id: string) {
    const branch = await this.getBranchById(id);

    const batchIds = branch.batches.map((b) => b.id);
    const enrollments = await this.prisma.batchEnrollment.findMany({
      where: { batchId: { in: batchIds } },
      select: { studentId: true },
    });

    const studentIds = Array.from(new Set(enrollments.map((e) => e.studentId)));

    const stores = await this.prisma.store.findMany({
      where: { studentId: { in: studentIds } },
      select: { id: true, status: true },
    });

    const storeIds = stores.map((s) => s.id);

    const orders = await this.prisma.order.findMany({
      where: {
        storeId: { in: storeIds },
        status: { in: [OrderStatus.COMPLETE, OrderStatus.DELIVERED, OrderStatus.PAID] },
      },
      select: { totalAmount: true },
    });

    const grossSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    return {
      branchId: branch.id,
      branchName: branch.name,
      totalBatches: branch.batches.length,
      totalStudents: studentIds.length,
      activeStores: stores.filter((s) => s.status === "ACTIVE").length,
      grossSales: Math.round(grossSales * 100) / 100,
    };
  }
}
