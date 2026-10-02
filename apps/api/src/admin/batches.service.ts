import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BatchStatus, EnrollmentStatus, OrderStatus, UserRole } from "@repo/db";
import { CreateBatchDto, UpdateBatchDto } from "./dto/campus.dto";

export { CreateBatchDto, UpdateBatchDto };

/** UPCOMING -> ACTIVE -> COMPLETED; no skipping, no going back. */
export class BatchStateMachine {
  private static readonly NEXT: Record<BatchStatus, BatchStatus[]> = {
    [BatchStatus.UPCOMING]: [BatchStatus.ACTIVE],
    [BatchStatus.ACTIVE]: [BatchStatus.COMPLETED],
    [BatchStatus.COMPLETED]: [],
  };

  static validate(from: BatchStatus, to: BatchStatus) {
    if (from !== to && !this.NEXT[from].includes(to)) {
      throw new BadRequestException(`Illegal batch transition ${from} -> ${to}`);
    }
  }
}

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async listBatches(filters?: { branchId?: string; status?: BatchStatus }) {
    const where: any = {};
    if (filters?.branchId) where.branchId = filters.branchId;
    if (filters?.status) where.status = filters.status;

    const batches = await this.prisma.studentBatch.findMany({
      where,
      orderBy: { startDate: "desc" },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        instructor: { select: { id: true, fullName: true, email: true } },
        _count: { select: { enrollments: true } },
      },
    });

    return batches.map((b) => ({
      id: b.id,
      name: b.name,
      batchCode: b.batchCode,
      branch: b.branch,
      instructor: b.instructor,
      startDate: b.startDate,
      endDate: b.endDate,
      maxCapacity: b.maxCapacity,
      status: b.status,
      enrolledStudentsCount: b._count.enrollments,
      createdAt: b.createdAt,
    }));
  }

  async getBatchById(id: string) {
    const batch = await this.prisma.studentBatch.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        instructor: { select: { id: true, fullName: true, email: true, phone: true } },
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                stores: {
                  select: { id: true, storeName: true, slug: true, status: true },
                },
              },
            },
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException(`Student batch with ID "${id}" not found`);
    }

    return batch;
  }

  async createBatch(dto: CreateBatchDto) {
    const existing = await this.prisma.studentBatch.findUnique({
      where: { batchCode: dto.batchCode.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`Batch code "${dto.batchCode}" is already in use`);
    }

    return this.prisma.studentBatch.create({
      data: {
        name: dto.name,
        batchCode: dto.batchCode.toUpperCase(),
        branchId: dto.branchId,
        instructorId: dto.instructorId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        maxCapacity: dto.maxCapacity || 50,
        status: new Date(dto.startDate) > new Date() ? BatchStatus.UPCOMING : BatchStatus.ACTIVE,
      },
      include: {
        branch: { select: { id: true, name: true } },
        instructor: { select: { id: true, fullName: true } },
      },
    });
  }

  async updateBatch(id: string, dto: UpdateBatchDto) {
    const batch = await this.prisma.studentBatch.findUnique({ where: { id } });
    if (!batch) {
      throw new NotFoundException(`Student batch with ID "${id}" not found`);
    }

    if (dto.status) {
      BatchStateMachine.validate(batch.status, dto.status);
    }

    if (dto.maxCapacity !== undefined) {
      const enrolled = await this.prisma.batchEnrollment.count({
        where: { batchId: id, status: { not: EnrollmentStatus.DROPPED } },
      });
      if (dto.maxCapacity < enrolled) {
        throw new BadRequestException(`Capacity cannot drop below the ${enrolled} students already enrolled`);
      }
    }

    if (dto.batchCode && dto.batchCode.toUpperCase() !== batch.batchCode) {
      const taken = await this.prisma.studentBatch.findUnique({
        where: { batchCode: dto.batchCode.toUpperCase() },
      });
      if (taken) {
        throw new ConflictException(`Batch code "${dto.batchCode}" is already in use`);
      }
    }

    return this.prisma.studentBatch.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.batchCode ? { batchCode: dto.batchCode.toUpperCase() } : {}),
        ...(dto.branchId !== undefined ? { branchId: dto.branchId } : {}),
        ...(dto.instructorId !== undefined ? { instructorId: dto.instructorId } : {}),
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined ? { endDate: dto.endDate ? new Date(dto.endDate) : null } : {}),
        ...(dto.maxCapacity !== undefined ? { maxCapacity: dto.maxCapacity } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }

  /**
   * Enrolls students in one transaction. The batch row is locked FOR UPDATE so concurrent
   * enrollments serialize and can never push the batch past maxCapacity.
   */
  async bulkEnrollStudents(batchId: string, studentIds: string[]) {
    const ids = Array.from(new Set(studentIds));
    if (ids.length === 0) {
      throw new BadRequestException("At least one student is required");
    }

    return this.prisma.$transaction(async (tx) => {
      const [batch] = await tx.$queryRaw<Array<{ id: string; status: BatchStatus; max_capacity: number }>>`
        SELECT id, status, max_capacity FROM student_batches WHERE id = ${batchId} FOR UPDATE
      `;
      if (!batch) {
        throw new NotFoundException(`Batch with ID "${batchId}" not found`);
      }
      if (batch.status === BatchStatus.COMPLETED) {
        throw new BadRequestException("Cannot enroll students into a COMPLETED batch");
      }

      const users = await tx.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, role: true, isActive: true },
      });
      const valid = new Set(users.filter((u) => u.role === UserRole.STUDENT && u.isActive).map((u) => u.id));
      const invalid = ids.filter((id) => !valid.has(id));
      if (invalid.length > 0) {
        throw new BadRequestException(`Not active students: ${invalid.join(", ")}`);
      }

      const existing = await tx.batchEnrollment.findMany({
        where: { batchId, studentId: { in: ids } },
        select: { studentId: true, status: true },
      });
      const alreadyEnrolled = new Set(
        existing.filter((e) => e.status !== EnrollmentStatus.DROPPED).map((e) => e.studentId),
      );
      const dropped = existing.filter((e) => e.status === EnrollmentStatus.DROPPED).map((e) => e.studentId);
      const fresh = ids.filter((id) => !alreadyEnrolled.has(id) && !dropped.includes(id));
      const seatsNeeded = fresh.length + dropped.length;

      const occupied = await tx.batchEnrollment.count({
        where: { batchId, status: { not: EnrollmentStatus.DROPPED } },
      });
      if (occupied + seatsNeeded > batch.max_capacity) {
        throw new ConflictException(
          `Enrollment exceeds max capacity (${batch.max_capacity}). Occupied: ${occupied}, requested new seats: ${seatsNeeded}`,
        );
      }

      if (fresh.length > 0) {
        await tx.batchEnrollment.createMany({
          data: fresh.map((studentId) => ({ batchId, studentId, status: EnrollmentStatus.ENROLLED })),
        });
      }
      if (dropped.length > 0) {
        await tx.batchEnrollment.updateMany({
          where: { batchId, studentId: { in: dropped } },
          data: { status: EnrollmentStatus.ENROLLED },
        });
      }

      return {
        batchId,
        enrolledCount: ids.length,
        newlyEnrolled: seatsNeeded,
        alreadyEnrolled: alreadyEnrolled.size,
        capacityRemaining: batch.max_capacity - occupied - seatsNeeded,
      };
    });
  }

  /** Occupancy and graduation analytics across all batches. */
  async getBatchAnalytics() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        sb.id, sb.name, sb.batch_code, sb.start_date, sb.end_date, sb.max_capacity, sb.status,
        b.name AS branch_name,
        inst.full_name AS instructor_name,
        COUNT(be.id) AS enrolled_count,
        ROUND((COUNT(be.id)::decimal / NULLIF(sb.max_capacity, 0)) * 100, 1) AS occupancy_rate_percent,
        COUNT(be.id) FILTER (WHERE be.status = 'GRADUATED') AS graduated_count
      FROM student_batches sb
      LEFT JOIN branches b ON sb.branch_id = b.id
      LEFT JOIN users inst ON sb.instructor_id = inst.id
      LEFT JOIN batch_enrollments be ON be.batch_id = sb.id
      GROUP BY sb.id, b.id, inst.id
      ORDER BY sb.start_date DESC
    `;

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      batchCode: r.batch_code,
      startDate: r.start_date,
      endDate: r.end_date,
      maxCapacity: r.max_capacity,
      status: r.status,
      branchName: r.branch_name,
      instructorName: r.instructor_name,
      enrolledCount: Number(r.enrolled_count),
      occupancyRatePercent: Number(r.occupancy_rate_percent ?? 0),
      graduatedCount: Number(r.graduated_count),
    }));
  }

  async getBatchLeaderboard(batchId: string) {
    const batch = await this.getBatchById(batchId);

    const studentIds = batch.enrollments.map((e) => e.studentId);

    // Get stores for enrolled students
    const stores = await this.prisma.store.findMany({
      where: { studentId: { in: studentIds } },
      select: {
        id: true,
        studentId: true,
        storeName: true,
        slug: true,
        ratingAvg: true,
        completedOrdersCount: true,
      },
    });

    const storeMap = new Map(stores.map((s) => [s.studentId, s]));
    const storeIds = stores.map((s) => s.id);

    // Aggregate sales per store
    const orders = await this.prisma.order.findMany({
      where: {
        storeId: { in: storeIds },
        status: { in: [OrderStatus.COMPLETE, OrderStatus.DELIVERED, OrderStatus.PAID] },
      },
      select: {
        storeId: true,
        totalAmount: true,
        studentNetProfit: true,
      },
    });

    const salesMap = new Map<string, { gmv: number; profit: number; count: number }>();
    for (const o of orders) {
      const current = salesMap.get(o.storeId) || { gmv: 0, profit: 0, count: 0 };
      salesMap.set(o.storeId, {
        gmv: current.gmv + Number(o.totalAmount),
        profit: current.profit + Number(o.studentNetProfit),
        count: current.count + 1,
      });
    }

    const leaderboard = batch.enrollments.map((e) => {
      const store = storeMap.get(e.studentId);
      const metrics = store ? salesMap.get(store.id) || { gmv: 0, profit: 0, count: 0 } : { gmv: 0, profit: 0, count: 0 };

      return {
        studentId: e.student.id,
        fullName: e.student.fullName,
        email: e.student.email,
        storeName: store?.storeName || "No Store Yet",
        storeSlug: store?.slug || null,
        ratingAvg: store?.ratingAvg ? Number(store.ratingAvg) : 0,
        gmv: Math.round(metrics.gmv * 100) / 100,
        studentProfit: Math.round(metrics.profit * 100) / 100,
        ordersCount: metrics.count,
        enrollmentStatus: e.status,
      };
    });

    leaderboard.sort((a, b) => b.gmv - a.gmv);

    return {
      batchId: batch.id,
      batchName: batch.name,
      batchCode: batch.batchCode,
      totalParticipants: leaderboard.length,
      rankings: leaderboard.map((item, index) => ({
        rank: index + 1,
        ...item,
      })),
    };
  }
}
