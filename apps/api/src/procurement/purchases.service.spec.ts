import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { InvoiceMatchStatus, PurchaseOrderStatus } from "@repo/db";
import { PurchasesService, computeInvoiceVariance } from "./purchases.service";
import { classifyContract, isValidTin } from "./suppliers.service";

describe("Procurement (Unit)", () => {
  describe("supplier validation", () => {
    it("accepts only 12-digit TINs", () => {
      expect(isValidTin("123456789012")).toBe(true);
      expect(isValidTin("12345678901")).toBe(false);
      expect(isValidTin("12345678901A")).toBe(false);
    });

    it("warns 30 days before contract expiry", () => {
      const now = new Date("2026-09-01T00:00:00Z");
      expect(classifyContract(new Date("2026-09-20T00:00:00Z"), now)).toEqual({ state: "EXPIRING_SOON", daysRemaining: 19 });
      expect(classifyContract(new Date("2026-12-01T00:00:00Z"), now)).toEqual({ state: "ACTIVE", daysRemaining: 91 });
      expect(classifyContract(new Date("2026-08-01T00:00:00Z"), now)).toEqual({ state: "EXPIRED", daysRemaining: -31 });
      expect(classifyContract(null, now)).toEqual({ state: "NO_CONTRACT", daysRemaining: null });
    });
  });

  describe("computeInvoiceVariance()", () => {
    it("matches within the 1% tolerance", () => {
      expect(computeInvoiceVariance(10000, 10099)).toEqual({ variancePercent: 0.99, matchStatus: InvoiceMatchStatus.MATCHED });
    });

    it("flags variance above 1% for discrepancy review", () => {
      expect(computeInvoiceVariance(10000, 9850)).toEqual({ variancePercent: 1.5, matchStatus: InvoiceMatchStatus.DISCREPANCY });
    });
  });

  describe("PurchasesService", () => {
    let prisma: any;
    let inventory: any;
    let sequences: any;
    let service: PurchasesService;
    let po: any;

    beforeEach(() => {
      po = {
        id: "po-1",
        poNumber: "PO-2026-000001",
        supplierId: "sup-1",
        status: PurchaseOrderStatus.ISSUED,
        items: [
          { id: "poi-1", masterProductId: "p-1", quantityOrdered: 10, quantityReceived: 0, unitCost: "150.00" },
          { id: "poi-2", masterProductId: "p-2", quantityOrdered: 4, quantityReceived: 0, unitCost: "80.00" },
        ],
      };
      prisma = {
        purchaseOrder: {
          findUnique: vi.fn(async () => po),
          findMany: vi.fn(async () => [po]),
          count: vi.fn(async () => 1),
          create: vi.fn(async ({ data }: any) => ({ ...po, ...data, id: "po-new", items: po.items })),
          update: vi.fn(async ({ data }: any) => ({ ...po, ...data })),
        },
        purchaseOrderItem: { update: vi.fn() },
        goodsReceipt: { create: vi.fn(async ({ data }: any) => ({ id: "grn-1", ...data })) },
        purchaseReturnType: {
          findUnique: vi.fn().mockResolvedValue({ id: "rt-1", isActive: true }),
          create: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
        },
        purchaseReturn: {
          create: vi.fn(async ({ data }: any) => ({ id: "pr-1", ...data })),
          findMany: vi.fn(async () => [{ id: "pr-1", returnNumber: "PR-1" }]),
          count: vi.fn(async () => 1),
        },
        masterProduct: { findUnique: vi.fn().mockResolvedValue({ averageCost: "120.00" }) },
        supplier: { findUnique: vi.fn().mockResolvedValue({ id: "sup-1", isActive: true }) },
        $queryRaw: vi.fn().mockResolvedValue([]),
        $transaction: vi.fn(async (cb: any) => cb(prisma)),
      };
      inventory = { receive: vi.fn(), returnToSupplier: vi.fn() };
      sequences = { next: vi.fn().mockResolvedValue("GRN-2026-000001") };
      service = new PurchasesService(prisma, inventory, sequences);
    });

    it("goods receipt posts each line at the agreed PO rate so WAC is recalculated", async () => {
      await service.receive("po-1", [{ purchaseOrderItemId: "poi-1", quantity: 6 }, { purchaseOrderItemId: "poi-2", quantity: 4 }], "wh-1");
      expect(inventory.receive).toHaveBeenCalledWith("p-1", 6, 150, expect.objectContaining({ referenceType: "GRN" }));
      expect(inventory.receive).toHaveBeenCalledWith("p-2", 4, 80, expect.anything());
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: PurchaseOrderStatus.PARTIALLY_RECEIVED }) }),
      );
    });

    it("marks the PO RECEIVED once every line is fully received", async () => {
      po.items[0].quantityReceived = 6;
      await service.receive("po-1", [{ purchaseOrderItemId: "poi-1", quantity: 4 }, { purchaseOrderItemId: "poi-2", quantity: 4 }], "wh-1");
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: PurchaseOrderStatus.RECEIVED }) }),
      );
    });

    it("rejects receiving more than the outstanding quantity", async () => {
      await expect(service.receive("po-1", [{ purchaseOrderItemId: "poi-2", quantity: 5 }], "wh-1")).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(inventory.receive).not.toHaveBeenCalled();
    });

    it("only ISSUED or PARTIALLY_RECEIVED orders accept goods", async () => {
      po.status = PurchaseOrderStatus.DRAFT;
      await expect(service.receive("po-1", [{ purchaseOrderItemId: "poi-1", quantity: 1 }], "wh")).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it("return to supplier deducts the exact quantity from physical stock", async () => {
      po.items[0].quantityReceived = 10;
      await service.createReturn(
        { supplierId: "sup-1", masterProductId: "p-1", quantity: 3, returnTypeId: "rt-1", purchaseOrderId: "po-1" },
        "wh-1",
      );
      expect(inventory.returnToSupplier).toHaveBeenCalledWith(
        "p-1",
        3,
        expect.objectContaining({ referenceType: "PURCHASE_RETURN", referenceId: "pr-1" }),
      );
    });

    it("three-way match compares the supplier bill with received quantities at PO rates", async () => {
      po.items[0].quantityReceived = 10;
      po.items[1].quantityReceived = 4; // expected = 1500 + 320 = 1820
      await service.matchInvoice("po-1", { invoiceNumber: "BILL-9", invoiceAmount: 1900 });
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ matchStatus: InvoiceMatchStatus.DISCREPANCY, matchVariancePercent: 4.4 }),
        }),
      );
    });

    it("cannot match an invoice before any goods are received", async () => {
      await expect(service.matchInvoice("po-1", { invoiceNumber: "B", invoiceAmount: 100 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("records payment against outstanding PO balance or rejects overpayment", async () => {
      po.totalCost = "1000.00";
      po.paidAmount = "400.00";
      await expect(service.recordPayment("po-1", 700)).rejects.toBeInstanceOf(BadRequestException);

      prisma.purchaseOrder.findUnique.mockResolvedValue({ ...po, paidAmount: "900.00" });
      await service.recordPayment("po-1", 50);
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { paidAmount: { increment: 50 } } }),
      );
    });

    it("issues a draft purchase order or rejects non-draft orders", async () => {
      po.status = PurchaseOrderStatus.ISSUED;
      await expect(service.issue("po-1")).rejects.toBeInstanceOf(ConflictException);

      po.status = PurchaseOrderStatus.DRAFT;
      await service.issue("po-1");
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: PurchaseOrderStatus.ISSUED }) }),
      );
    });

    it("cancels PO without received goods or rejects if goods were received", async () => {
      po.items[0].quantityReceived = 2;
      await expect(service.cancel("po-1")).rejects.toBeInstanceOf(ConflictException);

      po.items[0].quantityReceived = 0;
      await service.cancel("po-1");
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: PurchaseOrderStatus.CANCELLED } }),
      );
    });

    it("creates return type or throws ConflictException on duplicate code", async () => {
      prisma.purchaseReturnType.findUnique.mockResolvedValueOnce({ id: "rt-1" });
      await expect(service.createReturnType({ code: "DAMAGED", name: "Damaged" })).rejects.toBeInstanceOf(ConflictException);

      prisma.purchaseReturnType.findUnique.mockResolvedValueOnce(null);
      prisma.purchaseReturnType.create.mockResolvedValueOnce({ id: "rt-new", code: "DEFECT" });
      const created = await service.createReturnType({ code: "DEFECT", name: "Defective" });
      expect(created.id).toBe("rt-new");
    });

    it("lists return types and accounts payable aging buckets", async () => {
      prisma.purchaseReturnType.findMany = vi.fn().mockResolvedValue([{ id: "rt-1" }]);
      expect(await service.listReturnTypes()).toHaveLength(1);

      prisma.$queryRaw.mockResolvedValueOnce([
        {
          supplier_id: "sup-1",
          supplier_name: "Supplier A",
          total_outstanding: "5000.00",
          aging_0_30: "3000.00",
          aging_31_60: "2000.00",
          aging_over_60: "0",
        },
      ]);
      const aging = await service.apAging();
      expect(aging[0]).toMatchObject({
        supplierId: "sup-1",
        totalOutstanding: 5000,
        aging0To30: 3000,
      });
    });

    it("creates a purchase order or rejects inactive/unknown suppliers", async () => {
      prisma.supplier.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.createPurchaseOrder({ supplierId: "bad-sup", items: [] } as any, "usr-1"),
      ).rejects.toBeInstanceOf(BadRequestException);

      prisma.supplier.findUnique.mockResolvedValueOnce({ id: "sup-1", isActive: false });
      await expect(
        service.createPurchaseOrder({ supplierId: "sup-1", items: [] } as any, "usr-1"),
      ).rejects.toBeInstanceOf(BadRequestException);

      prisma.supplier.findUnique.mockResolvedValue({ id: "sup-1", isActive: true });
      const created = await service.createPurchaseOrder(
        {
          supplierId: "sup-1",
          expectedDate: "2026-10-15",
          items: [{ masterProductId: "p-1", quantity: 10, unitCost: 100 }],
        } as any,
        "usr-1",
      );
      expect(created).toBeDefined();
    });

    it("executes direct purchase with immediate receipt", async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: "sup-1", isActive: true });
      const res = await service.createDirectPurchase(
        {
          supplierId: "sup-1",
          items: [{ masterProductId: "p-1", quantity: 5, unitCost: 150 }],
        } as any,
        "usr-1",
      );
      expect(res).toBeDefined();
    });

    it("fetches single PO or throws NotFoundException when missing", async () => {
      prisma.purchaseOrder.findUnique.mockResolvedValueOnce(null);
      await expect(service.get("po-missing")).rejects.toBeInstanceOf(NotFoundException);

      prisma.purchaseOrder.findUnique.mockResolvedValueOnce(po);
      const res = await service.get("po-1");
      expect(res.id).toBe("po-1");
    });

    it("lists purchase orders with status and supplier filters", async () => {
      const res = await service.list({
        status: PurchaseOrderStatus.ISSUED,
        supplierId: "sup-1",
        page: "1",
        limit: "10",
      });
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });

    it("rejects receipt for unknown item line on the PO", async () => {
      await expect(
        service.receive("po-1", [{ purchaseOrderItemId: "poi-unknown", quantity: 2 }], "usr-1"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("validates return preconditions: supplier, returnType, PO mismatch, and received limit", async () => {
      prisma.supplier.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.createReturn({ supplierId: "sup-x", returnTypeId: "rt-1", masterProductId: "p-1", quantity: 1 } as any, "u-1"),
      ).rejects.toBeInstanceOf(NotFoundException);

      prisma.supplier.findUnique.mockResolvedValue({ id: "sup-1", isActive: true });
      prisma.purchaseReturnType.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.createReturn({ supplierId: "sup-1", returnTypeId: "rt-bad", masterProductId: "p-1", quantity: 1 } as any, "u-1"),
      ).rejects.toBeInstanceOf(BadRequestException);

      prisma.purchaseReturnType.findUnique.mockResolvedValue({ id: "rt-1", isActive: true });
      // PO supplier mismatch
      await expect(
        service.createReturn(
          { supplierId: "other-sup", returnTypeId: "rt-1", purchaseOrderId: "po-1", masterProductId: "p-1", quantity: 1 } as any,
          "u-1",
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      // Return quantity > quantityReceived
      po.items[0].quantityReceived = 2;
      await expect(
        service.createReturn(
          { supplierId: "sup-1", returnTypeId: "rt-1", purchaseOrderId: "po-1", masterProductId: "p-1", quantity: 10 } as any,
          "u-1",
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      // Return without PO: product not found
      prisma.masterProduct.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.createReturn(
          { supplierId: "sup-1", returnTypeId: "rt-1", masterProductId: "p-unknown", quantity: 2 } as any,
          "u-1",
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      // Return without PO: success with averageCost
      prisma.masterProduct.findUnique.mockResolvedValueOnce({ averageCost: "115.50" });
      const ret = await service.createReturn(
        { supplierId: "sup-1", returnTypeId: "rt-1", masterProductId: "p-1", quantity: 2 } as any,
        "u-1",
      );
      expect(ret.id).toBe("pr-1");
    });

    it("lists purchase returns with and without supplierId filter", async () => {
      const withSup = await service.listReturns({ supplierId: "sup-1", page: "1", limit: "5" });
      expect(withSup.data).toHaveLength(1);

      const all = await service.listReturns({});
      expect(all.data).toHaveLength(1);
    });
  });
});
