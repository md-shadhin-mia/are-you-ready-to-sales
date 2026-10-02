import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Retrieves all roles with attached permissions and user assignment count.
   */
  async getAllRoles() {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userAssignments: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystemRole: r.isSystemRole,
      assignedUsersCount: r._count.userAssignments,
      permissions: r.rolePermissions.map((rp) => rp.permission),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Creates a new custom staff role.
   */
  async createRole(dto: {
    name: string;
    description?: string;
    permissionIds?: string[];
  }) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Role with name "${dto.name}" already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: dto.name,
          description: dto.description || null,
          isSystemRole: false,
        },
      });

      if (dto.permissionIds && dto.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }

      return tx.role.findUnique({
        where: { id: role.id },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      });
    });
  }

  /**
   * Updates permission associations for a given role.
   */
  async updateRolePermissions(roleId: string, permissionIds: string[]) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    await this.prisma.$transaction(async (tx) => {
      // Remove existing permissions
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      // Add new permissions
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permId) => ({
            roleId,
            permissionId: permId,
          })),
          skipDuplicates: true,
        });
      }
    });

    // Invalidate Redis cache for all users assigned to this role
    const assignedUsers = await this.prisma.userRoleAssignment.findMany({
      where: { roleId },
      select: { userId: true },
    });

    for (const u of assignedUsers) {
      await this.redis.del(`user:permissions:${u.userId}`);
    }

    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });
  }

  /**
   * Retrieves all registered system permissions grouped by domain module.
   */
  async getAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { slug: "asc" }],
    });

    const grouped: Record<string, typeof permissions> = {};
    for (const perm of permissions) {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    }

    return {
      all: permissions,
      grouped,
    };
  }

  /**
   * Assigns a role to a user.
   */
  async assignRoleToUser(userId: string, roleId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      throw new NotFoundException("Role not found");
    }

    const assignment = await this.prisma.userRoleAssignment.upsert({
      where: {
        userId_roleId: { userId, roleId },
      },
      update: {},
      create: { userId, roleId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    // Invalidate user permission cache
    await this.redis.del(`user:permissions:${userId}`);

    return assignment;
  }

  /**
   * Removes a role from a user.
   */
  async removeRoleFromUser(userId: string, roleId: string) {
    try {
      await this.prisma.userRoleAssignment.delete({
        where: {
          userId_roleId: { userId, roleId },
        },
      });
    } catch {
      throw new NotFoundException("Role assignment not found for this user");
    }

    // Invalidate user permission cache
    await this.redis.del(`user:permissions:${userId}`);

    return { success: true, message: "Role successfully removed" };
  }

  /**
   * Retrieves all roles and effective permissions for a user.
   */
  async getUserRoles(userId: string) {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const permissions = new Set<string>();
    const roles = assignments.map((a) => {
      for (const rp of a.role.rolePermissions) {
        permissions.add(rp.permission.slug);
      }
      return {
        id: a.role.id,
        name: a.role.name,
        description: a.role.description,
        isSystemRole: a.role.isSystemRole,
      };
    });

    return {
      userId,
      roles,
      effectivePermissions: Array.from(permissions),
    };
  }
}
