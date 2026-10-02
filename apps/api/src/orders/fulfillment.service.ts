import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { LedgerEntryType, OrderStatus, Prisma } from "@repo/db";
import { PrismaService } from "../prisma/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { DocumentSequenceService } from "../common/document-sequence.service";
import { PricingService } from "../pricing/pricing.service";
import { OrderStateMachine } from "./order-state-machine";

type Money = number | string | Prisma.Decimal;
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface AcceptedItem {
  orderItemId: string;
  quantity: number;
}

interface SplittableOrder {
  subtotal: Money;
  discountAmount: Money;
  shippingFee: Money;
  platformCommission: Money;
  paymentFee: Money;
  studentNetProfit: Money;
  items: Array<{ id: string; masterProductId: string; quantity: number; unitSellingPrice: Money; unitBasePrice: Money }>;
}

/**
 * Pure partial-delivery split: keeps accepted units on the invoice, returns the rest, and re-prices
 * commission (at the order's original effective rate), payment fee, total and student profit.
 */
export function splitPartialDelivery(order: SplittableOrder, accepted: AcceptedItem[]) {
  const acceptedById = new Map<string, number>();
  for (const a of accepted) {
    if (!order.items.some((i) => i.id === a.orderItemId)) {
      throw new BadRequestException(`Order item "${a.orderItemId}" does not belong to this order`);
    }
    acceptedById.set(a.orderItemId, (acceptedById.get(a.orderItemId) ?? 0) + a.quantity);
  }

  const lines = order.items.map((item) => {
    const acceptedQty = acceptedById.get(item.id) ?? 0;
    if (!Number.isInteger(acceptedQty) || acceptedQty < 0 || acceptedQty > item.quantity) {
      throw new BadRequestException(`Accepted quantity for item "${item.id}" must be between 0 and ${item.quantity}`);
    }
    return { item, acceptedQty, returnedQty: item.quantity - acceptedQty };
  });

  const totalAccepted = lines.reduce((s, l) => s + l.acceptedQty, 0);
  const totalReturned = lines.reduce((s, l) => s + l.returnedQty, 0);
  if (totalAccepted === 0) throw new BadRequestException("No items accepted; mark the order RETURNED instead");
  if (totalReturned === 0) throw new BadRequestException("All items accepted; mark the order DELIVERED instead");

  const originalDiscounted = Number(order.subtotal) - Number(order.discountAmount);
  const commissionRate = originalDiscounted > 0 ? Number(order.platformCommission) / originalDiscounted : 0;

  const subtotal = round2(lines.reduce((s, l) => s + Number(l.item.unitSellingPrice) * l.acceptedQty, 0));
  const totalBaseCost = round2(lines.reduce((s, l) => s + Number(l.item.unitBasePrice) * l.acceptedQty, 0));
  const discounted = Math.max(0, subtotal - Number(order.discountAmount));
  const shippingFee = Number(order.shippingFee);
  const platformCommission = round2(discounted * commissionRate);
  const paymentFee =
    Number(order.paymentFee) > 0 ? round2((discounted + shippingFee) * PricingService.ONLINE_PAYMENT_FEE_RATE) : 0;
  const studentNetProfit = round2(discounted - totalBaseCost - platformCommission - paymentFee);

  return {
    lines,
    subtotal,
    totalBaseCost,
    platformCommission,
    paymentFee,
    totalAmount: round2(discounted + shippingFee),
    studentNetProfit,
    profitDelta: round2(studentNetProfit - Number(order.studentNetProfit)),
    returned: lines
      .filter((l) => l.returnedQty > 0)
      .map((l) => ({ orderItemId: l.item.id, masterProductId: l.item.masterProductId, quantity: l.returnedQty })),
  };
}

