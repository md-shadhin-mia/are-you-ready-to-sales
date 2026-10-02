import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBannerDto, UpdateBannerDto } from "./cms.dto";

export function isBannerLive(banner: { isActive: boolean; startDate: Date; endDate: Date }, now = new Date()) {
  return banner.isActive && banner.startDate <= now && now <= banner.endDate;
}

@Injectable()
export class BannersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.platformBanner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  }

  /** Storefront delivery: active banners whose campaign window contains NOW(). */
  listLive(placement?: string) {
    const now = new Date();
    return this.prisma.platformBanner.findMany({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now }, ...(placement ? { placement } : {}) },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true, subtitle: true, imageUrl: true, linkUrl: true, placement: true, sortOrder: true },
    });
  }

  private assertWindow(start: Date, end: Date) {
    if (end <= start) throw new BadRequestException("endDate must be after startDate");
  }

  async create(dto: CreateBannerDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    this.assertWindow(startDate, endDate);
    const last = await this.prisma.platformBanner.aggregate({ _max: { sortOrder: true } });
    return this.prisma.platformBanner.create({
      data: { ...dto, startDate, endDate, sortOrder: (last._max.sortOrder ?? 0) + 1 },
    });
  }

  async update(id: string, dto: UpdateBannerDto) {
    const banner = await this.prisma.platformBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException("Banner not found");
    const startDate = dto.startDate ? new Date(dto.startDate) : banner.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : banner.endDate;
    this.assertWindow(startDate, endDate);
    return this.prisma.platformBanner.update({ where: { id }, data: { ...dto, startDate, endDate } });
  }

  async remove(id: string) {
    const banner = await this.prisma.platformBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException("Banner not found");
    await this.prisma.platformBanner.delete({ where: { id } });
    const remaining = await this.list();
    await this.reorder(remaining.map((b) => b.id));
    return { id, deleted: true };
  }

  /** Reassigns positions 1..n in one transaction; the ordering must list every banner exactly once. */
  async reorder(orderedIds: string[]) {
    const existing = await this.prisma.platformBanner.findMany({ select: { id: true } });
    const known = new Set(existing.map((b) => b.id));
    const unique = new Set(orderedIds);
    if (unique.size !== orderedIds.length || unique.size !== known.size || orderedIds.some((id) => !known.has(id))) {
      throw new BadRequestException("orderedIds must contain every banner exactly once");
    }
    await this.prisma.$transaction(
      orderedIds.map((id, index) => this.prisma.platformBanner.update({ where: { id }, data: { sortOrder: index + 1 } })),
    );
    return this.list();
  }
}
