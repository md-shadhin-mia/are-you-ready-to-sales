import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AdjustmentStatus,
  AdjustmentType,
  OrderStatus,
  Prisma,
  SellerAdjustment,
  SellerStatus,
  TicketPriority,
  TicketStatus,
} from "@repo/db";
import { PrismaService } from "../prisma/prisma.service";
import { clampPagination, paginationMeta } from "../common/pagination";

export const DUAL_APPROVAL_THRESHOLD = 10_000;
export const ADJUSTMENT_REASON_CODES = [
  "COMMISSION_CORRECTION",
  "REFUND_CORRECTION",
  "CHARGEBACK",
  "PENALTY",
  "BONUS",
  "OTHER",
] as const;
const ON_TIME_DISPATCH_HOURS = 48;
const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export interface ScoreInputs {
  onTimeDispatchRate: number; // 0..1
  qualityReviewAvg: number; // 0..5
  disputeResolutionRate: number; // 0..1
}

/** Score = on-time dispatch x 0.4 + review quality x 0.4 + dispute resolution x 0.2 (0-100 scale). */
export function computeVendorScore(inputs: ScoreInputs): number {
  const onTime = clamp(inputs.onTimeDispatchRate, 0, 1) * 100;
  const quality = (clamp(inputs.qualityReviewAvg, 0, 5) / 5) * 100;
  const disputes = clamp(inputs.disputeResolutionRate, 0, 1) * 100;
  return round2(onTime * 0.4 + quality * 0.4 + disputes * 0.2);
}

export interface AdjustmentInput {
  type: AdjustmentType;
  amount: number;
  reasonCode: string;
  documentUrl: string;
  notes?: string;
}

type Tx = Prisma.TransactionClient;

@Injectable()
export class SellerGovernanceService {
  constructor(private readonly prisma: PrismaService) {}

  private present(a: SellerAdjustment) {
    return { ...a, amount: Number(a.amount), balanceAfter: a.balanceAfter == null ? null : Number(a.balanceAfter) };
  }

  /** Locks the seller row and applies a signed adjustment, returning the new balance. */
  private async applyToBalance(tx: Tx, sellerId: string, type: AdjustmentType, amount: number) {
    const [row] = await tx.$queryRaw<Array<{ id: string; balance: Prisma.Decimal | string }>>`
      SELECT id, balance FROM seller_profiles WHERE id = ${sellerId} FOR UPDATE
    `;
    if (!row) throw new NotFoundException("Seller not found");
    const balance = Number(row.balance);
    const next = round2(type === AdjustmentType.CREDIT ? balance + amount : balance - amount);
    if (next < 0) {
      throw new BadRequestException(`Debit of ৳${amount} would overdraw the seller balance of ৳${balance}`);
    }
    await tx.sellerProfile.update({ where: { id: sellerId }, data: { balance: next } });
    return next;
  }

  async requestAdjustment(sellerId: string, input: AdjustmentInput, requestedById: string) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException("Seller not found");
    const amount = round2(input.amount);
    if (!(amount > 0)) throw new BadRequestException("Adjustment amount must be positive");

    const base = {
      sellerId,
      type: input.type,
      amount,
      reasonCode: input.reasonCode,
      documentUrl: input.documentUrl,
      notes: input.notes,
      requestedById,
    };

    if (amount > DUAL_APPROVAL_THRESHOLD) {
      const pending = await this.prisma.sellerAdjustment.create({
        data: { ...base, status: AdjustmentStatus.PENDING_APPROVAL },
      });
      return this.present(pending);
    }

