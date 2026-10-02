import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, StockMovementType } from "@repo/db";
import { PrismaService } from "../prisma/prisma.service";
import { clampPagination, paginationMeta } from "../common/pagination";

export class InsufficientInventoryException extends ConflictException {
  constructor(message: string) {
    super(message);
  }
}

type Tx = Prisma.TransactionClient;

export interface MovementRef {
  referenceType?: string;
  referenceId?: string;
  performedById?: string;
  notes?: string;
  /** Join the caller's transaction instead of opening a new one. */
  tx?: Tx;
}

interface LockedStock {
  id: string;
  title: string;
  stock_quantity: number;
  reserved_quantity: number;
  average_cost: Prisma.Decimal | string | number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** WAC = (currentQty * currentCost + purchasedQty * purchasedCost) / (currentQty + purchasedQty). */
export function computeWeightedAverageCost(
  currentQty: number,
  currentCost: number,
  purchasedQty: number,
  purchasedCost: number,
): number {
  const totalQty = Math.max(0, currentQty) + purchasedQty;
  if (totalQty <= 0) return round2(purchasedCost);
  return round2((Math.max(0, currentQty) * currentCost + purchasedQty * purchasedCost) / totalQty);
}

/**
 * Single writer for physical stock. `stock_quantity` holds AVAILABLE units (what checkout sells);
 * on hand = available + reserved. Every mutation locks the product row (SELECT ... FOR UPDATE)
 * and appends an immutable stock_movements row.
 */
@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private run<T>(ref: MovementRef, work: (tx: Tx) => Promise<T>): Promise<T> {
    return ref.tx ? work(ref.tx) : this.prisma.$transaction(work);
  }

  private async lock(tx: Tx, productId: string): Promise<LockedStock> {
    const [row] = await tx.$queryRaw<LockedStock[]>`
      SELECT id, title, stock_quantity, reserved_quantity, average_cost
      FROM master_products WHERE id = ${productId} FOR UPDATE
    `;
    if (!row) throw new NotFoundException(`Master product "${productId}" not found`);
    return row;
  }

  private async move(
    type: StockMovementType,
    productId: string,
    onHandDelta: number,
    reservedDelta: number,
    ref: MovementRef,
    purchaseUnitCost?: number,
  ) {
    return this.run(ref, async (tx) => {
      const row = await this.lock(tx, productId);
      const available = row.stock_quantity;
      const reserved = row.reserved_quantity;
      const onHand = available + reserved;

      const reservedAfter = reserved + reservedDelta;
      const onHandAfter = onHand + onHandDelta;
      const availableAfter = onHandAfter - reservedAfter;

      if (reservedAfter < 0) {
        throw new InsufficientInventoryException(
          `Cannot release ${-reservedDelta} unit(s) of "${row.title}": only ${reserved} reserved`,
        );
      }
      if (availableAfter < 0) {
        throw new InsufficientInventoryException(
          `Insufficient inventory for "${row.title}". Available: ${available}, requested: ${available - availableAfter}`,
        );
      }

      const data: Prisma.MasterProductUpdateInput = { stockQuantity: availableAfter, reservedQuantity: reservedAfter };
      if (purchaseUnitCost !== undefined) {
        data.averageCost = computeWeightedAverageCost(onHand, Number(row.average_cost), onHandDelta, purchaseUnitCost);
      }
      await tx.masterProduct.update({ where: { id: productId }, data });

      return tx.stockMovement.create({
        data: {
          masterProductId: productId,
          movementType: type,
          quantity: onHandDelta,
          reservedDelta,
          onHandAfter,
          reservedAfter,
          balanceAfter: availableAfter,
          referenceType: ref.referenceType,
          referenceId: ref.referenceId,
          performedById: ref.performedById,
          notes: ref.notes,
        },
      });
    });
  }

  private assertPositive(qty: number) {
    if (!Number.isInteger(qty) || qty <= 0) throw new BadRequestException("Quantity must be a positive integer");
  }

  async reserve(productId: string, qty: number, ref: MovementRef) {
    this.assertPositive(qty);
    return this.move(StockMovementType.EXCHANGE_HOLD, productId, 0, qty, ref);
  }

  async release(productId: string, qty: number, ref: MovementRef) {
    this.assertPositive(qty);
    return this.move(StockMovementType.EXCHANGE_RELEASE, productId, 0, -qty, ref);
  }

  async fulfillReserved(productId: string, qty: number, ref: MovementRef) {
    this.assertPositive(qty);
    return this.move(StockMovementType.EXCHANGE_DISPATCH, productId, -qty, -qty, ref);
  }

  /** Direct sale out of available stock (e.g. wholesale orders). */
  async fulfillSale(productId: string, qty: number, ref: MovementRef) {
    this.assertPositive(qty);
    return this.move(StockMovementType.ORDER_FULFILLMENT, productId, -qty, 0, ref);
  }

