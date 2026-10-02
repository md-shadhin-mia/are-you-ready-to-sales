import { UserRole } from "@repo/db";

export interface ScopedUser {
  id: string;
  role: UserRole | string;
}

/** `null` means global visibility; an array restricts results to those campuses. */
export type CampusScope = string[] | null;

interface BranchReader {
  branch: { findMany(args: any): Promise<Array<{ id: string }>> };
}

/** Branch managers only see records inside the campuses they manage. */
export async function resolveCampusScope(prisma: BranchReader, user: ScopedUser | undefined): Promise<CampusScope> {
  if (!user || user.role !== UserRole.BRANCH_MANAGER) return null;
  const branches = await prisma.branch.findMany({ where: { managerId: user.id }, select: { id: true } });
  return branches.map((b) => b.id);
}
