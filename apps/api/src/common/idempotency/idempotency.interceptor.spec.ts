import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, ConflictException, UnprocessableEntityException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { lastValueFrom, of, throwError } from "rxjs";
import { IdempotencyInterceptor } from "./idempotency.interceptor";
import { IDEMPOTENT_KEY } from "./idempotent.decorator";

function makeContext(headers: Record<string, string>, body: any = { amount: 1 }) {
  const response = { statusCode: 201, status: vi.fn() };
  const request = { headers, body, method: "POST", originalUrl: "/api/v1/x", user: { id: "u1" } };
  return {
    ctx: {
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    } as any,
    response,
  };
}

describe("IdempotencyInterceptor (Unit)", () => {
  let store: Map<string, string>;
  let redisClient: any;
  let reflector: Reflector;
  let interceptor: IdempotencyInterceptor;

  beforeEach(() => {
    store = new Map();
    redisClient = {
      set: vi.fn(async (key: string, value: string, ...args: any[]) => {
        if (args.includes("NX") && store.has(key)) return null;
        store.set(key, value);
        return "OK";
      }),
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      del: vi.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
    };
    reflector = { getAllAndOverride: vi.fn().mockReturnValue(true) } as any;
    interceptor = new IdempotencyInterceptor(reflector, { getClient: () => redisClient } as any);
  });

  it("passes through handlers that are not marked idempotent", async () => {
    (reflector.getAllAndOverride as any).mockReturnValue(undefined);
    const { ctx } = makeContext({});
    const result = await lastValueFrom(await interceptor.intercept(ctx, { handle: () => of("ok") }));
    expect(result).toBe("ok");
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IDEMPOTENT_KEY, expect.any(Array));
  });

  it("requires an Idempotency-Key header", async () => {
    const { ctx } = makeContext({});
    await expect(interceptor.intercept(ctx, { handle: () => of("ok") })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("executes once and replays the cached response for the same key", async () => {
    const handler = vi.fn(() => of({ voucher: "V-1" }));
    const first = makeContext({ "idempotency-key": "key-12345678" });
    const r1 = await lastValueFrom(await interceptor.intercept(first.ctx, { handle: handler }));
    const second = makeContext({ "idempotency-key": "key-12345678" });
    const r2 = await lastValueFrom(await interceptor.intercept(second.ctx, { handle: handler }));

    expect(r1).toEqual({ voucher: "V-1" });
    expect(r2).toEqual({ voucher: "V-1" });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(second.response.status).toHaveBeenCalledWith(201);
    expect(redisClient.set).toHaveBeenCalledWith(expect.any(String), expect.any(String), "EX", 86400, "NX");
  });

  it("rejects a concurrent request while the first is in flight", async () => {
    const { ctx } = makeContext({ "idempotency-key": "key-12345678" });
    await interceptor.intercept(ctx, { handle: () => of("pending") }); // lock acquired, not yet subscribed
    const again = makeContext({ "idempotency-key": "key-12345678" });
    await expect(interceptor.intercept(again.ctx, { handle: () => of("x") })).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects reuse of a key with a different payload", async () => {
    const first = makeContext({ "idempotency-key": "key-12345678" }, { amount: 1 });
    await lastValueFrom(await interceptor.intercept(first.ctx, { handle: () => of("done") }));
    const second = makeContext({ "idempotency-key": "key-12345678" }, { amount: 2 });
    await expect(interceptor.intercept(second.ctx, { handle: () => of("x") })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it("releases the key when the handler fails so the client can retry", async () => {
    const { ctx } = makeContext({ "idempotency-key": "key-12345678" });
    const obs = await interceptor.intercept(ctx, { handle: () => throwError(() => new Error("boom")) });
    await expect(lastValueFrom(obs)).rejects.toThrow("boom");
    expect(store.size).toBe(0);
  });

  it("handles anonymous users, undefined request body, and default 200 status code", async () => {
    const response = { statusCode: undefined, status: vi.fn() };
    const request = {
      headers: { "idempotency-key": "valid-key-1234" },
      body: undefined,
      method: "POST",
      originalUrl: "/anon",
      user: undefined,
    };
    const ctx = {
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    } as any;

    const handler = vi.fn(() => of({ status: "ok" }));
    const obs = await interceptor.intercept(ctx, { handle: handler });
    await lastValueFrom(obs);

    // Replay with undefined statusCode in cache
    const replay = await interceptor.intercept(ctx, { handle: handler });
    const res = await lastValueFrom(replay);
    expect(res).toEqual({ status: "ok" });
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it("rejects keys shorter than 8 or longer than 128 characters", async () => {
    const { ctx: shortCtx } = makeContext({ "idempotency-key": "short" });
    await expect(interceptor.intercept(shortCtx, { handle: () => of("ok") })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const longKey = "a".repeat(129);
    const { ctx: longCtx } = makeContext({ "idempotency-key": longKey });
    await expect(interceptor.intercept(longCtx, { handle: () => of("ok") })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
