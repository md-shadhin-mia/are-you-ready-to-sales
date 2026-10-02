import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createHmac, randomUUID } from "crypto";
import { ExchangeStatus, KycStatus, OrderStatus, StoreStatus, UserRole } from "@repo/db";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapApp, createMasterProduct, createUser, loginAs, uid } from "./helpers/e2e-app";

/**
 * Happy-path, validation and not-found coverage for admin portal endpoints that the
 * feature suites do not exercise directly.
 */
describe("Admin portal endpoint coverage (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const t: Record<string, string> = {};
  const missing = randomUUID();
  const cleanup = {
    users: [] as string[],
    products: [] as string[],
    suppliers: [] as string[],
    stores: [] as string[],
    branches: [] as string[],
    employees: [] as string[],
    sellers: [] as string[],
    brands: [] as string[],
    sizes: [] as string[],
    colors: [] as string[],
    pages: [] as string[],
    banners: [] as string[],
    faqs: [] as string[],
  };

  const api = () => request(app.getHttpServer());
  const as = (persona: string) => ({ Authorization: `Bearer ${t[persona]}` });

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    for (const p of ["superAdmin", "instituteAdmin", "productManager", "supportAgent"] as const) t[p] = await loginAs(app, p);
  });

  afterAll(async () => {
    await prisma.cmsPage.deleteMany({ where: { id: { in: cleanup.pages } } });
    await prisma.platformBanner.deleteMany({ where: { id: { in: cleanup.banners } } });
    await prisma.faq.deleteMany({ where: { id: { in: cleanup.faqs } } });
    await prisma.purchaseReturn.deleteMany({ where: { returnType: { code: { startsWith: "E2E_" } } } });
    await prisma.purchaseReturnType.deleteMany({ where: { code: { startsWith: "E2E_" } } });
    await prisma.purchaseOrder.deleteMany({ where: { supplierId: { in: cleanup.suppliers } } });
    await prisma.supplier.deleteMany({ where: { id: { in: cleanup.suppliers } } });
    await prisma.employeeCommission.deleteMany({ where: { employeeId: { in: cleanup.employees } } });
    await prisma.employeePenalty.deleteMany({ where: { employeeId: { in: cleanup.employees } } });
    await prisma.employee.deleteMany({ where: { id: { in: cleanup.employees } } });
    await prisma.sellerAdjustment.deleteMany({ where: { sellerId: { in: cleanup.sellers } } });
    await prisma.sellerProfile.deleteMany({ where: { id: { in: cleanup.sellers } } });
    await prisma.exchangeOrder.deleteMany({ where: { originalOrder: { storeId: { in: cleanup.stores } } } });
    await prisma.ledgerEntry.deleteMany({ where: { storeId: { in: cleanup.stores } } });
    await prisma.order.deleteMany({ where: { storeId: { in: cleanup.stores } } });
    await prisma.customer.deleteMany({ where: { storeId: { in: cleanup.stores } } });
    await prisma.store.deleteMany({ where: { id: { in: cleanup.stores } } });
    await prisma.branch.deleteMany({ where: { id: { in: cleanup.branches } } });
    await prisma.stockMovement.deleteMany({ where: { masterProductId: { in: cleanup.products } } });
    await prisma.productVariant.deleteMany({ where: { masterProductId: { in: cleanup.products } } });
    await prisma.masterProduct.deleteMany({ where: { id: { in: cleanup.products } } });
    await prisma.brand.deleteMany({ where: { id: { in: cleanup.brands } } });
    await prisma.size.deleteMany({ where: { id: { in: cleanup.sizes } } });
    await prisma.color.deleteMany({ where: { id: { in: cleanup.colors } } });
    await prisma.wholesaleCreditAccount.deleteMany({ where: { userId: { in: cleanup.users } } });
    await prisma.wholesaleOrder.deleteMany({ where: { userId: { in: cleanup.users } } });
    await prisma.user.deleteMany({ where: { id: { in: cleanup.users } } });
    await app.close();
  });

  it("CMS: settings, pages, about, banners and FAQ CRUD", async () => {
    const su = as("superAdmin");
    await api().get("/api/v1/admin/cms/settings").set(su).expect(200);
    await api().get("/api/v1/admin/cms/about").set(su).expect(200);

    const page = await api().post("/api/v1/admin/cms/pages").set(su).send({ slug: `p-${uid()}`, title: "P", contentHtml: "<p>x</p>" }).expect(201);
    cleanup.pages.push(page.body.id);
    await api().post("/api/v1/admin/cms/pages").set(su).send({ slug: page.body.slug, title: "Dup", contentHtml: "" }).expect(409);
    await api().get("/api/v1/admin/cms/pages").set(su).expect(200);
    const edited = await api().put(`/api/v1/admin/cms/pages/${page.body.id}`).set(su).send({ contentHtml: "<p onclick=x()>y</p>" }).expect(200);
    expect(edited.body.contentHtml).toBe("<p>y</p>");
    await api().put(`/api/v1/admin/cms/pages/${missing}`).set(su).send({ title: "x" }).expect(404);
    await api().delete(`/api/v1/admin/cms/pages/${page.body.id}`).set(su).expect(200);
    await api().delete(`/api/v1/admin/cms/pages/${page.body.id}`).set(su).expect(404);

    const now = Date.now();
    const banner = await api()
      .post("/api/v1/admin/cms/banners")
      .set(su)
      .send({ title: "B", imageUrl: "https://cdn.example.com/b.png", startDate: new Date(now).toISOString(), endDate: new Date(now + 86400000).toISOString() })
      .expect(201);
    cleanup.banners.push(banner.body.id);
    await api()
      .post("/api/v1/admin/cms/banners")
      .set(su)
      .send({ title: "Bad", imageUrl: "https://cdn.example.com/b.png", startDate: new Date(now).toISOString(), endDate: new Date(now - 1).toISOString() })
      .expect(400);
    await api().put(`/api/v1/admin/cms/banners/${banner.body.id}`).set(su).send({ title: "B2" }).expect(200);
    await api().put(`/api/v1/admin/cms/banners/${missing}`).set(su).send({ title: "x" }).expect(404);
    await api().delete(`/api/v1/admin/cms/banners/${banner.body.id}`).set(su).expect(200);
    await api().delete(`/api/v1/admin/cms/banners/${missing}`).set(su).expect(404);

    const faq = await api().post("/api/v1/admin/cms/faqs").set(su).send({ question: "Q?", answer: "A." }).expect(201);
    cleanup.faqs.push(faq.body.id);
    await api().get("/api/v1/admin/cms/faqs").set(su).expect(200);
    await api().put(`/api/v1/admin/cms/faqs/${faq.body.id}`).set(su).send({ isActive: false }).expect(200);
    await api().put(`/api/v1/admin/cms/faqs/${missing}`).set(su).send({ question: "x" }).expect(404);
    await api().get("/api/v1/public/faqs").expect(200);
    await api().delete(`/api/v1/admin/cms/faqs/${faq.body.id}`).set(su).expect(200);
    await api().delete(`/api/v1/admin/cms/faqs/${missing}`).set(su).expect(404);
  });

  it("Suppliers & purchase orders: read, update, cancel, returns, return types, payments", async () => {
    const pm = as("productManager");
    const supplier = await api()
      .post("/api/v1/admin/suppliers")
      .set(pm)
      .send({ name: "Coverage Supplier", tinNumber: String(Math.floor(1e11 + Math.random() * 9e11)), businessAddress: "Plot 9, Savar EPZ, Dhaka" })
      .expect(201);
    cleanup.suppliers.push(supplier.body.id);
    await api().get("/api/v1/admin/suppliers").query({ includeInactive: "true" }).set(pm).expect(200);
    await api().get(`/api/v1/admin/suppliers/${supplier.body.id}`).set(pm).expect(200);
    await api().get(`/api/v1/admin/suppliers/${missing}`).set(pm).expect(404);
    await api().put(`/api/v1/admin/suppliers/${supplier.body.id}`).set(pm).send({ contactName: "Rahim", contractEndDate: "2099-01-01" }).expect(200);

    const product = await createMasterProduct(prisma, { stockQuantity: 0 });
    cleanup.products.push(product.id);
    const po = await api()
      .post("/api/v1/admin/purchase-orders")
      .set(pm)
      .set("Idempotency-Key", `cov-${uid()}-${uid()}`)
      .send({ supplierId: supplier.body.id, items: [{ masterProductId: product.id, quantity: 5, unitCost: 10 }] })
      .expect(201);
    await api().get("/api/v1/admin/purchase-orders").query({ supplierId: supplier.body.id, status: "DRAFT" }).set(pm).expect(200);
    await api().get(`/api/v1/admin/purchase-orders/${po.body.id}`).set(pm).expect(200);
    await api().get(`/api/v1/admin/purchase-orders/${missing}`).set(pm).expect(404);
    await api().post(`/api/v1/admin/purchase-orders/${po.body.id}/receive`).set(pm).send({ items: [{ purchaseOrderItemId: po.body.items[0].id, quantity: 1 }] }).expect(409);
    await api().post(`/api/v1/admin/purchase-orders/${po.body.id}/match-invoice`).set(pm).send({ invoiceNumber: "X", invoiceAmount: 1 }).expect(400);
    await api().post(`/api/v1/admin/purchase-orders/${po.body.id}/issue`).set(pm).expect(200);
    await api().post(`/api/v1/admin/purchase-orders/${po.body.id}/issue`).set(pm).expect(409);
    await api().post(`/api/v1/admin/purchase-orders/${po.body.id}/payments`).set(pm).send({ amount: 51 }).expect(400);
    await api().post(`/api/v1/admin/purchase-orders/${po.body.id}/cancel`).set(pm).expect(200);
    await api().post(`/api/v1/admin/purchase-orders/${po.body.id}/cancel`).set(pm).expect(409);

    const code = `E2E_${uid().toUpperCase().replace(/-/g, "")}`;
    const type = await api().post("/api/v1/admin/purchase-return-types").set(pm).send({ name: "Coverage", code }).expect(201);
    await api().post("/api/v1/admin/purchase-return-types").set(pm).send({ name: "Coverage", code }).expect(409);
    await prisma.masterProduct.update({ where: { id: product.id }, data: { stockQuantity: 4, averageCost: 20 } });
    const ret = await api()
      .post("/api/v1/admin/purchase-returns")
      .set(pm)
      .send({ supplierId: supplier.body.id, masterProductId: product.id, quantity: 1, returnTypeId: type.body.id })
      .expect(201);
    expect(ret.body.unitCost).toBe(20);
    await api()
      .post("/api/v1/admin/purchase-returns")
      .set(pm)
      .send({ supplierId: supplier.body.id, purchaseOrderId: po.body.id, masterProductId: product.id, quantity: 1, returnTypeId: type.body.id })
      .expect(400);
    await api()
      .post("/api/v1/admin/purchase-returns")
      .set(pm)
      .send({ supplierId: missing, masterProductId: product.id, quantity: 1, returnTypeId: type.body.id })
      .expect(404);
    await api().get("/api/v1/admin/purchase-returns").query({ supplierId: supplier.body.id }).set(pm).expect(200);
  });

  it("Employees, commissions, penalties and payroll read paths", async () => {
    const admin = as("instituteAdmin");
    const user = await createUser(app, { role: UserRole.SUPPORT_AGENT });
    cleanup.users.push(user.id);
    const code = `EMP-${uid()}`.toUpperCase();
    const e = await api()
      .post("/api/v1/admin/employees")
      .set(admin)
      .send({ userId: user.id, employeeCode: code, designation: "Agent", baseSalary: 1000 })
      .expect(201);
    cleanup.employees.push(e.body.id);
    await api().post("/api/v1/admin/employees").set(admin).send({ userId: user.id, employeeCode: `${code}X`, designation: "A", baseSalary: 1 }).expect(409);
    await api().post("/api/v1/admin/employees").set(admin).send({ userId: missing, employeeCode: `${code}Y`, designation: "A", baseSalary: 1 }).expect(404);
    await api().get("/api/v1/admin/employees").query({ search: code }).set(admin).expect(200);
    await api().put(`/api/v1/admin/employees/${e.body.id}`).set(admin).send({ designation: "Senior Agent" }).expect(200);
    await api().get(`/api/v1/admin/employees/${missing}`).set(admin).expect(404);

    const commission = await api().post(`/api/v1/admin/employees/${e.body.id}/commissions`).set(admin).send({ amount: 10 }).expect(201);
    await api().get(`/api/v1/admin/employees/${e.body.id}/commissions`).set(admin).expect(200);
    await api().post(`/api/v1/admin/employees/commissions/${commission.body.id}/approve`).set(admin).expect(200);
    await api().post(`/api/v1/admin/employees/commissions/${commission.body.id}/approve`).set(admin).expect(409);
    await api().post(`/api/v1/admin/employees/commissions/${missing}/approve`).set(admin).expect(404);

    const penalty = await api()
      .post(`/api/v1/admin/employees/${e.body.id}/penalties`)
      .set(admin)
      .send({ amount: 5, infractionCode: "POL-DRS-1", supervisorNotes: "Uniform", effectiveMonth: "2099-12" })
      .expect(201);
    await api().post(`/api/v1/admin/employees/penalties/${penalty.body.id}/reject`).set(admin).expect(200);
    await api().post(`/api/v1/admin/employees/penalties/${penalty.body.id}/approve`).set(admin).expect(409);
    await api().post(`/api/v1/admin/employees/penalties/${missing}/approve`).set(admin).expect(404);

    await api().get("/api/v1/admin/payroll/1999-01").set(as("superAdmin")).expect(404);
    await api().post("/api/v1/admin/payroll/1999-01/finalize").set(as("superAdmin")).expect(404);
    await api().post("/api/v1/admin/payroll/1999-13/generate").set(as("superAdmin")).expect(400);
  });

  it("Seller panel: adjustment listing and rejection", async () => {
    const admin = as("instituteAdmin");
    const user = await createUser(app, { role: UserRole.SELLER });
    cleanup.users.push(user.id);
    const seller = await prisma.sellerProfile.create({ data: { userId: user.id, companyName: "Coverage Vendor", balance: 100 } });
    cleanup.sellers.push(seller.id);
    const adj = await api()
      .post(`/api/v1/admin/seller-panel/sellers/${seller.id}/adjustments`)
      .set(admin)
      .send({ type: "DEBIT", amount: 20000, reasonCode: "PENALTY", documentUrl: "https://docs.example.com/p.pdf" })
      .expect(201);
    await api().get("/api/v1/admin/seller-panel/adjustments").query({ sellerId: seller.id, status: "PENDING_APPROVAL" }).set(admin).expect(200);
    await api().post(`/api/v1/admin/seller-panel/adjustments/${adj.body.id}/reject`).set(as("superAdmin")).send({ reason: "Duplicate" }).expect(200);
    await api().post(`/api/v1/admin/seller-panel/adjustments/${adj.body.id}/approve`).set(as("superAdmin")).expect(409);
    await api().post(`/api/v1/admin/seller-panel/adjustments/${missing}/approve`).set(as("superAdmin")).expect(404);
    await api()
      .post(`/api/v1/admin/seller-panel/sellers/${missing}/adjustments`)
      .set(admin)
      .send({ type: "CREDIT", amount: 1, reasonCode: "BONUS", documentUrl: "https://docs.example.com/p.pdf" })
      .expect(404);
    await api().post(`/api/v1/admin/seller-panel/sellers/${missing}/deactivate`).set(admin).send({ reason: "x" }).expect(404);
    await api().post("/api/v1/admin/seller-panel/tickets").set(admin).send({ sellerId: missing, subject: "s", message: "m" }).expect(404);
    await api().patch(`/api/v1/admin/seller-panel/tickets/${missing}`).set(admin).send({ status: "CLOSED" }).expect(404);
  });

  it("Taxonomy, exchanges, logistics, inventory, wholesale and legacy KYC edge paths", async () => {
    const pm = as("productManager");
    const tag = uid().toUpperCase();
    const size = await api().post("/api/v1/admin/catalog/sizes").set(pm).send({ name: "Tiny", code: `T${tag}` }).expect(201);
    cleanup.sizes.push(size.body.id);
    await api().post("/api/v1/admin/catalog/sizes").set(pm).send({ name: "Tiny", code: `T${tag}` }).expect(409);
    await api().get("/api/v1/admin/catalog/sizes").set(pm).expect(200);
    await api().put(`/api/v1/admin/catalog/sizes/${size.body.id}`).set(pm).send({ sortOrder: 9 }).expect(200);
    await api().put(`/api/v1/admin/catalog/sizes/${missing}`).set(pm).send({ sortOrder: 9 }).expect(404);
    const color = await api().post("/api/v1/admin/catalog/colors").set(pm).send({ name: "Teal", code: `C${tag}`, hexCode: "#008080" }).expect(201);
    cleanup.colors.push(color.body.id);
    await api().post("/api/v1/admin/catalog/colors").set(pm).send({ name: "Teal", code: `C${tag}`, hexCode: "#008080" }).expect(409);
    await api().get("/api/v1/admin/catalog/colors").set(pm).expect(200);
    await api().put(`/api/v1/admin/catalog/colors/${color.body.id}`).set(pm).send({ hexCode: "#00ffff" }).expect(200);
    const brand = await api().post("/api/v1/admin/catalog/brands").set(pm).send({ name: "Temp", slug: `temp-${uid()}` }).expect(201);
    await api().put(`/api/v1/admin/catalog/brands/${missing}`).set(pm).send({ name: "x" }).expect(404);
    await api().delete(`/api/v1/admin/catalog/brands/${brand.body.id}`).set(pm).expect(200);
    await api().post(`/api/v1/admin/catalog/products/${missing}/variants/generate`).set(pm).send({ sizeIds: [], colorIds: [] }).expect(404);
    const product = await createMasterProduct(prisma, { stockQuantity: 3, basePrice: 100 });
    cleanup.products.push(product.id);
    await api().post(`/api/v1/admin/catalog/products/${product.id}/variants/generate`).set(pm).send({ sizeIds: [missing], colorIds: [] }).expect(400);
    await api().get("/api/v1/admin/inventory/stock").query({ lowStock: "true" }).set(pm).expect(200);
    await api().post("/api/v1/admin/inventory/adjustments").set(pm).send({ masterProductId: missing, quantity: 1, notes: "Missing product" }).expect(404);

    // exchanges: hold + illegal transitions + not found
    const support = as("supportAgent");
    const owner = await createUser(app, { role: UserRole.STUDENT, nationalId: "1234567890" });
    cleanup.users.push(owner.id);
    const store = await prisma.store.create({ data: { studentId: owner.id, storeName: "Cov", slug: `cov-${uid()}`, status: StoreStatus.DRAFT } });
    cleanup.stores.push(store.id);
    const customer = await prisma.customer.create({ data: { storeId: store.id, fullName: "C", phone: `+8801${uid()}` } });
    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        orderNumber: `ORD-COV-${uid()}`.toUpperCase(),
        subtotal: 100,
        totalAmount: 100,
        status: OrderStatus.DELIVERED,
        shippingAddress: {},
        items: { create: [{ masterProductId: product.id, quantity: 1, unitBasePrice: 50, unitSellingPrice: 100, totalPrice: 100 }] },
      },
    });
    const ex = await api()
      .post("/api/v1/admin/exchanges")
      .set(support)
      .set("Idempotency-Key", `cov-${uid()}-${uid()}`)
      .send({ originalOrderId: order.id, returnedProductId: product.id, replacementProductId: product.id, reason: "Same swap" })
      .expect(201);
    expect(ex.body.settlementType).toBe("NONE");
    const held = await api().post(`/api/v1/admin/exchanges/${ex.body.id}/hold`).set(support).send({ reason: "Awaiting photos" }).expect(200);
    expect(held.body.status).toBe(ExchangeStatus.HOLD);
    await api().post(`/api/v1/admin/exchanges/${ex.body.id}/complete`).set(support).expect(400);
    await api().patch(`/api/v1/admin/exchanges/${ex.body.id}/inspect`).set(support).send({ grading: "DAMAGED" }).expect(400);
    await api().post(`/api/v1/admin/exchanges/${missing}/approve`).set(support).expect(404);
    await api()
      .post("/api/v1/admin/exchanges")
      .set(support)
      .set("Idempotency-Key", `cov-${uid()}-${uid()}`)
      .send({ originalOrderId: order.id, returnedProductId: missing, replacementProductId: product.id, reason: "Wrong line" })
      .expect(400);

    // logistics: unsigned and malformed webhooks
    await api().post("/api/v1/webhooks/courier/steadfast").send({ eventId: "x" }).expect(401);
    const body = JSON.stringify({ eventId: "only-id" });
    const sig = createHmac("sha256", process.env.COURIER_WEBHOOK_SECRET || "dev-courier-webhook-secret").update(body).digest("hex");
    await api().post("/api/v1/webhooks/courier/steadfast").set("Content-Type", "application/json").set("X-Courier-Signature", sig).send(body).expect(400);
    await api().post(`/api/v1/admin/logistics/rto-inspections/${missing}/resolve`).set(as("instituteAdmin")).send({ result: "SEAL_VERIFIED" }).expect(404);

    // wholesale credit limit cannot drop below outstanding
    const buyer = await createUser(app, { role: UserRole.STUDENT });
    cleanup.users.push(buyer.id);
    await prisma.wholesaleCreditAccount.create({ data: { userId: buyer.id, creditLimit: 1000, outstandingBalance: 800 } });
    await api().put(`/api/v1/admin/wholesale/credit-accounts/${buyer.id}`).set(as("instituteAdmin")).send({ creditLimit: 500 }).expect(400);
    await api().put(`/api/v1/admin/wholesale/credit-accounts/${missing}`).set(as("instituteAdmin")).send({ creditLimit: 500 }).expect(404);

    // legacy boolean KYC endpoint maps onto the KYC lifecycle
    const legacy = await api()
      .post(`/api/v1/admin/students/${owner.id}/verify-kyc`)
      .set(as("instituteAdmin"))
      .send({ isVerified: false })
      .expect(201);
    expect(legacy.body.kycStatus).toBe(KycStatus.REJECTED);
    await api().patch(`/api/v1/admin/students/${missing}/kyc`).set(as("instituteAdmin")).send({ status: KycStatus.VERIFIED }).expect(404);
    await api().post(`/api/v1/admin/students/${missing}/suspend`).set(as("instituteAdmin")).send({ reason: "x" }).expect(404);
    await api()
      .get("/api/v1/admin/students/performance")
      .query({ isVerified: "false", storeStatus: StoreStatus.DRAFT, search: owner.email })
      .set(as("instituteAdmin"))
      .expect(200);
  });

  it("Branches: manager reassignment is logged; invalid managers are rejected", async () => {
    const admin = as("instituteAdmin");
    const [bm, ia] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { email: "branchmanager@platform.local" } }),
      prisma.user.findUniqueOrThrow({ where: { email: "institute@platform.local" } }),
    ]);
    const branch = await api()
      .post("/api/v1/admin/branches")
      .set(admin)
      .send({ name: "Online", code: `WEB-${uid()}`, branchType: "DIGITAL", managerId: bm.id })
      .expect(201);
    cleanup.branches.push(branch.body.id);
    await api().put(`/api/v1/admin/branches/${branch.body.id}`).set(admin).send({ managerId: ia.id }).expect(200);
    const history = await api().get(`/api/v1/admin/branches/${branch.body.id}/manager-history`).set(admin).expect(200);
    expect(history.body).toHaveLength(2);
    expect(history.body.filter((h: any) => h.unassignedAt === null)).toHaveLength(1);

    const student = await prisma.user.findUniqueOrThrow({ where: { email: "student1@platform.local" } });
    await api().put(`/api/v1/admin/branches/${branch.body.id}`).set(admin).send({ managerId: student.id }).expect(400);
    await api().put(`/api/v1/admin/branches/${branch.body.id}`).set(admin).send({ branchType: "PHYSICAL" }).expect(400);
    await api().put(`/api/v1/admin/branches/${missing}`).set(admin).send({ name: "x" }).expect(404);
    await api().delete(`/api/v1/admin/branches/${missing}`).set(admin).expect(404);
    await api().get(`/api/v1/admin/branches/${missing}/manager-history`).set(admin).expect(404);
    await api().post(`/api/v1/admin/batches/${missing}/enroll`).set(admin).send({ studentIds: [student.id] }).expect(404);
  });
});
