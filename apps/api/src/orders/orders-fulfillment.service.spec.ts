import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { OrderStatus } from "@repo/db";
import { IllegalStateTransitionException, OrderStateMachine } from "./order-state-machine";
import { FulfillmentService, splitPartialDelivery } from "./fulfillment.service";

const baseOrder = () => ({
  id: "o-1",
  orderNumber: "ORD-1",
  storeId: "s-1",
  status: OrderStatus.IN_COURIER,
  subtotal: 2500,
  discountAmount: 0,
  shippingFee: 80,
  totalBaseCost: 1700,
  platformCommission: 125,
  paymentFee: 0,
  totalAmount: 2580,
  studentNetProfit: 675,
  items: [
    { id: "i-a", masterProductId: "p-a", quantity: 2, unitSellingPrice: 1000, unitBasePrice: 700, totalPrice: 2000 },
    { id: "i-b", masterProductId: "p-b", quantity: 1, unitSellingPrice: 500, unitBasePrice: 300, totalPrice: 500 },
  ],
});

describe("Order fulfillment (Unit)", () => {
  describe("state machine", () => {
    it("NEW -> COMPLETE throws IllegalStateTransitionException", () => {
      expect(() => OrderStateMachine.validateTransition(OrderStatus.NEW, OrderStatus.COMPLETE)).toThrow(
        IllegalStateTransitionException,
      );
    });

    it("IllegalStateTransitionException is a 400 Bad Request", () => {
      expect(new IllegalStateTransitionException(OrderStatus.NEW, OrderStatus.COMPLETE, [])).toBeInstanceOf(
        BadRequestException,
      );
    });

    it("follows the documented fulfillment path", () => {
      const path = [
        OrderStatus.NEW,
        OrderStatus.INVOICED,
        OrderStatus.IN_COURIER,
        OrderStatus.DELIVERED,
        OrderStatus.COMPLETE,
      ];
      for (let i = 1; i < path.length; i++) {
        expect(OrderStateMachine.canTransition(path[i - 1], path[i])).toBe(true);
      }
      expect(OrderStateMachine.canTransition(OrderStatus.INVOICED, OrderStatus.UNMATCH)).toBe(true);
      expect(OrderStateMachine.canTransition(OrderStatus.UNMATCH, OrderStatus.INVOICED)).toBe(true);
      expect(OrderStateMachine.canTransition(OrderStatus.HOLD, OrderStatus.NEW)).toBe(true);
      expect(OrderStateMachine.canTransition(OrderStatus.PARTIAL_DELIVERED, OrderStatus.COMPLETE)).toBe(true);
    });
  });

  describe("splitPartialDelivery()", () => {
    it("recalculates subtotal, fees and profit for the accepted items", () => {
      const split = splitPartialDelivery(baseOrder(), [
        { orderItemId: "i-a", quantity: 2 },
        { orderItemId: "i-b", quantity: 0 },
      ]);
      expect(split).toMatchObject({
        subtotal: 2000,
        totalBaseCost: 1400,
        platformCommission: 100,
        paymentFee: 0,
        totalAmount: 2080,
        studentNetProfit: 500,
        profitDelta: -175,
      });
      expect(split.returned).toEqual([{ orderItemId: "i-b", masterProductId: "p-b", quantity: 1 }]);
    });

    it("keeps the original commission rate and re-prices online payment fees", () => {
      const order = { ...baseOrder(), paymentFee: 51.6, platformCommission: 37.5 }; // 1.5% L5 rate, 2% fee
      const split = splitPartialDelivery(order, [{ orderItemId: "i-a", quantity: 1 }]);
      expect(split.platformCommission).toBe(15);
      expect(split.paymentFee).toBe(21.6);
    });

    it("treats unlisted items as fully returned", () => {
      const split = splitPartialDelivery(baseOrder(), [{ orderItemId: "i-a", quantity: 1 }]);
      expect(split.returned).toEqual([
        { orderItemId: "i-a", masterProductId: "p-a", quantity: 1 },
        { orderItemId: "i-b", masterProductId: "p-b", quantity: 1 },
      ]);
    });

    it("rejects full acceptance, zero acceptance and over-acceptance", () => {
      const order = baseOrder();
      expect(() =>
        splitPartialDelivery(order, [
          { orderItemId: "i-a", quantity: 2 },
          { orderItemId: "i-b", quantity: 1 },
        ]),
      ).toThrow(BadRequestException);
      expect(() => splitPartialDelivery(order, [{ orderItemId: "i-a", quantity: 0 }])).toThrow(BadRequestException);
      expect(() => splitPartialDelivery(order, [{ orderItemId: "i-a", quantity: 3 }])).toThrow(BadRequestException);
      expect(() => splitPartialDelivery(order, [{ orderItemId: "nope", quantity: 1 }])).toThrow(BadRequestException);
    });
  });

  describe("FulfillmentService", () => {
    let prisma: any;
    let inventory: any;
    let sequences: any;
    let events: any;
    let service: FulfillmentService;

    beforeEach(() => {
      prisma = {
        order: {
          findUnique: vi.fn().mockResolvedValue(baseOrder()),
          findMany: vi.fn(),
          update: vi.fn(async ({ data }: any) => ({ ...baseOrder(), ...data })),
        },
        orderItem: { update: vi.fn() },
        orderReturnItem: { createMany: vi.fn() },
        ledgerEntry: {
          findFirst: vi.fn().mockResolvedValue({ balanceAfter: "1000.00" }),
          create: vi.fn(async ({ data }: any) => data),
        },
        $executeRaw: vi.fn().mockResolvedValue(2),
        $queryRaw: vi.fn().mockResolvedValue([]),
        $transaction: vi.fn(async (cb: any) => cb(prisma)),
      };
      inventory = { restock: vi.fn() };
      sequences = {
        next: vi.fn().mockResolvedValue("INV-2026-000001"),
        nextRange: vi.fn().mockResolvedValue(["INV-2026-000001", "INV-2026-000002"]),
      };
      events = { emit: vi.fn() };
      service = new FulfillmentService(prisma, inventory, sequences, events);
    });

    it("partial delivery restocks returned units and posts a profit ADJUSTMENT to the ledger", async () => {
      await service.recordPartialDelivery("o-1", [{ orderItemId: "i-a", quantity: 2 }], "Customer refused item B");

      expect(inventory.restock).toHaveBeenCalledWith(
        "p-b",
        1,
        expect.objectContaining({ referenceType: "ORDER_PARTIAL_RETURN", referenceId: "o-1" }),
      );
      expect(prisma.ledgerEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ entryType: "ADJUSTMENT", amount: -175, balanceAfter: 825, orderId: "o-1" }),
      });
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: OrderStatus.PARTIAL_DELIVERED, subtotal: 2000, studentNetProfit: 500 }),
        }),
      );
    });

    it("partial delivery is only possible for orders in courier", async () => {
      prisma.order.findUnique.mockResolvedValue({ ...baseOrder(), status: OrderStatus.NEW });
      await expect(service.recordPartialDelivery("o-1", [{ orderItemId: "i-a", quantity: 1 }])).rejects.toBeInstanceOf(
        IllegalStateTransitionException,
      );
    });

    it("invoicing assigns the next INV sequence number", async () => {
      prisma.order.findUnique.mockResolvedValue({ ...baseOrder(), status: OrderStatus.NEW });
      await service.invoice("o-1");
      expect(sequences.next).toHaveBeenCalledWith("INV", expect.anything());
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: OrderStatus.INVOICED, invoiceNumber: "INV-2026-000001" }),
        }),
      );
    });

    it("bulk invoicing is all-or-nothing and uses a single batched UPDATE", async () => {
      prisma.order.findMany.mockResolvedValue([
        { id: "o-1", orderNumber: "ORD-1", status: OrderStatus.NEW },
        { id: "o-2", orderNumber: "ORD-2", status: OrderStatus.DELIVERED },
      ]);
      await expect(service.bulkInvoice(["o-1", "o-2"])).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$executeRaw).not.toHaveBeenCalled();

      prisma.order.findMany.mockResolvedValue([
        { id: "o-1", orderNumber: "ORD-1", status: OrderStatus.NEW },
        { id: "o-2", orderNumber: "ORD-2", status: OrderStatus.NEW },
      ]);
      const result = await service.bulkInvoice(["o-1", "o-2"]);
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(result.invoices).toEqual([
        { orderId: "o-1", orderNumber: "ORD-1", invoiceNumber: "INV-2026-000001" },
        { orderId: "o-2", orderNumber: "ORD-2", invoiceNumber: "INV-2026-000002" },
      ]);

      // When rows updated does not match expected ordered length
      prisma.$executeRaw.mockResolvedValueOnce(1); // 1 instead of 2
      await expect(service.bulkInvoice(["o-1", "o-2"])).rejects.toThrow(
        "Orders changed status during bulk invoicing; retry the batch",
      );
    });

    it("transitions order status with reason or defaults statusReason to null, and rejects illegal transitions", async () => {
      prisma.order.findUnique.mockResolvedValue({ ...baseOrder(), status: OrderStatus.NEW });
      await service.transition("o-1", OrderStatus.INVOICED, "Ready for dispatch");
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: "o-1" },
        data: { status: OrderStatus.INVOICED, statusReason: "Ready for dispatch" },
      });

      // Default reason to null
      await service.transition("o-1", OrderStatus.INVOICED);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: "o-1" },
        data: { status: OrderStatus.INVOICED, statusReason: null },
      });

      // Illegal transition
      await expect(service.transition("o-1", OrderStatus.COMPLETE)).rejects.toBeInstanceOf(
        IllegalStateTransitionException,
      );
    });

    it("retrieves queue counts aggregated across all fulfillment buckets", async () => {
      prisma.$queryRaw.mockResolvedValueOnce([
        {
          all: "120",
          new: "20",
          invoiced: "15",
          in_courier: "25",
          partial: "5",
          delivered: "30",
          complete: "15",
          hold: "3",
          cancelled: "4",
          unmatch: "1",
          exchange: "1",
          returned: "1",
        },
      ]);
      const counts = await service.getQueueCounts();
      expect(counts.all).toBe(120);
      expect(counts.new).toBe(20);
      expect(counts.invoiced).toBe(15);
      expect(counts.inCourier).toBe(25);
      expect(counts.delivered).toBe(30);
    });
  });
});
