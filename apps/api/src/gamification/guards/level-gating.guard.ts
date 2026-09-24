import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { MIN_LEVEL_KEY } from "./min-level.decorator";
import { CAREER_LEVELS } from "../gamification.types";

@Injectable()
export class LevelGatingGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const minLevel = this.reflector.getAllAndOverride<number>(MIN_LEVEL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!minLevel) {
      return true; // No gating required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Admins bypass level gating
    if (["SUPER_ADMIN", "INSTITUTE_ADMIN"].includes(user.role)) {
      return true;
    }

    const studentLevel = await this.prisma.studentLevel.findUnique({
      where: { studentId: user.id },
    });

    const currentLevel = studentLevel?.currentLevel || 1;

    if (currentLevel < minLevel) {
      const requiredTier =
        CAREER_LEVELS.find((t) => t.level === minLevel) || CAREER_LEVELS[minLevel - 1];
      throw new ForbiddenException(
        `Feature locked. Requires Level ${minLevel} (${requiredTier.title}) or higher. Your current level is Level ${currentLevel} (${studentLevel?.levelTitle || "Store Starter"}).`,
      );
    }

    return true;
  }
}
