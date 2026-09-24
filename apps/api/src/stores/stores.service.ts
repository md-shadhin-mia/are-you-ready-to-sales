import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import {
  CreateStoreDto,
  UpdateBrandingDto,
  UpdateThemeDto,
} from "./dto/store.dto";
import { StoreStatus } from "@repo/db";

const RESERVED_SLUGS = [
  "admin",
  "api",
  "app",
  "auth",
  "dashboard",
  "mail",
  "static",
  "support",
  "www",
  "platform",
];

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getMyStore(userId: string) {
    const store = await this.prisma.store.findFirst({
      where: { studentId: userId },
      include: {
        _count: {
          select: {
            storeProducts: true,
            orders: true,
            customers: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException("Student does not have an active store yet");
    }

    return store;
  }

  async checkSlug(slug: string) {
    if (!slug || typeof slug !== "string") {
      throw new BadRequestException("Slug parameter is required");
    }

    const cleanSlug = slug.trim().toLowerCase();
    const slugRegex = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/;
    if (!slugRegex.test(cleanSlug)) {
      return {
        slug: cleanSlug,
        available: false,
        reason:
          "Slug must be 3-30 lowercase alphanumeric characters and hyphens, cannot start or end with a hyphen",
      };
    }

    if (RESERVED_SLUGS.includes(cleanSlug)) {
      return {
        slug: cleanSlug,
        available: false,
        reason: "This subdomain name is reserved by the platform",
      };
    }

    const existing = await this.prisma.store.findUnique({
      where: { slug: cleanSlug },
      select: { id: true },
    });

    return {
      slug: cleanSlug,
      available: !existing,
      reason: existing ? "Subdomain slug is already taken" : null,
    };
  }

  async createStore(userId: string, dto: CreateStoreDto) {
    const existingForStudent = await this.prisma.store.findFirst({
      where: { studentId: userId },
    });
    if (existingForStudent) {
      throw new ConflictException("You already have an active store");
    }

    const slugCheck = await this.checkSlug(dto.slug);
    if (!slugCheck.available) {
      throw new ConflictException(slugCheck.reason || "Slug is not available");
    }

    const store = await this.prisma.store.create({
      data: {
        studentId: userId,
        storeName: dto.storeName,
        slug: dto.slug.toLowerCase().trim(),
        themeConfig: dto.themeConfig ?? {
          primaryColor: "#2563eb",
          secondaryColor: "#1e293b",
          fontFamily: "Inter",
          borderRadius: "0.5rem",
        },
        brandingInfo: dto.brandingInfo ?? {
          tagline: `Welcome to ${dto.storeName}`,
        },
        status: StoreStatus.DRAFT,
      },
    });

    return store;
  }

  async updateBranding(userId: string, dto: UpdateBrandingDto) {
    const store = await this.getMyStore(userId);

    const updated = await this.prisma.store.update({
      where: { id: store.id },
      data: {
        ...(dto.storeName && { storeName: dto.storeName }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.faviconUrl !== undefined && { faviconUrl: dto.faviconUrl }),
        ...(dto.brandingInfo && { brandingInfo: dto.brandingInfo }),
      },
    });

    await this.redis.del(`tenant:slug:${store.slug}`);
    return updated;
  }

  async updateTheme(userId: string, dto: UpdateThemeDto) {
    const store = await this.getMyStore(userId);

    const updated = await this.prisma.store.update({
      where: { id: store.id },
      data: {
        themeConfig: dto.themeConfig,
      },
    });

    await this.redis.del(`tenant:slug:${store.slug}`);
    return updated;
  }

  async updateStatus(userId: string, status: StoreStatus) {
    const store = await this.getMyStore(userId);

    if (status === StoreStatus.ACTIVE) {
      const activeProductsCount = await this.prisma.storeProduct.count({
        where: {
          storeId: store.id,
          isVisible: true,
        },
      });

      if (activeProductsCount < 1) {
        throw new BadRequestException(
          "Cannot publish store: You must import at least 1 product from the master catalog before going live",
        );
      }
    }

    const updated = await this.prisma.store.update({
      where: { id: store.id },
      data: { status },
    });

    await this.redis.del(`tenant:slug:${store.slug}`);
    return updated;
  }
}