    const applied = await this.prisma.$transaction(async (tx) => {
      const balanceAfter = await this.applyToBalance(tx, sellerId, input.type, amount);
      return tx.sellerAdjustment.create({
        data: {
          ...base,
          status: AdjustmentStatus.APPROVED,
          approvedById: requestedById,
          approvedAt: new Date(),
          balanceAfter,
        },
      });
    });
    return this.present(applied);
  }

  private async loadPending(id: string) {
    const adjustment = await this.prisma.sellerAdjustment.findUnique({ where: { id } });
    if (!adjustment) throw new NotFoundException("Adjustment not found");
    if (adjustment.status !== AdjustmentStatus.PENDING_APPROVAL) {
      throw new ConflictException(`Adjustment is already ${adjustment.status}`);
    }
    return adjustment;
  }

  async approveAdjustment(id: string, approverId: string) {
    const adjustment = await this.loadPending(id);
    if (adjustment.requestedById === approverId) {
      throw new ForbiddenException("Dual authorization requires a different administrator to approve");
    }
    const approved = await this.prisma.$transaction(async (tx) => {
      const balanceAfter = await this.applyToBalance(tx, adjustment.sellerId, adjustment.type, Number(adjustment.amount));
      return tx.sellerAdjustment.update({
        where: { id },
        data: { status: AdjustmentStatus.APPROVED, approvedById: approverId, approvedAt: new Date(), balanceAfter },
      });
    });
    return this.present(approved);
  }

  async rejectAdjustment(id: string, approverId: string, reason?: string) {
    await this.loadPending(id);
    const rejected = await this.prisma.sellerAdjustment.update({
      where: { id },
      data: { status: AdjustmentStatus.REJECTED, approvedById: approverId, approvedAt: new Date(), notes: reason },
    });
    return this.present(rejected);
  }

  async listAdjustments(query: { sellerId?: string; status?: AdjustmentStatus; page?: string; limit?: string }) {
    const { page, limit, skip } = clampPagination(query);
    const where: Prisma.SellerAdjustmentWhereInput = {
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.sellerAdjustment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { seller: { select: { companyName: true } } },
      }),
      this.prisma.sellerAdjustment.count({ where }),
    ]);
    return { data: rows.map((r) => this.present(r)), meta: paginationMeta(page, limit, total) };
  }

  /** Suspends the seller and atomically unpublishes their catalog items and every store listing of them. */
  async deactivateSeller(id: string, reason: string) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { id } });
    if (!seller) throw new NotFoundException("Seller not found");

    return this.prisma.$transaction(async (tx) => {
      const products = await tx.masterProduct.updateMany({ where: { sellerId: id }, data: { isActive: false } });
      const listings = await tx.storeProduct.updateMany({
        where: { masterProduct: { sellerId: id }, isVisible: true },
        data: { isVisible: false },
      });
      const updated = await tx.sellerProfile.update({ where: { id }, data: { status: SellerStatus.SUSPENDED } });
      return {
        id,
        status: updated.status,
        reason,
        productsDeactivated: products.count,
        listingsHidden: listings.count,
      };
    });
  }

  // ----- Support tickets -----

  async createTicket(input: { sellerId: string; subject: string; message: string; priority?: TicketPriority }) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { id: input.sellerId } });
    if (!seller) throw new NotFoundException("Seller not found");
    return this.prisma.supportTicket.create({ data: input });
  }

  async listTickets(query: { status?: TicketStatus; sellerId?: string; page?: string; limit?: string }) {
    const { page, limit, skip } = clampPagination(query);
    const where: Prisma.SupportTicketWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        include: { seller: { select: { companyName: true } } },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { data, meta: paginationMeta(page, limit, total) };
  }

  async updateTicket(id: string, input: { status?: TicketStatus; priority?: TicketPriority; resolution?: string }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException("Ticket not found");
    const closing = input.status === TicketStatus.RESOLVED || input.status === TicketStatus.CLOSED;
    return this.prisma.supportTicket.update({
      where: { id },
      data: { ...input, ...(closing && !ticket.resolvedAt ? { resolvedAt: new Date() } : {}) },
    });
  }

  // ----- Scorecards -----

  /**
   * Recomputes every seller's compliance score. Sellers without history receive neutral-best inputs
   * (no late dispatches, no poor reviews, no unresolved disputes).
   */
  async recomputeScorecards() {
    const since = new Date(Date.now() - 90 * 86_400_000);
    const sellers = await this.prisma.sellerProfile.findMany({ select: { id: true, companyName: true } });

    const cards = [];
    for (const seller of sellers) {
      const [orders, reviews, tickets] = await Promise.all([
        this.prisma.order.findMany({
          where: {
            createdAt: { gte: since },
            status: { notIn: [OrderStatus.NEW, OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED, OrderStatus.HOLD] },
            items: { some: { masterProduct: { sellerId: seller.id } } },
          },
          select: { createdAt: true, invoicedAt: true },
        }),
        this.prisma.review.aggregate({
          where: { masterProduct: { sellerId: seller.id } },
          _avg: { productRating: true },
        }),
        this.prisma.supportTicket.groupBy({ by: ["status"], where: { sellerId: seller.id }, _count: { _all: true } }),
      ]);

      const onTime = orders.filter(
        (o) => o.invoicedAt && o.invoicedAt.getTime() - o.createdAt.getTime() <= ON_TIME_DISPATCH_HOURS * 3_600_000,
      ).length;
      const totalTickets = tickets.reduce((s, t) => s + t._count._all, 0);
      const resolvedTickets = tickets
        .filter((t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED)
        .reduce((s, t) => s + t._count._all, 0);

      const inputs: ScoreInputs = {
        onTimeDispatchRate: orders.length ? round2(onTime / orders.length) : 1,
        qualityReviewAvg: round2(reviews._avg.productRating ?? 5),
        disputeResolutionRate: totalTickets ? round2(resolvedTickets / totalTickets) : 1,
      };
      const score = computeVendorScore(inputs);
      await this.prisma.sellerProfile.update({ where: { id: seller.id }, data: { complianceScore: score } });
      cards.push({ sellerId: seller.id, companyName: seller.companyName, ...inputs, score });
    }
    return cards.sort((a, b) => b.score - a.score);
  }

  async overview() {
    const [byStatus, byType, balance, pendingAdjustments, openTickets] = await Promise.all([
      this.prisma.sellerProfile.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.sellerProfile.groupBy({ by: ["sellerType"], _count: { _all: true } }),
      this.prisma.sellerProfile.aggregate({ _sum: { balance: true }, _avg: { complianceScore: true } }),
      this.prisma.sellerAdjustment.count({ where: { status: AdjustmentStatus.PENDING_APPROVAL } }),
      this.prisma.supportTicket.count({ where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } } }),
    ]);
    const count = (s: SellerStatus) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
    return {
      totalSellers: byStatus.reduce((s, b) => s + b._count._all, 0),
      activeSellers: count(SellerStatus.APPROVED),
      pendingSellers: count(SellerStatus.PENDING),
      suspendedSellers: count(SellerStatus.SUSPENDED),
      sellersByType: Object.fromEntries(byType.map((t) => [t.sellerType, t._count._all])),
      totalSellerBalance: Number(balance._sum.balance ?? 0),
      averageComplianceScore: round2(Number(balance._avg.complianceScore ?? 0)),
      pendingAdjustments,
      openTickets,
    };
  }
}
