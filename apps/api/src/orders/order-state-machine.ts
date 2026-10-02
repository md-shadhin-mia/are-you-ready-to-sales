import { BadRequestException } from "@nestjs/common";
import { OrderStatus } from "@repo/db";

export class IllegalStateTransitionException extends BadRequestException {
  constructor(from: OrderStatus, to: OrderStatus, allowed: OrderStatus[]) {
    super(`Illegal order status transition ${from} -> ${to}. Allowed transitions: [${allowed.join(", ")}]`);
  }
}

export class OrderStateMachine {
  private static readonly VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.NEW]: [OrderStatus.INVOICED, OrderStatus.HOLD, OrderStatus.UNMATCH, OrderStatus.CANCELLED],
    [OrderStatus.INVOICED]: [OrderStatus.IN_COURIER, OrderStatus.SHIPPED, OrderStatus.HOLD, OrderStatus.UNMATCH, OrderStatus.CANCELLED],
    [OrderStatus.IN_COURIER]: [OrderStatus.PARTIAL_DELIVERED, OrderStatus.DELIVERED, OrderStatus.COMPLETE, OrderStatus.COMPLETED, OrderStatus.HOLD, OrderStatus.RETURNED],
    [OrderStatus.PARTIAL_DELIVERED]: [OrderStatus.COMPLETE, OrderStatus.COMPLETED, OrderStatus.EXCHANGE, OrderStatus.RETURNED],
    [OrderStatus.DELIVERED]: [OrderStatus.COMPLETE, OrderStatus.COMPLETED, OrderStatus.EXCHANGE, OrderStatus.RETURNED],
    [OrderStatus.COMPLETE]: [OrderStatus.EXCHANGE, OrderStatus.RETURNED],
    [OrderStatus.HOLD]: [OrderStatus.NEW, OrderStatus.INVOICED, OrderStatus.IN_COURIER, OrderStatus.CANCELLED],
    [OrderStatus.UNMATCH]: [OrderStatus.NEW, OrderStatus.INVOICED, OrderStatus.CANCELLED],
    [OrderStatus.EXCHANGE]: [OrderStatus.IN_COURIER, OrderStatus.COMPLETE, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.NEW, OrderStatus.CANCELLED],
    [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.INVOICED, OrderStatus.REFUNDED],
    [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.INVOICED, OrderStatus.IN_COURIER, OrderStatus.CANCELLED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.IN_COURIER, OrderStatus.RETURNED],
    [OrderStatus.COMPLETED]: [OrderStatus.EXCHANGE, OrderStatus.RETURNED],
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
      throw new IllegalStateTransitionException(from, to, this.VALID_TRANSITIONS[from] || []);
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
