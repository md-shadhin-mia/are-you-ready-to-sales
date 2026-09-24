import { describe, it, expect, vi } from "vitest";
import { RolesGuard } from "./roles.guard";
import { Reflector } from "@nestjs/core";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { UserRole } from "@repo/db";

describe("RolesGuard", () => {
  const mockReflector = {
    getAllAndOverride: vi.fn(),
  };

  const createMockContext = (user?: any): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it("should allow access if no roles are required on endpoint", () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const guard = new RolesGuard(mockReflector as unknown as Reflector);

    const context = createMockContext({ role: UserRole.STUDENT });
    expect(guard.canActivate(context)).toBe(true);
  });

  it("should allow SUPER_ADMIN access even if not explicitly in required roles", () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.PRODUCT_MANAGER]);
    const guard = new RolesGuard(mockReflector as unknown as Reflector);

    const context = createMockContext({ role: UserRole.SUPER_ADMIN });
    expect(guard.canActivate(context)).toBe(true);
  });

  it("should allow user with matching role", () => {
    mockReflector.getAllAndOverride.mockReturnValue([
      UserRole.INSTITUTE_ADMIN,
      UserRole.PRODUCT_MANAGER,
    ]);
    const guard = new RolesGuard(mockReflector as unknown as Reflector);

    const context = createMockContext({ role: UserRole.PRODUCT_MANAGER });
    expect(guard.canActivate(context)).toBe(true);
  });

  it("should throw ForbiddenException if user role does not match required roles", () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.INSTITUTE_ADMIN]);
    const guard = new RolesGuard(mockReflector as unknown as Reflector);

    const context = createMockContext({ role: UserRole.STUDENT });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("should throw ForbiddenException if no user is present on request", () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.STUDENT]);
    const guard = new RolesGuard(mockReflector as unknown as Reflector);

    const context = createMockContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
