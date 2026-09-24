import { BadRequestException } from "@nestjs/common";
import { OrderStatus } from "@repo/db";

export class OrderStateMachine {
  private static readonly VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CANCELLED],
    [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.REFUNDED],
    [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
    [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.RETURNED],
    [OrderStatus.COMPLETED]: [],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
    [OrderStatus.REFUNDED]: [],
  };

  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    if (from === to) return true;
    const allowed = this.VALID_TRANSITIONS[from] || [];
    return allowed.includes(to);
  }

  static validateTransition(from: OrderStatus, to: OrderStatus): void {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(
        `Invalid order status transition from ${from} to ${to}. Allowed transitions: [${(
          this.VALID_TRANSITIONS[from] || []
        ).join(", ")}]`,
      );
    }
  }

  static shouldRestituteStock(from: OrderStatus, to: OrderStatus): boolean {
    // If order was cancelled or returned after inventory was deducted, restock it
    return (
      (to === OrderStatus.CANCELLED || to === OrderStatus.RETURNED) &&
      from !== OrderStatus.CANCELLED &&
      from !== OrderStatus.RETURNED
    );
  }
}
