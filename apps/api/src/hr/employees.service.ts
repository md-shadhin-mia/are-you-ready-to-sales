import { ConflictException, Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { CommissionStatus, Employee, EmployeePenalty, PenaltyStatus, Prisma, UserRole } from "@repo/db";
import { PrismaService } from "../prisma/prisma.service";
import { clampPagination, paginationMeta } from "../common/pagination";
import { ScopedUser, resolveCampusScope } from "../admin/campus-scope";
import { PayrollService, monthOf } from "./payroll.service";

const isSuperAdmin = (viewer?: ScopedUser) => viewer?.role === UserRole.SUPER_ADMIN;

export interface CreateEmployeeInput {
  userId: string;
  employeeCode: string;
  designation: string;
  baseSalary: number;
  branchId?: string;
  joinedAt?: string;
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payroll: PayrollService,
  ) {}

  /** Base salary is confidential to Super Admin. */
  presentEmployee<T extends Pick<Employee, "baseSalary">>(employee: T, viewer?: ScopedUser) {
    return { ...employee, baseSalary: isSuperAdmin(viewer) ? Number(employee.baseSalary) : null };
  }

  /** Supervisor penalty notes are confidential to Super Admin. */
  presentPenalty(penalty: EmployeePenalty, viewer?: ScopedUser) {
    return {
      ...penalty,
      amount: Number(penalty.amount),
      supervisorNotes: isSuperAdmin(viewer) ? penalty.supervisorNotes : null,
    };
  }

  private async assertInScope(employee: { branchId: string | null }, viewer?: ScopedUser) {
    const scope = await resolveCampusScope(this.prisma, viewer);
    if (scope && (!employee.branchId || !scope.includes(employee.branchId))) {
      throw new ForbiddenException("Employee does not belong to a campus you manage");
    }
  }

  async list(query: { search?: string; branchId?: string; page?: string; limit?: string }, viewer?: ScopedUser) {
    const { page, limit, skip } = clampPagination(query);
    const scope = await resolveCampusScope(this.prisma, viewer);
    const where: Prisma.EmployeeWhereInput = {
      ...(scope ? { branchId: { in: scope } } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.search
        ? {
            OR: [
              { employeeCode: { contains: query.search, mode: "insensitive" } },
              { user: { fullName: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
          branch: { select: { id: true, name: true } },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);
    return { data: rows.map((e) => this.presentEmployee(e, viewer)), meta: paginationMeta(page, limit, total) };
  }

  async get(id: string, viewer?: ScopedUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: { select: { fullName: true, email: true, phone: true } }, branch: { select: { id: true, name: true } } },
    });
    if (!employee) throw new NotFoundException("Employee not found");
    await this.assertInScope(employee, viewer);
    return this.presentEmployee(employee, viewer);
  }

  async create(input: CreateEmployeeInput, viewer?: ScopedUser) {
    const [user, existing, codeTaken] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: input.userId } }),
      this.prisma.employee.findUnique({ where: { userId: input.userId } }),
      this.prisma.employee.findUnique({ where: { employeeCode: input.employeeCode } }),
    ]);
    if (!user) throw new NotFoundException("User not found");
    if (existing) throw new ConflictException("User already has an employee record");
    if (codeTaken) throw new ConflictException(`Employee code ${input.employeeCode} is in use`);
    await this.assertInScope({ branchId: input.branchId ?? null }, viewer);

    const employee = await this.prisma.employee.create({
      data: { ...input, joinedAt: input.joinedAt ? new Date(input.joinedAt) : undefined },
    });
    return this.presentEmployee(employee, viewer);
  }

  async update(id: string, input: Partial<Omit<CreateEmployeeInput, "userId">> & { isActive?: boolean }, viewer?: ScopedUser) {
    await this.get(id, viewer);
    const employee = await this.prisma.employee.update({ where: { id }, data: input });
    return this.presentEmployee(employee, viewer);
  }

  // ----- Lead commissions -----

  async addCommission(employeeId: string, input: { amount: number; orderId?: string; notes?: string }, viewer?: ScopedUser) {
    await this.get(employeeId, viewer);
    await this.payroll.assertMonthOpen(monthOf(new Date()));
    const commission = await this.prisma.employeeCommission.create({ data: { employeeId, ...input } });
    return { ...commission, amount: Number(commission.amount) };
  }

  async listCommissions(employeeId: string, viewer?: ScopedUser) {
    await this.get(employeeId, viewer);
    const rows = await this.prisma.employeeCommission.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" } });
    return rows.map((c) => ({ ...c, amount: Number(c.amount) }));
  }

  async approveCommission(id: string, approverId: string) {
    const commission = await this.prisma.employeeCommission.findUnique({ where: { id } });
    if (!commission) throw new NotFoundException("Commission not found");
    if (commission.status !== CommissionStatus.PENDING) {
      throw new ConflictException(`Commission is already ${commission.status}`);
    }
    await this.payroll.assertMonthOpen(monthOf(commission.createdAt));
    const approved = await this.prisma.employeeCommission.update({
      where: { id },
      data: { status: CommissionStatus.APPROVED, approvedById: approverId },
    });
    return { ...approved, amount: Number(approved.amount) };
  }

  // ----- Disciplinary penalties -----

  async addPenalty(
    employeeId: string,
    input: { amount: number; infractionCode: string; supervisorNotes: string; effectiveMonth: string; description?: string },
    viewer?: ScopedUser,
  ) {
    await this.get(employeeId, viewer);
    await this.payroll.assertMonthOpen(input.effectiveMonth);
    const penalty = await this.prisma.employeePenalty.create({ data: { employeeId, ...input } });
    return this.presentPenalty(penalty, viewer);
  }

  async listPenalties(employeeId: string, viewer?: ScopedUser) {
    await this.get(employeeId, viewer);
    const rows = await this.prisma.employeePenalty.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" } });
    return rows.map((p) => this.presentPenalty(p, viewer));
  }

  async decidePenalty(id: string, status: PenaltyStatus, approverId: string, viewer?: ScopedUser) {
    const penalty = await this.prisma.employeePenalty.findUnique({ where: { id } });
    if (!penalty) throw new NotFoundException("Penalty not found");
    if (penalty.status !== PenaltyStatus.PENDING) throw new ConflictException(`Penalty is already ${penalty.status}`);
    await this.payroll.assertMonthOpen(penalty.effectiveMonth);
    const updated = await this.prisma.employeePenalty.update({ where: { id }, data: { status, approvedById: approverId } });
    return this.presentPenalty(updated, viewer);
  }
}
