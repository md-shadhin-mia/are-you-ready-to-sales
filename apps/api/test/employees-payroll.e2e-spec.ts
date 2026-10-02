import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { CommissionStatus, OrderStatus, SalarySheetStatus, StoreStatus, UserRole } from "@repo/db";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapApp, createUser, loginAs, uid } from "./helpers/e2e-app";

describe("Employees, Commissions & Payroll (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdmin: string;
  let institute: string;
  let branchManager: string;
  let orderManager: string;
  // A random far-future billing month keeps this suite isolated from real payroll data.
  const month = `20${70 + Math.floor(Math.random() * 29)}-${String(1 + Math.floor(Math.random() * 12)).padStart(2, "0")}`;
  const midMonth = new Date(`${month}-15T12:00:00Z`);
  const cleanup = { userIds: [] as string[], employeeIds: [] as string[], branchIds: [] as string[], storeIds: [] as string[] };

  const api = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function employee(baseSalary: number, branchId?: string) {
    const user = await createUser(app, { role: UserRole.SUPPORT_AGENT });
    cleanup.userIds.push(user.id);
    const res = await api()
      .post("/api/v1/admin/employees")
      .set(as(institute))
      .send({ userId: user.id, employeeCode: `EMP-${uid()}`.toUpperCase(), designation: "Sales Rep", baseSalary, branchId })
      .expect(201);
    cleanup.employeeIds.push(res.body.id);
    return res.body;
  }

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    [superAdmin, institute, branchManager, orderManager] = await Promise.all([
      loginAs(app, "superAdmin"),
      loginAs(app, "instituteAdmin"),
      loginAs(app, "branchManager"),
      loginAs(app, "orderManager"),
    ]);
  });

  afterAll(async () => {
    await prisma.salarySheet.deleteMany({ where: { month } });
    await prisma.employeeCommission.deleteMany({ where: { employeeId: { in: cleanup.employeeIds } } });
    await prisma.employeePenalty.deleteMany({ where: { employeeId: { in: cleanup.employeeIds } } });
    await prisma.employee.deleteMany({ where: { id: { in: cleanup.employeeIds } } });
    await prisma.ledgerEntry.deleteMany({ where: { storeId: { in: cleanup.storeIds } } });
    await prisma.order.deleteMany({ where: { storeId: { in: cleanup.storeIds } } });
    await prisma.customer.deleteMany({ where: { storeId: { in: cleanup.storeIds } } });
    await prisma.store.deleteMany({ where: { id: { in: cleanup.storeIds } } });
    await prisma.branch.deleteMany({ where: { id: { in: cleanup.branchIds } } });
    await prisma.user.deleteMany({ where: { id: { in: cleanup.userIds } } });
    await app.close();
  });

  it("base salary and penalty notes are visible to Super Admin only", async () => {
    const e = await employee(30000);
    expect(e.baseSalary).toBeNull();

    const asSuper = await api().get(`/api/v1/admin/employees/${e.id}`).set(as(superAdmin)).expect(200);
    expect(asSuper.body.baseSalary).toBe(30000);

    const penalty = await api()
      .post(`/api/v1/admin/employees/${e.id}/penalties`)
      .set(as(institute))
      .send({ amount: 500, infractionCode: "POL-ATT-02", supervisorNotes: "Late three times this week", effectiveMonth: month })
      .expect(201);
    expect(penalty.body.supervisorNotes).toBeNull();
    const list = await api().get(`/api/v1/admin/employees/${e.id}/penalties`).set(as(superAdmin)).expect(200);
    expect(list.body[0].supervisorNotes).toBe("Late three times this week");
  });

  it("penalties must cite a policy infraction code and supervisor notes", async () => {
    const e = await employee(20000);
    await api()
      .post(`/api/v1/admin/employees/${e.id}/penalties`)
      .set(as(institute))
      .send({ amount: 500, effectiveMonth: month })
      .expect(400);
  });

  it("branch managers only see staff of their own campus", async () => {
    const manager = await prisma.user.findUniqueOrThrow({ where: { email: "branchmanager@platform.local" } });
    const branch = await prisma.branch.create({
      data: { name: "HR Campus", code: `HR-${uid()}`.toUpperCase(), managerId: manager.id, address: "Road 7", city: "Khulna" },
    });
    cleanup.branchIds.push(branch.id);
    const inside = await employee(18000, branch.id);
    const outside = await employee(18000);

    const res = await api().get("/api/v1/admin/employees").query({ limit: 100 }).set(as(branchManager)).expect(200);
    const ids = res.body.data.map((e: any) => e.id);
    expect(ids).toContain(inside.id);
    expect(ids).not.toContain(outside.id);
  });

  it("salary sheet: 30,000 + 5,000 commission - 2,000 penalty = 33,000; finalized sheets are sealed", async () => {
    const e = await employee(30000);
    const commission = await api()
      .post(`/api/v1/admin/employees/${e.id}/commissions`)
      .set(as(institute))
      .send({ amount: 5000, notes: "Corporate lead" })
      .expect(201);
    await api().post(`/api/v1/admin/employees/commissions/${commission.body.id}/approve`).set(as(institute)).expect(200);
    await prisma.employeeCommission.update({ where: { id: commission.body.id }, data: { createdAt: midMonth } });

    const penalty = await api()
      .post(`/api/v1/admin/employees/${e.id}/penalties`)
      .set(as(institute))
      .send({ amount: 2000, infractionCode: "POL-CASH-01", supervisorNotes: "Cash shortfall", effectiveMonth: month })
      .expect(201);
    await api().post(`/api/v1/admin/employees/penalties/${penalty.body.id}/approve`).set(as(institute)).expect(200);

    await api().post(`/api/v1/admin/payroll/${month}/generate`).set(as(institute)).expect(403);
    const sheet = await api().post(`/api/v1/admin/payroll/${month}/generate`).set(as(superAdmin)).expect(200);
    expect(sheet.body.status).toBe(SalarySheetStatus.DRAFT);
    expect(sheet.body.lines.find((l: any) => l.employeeId === e.id)).toMatchObject({
      baseSalary: 30000,
      commissions: 5000,
      penalties: 2000,
      netPayable: 33000,
    });

    await api().post(`/api/v1/admin/payroll/${month}/finalize`).set(as(superAdmin)).expect(200);
    await api().post(`/api/v1/admin/payroll/${month}/generate`).set(as(superAdmin)).expect(409);
    await api()
      .post(`/api/v1/admin/employees/${e.id}/penalties`)
      .set(as(institute))
      .send({ amount: 100, infractionCode: "POL-X-9", supervisorNotes: "After close", effectiveMonth: month })
      .expect(409);
  });

  it("cancelling an order revokes its pending lead commissions", async () => {
    const e = await employee(15000);
    const owner = await createUser(app, { role: UserRole.STUDENT });
    cleanup.userIds.push(owner.id);
    const store = await prisma.store.create({
      data: { studentId: owner.id, storeName: "HR Store", slug: `hr-${uid()}`, status: StoreStatus.ACTIVE },
    });
    cleanup.storeIds.push(store.id);
    const customer = await prisma.customer.create({ data: { storeId: store.id, fullName: "Lead", phone: `+8801${uid()}` } });
    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        orderNumber: `ORD-HR-${uid()}`.toUpperCase(),
        subtotal: 0,
        totalAmount: 0,
        status: OrderStatus.NEW,
        shippingAddress: {},
      },
    });

    const commission = await api()
      .post(`/api/v1/admin/employees/${e.id}/commissions`)
      .set(as(institute))
      .send({ amount: 750, orderId: order.id })
      .expect(201);

    await api()
      .patch(`/api/v1/admin/orders/${order.id}/status`)
      .set(as(orderManager))
      .send({ status: OrderStatus.CANCELLED })
      .expect(200);

    await expect
      .poll(async () => (await prisma.employeeCommission.findUniqueOrThrow({ where: { id: commission.body.id } })).status)
      .toBe(CommissionStatus.REVOKED);
  });
});
