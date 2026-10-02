import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { createHmac } from "crypto";
import { OrderStatus } from "@repo/db";
import { CourierWebhookService } from "./courier-webhook.service";

const SECRET = "unit-test-secret";
const sign = (body: string) => createHmac("sha256", SECRET).update(body).digest("hex");

describe("CourierWebhookService (Unit)", () => {
  let prisma: any;
  let redisStore: Map<string, string>;
  let redisClient: any;
  let orders: any;
  let service: CourierWebhookService;

  const payload = (status: string, eventId = "evt-1") =>
    JSON.stringify({ eventId, trackingNumber: "TRK-1", status });

  beforeEach(() => {
    redisStore = new Map();
    redisClient = {
      set: vi.fn(async (k: string, v: string, ...args: any[]) => {
        if (args.includes("NX") && redisStore.has(k)) return null;
        redisStore.set(k, v);
        return "OK";
      }),
      del: vi.fn(async (k: string) => redisStore.delete(k)),
    };
    prisma = {
      order: { findFirst: vi.fn().mockResolvedValue({ id: "o-1", status: OrderStatus.IN_COURIER }) },
      courierEvent: { create: vi.fn(async ({ data }: any) => data) },
      rtoInspection: { create: vi.fn() },
    };
    orders = { updateOrderStatus: vi.fn(async (_id: string, status: OrderStatus) => ({ id: "o-1", status })) };
    const config = { get: (key: string) => (key === "COURIER_WEBHOOK_SECRET" ? SECRET : undefined) };
    service = new CourierWebhookService(prisma, { getClient: () => redisClient } as any, orders, config as any);
  });

  it("rejects an invalid HMAC signature with UnauthorizedException before touching state", async () => {
    const body = payload("delivered");
    await expect(service.handle("steadfast", body, "deadbeef")).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.handle("steadfast", body, undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(redisClient.set).not.toHaveBeenCalled();
    expect(prisma.courierEvent.create).not.toHaveBeenCalled();
  });

  it("applies a delivered event through the order state machine", async () => {
    const body = payload("delivered");
    const result = await service.handle("steadfast", body, sign(body));
    expect(orders.updateOrderStatus).toHaveBeenCalledWith("o-1", OrderStatus.DELIVERED);
    expect(result).toMatchObject({ duplicate: false, applied: true, orderStatus: OrderStatus.DELIVERED });
    expect(prisma.courierEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ provider: "STEADFAST", eventId: "evt-1", applied: true, orderId: "o-1" }),
    });
  });

  it("acknowledges replayed event IDs without re-executing database writes", async () => {
    const body = payload("delivered");
    await service.handle("pathao", body, sign(body));
    orders.updateOrderStatus.mockClear();
    prisma.courierEvent.create.mockClear();

    const replay = await service.handle("pathao", body, sign(body));
    expect(replay).toMatchObject({ received: true, duplicate: true });
    expect(orders.updateOrderStatus).not.toHaveBeenCalled();
    expect(prisma.courierEvent.create).not.toHaveBeenCalled();
  });

  it("returned-to-origin moves the order to RETURNED and opens a seal inspection", async () => {
    const body = payload("RETURNED_TO_ORIGIN");
    await service.handle("redx", body, sign(body));
    expect(orders.updateOrderStatus).toHaveBeenCalledWith("o-1", OrderStatus.RETURNED);
    expect(prisma.rtoInspection.create).toHaveBeenCalledWith({ data: { orderId: "o-1" } });
  });

  it("records but does not apply events that would be illegal transitions", async () => {
    prisma.order.findFirst.mockResolvedValue({ id: "o-1", status: OrderStatus.NEW });
    const body = payload("delivered");
    const result = await service.handle("paperfly", body, sign(body));
    expect(orders.updateOrderStatus).not.toHaveBeenCalled();
    expect(result.applied).toBe(false);
  });

  it("records events for unknown tracking numbers without failing the courier", async () => {
    prisma.order.findFirst.mockResolvedValue(null);
    const body = payload("in_transit");
    const result = await service.handle("steadfast", body, sign(body));
    expect(result).toMatchObject({ applied: false, orderStatus: null });
    expect(prisma.courierEvent.create).toHaveBeenCalled();
  });

  it("releases the dedupe key if processing fails so the courier can retry", async () => {
    orders.updateOrderStatus.mockRejectedValue(new Error("db down"));
    const body = payload("delivered");
    await expect(service.handle("steadfast", body, sign(body))).rejects.toThrow("db down");
    expect(redisStore.size).toBe(0);
  });

  it("rejects unknown courier providers", async () => {
    await expect(service.handle("unsupported_courier", "{}", "sig")).rejects.toThrow(
      'Unsupported courier provider "unsupported_courier"',
    );
  });

  it("validates payload format: requires JSON and required fields", async () => {
    const invalidJson = "not-json";
    await expect(service.handle("steadfast", invalidJson, sign(invalidJson))).rejects.toThrow(
      "Webhook body must be JSON",
    );

    const missingFields = JSON.stringify({ eventId: "e-1" });
    await expect(service.handle("steadfast", missingFields, sign(missingFields))).rejects.toThrow(
      "eventId, trackingNumber and status are required",
    );
  });

  it("treats events matching current order status as idempotent applied", async () => {
    prisma.order.findFirst.mockResolvedValue({ id: "o-1", status: OrderStatus.DELIVERED });
    const body = payload("delivered");
    const res = await service.handle("steadfast", body, sign(body));
    expect(res.applied).toBe(true);
    expect(orders.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("catches database P2002 duplicate event key conflicts gracefully", async () => {
    const p2002Error: any = new Error("Unique constraint failed");
    p2002Error.code = "P2002";
    prisma.courierEvent.create.mockRejectedValueOnce(p2002Error);

    const body = payload("delivered");
    const res = await service.handle("steadfast", body, sign(body));
    expect(res).toMatchObject({ received: true, duplicate: true, applied: false });
  });
});
