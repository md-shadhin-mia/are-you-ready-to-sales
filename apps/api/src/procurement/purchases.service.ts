import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InvoiceMatchStatus, Prisma, PurchaseOrderStatus } from "@repo/db";
import { PrismaService } from "../prisma/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { DocumentSequenceService } from "../common/document-sequence.service";
import { clampPagination, paginationMeta } from "../common/pagination";
import { CreatePurchaseOrderDto, CreatePurchaseReturnDto, CreateReturnTypeDto } from "./procurement.dto";

export const INVOICE_VARIANCE_TOLERANCE_PERCENT = 1;
const round2 = (n: number) => Math.round(n * 100) / 100;
const RECEIVABLE: PurchaseOrderStatus[] = [PurchaseOrderStatus.ISSUED, PurchaseOrderStatus.PARTIALLY_RECEIVED];

export function computeInvoiceVariance(expectedAmount: number, invoiceAmount: number) {
  const variancePercent = round2((Math.abs(invoiceAmount - expectedAmount) / expectedAmount) * 100);
  return {
    variancePercent,
    matchStatus:
      variancePercent > INVOICE_VARIANCE_TOLERANCE_PERCENT ? InvoiceMatchStatus.DISCREPANCY : InvoiceMatchStatus.MATCHED,
  };
}

const PO_INCLUDE = {
  supplier: { select: { id: true, name: true, tinNumber: true } },
  items: { include: { masterProduct: { select: { sku: true, title: true } } } },
} satisfies Prisma.PurchaseOrderInclude;

