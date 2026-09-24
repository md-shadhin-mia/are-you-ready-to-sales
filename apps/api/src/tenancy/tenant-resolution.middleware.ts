import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
} from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { TenantContext } from "./tenant-context";
import { StoreStatus } from "@repo/db";

export interface RequestWithTenant extends Request {
  tenant?: any;
}

@Injectable()
export class TenantResolutionMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    private readonly tenantContext: TenantContext,
  ) {}

  async use(req: RequestWithTenant, res: Response, next: NextFunction) {
    let slug: string | undefined;

    // 1. Check direct header (for API / mobile / testing)
    const headerSlug = req.headers["x-tenant-slug"];
    if (typeof headerSlug === "string" && headerSlug.trim().length > 0) {
      slug = headerSlug.trim().toLowerCase();
    }

    // 2. Parse Host header if no explicit header
    if (!slug) {
      const host = req.headers["host"]?.split(":")[0]?.toLowerCase();
      const platformDomain = this.configService
        .get<string>("PLATFORM_DOMAIN", "platform.local")
        .toLowerCase();

      if (host && host.endsWith(platformDomain)) {
        const parts = host.replace(`.${platformDomain}`, "").split(".");
        if (parts.length === 1 && parts[0] !== "admin" && parts[0] !== "api") {
          slug = parts[0];
        }
      }
    }

    if (slug) {
      const cacheKey = `tenant:slug:${slug}`;
      let storeJson = await this.redis.get(cacheKey);
      let store: any = null;

      if (storeJson) {
        store = JSON.parse(storeJson);
      } else {
        store = await this.prisma.store.findUnique({
          where: { slug },
        });

        if (store) {
          await this.redis.set(cacheKey, JSON.stringify(store), 300);
        }
      }

      if (store) {
        if (store.status === StoreStatus.SUSPENDED) {
          throw new ForbiddenException("This store has been suspended");
        }

        req.tenant = store;
        this.tenantContext.setTenant(store);
      }
    }

    next();
  }
}
