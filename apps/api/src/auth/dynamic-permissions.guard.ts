import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@repo/db";
import { ROLES_KEY } from "./roles.decorator";
import { PERMISSIONS_KEY } from "./permissions.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class DynamicPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permission or role is required, allow access
    if (
      (!requiredPermissions || requiredPermissions.length === 0) &&
      (!requiredRoles || requiredRoles.length === 0)
    ) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    // Super Admin has universal access
    if (user.role === UserRole.SUPER_ADMIN || user.role === "SUPER_ADMIN") {
      return true;
    }

    // 1. Evaluate Legacy Roles if specified
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(user.role);
      // If endpoint only requires roles and no specific permissions, check role
      if (!requiredPermissions || requiredPermissions.length === 0) {
        if (!hasRole) {
          throw new ForbiddenException(
            `Access denied. Required roles: [${requiredRoles.join(", ")}]. Current role: ${user.role}`,
          );
        }
        return true;
      }
    }

    // 2. Evaluate Dynamic Permissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = await this.resolveUserPermissions(user.id, user.role);

      if (userPermissions.includes("*")) {
        return true;
      }

      for (const reqPerm of requiredPermissions) {
        const hasPermission = this.checkPermissionMatch(reqPerm, userPermissions);
        if (!hasPermission) {
          throw new ForbiddenException(
            `Insufficient permissions: ${reqPerm} required`,
          );
        }
      }
    }

    return true;
  }

  /**
   * Resolves all granted permission slugs for a user, using Redis cache if available.
   */
  async resolveUserPermissions(userId: string, legacyRole?: string): Promise<string[]> {
    const cacheKey = `user:permissions:${userId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // invalid cache, re-fetch
      }
    }

    const permissionsSet = new Set<string>();

    // 1. Query role assignments
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    for (const assignment of assignments) {
      for (const rp of assignment.role.rolePermissions) {
        if (rp.permission?.slug) {
          permissionsSet.add(rp.permission.slug);
        }
      }
    }

    // 2. Fallback to system role matching user's legacy enum if no explicit assignments exist
    if (permissionsSet.size === 0 && legacyRole) {
      const systemRole = await this.prisma.role.findFirst({
        where: { name: legacyRole },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (systemRole) {
        for (const rp of systemRole.rolePermissions) {
          if (rp.permission?.slug) {
            permissionsSet.add(rp.permission.slug);
          }
        }
      }
    }

    const permissions = Array.from(permissionsSet);
    // Cache for 10 minutes (600s)
    await this.redis.set(cacheKey, JSON.stringify(permissions), 600);

    return permissions;
  }

  /**
   * Evaluates if a required permission is covered by user permissions, including wildcards.
   */
  private checkPermissionMatch(required: string, userPerms: string[]): boolean {
    if (userPerms.includes("*")) {
      return true;
    }
    if (userPerms.includes(required)) {
      return true;
    }

    const parts = required.split(":");
    if (parts.length === 2) {
      const moduleWildcard = `${parts[0]}:*`;
      if (userPerms.includes(moduleWildcard)) {
        return true;
      }
    }

    return false;
  }
}
