import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ExchangeOrder, ExchangeStatus, OrderStatus, Prisma, ReturnGrading } from "@repo/db";
import { PrismaService } from "../prisma/prisma.service";
import { InsufficientInventoryException, InventoryService } from "../inventory/inventory.service";
import { DocumentSequenceService } from "../common/document-sequence.service";
import { clampPagination, paginationMeta } from "../common/pagination";

export class OutOfStockException extends ConflictException {
  constructor(detail: string) {
    super(`Replacement SKU is out of stock: ${detail}`);
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const EXCHANGEABLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.PARTIAL_DELIVERED,
  OrderStatus.COMPLETE,
  OrderStatus.COMPLETED,
  OrderStatus.EXCHANGE,
];

const TRANSITIONS: Record<ExchangeStatus, ExchangeStatus[]> = {
  [ExchangeStatus.NEW]: [ExchangeStatus.INVOICED, ExchangeStatus.HOLD, ExchangeStatus.CANCELLED],
  [ExchangeStatus.HOLD]: [ExchangeStatus.NEW, ExchangeStatus.INVOICED, ExchangeStatus.CANCELLED],
  [ExchangeStatus.INVOICED]: [ExchangeStatus.IN_COURIER, ExchangeStatus.CANCELLED],
  [ExchangeStatus.IN_COURIER]: [ExchangeStatus.COMPLETE],
  [ExchangeStatus.COMPLETE]: [],
  [ExchangeStatus.CANCELLED]: [],
};

export type SettlementType = "INVOICE" | "CREDIT_NOTE" | "NONE";

/** Higher-priced replacement: invoice difference + return fee. Lower-priced: credit note. */
export function computeExchangeDifferential(
  returnedUnitPrice: number,
  replacementUnitPrice: number,
  quantity: number,
  returnDeliveryFee: number,
): { differenceAmount: number; amountDue: number; settlementType: SettlementType } {
  const differenceAmount = round2((replacementUnitPrice - returnedUnitPrice) * quantity);
  if (differenceAmount > 0) {
    return { differenceAmount, amountDue: round2(differenceAmount + returnDeliveryFee), settlementType: "INVOICE" };
  }
  if (differenceAmount < 0) return { differenceAmount, amountDue: 0, settlementType: "CREDIT_NOTE" };
  return { differenceAmount: 0, amountDue: 0, settlementType: "NONE" };
}

export interface CreateExchangeInput {
  originalOrderId: string;
  returnedProductId: string;
  replacementProductId: string;
  reason: string;
  quantity?: number;
  proofPhotos?: string[];
  returnDeliveryFee?: number;
  notes?: string;
}

@Injectable()
export class ExchangeOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly sequences: DocumentSequenceService,
  ) {}

  private serialize(e: ExchangeOrder) {
    const differenceAmount = Number(e.differenceAmount);
    const returnDeliveryFee = Number(e.returnDeliveryFee);
    return {
      ...e,
      differenceAmount,
      returnDeliveryFee,
      amountDue: differenceAmount > 0 ? round2(differenceAmount + returnDeliveryFee) : 0,
    };
  }

  private async load(id: string) {
    const exchange = await this.prisma.exchangeOrder.findUnique({
      where: { id },
      include: { originalOrder: { select: { customerId: true } } },
    });
    if (!exchange) throw new NotFoundException(`Exchange "${id}" not found`);
    return exchange;
  }

  private assertTransition(from: ExchangeStatus, to: ExchangeStatus) {
    if (!TRANSITIONS[from].includes(to)) {
      throw new BadRequestException(`Illegal exchange transition ${from} -> ${to}`);
    }
  }

  async create(input: CreateExchangeInput, createdById: string) {
    const quantity = input.quantity ?? 1;
    const order = await this.prisma.order.findUnique({ where: { id: input.originalOrderId }, include: { items: true } });
    if (!order) throw new NotFoundException(`Order "${input.originalOrderId}" not found`);
    if (!EXCHANGEABLE_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException(`Only delivered orders can be exchanged; order is ${order.status}`);
    }

    const line = order.items.find((i) => i.masterProductId === input.returnedProductId);
    if (!line || line.quantity < quantity) {
      throw new BadRequestException("Returned product/quantity does not match the original order");
    }

    const replacement = await this.prisma.masterProduct.findUnique({
      where: { id: input.replacementProductId },
      select: { id: true, basePrice: true, isActive: true },
    });
    if (!replacement || !replacement.isActive) throw new BadRequestException("Replacement product is not available");

    const storeListing = await this.prisma.storeProduct.findUnique({
      where: { storeId_masterProductId: { storeId: order.storeId, masterProductId: replacement.id } },
      select: { sellingPrice: true },
    });
    const replacementPrice = Number(storeListing?.sellingPrice ?? replacement.basePrice);
    const fee = input.returnDeliveryFee ?? 0;
    const { differenceAmount, settlementType } = computeExchangeDifferential(
      Number(line.unitSellingPrice),
      replacementPrice,
      quantity,
      fee,
    );

    const created = await this.prisma.$transaction(async (tx) =>
      tx.exchangeOrder.create({
        data: {
          exchangeNumber: await this.sequences.next("EX", { tx, pad: 4 }),
          originalOrderId: order.id,
          returnedProductId: input.returnedProductId,
          replacementProductId: input.replacementProductId,
          quantity,
          reason: input.reason,
          proofPhotos: input.proofPhotos ?? [],
          differenceAmount,
          returnDeliveryFee: fee,
          settlementType,
          notes: input.notes,
          createdById,
        },
      }),
    );
    return this.serialize(created);
  }

  /** Approval reserves the replacement SKU so it cannot be sold out from under the exchange. */
  async approve(id: string, adminId: string) {
    const exchange = await this.load(id);
    this.assertTransition(exchange.status, ExchangeStatus.INVOICED);

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        await this.inventory.reserve(exchange.replacementProductId, exchange.quantity, {
          tx,
          referenceType: "EXCHANGE",
          referenceId: exchange.id,
          performedById: adminId,
        });
        return tx.exchangeOrder.update({
          where: { id },
          data: { status: ExchangeStatus.INVOICED, stockReserved: true },
        });
      });
      return this.serialize(updated);
    } catch (error) {
      if (error instanceof InsufficientInventoryException) throw new OutOfStockException(error.message);
      throw error;
    }
  }

  async hold(id: string, reason: string) {
    const exchange = await this.load(id);
    this.assertTransition(exchange.status, ExchangeStatus.HOLD);
    return this.serialize(await this.prisma.exchangeOrder.update({ where: { id }, data: { status: ExchangeStatus.HOLD, notes: reason } }));
  }

  async reject(id: string, reason: string, adminId: string) {
    const exchange = await this.load(id);
    this.assertTransition(exchange.status, ExchangeStatus.CANCELLED);
    const updated = await this.prisma.$transaction(async (tx) => {
      if (exchange.stockReserved) {
        await this.inventory.release(exchange.replacementProductId, exchange.quantity, {
          tx,
          referenceType: "EXCHANGE",
          referenceId: exchange.id,
          performedById: adminId,
          notes: reason,
        });
      }
      return tx.exchangeOrder.update({
        where: { id },
        data: { status: ExchangeStatus.CANCELLED, stockReserved: false, notes: reason },
      });
    });
    return this.serialize(updated);
  }

  /** Issues reverse pickup + forward waybill; the reserved replacement leaves the warehouse. */
  async dispatch(
    id: string,
    waybill: { courierName: string; reverseTrackingNumber: string; forwardTrackingNumber: string },
    adminId: string,
  ) {
    const exchange = await this.load(id);
    this.assertTransition(exchange.status, ExchangeStatus.IN_COURIER);
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.inventory.fulfillReserved(exchange.replacementProductId, exchange.quantity, {
        tx,
        referenceType: "EXCHANGE",
        referenceId: exchange.id,
        performedById: adminId,
      });
      return tx.exchangeOrder.update({
        where: { id },
        data: { status: ExchangeStatus.IN_COURIER, stockReserved: false, ...waybill },
      });
    });
    return this.serialize(updated);
  }

  /** Quality inspection of the returned item: resellable units go back to stock, damaged are written off. */
  async inspect(id: string, grading: ReturnGrading, inspectorId: string) {
    const exchange = await this.load(id);
    if (exchange.status !== ExchangeStatus.IN_COURIER) {
      throw new BadRequestException("Returned items can only be inspected while the exchange is in courier");
    }
    if (exchange.grading) throw new ConflictException(`Return already graded ${exchange.grading}`);

    const ref = { referenceType: "EXCHANGE", referenceId: exchange.id, performedById: inspectorId };
    const updated = await this.prisma.$transaction(async (tx) => {
      if (grading === ReturnGrading.RESELLABLE) {
        await this.inventory.restock(exchange.returnedProductId, exchange.quantity, { ...ref, tx });
      } else {
        await this.inventory.writeOff(exchange.returnedProductId, 0, {
          ...ref,
          tx,
          notes: `Damaged exchange return (${exchange.quantity} unit(s)) not restocked`,
        });
      }
      return tx.exchangeOrder.update({ where: { id }, data: { grading, inspectedAt: new Date() } });
    });
    return this.serialize(updated);
  }

  async complete(id: string) {
    const exchange = await this.load(id);
    this.assertTransition(exchange.status, ExchangeStatus.COMPLETE);
    if (!exchange.grading) throw new BadRequestException("Inspect the returned item before completing the exchange");

    const updated = await this.prisma.$transaction(async (tx) => {
      if (exchange.settlementType === "CREDIT_NOTE") {
        await tx.customer.update({
          where: { id: exchange.originalOrder.customerId },
          data: { creditBalance: { increment: Math.abs(Number(exchange.differenceAmount)) } },
        });
      }
      return tx.exchangeOrder.update({
        where: { id },
        data: { status: ExchangeStatus.COMPLETE, completedAt: new Date() },
      });
    });
    return this.serialize(updated);
  }

  async list(query: { status?: ExchangeStatus; page?: string; limit?: string }) {
    const { page, limit, skip } = clampPagination(query);
    const statusFilter = query.status ? Prisma.sql`WHERE eo.status = ${query.status}::"ExchangeStatus"` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        eo.id, eo.exchange_number, eo.reason, eo.status, eo.difference_amount, eo.created_at,
        o.order_number AS original_order_number,
        c.full_name AS customer_name, c.phone AS customer_phone,
        ROUND(EXTRACT(EPOCH FROM (COALESCE(eo.completed_at, NOW()) - eo.created_at)) / 86400, 1) AS days_in_process,
        p_orig.title AS returned_product_title,
        p_rep.title AS replacement_product_title,
        COUNT(*) OVER () AS total_count
      FROM exchange_orders eo
      JOIN orders o ON eo.original_order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      JOIN master_products p_orig ON eo.returned_product_id = p_orig.id
      JOIN master_products p_rep ON eo.replacement_product_id = p_rep.id
      ${statusFilter}
      ORDER BY eo.created_at DESC
      LIMIT ${limit} OFFSET ${skip}
    `;
    return {
      data: rows.map((r) => ({
        id: r.id,
        exchangeNumber: r.exchange_number,
        reason: r.reason,
        status: r.status,
        differenceAmount: Number(r.difference_amount),
        originalOrderNumber: r.original_order_number,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        daysInProcess: Number(r.days_in_process),
        returnedProductTitle: r.returned_product_title,
        replacementProductTitle: r.replacement_product_title,
        createdAt: r.created_at,
      })),
      meta: paginationMeta(page, limit, rows.length ? Number(rows[0].total_count) : 0),
    };
  }

  async overview() {
    const groups = await this.prisma.exchangeOrder.groupBy({ by: ["status"], _count: { _all: true } });
    const counts = Object.fromEntries(Object.values(ExchangeStatus).map((s) => [s, 0])) as Record<ExchangeStatus, number>;
    for (const g of groups) counts[g.status] = g._count._all;
    return { ...counts, total: groups.reduce((s, g) => s + g._count._all, 0) };
  }
}