type Tx = Prisma.TransactionClient;

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly sequences: DocumentSequenceService,
  ) {}

  private serialize<T extends { totalCost: any; paidAmount: any; invoiceAmount?: any; matchVariancePercent?: any; items?: any[] }>(po: T) {
    return {
      ...po,
      totalCost: Number(po.totalCost),
      paidAmount: Number(po.paidAmount),
      invoiceAmount: po.invoiceAmount == null ? null : Number(po.invoiceAmount),
      matchVariancePercent: po.matchVariancePercent == null ? null : Number(po.matchVariancePercent),
      items: po.items?.map((i) => ({ ...i, unitCost: Number(i.unitCost) })),
    };
  }

  private async findPo(id: string, client: Tx | PrismaService = this.prisma) {
    const po = await client.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!po) throw new NotFoundException(`Purchase order "${id}" not found`);
    return po;
  }

  private async createPoRecord(tx: Tx, dto: CreatePurchaseOrderDto, userId: string, status: PurchaseOrderStatus) {
    const supplier = await tx.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier || !supplier.isActive) throw new BadRequestException("Supplier is not active");

    const totalCost = round2(dto.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0));
    return tx.purchaseOrder.create({
      data: {
        poNumber: await this.sequences.next("PO", { tx }),
        supplierId: dto.supplierId,
        status,
        totalCost,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        notes: dto.notes,
        createdById: userId,
        issuedAt: status === PurchaseOrderStatus.DRAFT ? undefined : new Date(),
        items: {
          create: dto.items.map((i) => ({ masterProductId: i.masterProductId, quantityOrdered: i.quantity, unitCost: i.unitCost })),
        },
      },
      include: PO_INCLUDE,
    });
  }

  async createPurchaseOrder(dto: CreatePurchaseOrderDto, userId: string) {
    const po = await this.prisma.$transaction((tx) => this.createPoRecord(tx, dto, userId, PurchaseOrderStatus.DRAFT));
    return this.serialize(po);
  }

  /** "Add Purchase": goods bought and received on the spot (PO issued + fully received in one transaction). */
  async createDirectPurchase(dto: CreatePurchaseOrderDto, userId: string) {
    const id = await this.prisma.$transaction(async (tx) => {
      const po = await this.createPoRecord(tx, dto, userId, PurchaseOrderStatus.ISSUED);
      await this.receiveInTx(
        tx,
        po.id,
        po.items.map((i) => ({ purchaseOrderItemId: i.id, quantity: i.quantityOrdered })),
        userId,
        "Direct purchase",
      );
      return po.id;
    });
    return this.get(id);
  }

  async get(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { ...PO_INCLUDE, goodsReceipts: { include: { items: true } } },
    });
    if (!po) throw new NotFoundException(`Purchase order "${id}" not found`);
    return this.serialize(po);
  }

  async list(query: { status?: PurchaseOrderStatus; supplierId?: string; page?: string; limit?: string }) {
    const { page, limit, skip } = clampPagination(query);
    const where: Prisma.PurchaseOrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: PO_INCLUDE }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { data: rows.map((r) => this.serialize(r)), meta: paginationMeta(page, limit, total) };
  }

  async issue(id: string) {
    const po = await this.findPo(id);
    if (po.status !== PurchaseOrderStatus.DRAFT) throw new ConflictException(`Only DRAFT orders can be issued (is ${po.status})`);
    await this.prisma.purchaseOrder.update({ where: { id }, data: { status: PurchaseOrderStatus.ISSUED, issuedAt: new Date() } });
    return this.get(id);
  }

  async cancel(id: string) {
    const po = await this.findPo(id);
    if (po.items.some((i) => i.quantityReceived > 0) || po.status === PurchaseOrderStatus.CANCELLED) {
      throw new ConflictException("Purchase orders with received goods cannot be cancelled");
    }
    await this.prisma.purchaseOrder.update({ where: { id }, data: { status: PurchaseOrderStatus.CANCELLED } });
    return this.get(id);
  }

  /** Goods Received Note: physical stock rises immediately and WAC is re-weighted at the PO rate. */
  async receive(id: string, lines: Array<{ purchaseOrderItemId: string; quantity: number }>, userId: string, notes?: string) {
    return this.prisma.$transaction((tx) => this.receiveInTx(tx, id, lines, userId, notes));
  }

  private async receiveInTx(
    tx: Tx,
    id: string,
    lines: Array<{ purchaseOrderItemId: string; quantity: number }>,
    userId: string,
    notes?: string,
  ) {
    await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id = ${id} FOR UPDATE`;
    const po = await this.findPo(id, tx);
    if (!RECEIVABLE.includes(po.status)) {
      throw new ConflictException(`Goods can only be received against ISSUED orders (is ${po.status})`);
    }

    const received = new Map(po.items.map((i) => [i.id, i.quantityReceived]));
    for (const line of lines) {
      const item = po.items.find((i) => i.id === line.purchaseOrderItemId);
      if (!item) throw new BadRequestException(`Line "${line.purchaseOrderItemId}" is not on this purchase order`);
      const next = (received.get(item.id) ?? 0) + line.quantity;
      if (next > item.quantityOrdered) {
        throw new BadRequestException(
          `Receiving ${line.quantity} exceeds the outstanding ${item.quantityOrdered - (received.get(item.id) ?? 0)} unit(s)`,
        );
      }
      received.set(item.id, next);
    }

    const grn = await tx.goodsReceipt.create({
      data: {
        grnNumber: await this.sequences.next("GRN", { tx }),
        purchaseOrderId: po.id,
        receivedById: userId,
        notes,
        items: {
          create: lines.map((l) => ({
            purchaseOrderItemId: l.purchaseOrderItemId,
            quantity: l.quantity,
            unitCost: po.items.find((i) => i.id === l.purchaseOrderItemId)!.unitCost,
          })),
        },
      },
    });

    for (const line of lines) {
      const item = po.items.find((i) => i.id === line.purchaseOrderItemId)!;
      await this.inventory.receive(item.masterProductId, line.quantity, Number(item.unitCost), {
        tx,
        referenceType: "GRN",
        referenceId: grn.id,
        performedById: userId,
      });
      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { quantityReceived: received.get(item.id) },
      });
    }

    const complete = po.items.every((i) => (received.get(i.id) ?? 0) >= i.quantityOrdered);
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: complete ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED },
    });
    return grn;
  }

  /** Three-way match: supplier bill vs. GRN quantities at the agreed PO rates (>1% variance => DISCREPANCY). */
  async matchInvoice(id: string, dto: { invoiceNumber: string; invoiceAmount: number }) {
    const po = await this.findPo(id);
    const expected = round2(po.items.reduce((s, i) => s + i.quantityReceived * Number(i.unitCost), 0));
    if (expected <= 0) throw new BadRequestException("No goods have been received against this purchase order yet");

    const { variancePercent, matchStatus } = computeInvoiceVariance(expected, dto.invoiceAmount);
    await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        invoiceNumber: dto.invoiceNumber,
        invoiceAmount: dto.invoiceAmount,
        matchStatus,
        matchVariancePercent: variancePercent,
      },
    });
    return { id, invoiceNumber: dto.invoiceNumber, expectedAmount: expected, invoiceAmount: dto.invoiceAmount, variancePercent, matchVariancePercent: variancePercent, matchStatus };
  }

  async recordPayment(id: string, amount: number) {
    const po = await this.findPo(id);
    const outstanding = round2(Number(po.totalCost) - Number(po.paidAmount));
    if (amount > outstanding) throw new BadRequestException(`Payment exceeds the outstanding ৳${outstanding}`);
    await this.prisma.purchaseOrder.update({ where: { id }, data: { paidAmount: { increment: amount } } });
    return this.get(id);
  }

  async createReturn(dto: CreatePurchaseReturnDto, userId: string) {
    const [supplier, returnType] = await Promise.all([
      this.prisma.supplier.findUnique({ where: { id: dto.supplierId } }),
      this.prisma.purchaseReturnType.findUnique({ where: { id: dto.returnTypeId } }),
    ]);
    if (!supplier) throw new NotFoundException("Supplier not found");
    if (!returnType || !returnType.isActive) throw new BadRequestException("Unknown or inactive purchase return type");

    let unitCost: number;
    if (dto.purchaseOrderId) {
      const po = await this.findPo(dto.purchaseOrderId);
      const line = po.items.find((i) => i.masterProductId === dto.masterProductId);
      if (po.supplierId !== dto.supplierId || !line) {
        throw new BadRequestException("Product was not purchased from this supplier on that order");
      }
      if (dto.quantity > line.quantityReceived) {
        throw new BadRequestException(`Only ${line.quantityReceived} unit(s) were received on that order`);
      }
      unitCost = Number(line.unitCost);
    } else {
      const product = await this.prisma.masterProduct.findUnique({
        where: { id: dto.masterProductId },
        select: { averageCost: true },
      });
      if (!product) throw new NotFoundException("Product not found");
      unitCost = Number(product.averageCost);
    }

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.purchaseReturn.create({
        data: {
          returnNumber: await this.sequences.next("PR", { tx }),
          supplierId: dto.supplierId,
          purchaseOrderId: dto.purchaseOrderId,
          masterProductId: dto.masterProductId,
          returnTypeId: dto.returnTypeId,
          quantity: dto.quantity,
          unitCost,
          notes: dto.notes,
          createdById: userId,
        },
      });
      await this.inventory.returnToSupplier(dto.masterProductId, dto.quantity, {
        tx,
        referenceType: "PURCHASE_RETURN",
        referenceId: record.id,
        performedById: userId,
        notes: dto.notes,
      });
      return { ...record, unitCost: Number(record.unitCost) };
    });
  }

  async listReturns(query: { supplierId?: string; page?: string; limit?: string }) {
    const { page, limit, skip } = clampPagination(query);
    const where = query.supplierId ? { supplierId: query.supplierId } : {};
    const [data, total] = await Promise.all([
      this.prisma.purchaseReturn.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          supplier: { select: { name: true } },
          returnType: { select: { code: true, name: true } },
          masterProduct: { select: { sku: true, title: true } },
        },
      }),
      this.prisma.purchaseReturn.count({ where }),
    ]);
    return { data, meta: paginationMeta(page, limit, total) };
  }

  listReturnTypes() {
    return this.prisma.purchaseReturnType.findMany({ orderBy: { name: "asc" } });
  }

  async createReturnType(dto: CreateReturnTypeDto) {
    if (await this.prisma.purchaseReturnType.findUnique({ where: { code: dto.code } })) {
      throw new ConflictException(`Return type ${dto.code} already exists`);
    }
    return this.prisma.purchaseReturnType.create({ data: dto });
  }

  /** Accounts payable aging buckets per supplier. */
  async apAging() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        s.id AS supplier_id, s.name AS supplier_name,
        COALESCE(SUM(po.total_cost - po.paid_amount), 0) AS total_outstanding,
        COALESCE(SUM(po.total_cost - po.paid_amount) FILTER (WHERE po.created_at >= NOW() - INTERVAL '30 days'), 0) AS aging_0_30,
        COALESCE(SUM(po.total_cost - po.paid_amount) FILTER (WHERE po.created_at < NOW() - INTERVAL '30 days' AND po.created_at >= NOW() - INTERVAL '60 days'), 0) AS aging_31_60,
        COALESCE(SUM(po.total_cost - po.paid_amount) FILTER (WHERE po.created_at < NOW() - INTERVAL '60 days'), 0) AS aging_over_60
      FROM suppliers s
      JOIN purchase_orders po ON po.supplier_id = s.id AND po.status NOT IN ('CANCELLED', 'DRAFT')
      GROUP BY s.id
      HAVING SUM(po.total_cost - po.paid_amount) > 0
      ORDER BY total_outstanding DESC
    `;
    return rows.map((r) => ({
      supplierId: r.supplier_id,
      supplierName: r.supplier_name,
      totalOutstanding: Number(r.total_outstanding),
      aging0To30: Number(r.aging_0_30),
      aging31To60: Number(r.aging_31_60),
      agingOver60: Number(r.aging_over_60),
    }));
  }
}
