import { describe, it, expect, beforeEach, vi } from "vitest";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DynamicPermissionsGuard } from "./dynamic-permissions.guard";
import { UserRole } from "@repo/db";

describe("DynamicPermissionsGuard (Unit)", () => {
  let guard: DynamicPermissionsGuard;
  let reflector: Reflector;
  let prismaMock: any;
  let redisMock: any;

  beforeEach(() => {
    reflector = new Reflector();
    prismaMock = {
      userRoleAssignment: {
        findMany: vi.fn(),
      },
      role: {
        findFirst: vi.fn(),
      },
    };
    redisMock = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
    };
    guard = new DynamicPermissionsGuard(reflector, prismaMock as any, redisMock as any);
  });

  function createMockContext(user: any): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it("1. Should allow access if no permissions or roles are required", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

    const context = createMockContext({ id: "user-1", role: UserRole.STUDENT });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it("2. Should allow Super Admin universal access without permission check", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key: any) => {
      if (key === "permissions") return ["finance:payout"];
      return undefined;
    });

    const context = createMockContext({ id: "admin-1", role: UserRole.SUPER_ADMIN });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it("3. Should allow user with specific permission (e.g. orders:dispatch)", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key: any) => {
      if (key === "permissions") return ["orders:dispatch"];
      return undefined;
    });

    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      {
        role: {
          rolePermissions: [
            { permission: { slug: "orders:dispatch" } },
          ],
        },
      },
    ]);

    const context = createMockContext({ id: "staff-1", role: UserRole.ORDER_MANAGER });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it("4. Should deny user lacking required permission with 403 Forbidden", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key: any) => {
      if (key === "permissions") return ["finance:payout"];
      return undefined;
    });

    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      {
        role: {
          rolePermissions: [
            { permission: { slug: "orders:dispatch" } },
          ],
        },
      },
    ]);

    const context = createMockContext({ id: "staff-1", role: UserRole.ORDER_MANAGER });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      "Insufficient permissions: finance:payout required",
    );
  });

  it("5. Should allow user if wildcard permission covers required permission", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key: any) => {
      if (key === "permissions") return ["orders:dispatch"];
      return undefined;
    });

    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      {
        role: {
          rolePermissions: [
            { permission: { slug: "orders:*" } },
          ],
        },
      },
    ]);

    const context = createMockContext({ id: "staff-2", role: UserRole.INSTITUTE_ADMIN });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it("6. Should throw ForbiddenException when user is not present on request", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key: any) => {
      if (key === "permissions") return ["orders:view"];
      return undefined;
    });

    const context = createMockContext(null);
    await expect(guard.canActivate(context)).rejects.toThrow("Authentication required");
  });

  it("7. Should evaluate legacy roles when requiredRoles is defined", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key: any) => {
      if (key === "roles") return [UserRole.BRANCH_MANAGER];
      return undefined;
    });

    const allowedCtx = createMockContext({ id: "bm-1", role: UserRole.BRANCH_MANAGER });
    expect(await guard.canActivate(allowedCtx)).toBe(true);

    const deniedCtx = createMockContext({ id: "stu-1", role: UserRole.STUDENT });
    await expect(guard.canActivate(deniedCtx)).rejects.toThrow("Access denied. Required roles: [BRANCH_MANAGER]");
  });

  it("8. Should allow access when user has global wildcard '*'", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key: any) => {
      if (key === "permissions") return ["anything:custom"];
      return undefined;
    });

    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { role: { rolePermissions: [{ permission: { slug: "*" } }] } },
    ]);

    const context = createMockContext({ id: "admin-root", role: UserRole.INSTITUTE_ADMIN });
    expect(await guard.canActivate(context)).toBe(true);
  });

  it("9. Should use Redis cache when present and recover from corrupted cache", async () => {
    redisMock.get.mockResolvedValueOnce(JSON.stringify(["cached:permission"]));

    let perms = await guard.resolveUserPermissions("u-cached");
    expect(perms).toEqual(["cached:permission"]);
    expect(prismaMock.userRoleAssignment.findMany).not.toHaveBeenCalled();

    // Corrupted cache
    redisMock.get.mockResolvedValueOnce("invalid-json{");
    prismaMock.userRoleAssignment.findMany.mockResolvedValueOnce([]);

    perms = await guard.resolveUserPermissions("u-corrupt");
    expect(perms).toEqual([]);
    expect(prismaMock.userRoleAssignment.findMany).toHaveBeenCalled();
  });

  it("10. Should fallback to system role matching legacyRole when no assignments exist", async () => {
    prismaMock.userRoleAssignment.findMany.mockResolvedValueOnce([]);
    prismaMock.role.findFirst.mockResolvedValueOnce({
      name: UserRole.STUDENT,
      rolePermissions: [{ permission: { slug: "student:portal" } }],
    });

    const perms = await guard.resolveUserPermissions("stu-legacy", UserRole.STUDENT);
    expect(perms).toEqual(["student:portal"]);
    expect(redisMock.set).toHaveBeenCalledWith("user:permissions:stu-legacy", JSON.stringify(["student:portal"]), 600);
  });
});