  async receive(productId: string, qty: number, unitCost: number, ref: MovementRef) {
    this.assertPositive(qty);
    return this.move(StockMovementType.PURCHASE_RECEIPT, productId, qty, 0, ref, unitCost);
  }

  async restock(productId: string, qty: number, ref: MovementRef) {
    this.assertPositive(qty);
    return this.move(StockMovementType.RETURN_RESTOCK, productId, qty, 0, ref);
  }

  async returnToSupplier(productId: string, qty: number, ref: MovementRef) {
    this.assertPositive(qty);
    return this.move(StockMovementType.PURCHASE_RETURN, productId, -qty, 0, ref);
  }

  /**
   * Writes off damaged units. Pass 0 to record an audit-only write-off for an item that was never
   * restocked (e.g. a damaged exchange return).
   */
  async writeOff(productId: string, qty: number, ref: MovementRef) {
    if (!Number.isInteger(qty) || qty < 0) throw new BadRequestException("Write-off quantity must be >= 0");
    return this.move(StockMovementType.WRITE_OFF, productId, -qty, 0, ref);
  }

  async adjust(productId: string, delta: number, ref: MovementRef & { performedById: string; notes: string }) {
    if (!Number.isInteger(delta) || delta === 0) {
      throw new BadRequestException("Adjustment quantity must be a non-zero integer");
    }
    if (!ref.performedById) throw new BadRequestException("Adjustments must record the supervising user");
    if (!ref.notes?.trim()) throw new BadRequestException("Adjustments require audit notes");
    return this.move(StockMovementType.AUDIT_ADJUSTMENT, productId, delta, 0, {
      ...ref,
      notes: ref.notes.trim(),
      referenceType: ref.referenceType ?? "AUDIT",
    });
  }

  async listStock(query: { search?: string; lowStock?: boolean; page?: number | string; limit?: number | string }) {
    const { page, limit, skip } = clampPagination(query);
    const where: Prisma.MasterProductWhereInput = query.search
      ? {
          OR: [
            { sku: { contains: query.search, mode: "insensitive" } },
            { title: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.masterProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy: { title: "asc" },
        select: {
          id: true,
          sku: true,
          title: true,
          stockQuantity: true,
          reservedQuantity: true,
          reorderLevel: true,
          averageCost: true,
          isActive: true,
        },
      }),
      this.prisma.masterProduct.count({ where }),
    ]);

    const data = rows
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        title: p.title,
        onHand: p.stockQuantity + p.reservedQuantity,
        reserved: p.reservedQuantity,
        available: p.stockQuantity,
        reorderLevel: p.reorderLevel,
        averageCost: Number(p.averageCost),
        isActive: p.isActive,
      }))
      .filter((p) => !query.lowStock || p.available <= p.reorderLevel);

    return { data, meta: paginationMeta(page, limit, total) };
  }

  async listMovements(query: {
    masterProductId?: string;
    movementType?: StockMovementType;
    page?: number | string;
    limit?: number | string;
  }) {
    const { page, limit, skip } = clampPagination(query);
    const where: Prisma.StockMovementWhereInput = {
      ...(query.masterProductId ? { masterProductId: query.masterProductId } : {}),
      ...(query.movementType ? { movementType: query.movementType } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { masterProduct: { select: { sku: true, title: true } } },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return { data, meta: paginationMeta(page, limit, total) };
  }

  /** Low stock & reorder forecast from 30-day sales velocity (NULLIF guards zero velocity). */
  async getReorderForecast() {
    const rows = await this.prisma.$queryRaw<any[]>`
      WITH velocity AS (
        SELECT oi.master_product_id, SUM(oi.quantity) AS units_30d
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status = 'COMPLETE' AND o.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY oi.master_product_id
      )
      SELECT
        mp.id, mp.sku, mp.title, c.name AS category_name,
        mp.stock_quantity + mp.reserved_quantity AS on_hand,
        mp.reserved_quantity AS reserved,
        mp.stock_quantity AS available,
        mp.reorder_level,
        COALESCE(v.units_30d, 0) AS sales_velocity_30d,
        ROUND(mp.stock_quantity::decimal / NULLIF(COALESCE(v.units_30d, 0) / 30.0, 0), 1) AS days_of_stock_remaining
      FROM master_products mp
      JOIN categories c ON mp.category_id = c.id
      LEFT JOIN velocity v ON v.master_product_id = mp.id
      WHERE mp.is_active = true
      ORDER BY days_of_stock_remaining ASC NULLS LAST, mp.stock_quantity ASC
    `;

    return rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      title: r.title,
      categoryName: r.category_name,
      onHand: Number(r.on_hand),
      reserved: Number(r.reserved),
      available: Number(r.available),
      reorderLevel: Number(r.reorder_level),
      salesVelocity30d: Number(r.sales_velocity_30d),
      daysOfStockRemaining: r.days_of_stock_remaining === null ? null : Number(r.days_of_stock_remaining),
      needsReorder: Number(r.available) <= Number(r.reorder_level),
    }));
  }
}
