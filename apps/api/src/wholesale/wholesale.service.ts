import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateWholesaleOrderDto,
  QueryWholesaleOrdersDto,
  UpdateWholesaleOrderStatusDto,
} from "./dto/wholesale-order.dto";
import { Prisma, OrderStatus, LedgerEntryType, WholesaleOrder } from "@repo/db";
import { InventoryService } from "../inventory/inventory.service";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Volume tiers, highest first: minimum total units -> discount percent. */
export const WHOLESALE_TIERS = [
  { minUnits: 200, discountPercent: 25 },
  { minUnits: 50, discountPercent: 15 },
] as const;

export function resolveTierDiscount(totalUnits: number): number {
  return WHOLESALE_TIERS.find((t) => totalUnits >= t.minUnits)?.discountPercent ?? 0;
}

/**
 * Prices a B2B order at base price with the earned volume tier. An explicit discount request is
 * honoured only up to the earned tier; anything higher is rejected.
 */
export function priceWholesaleOrder(lines: Array<{ quantity: number; unitPrice: number }>, requestedPercent?: number) {
  const totalUnits = lines.reduce((s, l) => s + l.quantity, 0);
  const subtotal = round2(lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0));
  const earned = resolveTierDiscount(totalUnits);
  if (requestedPercent !== undefined && requestedPercent > earned) {
    throw new BadRequestException(
      `A ${requestedPercent}% discount requires more volume; ${totalUnits} unit(s) qualify for ${earned}%`,
    );
  }
  const discountPercent = requestedPercent ?? earned;
  const discountAmount = round2((subtotal * discountPercent) / 100);
  return { totalUnits, subtotal, discountPercent, discountAmount, discountedSubtotal: round2(subtotal - discountAmount) };
}

type CreditAccountLike = { creditLimit: Prisma.Decimal | number; outstandingBalance: Prisma.Decimal | number; isActive: boolean };

export function assertCreditAvailable(account: CreditAccountLike | null, amount: number) {
  if (!account || !account.isActive) {
    throw new BadRequestException("No active institutional credit account for this customer");
  }
  const available = round2(Number(account.creditLimit) - Number(account.outstandingBalance));
  if (amount > available) {
    throw new BadRequestException(`Order total ৳${amount} exceeds available credit ৳${available}`);
  }
}

