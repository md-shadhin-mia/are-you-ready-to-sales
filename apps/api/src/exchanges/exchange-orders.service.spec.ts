import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ExchangeStatus, OrderStatus, ReturnGrading } from "@repo/db";
import { InsufficientInventoryException } from "../inventory/inventory.service";
import { ExchangeOrdersService, OutOfStockException, computeExchangeDifferential } from "./exchange-orders.service";

describe("ExchangeOrdersService (Unit)", () => {
  let prisma: any;
  let inventory: any;
  let sequences: any;
  let service: ExchangeOrdersService;

  const exchange = (overrides: any = {}) => ({
    id: "ex-1",
    exchangeNumber: "EX-2026-0001",
    status: ExchangeStatus.NEW,
    originalOrderId: "o-1",
    returnedProductId: "p-old",
    replacementProductId: "p-new",
    quantity: 1,
    stockReserved: false,
    grading: null,
    differenceAmount: -200,
    settlementType: "CREDIT_NOTE",
    originalOrder: { customerId: "c-1" },
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      exchangeOrder: {
        findUnique: vi.fn().mockResolvedValue(exchange()),
        create: vi.fn(async ({ data }: any) => ({ id: "ex-1", ...data })),
        update: vi.fn(async ({ data }: any) => ({ ...exchange(), ...data })),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      order: { findUnique: vi.fn() },
      storeProduct: { findUnique: vi.fn().mockResolvedValue(null) },
      masterProduct: { findUnique: vi.fn().mockResolvedValue({ id: "p-new", basePrice: 1300, isActive: true }) },
      customer: { update: vi.fn() },
      $queryRaw: vi.fn().mockResolvedValue([]),
      $transaction: vi.fn(async (cb: any) => cb(prisma)),
    };
    inventory = { reserve: vi.fn(), release: vi.fn(), fulfillReserved: vi.fn(), restock: vi.fn(), writeOff: vi.fn() };
    sequences = { next: vi.fn().mockResolvedValue("EX-2026-0001") };
    service = new ExchangeOrdersService(prisma, inventory, sequences);
  });

  describe("computeExchangeDifferential()", () => {
    it("invoices the difference plus return delivery fee for a pricier replacement", () => {
      expect(computeExchangeDifferential(1000, 1300, 1, 60)).toEqual({
        differenceAmount: 300,
        amountDue: 360,
        settlementType: "INVOICE",
      });
    });

    it("issues a credit note for a cheaper replacement", () => {
      expect(computeExchangeDifferential(1500, 1300, 2, 60)).toEqual({
        differenceAmount: -400,
        amountDue: 0,
        settlementType: "CREDIT_NOTE",
      });
    });

    it("like-for-like swaps only charge the delivery fee", () => {
      expect(computeExchangeDifferential(900, 900, 1, 0)).toEqual({
        differenceAmount: 0,
        amountDue: 0,
        settlementType: "NONE",
      });
    });
  });

  it("create() rejects exchanges for orders that were never delivered", async () => {
    prisma.order.findUnique.mockResolvedValue({ id: "o-1", status: OrderStatus.INVOICED, storeId: "s", items: [] });
    await expect(
      service.create({ originalOrderId: "o-1", returnedProductId: "p-old", replacementProductId: "p-new", reason: "Size" }, "u"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("create() numbers the ticket EX-YYYY-XXXX and prices the differential", async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: "o-1",
      storeId: "s-1",
      status: OrderStatus.DELIVERED,
      items: [{ masterProductId: "p-old", quantity: 1, unitSellingPrice: 1000 }],
    });
    const created = await service.create(
      { originalOrderId: "o-1", returnedProductId: "p-old", replacementProductId: "p-new", reason: "Wrong size" },
      "agent-1",
    );
    expect(sequences.next).toHaveBeenCalledWith("EX", expect.objectContaining({ pad: 4 }));
    expect(created).toMatchObject({ exchangeNumber: "EX-2026-0001", differenceAmount: 300, settlementType: "INVOICE" });
  });

  it("approving an exchange on a zero-stock SKU throws OutOfStockException", async () => {
    inventory.reserve.mockRejectedValue(new InsufficientInventoryException("none left"));
    await expect(service.approve("ex-1", "admin")).rejects.toBeInstanceOf(OutOfStockException);
    expect(prisma.exchangeOrder.update).not.toHaveBeenCalled();
  });

  it("approving reserves the replacement SKU and moves the ticket to INVOICED", async () => {
    await service.approve("ex-1", "admin");
    expect(inventory.reserve).toHaveBeenCalledWith("p-new", 1, expect.objectContaining({ referenceId: "ex-1" }));
    expect(prisma.exchangeOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: ExchangeStatus.INVOICED, stockReserved: true }) }),
    );
  });

  it("rejection releases the reserved replacement inventory", async () => {
    prisma.exchangeOrder.findUnique.mockResolvedValue(exchange({ status: ExchangeStatus.INVOICED, stockReserved: true }));
    await service.reject("ex-1", "Photos show customer damage", "admin");
    expect(inventory.release).toHaveBeenCalledWith("p-new", 1, expect.objectContaining({ referenceId: "ex-1" }));
    expect(prisma.exchangeOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: ExchangeStatus.CANCELLED, stockReserved: false }) }),
    );
  });

  it("rejection without a reservation does not touch inventory", async () => {
    await service.reject("ex-1", "Duplicate ticket", "admin");
    expect(inventory.release).not.toHaveBeenCalled();
  });

  it("inspection restocks a RESELLABLE return and writes off a DAMAGED one", async () => {
    prisma.exchangeOrder.findUnique.mockResolvedValue(exchange({ status: ExchangeStatus.IN_COURIER }));
    await service.inspect("ex-1", ReturnGrading.RESELLABLE, "wh-1");
    expect(inventory.restock).toHaveBeenCalledWith("p-old", 1, expect.anything());

    prisma.exchangeOrder.findUnique.mockResolvedValue(exchange({ status: ExchangeStatus.IN_COURIER }));
    await service.inspect("ex-1", ReturnGrading.DAMAGED, "wh-1");
    expect(inventory.writeOff).toHaveBeenCalledWith("p-old", 0, expect.anything());
  });

  it("completion requires inspection and applies credit notes to the customer", async () => {
    prisma.exchangeOrder.findUnique.mockResolvedValue(exchange({ status: ExchangeStatus.IN_COURIER }));
    await expect(service.complete("ex-1")).rejects.toBeInstanceOf(BadRequestException);

    prisma.exchangeOrder.findUnique.mockResolvedValue(
      exchange({ status: ExchangeStatus.IN_COURIER, grading: ReturnGrading.RESELLABLE }),
    );
    await service.complete("ex-1");
    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: "c-1" },
      data: { creditBalance: { increment: 200 } },
    });
  });

  it("enforces the exchange state machine", async () => {
    prisma.exchangeOrder.findUnique.mockResolvedValue(exchange({ status: ExchangeStatus.COMPLETE }));
    await expect(service.approve("ex-1", "admin")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("holds an exchange order with a reason note", async () => {
    prisma.exchangeOrder.findUnique.mockResolvedValue(exchange({ status: ExchangeStatus.NEW }));
    await service.hold("ex-1", "Awaiting customer photos");
    expect(prisma.exchangeOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: ExchangeStatus.HOLD, notes: "Awaiting customer photos" } }),
    );
  });

  it("inspect rejects calls if not in courier or if already graded", async () => {
    prisma.exchangeOrder.findUnique.mockResolvedValueOnce(exchange({ status: ExchangeStatus.NEW }));
    await expect(service.inspect("ex-1", ReturnGrading.RESELLABLE, "wh-1")).rejects.toThrow(
      "Returned items can only be inspected while the exchange is in courier",
    );

    prisma.exchangeOrder.findUnique.mockResolvedValueOnce(
      exchange({ status: ExchangeStatus.IN_COURIER, grading: ReturnGrading.RESELLABLE }),
    );
    await expect(service.inspect("ex-1", ReturnGrading.DAMAGED, "wh-1")).rejects.toThrow(
      ConflictException,
    );
  });

  it("completes exchange without crediting customer if settlement is INVOICE", async () => {
    prisma.exchangeOrder.findUnique.mockResolvedValue(
      exchange({
        status: ExchangeStatus.IN_COURIER,
        grading: ReturnGrading.RESELLABLE,
        settlementType: "INVOICE",
      }),
    );
    await service.complete("ex-1");
    expect(prisma.customer.update).not.toHaveBeenCalled();
    expect(prisma.exchangeOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: ExchangeStatus.COMPLETE }) }),
    );
  });

  it("lists exchange orders with and without status filter and handles empty lists", async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: "ex-1",
        exchange_number: "EX-1",
        reason: "Defective",
        status: ExchangeStatus.NEW,
        difference_amount: "100.00",
        original_order_number: "ORD-1",
        customer_name: "Customer",
        customer_phone: "01700000000",
        days_in_process: "1.5",
        returned_product_title: "Phone A",
        replacement_product_title: "Phone B",
        created_at: new Date(),
        total_count: "1",
      },
    ]);

    const res = await service.list({ status: ExchangeStatus.NEW, page: "1", limit: "10" });
    expect(res.data).toHaveLength(1);
    expect(res.meta.total).toBe(1);

    prisma.$queryRaw.mockResolvedValueOnce([]);
    const emptyRes = await service.list({});
    expect(emptyRes.data).toHaveLength(0);
    expect(emptyRes.meta.total).toBe(0);
  });

  it("aggregates overview metrics across all exchange statuses", async () => {
    prisma.exchangeOrder.groupBy.mockResolvedValueOnce([
      { status: ExchangeStatus.NEW, _count: { _all: 3 } },
      { status: ExchangeStatus.COMPLETE, _count: { _all: 7 } },
    ]);

    const overview = await service.overview();
    expect(overview.NEW).toBe(3);
    expect(overview.COMPLETE).toBe(7);
    expect(overview.total).toBe(10);
  });

  it("throws NotFoundException when exchange order is missing", async () => {
    prisma.exchangeOrder.findUnique.mockResolvedValueOnce(null);
    await expect(service.hold("ex-missing", "reason")).rejects.toThrow(NotFoundException);
  });
});
