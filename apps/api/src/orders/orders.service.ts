import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { PricingService } from "../pricing/pricing.service";
import { StoresService } from "../stores/stores.service";
import {
  CheckoutDto,
  DispatchOrderDto,
  QueryOrdersDto,
} from "./dto/order.dto";
import { OrderStateMachine } from "./order-state-machine";
import { OrderStatus, StoreStatus, Prisma } from "@repo/db";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly storesService: StoresService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Public checkout with pessimistic row-locking on MasterProduct stock.
   * Guarantees race-condition-free inventory reservation.
   */
  async checkout(storeSlug: string, dto: CheckoutDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException("Checkout items cannot be empty");
    }

    // 1. Resolve store
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug.toLowerCase() },
    });

    if (!store) {
      throw new NotFoundException(`Store "${storeSlug}" not found`);
    }

    if (store.status !== StoreStatus.ACTIVE) {
      throw new BadRequestException(`Store "${storeSlug}" is currently not active for checkout`);
    }

    // 2. Fetch and validate store products
    const itemProductIds = dto.items.map((i) => i.storeProductId);
    const storeProducts = await this.prisma.storeProduct.findMany({
      where: {
        id: { in: itemProductIds },
        storeId: store.id,
        isVisible: true,
      },
      include: { masterProduct: true },
    });

    if (storeProducts.length !== itemProductIds.length) {
      throw new BadRequestException(
        "One or more products in your cart are invalid, unavailable, or belong to another store",
      );
    }

    // 3. Execute transaction with pessimistic row-locking on master products
    return await this.prisma.$transaction(
      async (tx) => {
        // Collect master product IDs and order them to avoid deadlocks
        const masterProductIds = Array.from(
          new Set(storeProducts.map((sp) => sp.masterProductId)),
        ).sort();

        // Pessimistic lock: SELECT ... FOR UPDATE
        const lockedMasterProducts: Array<{
          id: string;
          stock_quantity: number;
          title: string;
          base_price: any;
        }> = await tx.$queryRaw`
          SELECT id, stock_quantity, title, base_price
          FROM master_products
          WHERE id IN (${Prisma.join(masterProductIds)})
          FOR UPDATE
        `;

        const lockedMap = new Map(
          lockedMasterProducts.map((mp) => [mp.id, mp]),
        );

        // Aggregate requested quantities per master product
        const requestedQuantities = new Map<string, number>();
        for (const item of dto.items) {
          const sp = storeProducts.find((p) => p.id === item.storeProductId)!;
          const current = requestedQuantities.get(sp.masterProductId) || 0;
          requestedQuantities.set(sp.masterProductId, current + item.quantity);
        }

        // Validate inventory
        for (const [masterId, requestedQty] of requestedQuantities.entries()) {
          const lockedMp = lockedMap.get(masterId);
          if (!lockedMp) {
            throw new ConflictException("Master product not found in catalog");
          }
          if (lockedMp.stock_quantity < requestedQty) {
            throw new ConflictException(
              `Insufficient stock for product "${lockedMp.title}". Available: ${lockedMp.stock_quantity}, Requested: ${requestedQty}`,
            );
          }
        }

        // Decrement inventory atomically
        for (const [masterId, requestedQty] of requestedQuantities.entries()) {
          await tx.masterProduct.update({
            where: { id: masterId },
            data: {
              stockQuantity: { decrement: requestedQty },
            },
          });
        }

        // Financial calculations
        const isOnlinePayment = dto.paymentMethod !== "COD";
        const isInsideDhaka = dto.shippingAddress?.isInsideDhaka !== false;
        const shippingFee = isInsideDhaka
          ? PricingService.SHIPPING_FEE_INSIDE_DHAKA
          : PricingService.SHIPPING_FEE_OUTSIDE_DHAKA;

        let subtotal = 0;
        let totalBaseCost = 0;

        const orderItemsData = dto.items.map((item) => {
          const sp = storeProducts.find((p) => p.id === item.storeProductId)!;
          const unitSellingPrice = Number(sp.sellingPrice);
          const unitBasePrice = Number(sp.masterProduct.basePrice);
          const totalPrice = Math.round(unitSellingPrice * item.quantity * 100) / 100;
          const baseCost = Math.round(unitBasePrice * item.quantity * 100) / 100;

          subtotal += totalPrice;
          totalBaseCost += baseCost;

          return {
            storeProductId: sp.id,
            masterProductId: sp.masterProductId,
            quantity: item.quantity,
            unitSellingPrice,
            unitBasePrice,
            totalPrice,
          };
        });

        subtotal = Math.round(subtotal * 100) / 100;
        totalBaseCost = Math.round(totalBaseCost * 100) / 100;

        // Process Coupon Discount if provided
        let couponRecord: any = null;
        let discountAmount = 0;
        if (dto.couponCode) {
          const normalizedCode = dto.couponCode.trim().toUpperCase();
          couponRecord = await tx.coupon.findUnique({
            where: {
              storeId_code: {
                storeId: store.id,
                code: normalizedCode,
              },
            },
          });

          if (couponRecord && couponRecord.isActive) {
            const now = new Date();
            const isNotExpired = !couponRecord.endDate || now <= couponRecord.endDate;
            const meetsMinSpend = subtotal >= Number(couponRecord.minSpend);
            const hasUsesLeft =
              couponRecord.maxUses === null || couponRecord.usedCount < couponRecord.maxUses;

            if (isNotExpired && meetsMinSpend && hasUsesLeft) {
              if (couponRecord.discountType === "PERCENTAGE") {
                discountAmount =
                  Math.round(((subtotal * Number(couponRecord.discountValue)) / 100) * 100) / 100;
              } else {
                discountAmount = Math.min(subtotal, Number(couponRecord.discountValue));
              }

              // Increment coupon usage
              await tx.coupon.update({
                where: { id: couponRecord.id },
                data: { usedCount: { increment: 1 } },
              });
            }
          }
        }

        const discountedSubtotal = Math.max(0, subtotal - discountAmount);

        // Check student level for Level 5+ reduced platform commission (1.5% vs 5.0%)
        const studentLevel = await tx.studentLevel.findUnique({
          where: { studentId: store.studentId },
        });
        const commissionRate =
          studentLevel && studentLevel.currentLevel >= 5
            ? 0.015 // Level 5+ Pro Seller reduced commission
            : PricingService.PLATFORM_COMMISSION_RATE; // 5.0%

        const platformCommission =
          Math.round(discountedSubtotal * commissionRate * 100) / 100;
        const paymentFee = isOnlinePayment
          ? Math.round(
              (discountedSubtotal + shippingFee) *
                PricingService.ONLINE_PAYMENT_FEE_RATE *
                100,
            ) / 100
          : 0;
        const grossMargin = Math.round((discountedSubtotal - totalBaseCost) * 100) / 100;
        const studentNetProfit =
          Math.round((grossMargin - platformCommission - paymentFee) * 100) / 100;
        const totalAmount = Math.round((discountedSubtotal + shippingFee) * 100) / 100;

        // Upsert customer scoped to [storeId, phone]
        const customerPhone = dto.shippingAddress.phone || dto.customerPhone;
        const customerName = dto.shippingAddress.recipientName || dto.customerName;

        const customer = await tx.customer.upsert({
          where: {
            storeId_phone: {
              storeId: store.id,
              phone: customerPhone,
            },
          },
          create: {
            storeId: store.id,
            fullName: customerName,
            phone: customerPhone,
            email: dto.customerEmail || null,
            addresses: [dto.shippingAddress as any],
            totalOrdersCount: 1,
            totalSpend: totalAmount,
          },
          update: {
            fullName: customerName,
            email: dto.customerEmail || undefined,
            totalOrdersCount: { increment: 1 },
            totalSpend: { increment: totalAmount },
          },
        });

        // Generate unique order number: ORD-YYYYMMDD-XXXX
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
        const orderNumber = `ORD-${dateStr}-${randomSuffix}`;

        // Initial status: COD orders enter PROCESSING, online payments enter PENDING_PAYMENT
        const initialStatus =
          dto.paymentMethod === "COD"
            ? OrderStatus.PROCESSING
            : OrderStatus.PENDING_PAYMENT;

        // Create Order and items
        const order = await tx.order.create({
          data: {
            storeId: store.id,
            customerId: customer.id,
            orderNumber,
            subtotal,
            shippingFee,
            discountAmount,
            couponId: couponRecord?.id || null,
            couponCode: couponRecord?.code || dto.couponCode || null,
            utmSource: dto.utmSource || null,
            utmMedium: dto.utmMedium || null,
            utmCampaign: dto.utmCampaign || null,
            referralCode: dto.referralCode || null,
            totalAmount,
            totalBaseCost,
            platformCommission,
            paymentFee,
            studentNetProfit,
            status: initialStatus,
            paymentMethod: dto.paymentMethod,
            paymentStatus: "UNPAID",
            shippingAddress: dto.shippingAddress as any,
            items: {
              create: orderItemsData,
            },
          },
          include: {
            items: {
              include: {
                storeProduct: true,
                masterProduct: true,
              },
            },
            customer: true,
          },
        });

        // Record Funnel Event for ORDER_COMPLETED if sessionId exists
        if (dto.sessionId) {
          await tx.storeFunnelEvent.create({
            data: {
              storeId: store.id,
              sessionId: dto.sessionId,
              eventType: "ORDER_COMPLETED",
              entityId: order.id,
              metadata: {
                orderNumber,
                totalAmount,
                discountAmount,
                couponCode: dto.couponCode || null,
                utmSource: dto.utmSource || null,
              },
            },
          });
        }

        // Record LedgerEntry for student net profit
        const lastLedger = await tx.ledgerEntry.findFirst({
          where: { storeId: store.id },
          orderBy: { createdAt: "desc" },
        });
        const previousBalance = lastLedger ? Number(lastLedger.balanceAfter) : 0;
        const balanceAfter = Math.round((previousBalance + studentNetProfit) * 100) / 100;

        await tx.ledgerEntry.create({
          data: {
            storeId: store.id,
            orderId: order.id,
            entryType: "ORDER_PROFIT",
            amount: studentNetProfit,
            balanceAfter,
            notes: `Projected profit for order ${orderNumber}`,
          },
        });

        // Online payment gateway sandbox simulation URL
        let paymentUrl: string | undefined;
        if (dto.paymentMethod === "BKASH") {
          paymentUrl = `https://sandbox.bkash.com/checkout?orderNumber=${orderNumber}&amount=${totalAmount}`;
        } else if (dto.paymentMethod === "NAGAD") {
          paymentUrl = `https://sandbox.nagad.com/checkout?orderNumber=${orderNumber}&amount=${totalAmount}`;
        } else if (dto.paymentMethod === "CARD") {
          paymentUrl = `https://sandbox.sslcommerz.com/gwprocess/v4/index.php?orderNumber=${orderNumber}`;
        }

        return {
          orderNumber: order.orderNumber,
          orderId: order.id,
          status: order.status,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          totalAmount: Number(order.totalAmount),
          subtotal: Number(order.subtotal),
          shippingFee: Number(order.shippingFee),
          discountAmount: Number(order.discountAmount),
          couponCode: order.couponCode,
          studentNetProfit: Number(order.studentNetProfit),
          platformCommission: Number(order.platformCommission),
          paymentFee: Number(order.paymentFee),
          paymentUrl,
          customer: {
            id: customer.id,
            fullName: customer.fullName,
            phone: customer.phone,
          },
          items: order.items.map((item) => ({
            id: item.id,
            productTitle: item.storeProduct?.customTitle || item.masterProduct.title,
            quantity: item.quantity,
            unitSellingPrice: Number(item.unitSellingPrice),
            totalPrice: Number(item.totalPrice),
          })),
          createdAt: order.createdAt,
        };
      },
      {
        timeout: 10000,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );
  }

  /**
   * Public tracking endpoint for customers.
   */
  async trackOrder(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber: orderNumber.trim().toUpperCase() },
      include: {
        store: {
          select: {
            id: true,
            storeName: true,
            slug: true,
            logoUrl: true,
          },
        },
        items: {
          include: {
            storeProduct: true,
            masterProduct: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with number "${orderNumber}" not found`);
    }

    const shipping = order.shippingAddress as Record<string, any>;

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      courierName: order.courierName,
      trackingNumber: order.trackingNumber,
      totalAmount: Number(order.totalAmount),
      subtotal: Number(order.subtotal),
      shippingFee: Number(order.shippingFee),
      recipientCity: shipping?.city || shipping?.district,
      store: order.store,
      reviewToken:
        order.status === OrderStatus.DELIVERED ||
        order.status === OrderStatus.COMPLETED
          ? order.reviewToken
          : null,
      items: order.items.map((item) => ({
        id: item.id,
        title: item.storeProduct?.customTitle || item.masterProduct.title,
        quantity: item.quantity,
        unitPrice: Number(item.unitSellingPrice),
        totalPrice: Number(item.totalPrice),
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * List orders for the authenticated student's store.
   */
  async listStudentOrders(userId: string, query: QueryOrdersDto) {
    const store = await this.storesService.getMyStore(userId);
    const { page = 1, limit = 20, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      storeId: store.id,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: "insensitive" } },
              { customer: { fullName: { contains: search, mode: "insensitive" } } },
              { customer: { phone: { contains: search } } },
            ],
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          items: {
            include: {
              storeProduct: true,
              masterProduct: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        totalAmount: Number(o.totalAmount),
        studentNetProfit: Number(o.studentNetProfit),
        courierName: o.courierName,
        trackingNumber: o.trackingNumber,
        customer: o.customer,
        itemsCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
        createdAt: o.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Global order queue across all stores for institute fulfillment staff.
   */
  async listAdminOrders(query: QueryOrdersDto) {
    const { page = 1, limit = 20, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: "insensitive" } },
              { customer: { fullName: { contains: search, mode: "insensitive" } } },
              { customer: { phone: { contains: search } } },
              { store: { storeName: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          store: {
            select: {
              id: true,
              storeName: true,
              slug: true,
            },
          },
          customer: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          items: {
            include: {
              storeProduct: true,
              masterProduct: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        subtotal: Number(o.subtotal),
        shippingFee: Number(o.shippingFee),
        totalAmount: Number(o.totalAmount),
        totalBaseCost: Number(o.totalBaseCost),
        platformCommission: Number(o.platformCommission),
        studentNetProfit: Number(o.studentNetProfit),
        courierName: o.courierName,
        trackingNumber: o.trackingNumber,
        shippingAddress: o.shippingAddress,
        store: o.store,
        customer: o.customer,
        items: o.items.map((i) => ({
          id: i.id,
          productTitle: i.storeProduct?.customTitle || i.masterProduct.title,
          sku: i.masterProduct.sku,
          quantity: i.quantity,
          unitBasePrice: Number(i.unitBasePrice),
          unitSellingPrice: Number(i.unitSellingPrice),
          totalPrice: Number(i.totalPrice),
        })),
        createdAt: o.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Warehouse dispatch: attach courier info and transition to SHIPPED.
   */
  async dispatchOrder(orderId: string, dto: DispatchOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order "${orderId}" not found`);
    }

    OrderStateMachine.validateTransition(order.status, OrderStatus.SHIPPED);

    return await this.prisma.order.update({
      where: { id: orderId },
      data: {
        courierName: dto.courierName,
        trackingNumber: dto.trackingNumber,
        status: OrderStatus.SHIPPED,
      },
    });
  }

  /**
   * Update order status with state machine enforcement and inventory restitution if cancelled/returned.
   */
  async updateOrderStatus(orderId: string, toStatus: OrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order "${orderId}" not found`);
    }

    OrderStateMachine.validateTransition(order.status, toStatus);

    return await this.prisma.$transaction(async (tx) => {
      // If order is cancelled or returned, restitute stock quantity to master product
      if (OrderStateMachine.shouldRestituteStock(order.status, toStatus)) {
        for (const item of order.items) {
          await tx.masterProduct.update({
            where: { id: item.masterProductId },
            data: {
              stockQuantity: { increment: item.quantity },
            },
          });
        }

        // Reversal of profit in ledger
        const lastLedger = await tx.ledgerEntry.findFirst({
          where: { storeId: order.storeId },
          orderBy: { createdAt: "desc" },
        });
        const prevBal = lastLedger ? Number(lastLedger.balanceAfter) : 0;
        const reversalAmount = -Number(order.studentNetProfit);
        const balanceAfter = Math.round((prevBal + reversalAmount) * 100) / 100;

        await tx.ledgerEntry.create({
          data: {
            storeId: order.storeId,
            orderId: order.id,
            entryType: "ORDER_PROFIT",
            amount: reversalAmount,
            balanceAfter,
            notes: `Profit reversal for ${toStatus.toLowerCase()} order ${order.orderNumber}`,
          },
        });
      }

      // Update payment status if marked PAID
      const paymentStatusUpdate =
        toStatus === OrderStatus.PAID
          ? "PAID"
          : toStatus === OrderStatus.CANCELLED
            ? "CANCELLED"
            : undefined;

      // Handle review token generation upon delivery/completion
      const isDeliveredOrCompleted =
        toStatus === OrderStatus.DELIVERED || toStatus === OrderStatus.COMPLETED;
      let reviewToken = order.reviewToken;
      let reviewRequestSentAt = order.reviewRequestSentAt;

      if (isDeliveredOrCompleted && !reviewToken) {
        reviewToken = `tok_${randomBytes(16).toString("hex")}`;
        reviewRequestSentAt = new Date();
      }

      // If transitioning to DELIVERED/COMPLETED for the first time, increment store completed orders
      const wasDeliveredOrCompleted =
        order.status === OrderStatus.DELIVERED ||
        order.status === OrderStatus.COMPLETED;

      if (isDeliveredOrCompleted && !wasDeliveredOrCompleted) {
        await tx.store.update({
          where: { id: order.storeId },
          data: {
            completedOrdersCount: { increment: 1 },
          },
        });
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: toStatus,
          ...(paymentStatusUpdate ? { paymentStatus: paymentStatusUpdate } : {}),
          ...(reviewToken ? { reviewToken, reviewRequestSentAt } : {}),
        },
      });

      if (isDeliveredOrCompleted) {
        this.eventEmitter.emit("order.delivered", {
          orderId: updated.id,
          storeId: updated.storeId,
          customerId: updated.customerId,
          orderNumber: updated.orderNumber,
          reviewToken,
          discountAmount: Number(updated.discountAmount),
          totalAmount: Number(updated.totalAmount),
        });
      }

      return updated;
    });
  }
}
