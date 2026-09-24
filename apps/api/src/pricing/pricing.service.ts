import { Injectable, BadRequestException } from "@nestjs/common";

export interface FeeBreakdown {
  sellingPrice: number;
  basePrice: number;
  grossMargin: number;
  platformCommission: number;
  paymentFee: number;
  shippingFee: number;
  studentNetProfit: number;
  totalCustomerAmount: number;
}

@Injectable()
export class PricingService {
  /** Default platform commission percentage: 5% */
  public static readonly PLATFORM_COMMISSION_RATE = 0.05;

  /** Payment processing fee percentage for online gateways (bKash/Nagad/Cards): 2% */
  public static readonly ONLINE_PAYMENT_FEE_RATE = 0.02;

  /** Standard delivery fee inside Dhaka metropolitan area (BDT) */
  public static readonly SHIPPING_FEE_INSIDE_DHAKA = 80;

  /** Standard delivery fee outside Dhaka metropolitan area (BDT) */
  public static readonly SHIPPING_FEE_OUTSIDE_DHAKA = 150;

  validateSellingPrice(basePrice: number, sellingPrice: number): void {
    if (sellingPrice < basePrice) {
      throw new BadRequestException(
        `Selling price (৳${sellingPrice}) cannot be lower than the institute wholesale base price (৳${basePrice})`,
      );
    }
  }

  calculateBreakdown(params: {
    basePrice: number;
    sellingPrice: number;
    isOnlinePayment?: boolean;
    isInsideDhaka?: boolean;
  }): FeeBreakdown {
    const { basePrice, sellingPrice, isOnlinePayment = false, isInsideDhaka = true } = params;

    this.validateSellingPrice(basePrice, sellingPrice);

    // 5% Platform commission on selling price
    const platformCommission = Math.round(sellingPrice * PricingService.PLATFORM_COMMISSION_RATE * 100) / 100;

    // 2% Payment gateway processing fee for online MFS/Cards, 0 for COD
    const paymentFee = isOnlinePayment
      ? Math.round(sellingPrice * PricingService.ONLINE_PAYMENT_FEE_RATE * 100) / 100
      : 0;

    // Shipping fee
    const shippingFee = isInsideDhaka
      ? PricingService.SHIPPING_FEE_INSIDE_DHAKA
      : PricingService.SHIPPING_FEE_OUTSIDE_DHAKA;

    const grossMargin = Math.round((sellingPrice - basePrice) * 100) / 100;
    const studentNetProfit = Math.round((grossMargin - platformCommission - paymentFee) * 100) / 100;
    const totalCustomerAmount = Math.round((sellingPrice + shippingFee) * 100) / 100;

    return {
      sellingPrice,
      basePrice,
      grossMargin,
      platformCommission,
      paymentFee,
      shippingFee,
      studentNetProfit,
      totalCustomerAmount,
    };
  }
}
