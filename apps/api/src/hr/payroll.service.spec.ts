import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConflictException } from "@nestjs/common";
import { CommissionStatus, SalarySheetStatus, UserRole } from "@repo/db";
import { PayrollAlreadyFinalizedException, PayrollService, computeNetPay, monthWindow } from "./payroll.service";
import { EmployeesService } from "./employees.service";
import { CommissionRevocationListener } from "./commission-revocation.listener";

describe("Payroll (Unit)", () => {
  it("net pay = base + approved commissions - approved penalties", () => {
    expect(computeNetPay(30000, 5000, 2000)).toBe(33000);
    expect(computeNetPay("30000.50", "0", "0.25")).toBe(30000.25);
  });

  it("derives the UTC window for a YYYY-MM billing month", () => {
    const { start, end } = monthWindow("2026-02");
    expect(start.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(() => monthWindow("2026-13")).toThrow();
  });

  describe("PayrollService", () => {
    let prisma: any;
    let service: PayrollService;

    beforeEach(() => {
      prisma = {
        salarySheet: {
          findUnique: vi.fn().mockResolvedValue({ id: "sheet-1", status: SalarySheetStatus.DRAFT, lines: [] }),
          upsert: vi.fn(async ({ create }: any) => ({ id: "sheet-1", ...create })),
          update: vi.fn(async ({ data }: any) => ({ id: "sheet-1", ...data })),
        },
        salarySheetLine: { deleteMany: vi.fn(), createMany: vi.fn() },
        $queryRaw: vi.fn().mockResolvedValue([
          { employee_id: "e-1", base_salary: "30000.00", total_commissions: "5000.00", total_penalties: "2000.00" },
          { employee_id: "e-2", base_salary: "25000.00", total_commissions: "0", total_penalties: "0" },
        ]),
        $transaction: vi.fn(async (cb: any) => cb(prisma)),
      };
      service = new PayrollService(prisma);
    });

    it("generates a DRAFT sheet with one line per active employee", async () => {
      prisma.salarySheet.findUnique.mockResolvedValueOnce(null);
      await service.generate("2026-09", "super-1");
      const [{ data: lines }] = prisma.salarySheetLine.createMany.mock.calls[0];
      expect(lines).toEqual([
        expect.objectContaining({ employeeId: "e-1", netPayable: 33000 }),
        expect.objectContaining({ employeeId: "e-2", netPayable: 25000 }),
      ]);
      expect(prisma.salarySheet.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ totalNetPayable: 58000, status: SalarySheetStatus.DRAFT }) }),
      );
    });

    it("re-generating a finalized sheet throws PayrollAlreadyFinalizedException", async () => {
      prisma.salarySheet.findUnique.mockResolvedValue({ id: "sheet-1", status: SalarySheetStatus.FINALIZED });
      await expect(service.generate("2026-09", "super-1")).rejects.toBeInstanceOf(PayrollAlreadyFinalizedException);
      expect(new PayrollAlreadyFinalizedException("2026-09")).toBeInstanceOf(ConflictException);
    });

    it("finalizing seals the sheet exactly once", async () => {
      prisma.salarySheet.findUnique.mockResolvedValue({ id: "sheet-1", status: SalarySheetStatus.DRAFT, lines: [] });
      await service.finalize("2026-09", "super-1");
      expect(prisma.salarySheet.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: SalarySheetStatus.FINALIZED, finalizedById: "super-1" }) }),
      );
      prisma.salarySheet.findUnique.mockResolvedValue({ id: "sheet-1", status: SalarySheetStatus.FINALIZED });
      await expect(service.finalize("2026-09", "super-1")).rejects.toBeInstanceOf(PayrollAlreadyFinalizedException);
    });

    it("rejects additions to a finalized billing month", async () => {
      prisma.salarySheet.findUnique.mockResolvedValue({ status: SalarySheetStatus.FINALIZED });
      await expect(service.assertMonthOpen("2026-09")).rejects.toBeInstanceOf(PayrollAlreadyFinalizedException);
    });
  });

  it("revokes pending (unapproved) commissions when an order is cancelled or returned", async () => {
    const prisma: any = { employeeCommission: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) } };
    await new CommissionRevocationListener(prisma).handleOrderReversed({ orderId: "o-1", status: "CANCELLED" });
    expect(prisma.employeeCommission.updateMany).toHaveBeenCalledWith({
      where: { orderId: "o-1", status: CommissionStatus.PENDING },
      data: { status: CommissionStatus.REVOKED, notes: "Revoked: order CANCELLED" },
    });
  });

  it("hides base salary from everyone except Super Admin", () => {
    const service = new EmployeesService({} as any, {} as any);
    const employee = { id: "e", baseSalary: "30000.00", user: { fullName: "A" } } as any;
    expect(service.presentEmployee(employee, { id: "x", role: UserRole.INSTITUTE_ADMIN }).baseSalary).toBeNull();
    expect(service.presentEmployee(employee, { id: "x", role: UserRole.SUPER_ADMIN }).baseSalary).toBe(30000);
  });
});
