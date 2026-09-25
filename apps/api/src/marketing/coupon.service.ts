import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCouponDto, UpdateCouponDto } from "./dto/marketing.dto";
import { CouponDiscountType } from "@repo/db";

@Injectable()
export class CouponService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to fetch student's active store
   */
  private async getStudentStore(studentId: string) {
    const store = await this.prisma.store.findFirst({
      where: { studentId },
    });

    if (!store) {
      throw new NotFoundException("Student does not have an active store.");
    }

    return store;
  }

  /**
   * Create a new store coupon
   */
  async createCoupon(studentId: string, dto: CreateCouponDto) {
    const store = await this.getStudentStore(studentId);
    const normalizedCode = dto.code.trim().toUpperCase();

    if (dto.discountType === CouponDiscountType.PERCENTAGE && dto.discountValue > 100) {
      throw new BadRequestException("Percentage discount cannot exceed 100%.");
    }

    // Check duplicate code
    const existing = await this.prisma.coupon.findUnique({
      where: {
        storeId_code: {
          storeId: store.id,
          code: normalizedCode,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Coupon code "${normalizedCode}" already exists for your store.`,
      );
    }

    return this.prisma.coupon.create({
      data: {
        storeId: store.id,
        code: normalizedCode,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minSpend: dto.minSpend || 0,
        maxUses: dto.maxUses || null,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isActive: true,
      },
    });
  }

  /**
   * List coupons for student store
   */
  async listStudentCoupons(studentId: string) {
    const store = await this.getStudentStore(studentId);
    return this.prisma.coupon.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Update or toggle coupon status
   */
  async updateCoupon(studentId: string, couponId: string, dto: UpdateCouponDto) {
    const store = await this.getStudentStore(studentId);

    // updateMany scopes the write itself by storeId (not just an earlier
    // read), so ownership can't be bypassed even if this logic is ever
    // reused without re-checking storeId first.
    const result = await this.prisma.coupon.updateMany({
      where: { id: couponId, storeId: store.id },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.maxUses !== undefined ? { maxUses: dto.maxUses } : {}),
        ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException("Coupon not found.");
    }

    return this.prisma.coupon.findUnique({ where: { id: couponId } });
  }

  /**
   * Validate coupon code for storefront checkout
   */
  async validateStorefrontCoupon(storeSlug: string, code: string, subtotal: number) {
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug },
    });

    if (!store) {
      throw new NotFoundException(`Store "${storeSlug}" not found.`);
    }

    const normalizedCode = (code || "").trim().toUpperCase();
    const coupon = await this.prisma.coupon.findUnique({
      where: {
        storeId_code: {
          storeId: store.id,
          code: normalizedCode,
        },
      },
    });

    if (!coupon || !coupon.isActive) {
      throw new BadRequestException("Coupon code is invalid or has been deactivated.");
    }

    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      throw new BadRequestException("Coupon is not active yet.");
    }

    if (coupon.endDate && now > coupon.endDate) {
      throw new BadRequestException("Coupon has expired.");
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException("Coupon redemption limit has been reached.");
    }

    const minSpend = Number(coupon.minSpend);
    if (subtotal < minSpend) {
      throw new BadRequestException(
        `Minimum cart spend of ৳${minSpend.toLocaleString()} required for this coupon.`,
      );
    }

    // Calculate discount amount
    let discountAmount = 0;
    const discountVal = Number(coupon.discountValue);

    if (coupon.discountType === CouponDiscountType.PERCENTAGE) {
      discountAmount = Math.round(((subtotal * discountVal) / 100) * 100) / 100;
    } else {
      discountAmount = Math.min(subtotal, discountVal);
    }

    const finalSubtotal = Math.max(0, subtotal - discountAmount);

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: discountVal,
        minSpend: minSpend,
      },
      discountAmount,
      finalSubtotal,
    };
  }

  /**
   * Increment coupon usedCount upon order placement
   */
  async recordCouponUsage(storeId: string, couponCode: string, tx?: any) {
    const client = tx || this.prisma;
    const normalizedCode = couponCode.trim().toUpperCase();

    const coupon = await client.coupon.findUnique({
      where: {
        storeId_code: {
          storeId,
          code: normalizedCode,
        },
      },
    });

    if (coupon) {
      await client.coupon.update({
        where: { id: coupon.id },
        data: {
          usedCount: { increment: 1 },
        },
      });
      return coupon;
    }

    return null;
  }
}
