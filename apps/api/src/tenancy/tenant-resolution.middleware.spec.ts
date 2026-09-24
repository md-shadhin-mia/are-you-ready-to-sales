import { describe, it, expect, vi, beforeEach } from "vitest";
import { TenantResolutionMiddleware } from "./tenant-resolution.middleware";
import { TenantContext } from "./tenant-context";
import { ForbiddenException } from "@nestjs/common";
import { StoreStatus } from "@repo/db";

describe("TenantResolutionMiddleware", () => {
  let middleware: TenantResolutionMiddleware;
  let mockPrisma: any;
  let mockRedis: any;
  let mockConfig: any;
  let tenantContext: TenantContext;

  beforeEach(() => {
    mockPrisma = {
      store: {
        findUnique: vi.fn(),
      },
    };
    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
    };
    mockConfig = {
      get: vi.fn().mockReturnValue("platform.local"),
    };
    tenantContext = new TenantContext();

    middleware = new TenantResolutionMiddleware(
      mockPrisma,
      mockRedis,
      mockConfig,
      tenantContext,
    );
  });

  it("should extract tenant from X-Tenant-Slug header", async () => {
    const store = {
      id: "store-123",
      slug: "apex-gadgets",
      status: StoreStatus.ACTIVE,
    };
    mockRedis.get.mockResolvedValue(JSON.stringify(store));

    const req: any = {
      headers: { "x-tenant-slug": "apex-gadgets" },
    };
    const res: any = {};
    const next = vi.fn();

    await middleware.use(req, res, next);

    expect(req.tenant).toEqual(store);
    expect(tenantContext.getStoreId()).toBe("store-123");
    expect(next).toHaveBeenCalled();
  });

  it("should extract tenant slug from Host header", async () => {
    const store = {
      id: "store-456",
      slug: "gadget-hub",
      status: StoreStatus.ACTIVE,
    };
    mockRedis.get.mockResolvedValue(null);
    mockPrisma.store.findUnique.mockResolvedValue(store);

    const req: any = {
      headers: { host: "gadget-hub.platform.local:4000" },
    };
    const res: any = {};
    const next = vi.fn();

    await middleware.use(req, res, next);

    expect(req.tenant).toEqual(store);
    expect(mockRedis.set).toHaveBeenCalledWith(
      "tenant:slug:gadget-hub",
      JSON.stringify(store),
      300,
    );
    expect(next).toHaveBeenCalled();
  });

  it("should throw ForbiddenException if store is SUSPENDED", async () => {
    const store = {
      id: "store-suspended",
      slug: "bad-store",
      status: StoreStatus.SUSPENDED,
    };
    mockRedis.get.mockResolvedValue(JSON.stringify(store));

    const req: any = {
      headers: { "x-tenant-slug": "bad-store" },
    };
    const res: any = {};
    const next = vi.fn();

    await expect(middleware.use(req, res, next)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("should proceed without tenant if no matching header or host", async () => {
    const req: any = {
      headers: { host: "api.platform.local" },
    };
    const res: any = {};
    const next = vi.fn();

    await middleware.use(req, res, next);

    expect(req.tenant).toBeUndefined();
    expect(tenantContext.getTenant()).toBeNull();
    expect(next).toHaveBeenCalled();
  });
});
