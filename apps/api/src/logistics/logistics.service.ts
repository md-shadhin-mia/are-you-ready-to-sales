import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, Prisma, RtoInspectionStatus } from "@repo/db";
import { PrismaService } from "../prisma/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { clampPagination, paginationMeta } from "../common/pagination";
import { maskPhone } from "../common/masking";

@Injectable()
export class LogisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  /** Transit report; customer phones are masked because it is shared with courier staff. */
  async listInCourier(query: { search?: string; courierName?: string; page?: string; limit?: string }) {
    const { page, limit, skip } = clampPagination(query);
    const where: Prisma.OrderWhereInput = {
      status: { in: [OrderStatus.IN_COURIER, OrderStatus.SHIPPED] },
      ...(query.courierName ? { courierName: { equals: query.courierName, mode: "insensitive" } } : {}),
      ...(query.search
        ? {
            OR: [
              { orderNumber: { contains: query.search, mode: "insensitive" } },
              { trackingNumber: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          courierName: true,
          trackingNumber: true,
          totalAmount: true,
          updatedAt: true,
          customer: { select: { fullName: true, phone: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map(({ customer, ...o }) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
        customerName: customer.fullName,
        customerPhone: maskPhone(customer.phone),
      })),
      meta: paginationMeta(page, limit, total),
    };
  }

  async listRtoInspections(query: { status?: RtoInspectionStatus; page?: string; limit?: string }) {
    const { page, limit, skip } = clampPagination(query);
    const where = query.status ? { status: query.status } : {};
    const [data, total] = await Promise.all([
      this.prisma.rtoInspection.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { order: { select: { orderNumber: true, trackingNumber: true, courierName: true } } },
      }),
      this.prisma.rtoInspection.count({ where }),
    ]);
    return { data, meta: paginationMeta(page, limit, total) };
  }

  /** Warehouse seal check on a returned parcel; damaged parcels are written off from stock. */
  async resolveRtoInspection(id: string, result: RtoInspectionStatus, inspectorId: string, notes?: string) {
    const inspection = await this.prisma.rtoInspection.findUnique({
      where: { id },
      include: { order: { include: { items: true } } },
    });
    if (!inspection) throw new NotFoundException(`RTO inspection "${id}" not found`);
    if (inspection.status !== RtoInspectionStatus.PENDING) {
      throw new ConflictException(`Inspection already resolved as ${inspection.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (result === RtoInspectionStatus.DAMAGED) {
        for (const item of inspection.order.items.filter((i) => i.quantity > 0)) {
          await this.inventory.writeOff(item.masterProductId, item.quantity, {
            tx,
            referenceType: "RTO_INSPECTION",
            referenceId: inspection.id,
            performedById: inspectorId,
            notes: notes ?? "Returned parcel failed seal inspection",
          });
        }
      }
      return tx.rtoInspection.update({
        where: { id },
        data: { status: result, notes, inspectedById: inspectorId, inspectedAt: new Date() },
      });
    });
  }
}
