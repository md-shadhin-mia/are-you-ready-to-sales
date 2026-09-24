import { describe, it, expect } from "vitest";
import { OrderStateMachine } from "./order-state-machine";
import { OrderStatus } from "@repo/db";
import { BadRequestException } from "@nestjs/common";

describe("OrderStateMachine", () => {
  it("should allow valid progressive transitions", () => {
    expect(
      OrderStateMachine.canTransition(
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAID,
      ),
    ).toBe(true);

    expect(
      OrderStateMachine.canTransition(
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
      ),
    ).toBe(true);

    expect(
      OrderStateMachine.canTransition(
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ),
    ).toBe(true);
  });

  it("should reject invalid skipping transitions", () => {
    expect(
      OrderStateMachine.canTransition(
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.DELIVERED,
      ),
    ).toBe(false);

    expect(() =>
      OrderStateMachine.validateTransition(
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.DELIVERED,
      ),
    ).toThrow(BadRequestException);
  });

  it("should flag stock restitution when order is cancelled from processing", () => {
    const restitute = OrderStateMachine.shouldRestituteStock(
      OrderStatus.PROCESSING,
      OrderStatus.CANCELLED,
    );
    expect(restitute).toBe(true);
  });
});
