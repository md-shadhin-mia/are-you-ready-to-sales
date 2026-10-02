import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { StockMovementType } from "@repo/db";
import {
  InventoryService,
  InsufficientInventoryException,
  computeWeightedAverageCost,
} from "./inventory.service";

describe("InventoryService (Unit)", () => {
  let prisma: any;
  let service: InventoryService;
  let row: { id: string; title: string; stock_quantity: number; reserved_quantity: number; average_cost: string };
  let lockSql: string;

  beforeEach(() => {
    row = { id: "p-1", title: "Earbuds", stock_quantity: 5, reserved_quantity: 1, average_cost: "100.00" };
    lockSql = "";
    prisma = {
      $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
        lockSql = strings.join("?");
        return [row];
      }),
      masterProduct: { update: vi.fn() },
      stockMovement: { create: vi.fn(async ({ data }: any) => ({ id: "mv-1", ...data })) },
      $transaction: vi.fn(async (cb: any) => cb(prisma)),
    };
    service = new InventoryService(prisma);
  });

  describe("reserve()", () => {
    it("fails with InsufficientInventoryException when available < requested", async () => {
      await expect(service.reserve("p-1", 6, { referenceType: "EXCHANGE", referenceId: "ex-1" })).rejects.toBeInstanceOf(
        InsufficientInventoryException,
      );
      expect(prisma.masterProduct.update).not.toHaveBeenCalled();
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });

    it("moves units from available to reserved under a row lock and records EXCHANGE_HOLD", async () => {
      const movement = await service.reserve("p-1", 2, { referenceType: "EXCHANGE", referenceId: "ex-1" });

      expect(lockSql).toMatch(/FOR UPDATE/);
      expect(prisma.masterProduct.update).toHaveBeenCalledWith({
        where: { id: "p-1" },
        data: { stockQuantity: 3, reservedQuantity: 3 },
      });
      expect(movement).toMatchObject({
        movementType: StockMovementType.EXCHANGE_HOLD,
        quantity: 0,
        reservedDelta: 2,
        onHandAfter: 6,
        reservedAfter: 3,
        balanceAfter: 3,
      });
    });
  });

  it("release() returns reserved units to available", async () => {
    const movement = await service.release("p-1", 1, { referenceType: "EXCHANGE", referenceId: "ex-1" });
    expect(movement).toMatchObject({ movementType: StockMovementType.EXCHANGE_RELEASE, reservedAfter: 0, balanceAfter: 6 });
  });

  it("release() cannot release more than is reserved", async () => {
    await expect(service.release("p-1", 2, { referenceType: "EXCHANGE", referenceId: "ex-1" })).rejects.toBeInstanceOf(
      InsufficientInventoryException,
    );
  });

  it("fulfillReserved() ships reserved units out of on-hand stock", async () => {
    const movement = await service.fulfillReserved("p-1", 1, { referenceType: "EXCHANGE", referenceId: "ex-1" });
    expect(movement).toMatchObject({ quantity: -1, reservedDelta: -1, onHandAfter: 5, reservedAfter: 0, balanceAfter: 5 });
  });

  describe("adjust()", () => {
    it("records the supervising user and audit notes", async () => {
      const movement = await service.adjust("p-1", -2, { performedById: "sup-1", notes: "Cycle count shrinkage" });
      expect(movement).toMatchObject({
        movementType: StockMovementType.AUDIT_ADJUSTMENT,
        quantity: -2,
        performedById: "sup-1",
        notes: "Cycle count shrinkage",
        balanceAfter: 3,
      });
    });

    it("requires audit notes and a supervisor", async () => {
      await expect(service.adjust("p-1", 1, { performedById: "sup-1", notes: " " })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.adjust("p-1", 1, { performedById: "", notes: "Found stock" })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("rejects zero-quantity adjustments and adjustments that drive available stock negative", async () => {
      await expect(service.adjust("p-1", 0, { performedById: "s", notes: "noop" })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.adjust("p-1", -6, { performedById: "s", notes: "Lost" })).rejects.toBeInstanceOf(
        InsufficientInventoryException,
      );
    });
  });

  it("receive() increases on-hand stock and re-weights the average cost", async () => {
    // on hand 6 @ 100 + 4 @ 150 => (600 + 600) / 10 = 120
    const movement = await service.receive("p-1", 4, 150, { referenceType: "GRN", referenceId: "grn-1" });
    expect(prisma.masterProduct.update).toHaveBeenCalledWith({
      where: { id: "p-1" },
      data: { stockQuantity: 9, reservedQuantity: 1, averageCost: 120 },
    });
    expect(movement.movementType).toBe(StockMovementType.PURCHASE_RECEIPT);
  });

  it("returnToSupplier() deducts the exact quantity from physical stock", async () => {
    const movement = await service.returnToSupplier("p-1", 3, { referenceType: "PURCHASE_RETURN", referenceId: "pr-1" });
    expect(movement).toMatchObject({ movementType: StockMovementType.PURCHASE_RETURN, quantity: -3, onHandAfter: 3 });
  });

  it("uses the caller's transaction client when provided", async () => {
    const tx = { ...prisma, $transaction: vi.fn() };
    await service.restock("p-1", 1, { referenceType: "ORDER", referenceId: "o-1", tx });
    expect(tx.$transaction).not.toHaveBeenCalled();
  });

  describe("computeWeightedAverageCost()", () => {
    it("blends current and purchased cost by quantity", () => {
      expect(computeWeightedAverageCost(10, 100, 30, 140)).toBe(130);
    });

    it("returns the purchase cost when there is no current stock", () => {
      expect(computeWeightedAverageCost(0, 999, 5, 80)).toBe(80);
    });

    it("rounds to 2 decimals", () => {
      expect(computeWeightedAverageCost(3, 10, 3, 10.01)).toBe(10.01);
      expect(computeWeightedAverageCost(1, 10, 2, 10.5)).toBe(10.33);
    });
  });
});