@Injectable()
export class WholesaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  serializeOrder(order: WholesaleOrder & { items?: any[] }) {
    return {
      ...order,
      subtotal: Number(order.subtotal),
      discountPercent: Number(order.discountPercent),
      discountAmount: Number(order.discountAmount),
      shippingFee: Number(order.shippingFee),
      totalAmount: Number(order.totalAmount),
    };
  }

  async createWholesaleOrder(userId: string, dto: CreateWholesaleOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException("Wholesale order must contain at least one product item");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { stores: { where: { status: "ACTIVE" } } },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException("Active reseller account not found");
    }

    const primaryStore = user.stores[0] || (await this.prisma.store.findFirst({ where: { studentId: userId } }));

    // Fetch and validate all master products and stock
    const productIds = dto.items.map((i) => i.masterProductId);
    const masterProducts = await this.prisma.masterProduct.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    const productMap = new Map(masterProducts.map((p) => [p.id, p]));

    for (const item of dto.items) {
      const prod = productMap.get(item.masterProductId);
      if (!prod) {
        throw new NotFoundException(`Product ID ${item.masterProductId} not found or inactive`);
      }
      if (prod.stockQuantity < item.quantity) {
        throw new ConflictException(
          `Insufficient warehouse inventory for "${prod.title}". Requested: ${item.quantity}, Available: ${prod.stockQuantity}`,
        );
      }
    }

    const pricing = priceWholesaleOrder(
      dto.items.map((item) => ({ quantity: item.quantity, unitPrice: Number(productMap.get(item.masterProductId)!.basePrice) })),
      dto.discountPercent,
    );

    // Calculate subtotal
    let subtotal = new Prisma.Decimal(0);
    const itemRecords: {
      masterProductId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
    }[] = [];

    for (const item of dto.items) {
      const prod = productMap.get(item.masterProductId)!;
      const unitPrice = new Prisma.Decimal(prod.basePrice);
      const lineTotal = unitPrice.mul(item.quantity);
      subtotal = subtotal.add(lineTotal);

      itemRecords.push({
        masterProductId: prod.id,
        quantity: item.quantity,
        unitPrice,
        totalPrice: lineTotal,
      });
    }

    // Flat wholesale bulk shipping fee: ৳120 across Bangladesh
    const shippingFee = new Prisma.Decimal(120);
    const totalAmount = new Prisma.Decimal(pricing.discountedSubtotal).add(shippingFee);

    let paymentStatus = dto.paymentMethod === "CREDIT" ? "CREDIT" : "UNPAID";

    // If paying via WALLET balance, verify and deduct from store ledger
    if (dto.paymentMethod === "WALLET") {
      if (!primaryStore) {
        throw new BadRequestException(
          "Reseller store is required to process wholesale payment via wallet earnings",
        );
      }

      const ledgerEntries = await this.prisma.ledgerEntry.findMany({
        where: { storeId: primaryStore.id },
      });

      const currentBalance = ledgerEntries.reduce(
        (sum, entry) => sum.add(entry.amount),
        new Prisma.Decimal(0),
      );

      if (currentBalance.lessThan(totalAmount)) {
        throw new BadRequestException(
          `Insufficient wallet balance. Available: ৳${currentBalance.toFixed(2)}, Required: ৳${totalAmount.toFixed(2)}`,
        );
      }

      paymentStatus = "PAID";
    }

    const orderNumber = `WN-WS-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Decrement warehouse stock under row locks (re-validates availability)
      for (const item of dto.items) {
        await this.inventory.fulfillSale(item.masterProductId, item.quantity, {
          tx,
          referenceType: "WHOLESALE",
          referenceId: orderNumber,
        });
      }

      // 1b. Institutional credit: lock the account and draw down the limit
      if (dto.paymentMethod === "CREDIT") {
        const [account] = await tx.$queryRaw<Array<{ credit_limit: Prisma.Decimal; outstanding_balance: Prisma.Decimal; is_active: boolean }>>`
          SELECT credit_limit, outstanding_balance, is_active FROM wholesale_credit_accounts WHERE user_id = ${userId} FOR UPDATE
        `;
        assertCreditAvailable(
          account ? { creditLimit: account.credit_limit, outstandingBalance: account.outstanding_balance, isActive: account.is_active } : null,
          Number(totalAmount),
        );
        await tx.wholesaleCreditAccount.update({
          where: { userId },
          data: { outstandingBalance: { increment: totalAmount } },
        });
      }

      // 2. Create wholesale order
      const wholesaleOrder = await tx.wholesaleOrder.create({
        data: {
          userId,
          orderNumber,
          subtotal,
          discountPercent: pricing.discountPercent,
          discountAmount: pricing.discountAmount,
          shippingFee,
          totalAmount,
          // Credit orders are issued on account immediately; others await payment/fulfillment.
          status: dto.paymentMethod === "CREDIT" ? OrderStatus.INVOICED : OrderStatus.NEW,
          paymentMethod: dto.paymentMethod,
          paymentStatus,
          shippingAddress: dto.shippingAddress as any,
          notes: dto.notes ?? null,
          items: {
            create: itemRecords.map((r) => ({
              masterProductId: r.masterProductId,
              quantity: r.quantity,
              unitPrice: r.unitPrice,
              totalPrice: r.totalPrice,
            })),
          },
        },
        include: {
          items: {
            include: {
              masterProduct: true,
            },
          },
        },
      });

      // 3. If wallet payment, record ledger entry
      if (dto.paymentMethod === "WALLET" && primaryStore) {
        const lastEntry = await tx.ledgerEntry.findFirst({
          where: { storeId: primaryStore.id },
          orderBy: { createdAt: "desc" },
        });

        const prevBalance = lastEntry?.balanceAfter ?? new Prisma.Decimal(0);
        const newBalance = prevBalance.sub(totalAmount);

        await tx.ledgerEntry.create({
          data: {
            storeId: primaryStore.id,
            entryType: LedgerEntryType.WHOLESALE_PURCHASE,
            amount: totalAmount.negated(),
            balanceAfter: newBalance,
            notes: `Wholesale inventory procurement order #${orderNumber}`,
          },
        });
      }

      return wholesaleOrder;
    });
  }

  async listMyWholesaleOrders(userId: string, query: QueryWholesaleOrdersDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WholesaleOrderWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.wholesaleOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              masterProduct: true,
            },
          },
        },
      }),
      this.prisma.wholesaleOrder.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getWholesaleOrder(userId: string, id: string) {
    const order = await this.prisma.wholesaleOrder.findFirst({
      where: { id, userId },
      include: {
        items: {
          include: {
            masterProduct: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException("Wholesale order not found");
    }

    return order;
  }

  async listAdminWholesaleOrders(query: QueryWholesaleOrdersDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WholesaleOrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.wholesaleOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
          items: {
            include: {
              masterProduct: true,
            },
          },
        },
      }),
      this.prisma.wholesaleOrder.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateAdminWholesaleOrderStatus(id: string, dto: UpdateWholesaleOrderStatusDto) {
    const order = await this.prisma.wholesaleOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException("Wholesale order not found");
    }

    return await this.prisma.wholesaleOrder.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.trackingNumber ? { trackingNumber: dto.trackingNumber } : {}),
        ...(dto.courierName ? { courierName: dto.courierName } : {}),
      },
      include: {
        items: {
          include: { masterProduct: true },
        },
      },
    });
  }

  async getPublicCatalog(query: { category?: string; search?: string; limit?: string | number; page?: string | number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.MasterProductWhereInput = {
      isActive: true,
      ...(query.search
        ? {
            OR: [
              { title: { contains: String(query.search), mode: "insensitive" } },
              { sku: { contains: String(query.search), mode: "insensitive" } },
              { masterDescription: { contains: String(query.search), mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.category && query.category !== "All"
        ? {
            category: {
              name: { contains: String(query.category), mode: "insensitive" },
            },
          }
        : {}),
    };

    const [items, total, categories] = await Promise.all([
      this.prisma.masterProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      this.prisma.masterProduct.count({ where }),
      this.prisma.category.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, _count: { select: { masterProducts: true } } },
      }),
    ]);

    return {
      items,
      categories,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getResellerProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        stores: {
          select: { id: true, storeName: true, slug: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Reseller not found");
    }

    let walletBalance = 0;
    const primaryStore = user.stores[0];
    if (primaryStore) {
      const ledgerEntries = await this.prisma.ledgerEntry.findMany({
        where: { storeId: primaryStore.id },
      });
      const balanceDecimal = ledgerEntries.reduce(
        (sum, entry) => sum.add(entry.amount),
        new Prisma.Decimal(0),
      );
      walletBalance = Number(balanceDecimal);
    }

    const totalOrders = await this.prisma.wholesaleOrder.count({
      where: { userId },
    });

    return {
      user,
      walletBalance,
      totalOrders,
    };
  }

  async listCreditAccounts() {
    const accounts = await this.prisma.wholesaleCreditAccount.findMany({
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return accounts.map((a) => ({
      ...a,
      creditLimit: Number(a.creditLimit),
      outstandingBalance: Number(a.outstandingBalance),
      availableCredit: round2(Number(a.creditLimit) - Number(a.outstandingBalance)),
    }));
  }

  async upsertCreditAccount(userId: string, input: { creditLimit: number; isActive?: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Customer not found");
    const existing = await this.prisma.wholesaleCreditAccount.findUnique({ where: { userId } });
    if (existing && input.creditLimit < Number(existing.outstandingBalance)) {
      throw new BadRequestException("Credit limit cannot be set below the outstanding balance");
    }
    const account = await this.prisma.wholesaleCreditAccount.upsert({
      where: { userId },
      create: { userId, creditLimit: input.creditLimit, isActive: input.isActive ?? true },
      update: { creditLimit: input.creditLimit, ...(input.isActive !== undefined ? { isActive: input.isActive } : {}) },
    });
    return {
      ...account,
      creditLimit: Number(account.creditLimit),
      outstandingBalance: Number(account.outstandingBalance),
      availableCredit: round2(Number(account.creditLimit) - Number(account.outstandingBalance)),
    };
  }

  /** Units, gross revenue and discount given per product across non-cancelled wholesale orders. */
  async productWiseReport() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        mp.id AS master_product_id, mp.sku, mp.title,
        COUNT(DISTINCT wo.id) AS orders_count,
        SUM(woi.quantity) AS units_sold,
        SUM(woi.total_price) AS gross_revenue,
        SUM(woi.total_price * wo.discount_percent / 100) AS discount_given
      FROM wholesale_order_items woi
      JOIN wholesale_orders wo ON wo.id = woi.wholesale_order_id AND wo.status <> 'CANCELLED'
      JOIN master_products mp ON mp.id = woi.master_product_id
      GROUP BY mp.id
      ORDER BY units_sold DESC
    `;
    return rows.map((r) => ({
      masterProductId: r.master_product_id,
      sku: r.sku,
      title: r.title,
      ordersCount: Number(r.orders_count),
      unitsSold: Number(r.units_sold),
      grossRevenue: round2(Number(r.gross_revenue)),
      discountGiven: round2(Number(r.discount_given)),
      netRevenue: round2(Number(r.gross_revenue) - Number(r.discount_given)),
    }));
  }
}
