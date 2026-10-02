import { ConflictException, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { Prisma, SalarySheetStatus } from "@repo/db";
import { PrismaService } from "../prisma/prisma.service";

type Money = number | string | Prisma.Decimal;
const round2 = (n: number) => Math.round(n * 100) / 100;

export class PayrollAlreadyFinalizedException extends ConflictException {
  constructor(month: string) {
    super(`Payroll for ${month} is FINALIZED; its records are sealed`);
  }
}

export function computeNetPay(base: Money, commissions: Money, penalties: Money): number {
  return round2(Number(base) + Number(commissions) - Number(penalties));
}

/** [start, end) UTC window for a YYYY-MM billing month. */
export function monthWindow(month: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) throw new BadRequestException("Billing month must be formatted YYYY-MM");
  const year = Number(match[1]);
  const index = Number(match[2]) - 1;
  return { start: new Date(Date.UTC(year, index, 1)), end: new Date(Date.UTC(year, index + 1, 1)) };
}

export const monthOf = (date: Date) => date.toISOString().slice(0, 7);

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async assertMonthOpen(month: string) {
    const sheet = await this.prisma.salarySheet.findUnique({ where: { month } });
    if (sheet?.status === SalarySheetStatus.FINALIZED) throw new PayrollAlreadyFinalizedException(month);
  }

  /** Builds (or rebuilds) the DRAFT salary sheet from approved commissions and penalties. */
  async generate(month: string, userId: string) {
    const { start, end } = monthWindow(month);
    const existing = await this.prisma.salarySheet.findUnique({ where: { month } });
    if (existing?.status === SalarySheetStatus.FINALIZED) throw new PayrollAlreadyFinalizedException(month);

    const rows = await this.prisma.$queryRaw<
      Array<{ employee_id: string; base_salary: Money; total_commissions: Money; total_penalties: Money }>
    >`
      SELECT
        e.id AS employee_id,
        e.base_salary,
        COALESCE((
          SELECT SUM(ec.amount) FROM employee_commissions ec
          WHERE ec.employee_id = e.id AND ec.status = 'APPROVED'
            AND ec.created_at >= ${start} AND ec.created_at < ${end}
        ), 0) AS total_commissions,
        COALESCE((
          SELECT SUM(ep.amount) FROM employee_penalties ep
          WHERE ep.employee_id = e.id AND ep.status = 'APPROVED' AND ep.effective_month = ${month}
        ), 0) AS total_penalties
      FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE e.is_active = true
      ORDER BY u.full_name ASC
    `;

    const lines = rows.map((r) => ({
      employeeId: r.employee_id,
      baseSalary: Number(r.base_salary),
      commissions: Number(r.total_commissions),
      penalties: Number(r.total_penalties),
      netPayable: computeNetPay(r.base_salary, r.total_commissions, r.total_penalties),
    }));
    const sum = (key: keyof (typeof lines)[number]) => round2(lines.reduce((s, l) => s + Number(l[key]), 0));

    await this.prisma.$transaction(async (tx) => {
      const sheet = await tx.salarySheet.upsert({
        where: { month },
        create: { month, generatedById: userId },
        update: { generatedById: userId },
      });
      await tx.salarySheetLine.deleteMany({ where: { salarySheetId: sheet.id } });
      await tx.salarySheetLine.createMany({ data: lines.map((l) => ({ ...l, salarySheetId: sheet.id })) });
      await tx.salarySheet.update({
        where: { id: sheet.id },
        data: {
          status: SalarySheetStatus.DRAFT,
          totalBase: sum("baseSalary"),
          totalCommissions: sum("commissions"),
          totalPenalties: sum("penalties"),
          totalNetPayable: sum("netPayable"),
        },
      });
    });

    return this.get(month);
  }

  async finalize(month: string, userId: string) {
    const sheet = await this.prisma.salarySheet.findUnique({ where: { month } });
    if (!sheet) throw new NotFoundException(`No salary sheet generated for ${month}`);
    if (sheet.status === SalarySheetStatus.FINALIZED) throw new PayrollAlreadyFinalizedException(month);
    await this.prisma.salarySheet.update({
      where: { month },
      data: { status: SalarySheetStatus.FINALIZED, finalizedById: userId, finalizedAt: new Date() },
    });
    return this.get(month);
  }

  async get(month: string) {
    const sheet = await this.prisma.salarySheet.findUnique({
      where: { month },
      include: {
        lines: {
          include: { employee: { select: { employeeCode: true, designation: true, user: { select: { fullName: true } } } } },
        },
      },
    });
    if (!sheet) throw new NotFoundException(`No salary sheet generated for ${month}`);
    return {
      ...sheet,
      totalBase: Number(sheet.totalBase),
      totalCommissions: Number(sheet.totalCommissions),
      totalPenalties: Number(sheet.totalPenalties),
      totalNetPayable: Number(sheet.totalNetPayable),
      lines: sheet.lines.map((l) => ({
        ...l,
        baseSalary: Number(l.baseSalary),
        commissions: Number(l.commissions),
        penalties: Number(l.penalties),
        netPayable: Number(l.netPayable),
      })),
    };
  }
}
