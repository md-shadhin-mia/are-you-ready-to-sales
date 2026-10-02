import { describe, it, expect } from "vitest";
import { OrderStateMachine, IllegalStateTransitionException } from "./order-state-machine";
import { OrderStatus } from "@repo/db";

describe("OrderStateMachine", () => {
  it("should allow valid progressive transitions", () => {
    expect(OrderStateMachine.canTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.PAID)).toBe(true);
    expect(OrderStateMachine.canTransition(OrderStatus.PROCESSING, OrderStatus.SHIPPED)).toBe(true);
    expect(OrderStateMachine.canTransition(OrderStatus.SHIPPED, OrderStatus.DELIVERED)).toBe(true);
    expect(OrderStateMachine.canTransition(OrderStatus.NEW, OrderStatus.INVOICED)).toBe(true);
  });

  it("should return true when transitioning to the same state", () => {
    expect(OrderStateMachine.canTransition(OrderStatus.NEW, OrderStatus.NEW)).toBe(true);
    expect(OrderStateMachine.canTransition(OrderStatus.INVOICED, OrderStatus.INVOICED)).toBe(true);
  });

  it("should handle unknown status gracefully", () => {
    expect(OrderStateMachine.canTransition("UNKNOWN" as any, OrderStatus.PAID)).toBe(false);
  });

  it("should reject invalid skipping transitions", () => {
    expect(OrderStateMachine.canTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.DELIVERED)).toBe(false);
    expect(() =>
      OrderStateMachine.validateTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.DELIVERED),
    ).toThrow(IllegalStateTransitionException);
    expect(() =>
      OrderStateMachine.validateTransition("UNKNOWN" as any, OrderStatus.DELIVERED),
    ).toThrow(IllegalStateTransitionException);
  });

  it("should not throw when validating a legal transition", () => {
    expect(() =>
      OrderStateMachine.validateTransition(OrderStatus.NEW, OrderStatus.INVOICED),
    ).not.toThrow();
  });

  it("should flag stock restitution when order is cancelled or returned", () => {
    expect(OrderStateMachine.shouldRestituteStock(OrderStatus.PROCESSING, OrderStatus.CANCELLED)).toBe(true);
    expect(OrderStateMachine.shouldRestituteStock(OrderStatus.SHIPPED, OrderStatus.RETURNED)).toBe(true);
    expect(OrderStateMachine.shouldRestituteStock(OrderStatus.CANCELLED, OrderStatus.CANCELLED)).toBe(false);
    expect(OrderStateMachine.shouldRestituteStock(OrderStatus.RETURNED, OrderStatus.RETURNED)).toBe(false);
    expect(OrderStateMachine.shouldRestituteStock(OrderStatus.PROCESSING, OrderStatus.COMPLETE)).toBe(false);
  });
});
