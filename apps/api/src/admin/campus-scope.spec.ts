import { describe, it, expect, vi } from "vitest";
import { UserRole } from "@repo/db";
import { resolveCampusScope } from "./campus-scope";

describe("resolveCampusScope (Unit)", () => {
  it("returns null if user is undefined", async () => {
    const prisma = { branch: { findMany: vi.fn() } };
    const scope = await resolveCampusScope(prisma, undefined);
    expect(scope).toBeNull();
    expect(prisma.branch.findMany).not.toHaveBeenCalled();
  });

  it("returns null if user role is not BRANCH_MANAGER", async () => {
    const prisma = { branch: { findMany: vi.fn() } };
    const scope = await resolveCampusScope(prisma, { id: "u-1", role: UserRole.STUDENT });
    expect(scope).toBeNull();
    expect(prisma.branch.findMany).not.toHaveBeenCalled();
  });

  it("returns branch ids array when user role is BRANCH_MANAGER", async () => {
    const prisma = {
      branch: {
        findMany: vi.fn().mockResolvedValue([{ id: "br-1" }, { id: "br-2" }]),
      },
    };
    const scope = await resolveCampusScope(prisma, { id: "m-1", role: UserRole.BRANCH_MANAGER });
    expect(scope).toEqual(["br-1", "br-2"]);
    expect(prisma.branch.findMany).toHaveBeenCalledWith({
      where: { managerId: "m-1" },
      select: { id: true },
    });
  });
});