@Injectable()
export class FulfillmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly sequences: DocumentSequenceService,
    private readonly events: EventEmitter2,
  ) {}

  private async findOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new NotFoundException(`Order "${orderId}" not found`);
    return order;
  }

  async invoice(orderId: string) {
    const order = await this.findOrder(orderId);
    OrderStateMachine.validateTransition(order.status, OrderStatus.INVOICED);
    return this.prisma.$transaction(async (tx) => {
      const invoiceNumber = order.invoiceNumber ?? (await this.sequences.next("INV", { tx }));
      return tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.INVOICED, invoiceNumber, invoicedAt: order.invoicedAt ?? new Date() },
      });
    });
  }

  /** Invoices many NEW orders atomically: one sequence allocation and one batched UPDATE. */
  async bulkInvoice(orderIds: string[]) {
    const ids = Array.from(new Set(orderIds));
    if (ids.length === 0) throw new BadRequestException("orderIds cannot be empty");

    const orders = await this.prisma.order.findMany({
      where: { id: { in: ids } },
      select: { id: true, orderNumber: true, status: true },
    });
    const missing = ids.filter((id) => !orders.some((o) => o.id === id));
    const illegal = orders.filter((o) => !OrderStateMachine.canTransition(o.status, OrderStatus.INVOICED) || o.status === OrderStatus.INVOICED);
    if (missing.length > 0 || illegal.length > 0) {
      throw new BadRequestException({
        message: "Bulk invoice rejected; no orders were changed",
        missingOrderIds: missing,
        illegalOrders: illegal.map((o) => ({ orderNumber: o.orderNumber, status: o.status })),
      });
    }

    const ordered = ids.map((id) => orders.find((o) => o.id === id)!);
    const invoices = await this.prisma.$transaction(async (tx) => {
      const numbers = await this.sequences.nextRange("INV", ordered.length, { tx });
      const values = Prisma.join(ordered.map((o, i) => Prisma.sql`(${o.id}, ${numbers[i]})`));
      const updated = await tx.$executeRaw`
        UPDATE orders SET status = 'INVOICED', invoice_number = v.invoice_number, invoiced_at = NOW(), updated_at = NOW()
        FROM (VALUES ${values}) AS v(id, invoice_number)
        WHERE orders.id = v.id AND orders.status IN ('NEW', 'PAID', 'PROCESSING', 'HOLD', 'UNMATCH')
      `;
      if (updated !== ordered.length) {
        throw new BadRequestException("Orders changed status during bulk invoicing; retry the batch");
      }
      return ordered.map((o, i) => ({ orderId: o.id, orderNumber: o.orderNumber, invoiceNumber: numbers[i] }));
    });

    return { invoiced: invoices.length, invoices };
  }

  async transition(orderId: string, to: OrderStatus, reason?: string) {
    const order = await this.findOrder(orderId);
    OrderStateMachine.validateTransition(order.status, to);
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: to, statusReason: reason ?? null },
    });
  }

  async recordPartialDelivery(orderId: string, accepted: AcceptedItem[], reason?: string) {
    const order = await this.findOrder(orderId);
    OrderStateMachine.validateTransition(order.status, OrderStatus.PARTIAL_DELIVERED);
    const split = splitPartialDelivery(order, accepted);
    const ref = { referenceType: "ORDER_PARTIAL_RETURN", referenceId: order.id, notes: reason };

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const line of split.lines.filter((l) => l.returnedQty > 0)) {
        await tx.orderItem.update({
          where: { id: line.item.id },
          data: {
            quantity: line.acceptedQty,
            totalPrice: round2(Number(line.item.unitSellingPrice) * line.acceptedQty),
          },
        });
      }
      await tx.orderReturnItem.createMany({
        data: split.returned.map((r) => ({ orderId: order.id, ...r, reason })),
      });
      for (const r of split.returned) {
        await this.inventory.restock(r.masterProductId, r.quantity, { ...ref, tx });
      }

      if (split.profitDelta !== 0) {
        const last = await tx.ledgerEntry.findFirst({ where: { storeId: order.storeId }, orderBy: { createdAt: "desc" } });
        await tx.ledgerEntry.create({
          data: {
            storeId: order.storeId,
            orderId: order.id,
            entryType: LedgerEntryType.ADJUSTMENT,
            amount: split.profitDelta,
            balanceAfter: round2(Number(last?.balanceAfter ?? 0) + split.profitDelta),
            notes: `Partial delivery adjustment for ${order.orderNumber}`,
          },
        });
      }

      return tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PARTIAL_DELIVERED,
          statusReason: reason ?? null,
          deliveredAt: new Date(),
          subtotal: split.subtotal,
          totalBaseCost: split.totalBaseCost,
          platformCommission: split.platformCommission,
          paymentFee: split.paymentFee,
          totalAmount: split.totalAmount,
          studentNetProfit: split.studentNetProfit,
        },
      });
    });

    return {
      id: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      subtotal: split.subtotal,
      totalAmount: split.totalAmount,
      studentNetProfit: split.studentNetProfit,
      profitAdjustment: split.profitDelta,
      returnedItems: split.returned.map(({ masterProductId, quantity }) => ({ masterProductId, quantity })),
    };
  }

  /** All fulfillment queue counters from one table scan. */
  async getQueueCounts() {
    const [row] = await this.prisma.$queryRaw<Array<Record<string, bigint>>>`
      SELECT
        COUNT(*) AS all,
        COUNT(*) FILTER (WHERE status IN ('NEW', 'PENDING_PAYMENT')) AS new,
        COUNT(*) FILTER (WHERE status = 'INVOICED') AS invoiced,
        COUNT(*) FILTER (WHERE status IN ('IN_COURIER', 'SHIPPED')) AS in_courier,
        COUNT(*) FILTER (WHERE status = 'PARTIAL_DELIVERED') AS partial,
        COUNT(*) FILTER (WHERE status = 'DELIVERED') AS delivered,
        COUNT(*) FILTER (WHERE status IN ('COMPLETE', 'COMPLETED')) AS complete,
        COUNT(*) FILTER (WHERE status = 'HOLD') AS hold,
        COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
        COUNT(*) FILTER (WHERE status = 'UNMATCH') AS unmatch,
        COUNT(*) FILTER (WHERE status = 'EXCHANGE') AS exchange,
        COUNT(*) FILTER (WHERE status = 'RETURNED') AS returned
      FROM orders
    `;
    return {
      all: Number(row.all),
      new: Number(row.new),
      invoiced: Number(row.invoiced),
      inCourier: Number(row.in_courier),
      partialDelivered: Number(row.partial),
      delivered: Number(row.delivered),
      complete: Number(row.complete),
      hold: Number(row.hold),
      cancelled: Number(row.cancelled),
      unmatch: Number(row.unmatch),
      exchange: Number(row.exchange),
      returned: Number(row.returned),
    };
  }
}
