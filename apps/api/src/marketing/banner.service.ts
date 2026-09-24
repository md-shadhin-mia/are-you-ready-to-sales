import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateBannerDto } from "./dto/marketing.dto";

@Injectable()
export class BannerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Update student store announcement banner
   */
  async updateBanner(studentId: string, dto: UpdateBannerDto) {
    const store = await this.prisma.store.findFirst({
      where: { studentId },
    });

    if (!store) {
      throw new NotFoundException("Student store not found.");
    }

    return this.prisma.store.update({
      where: { id: store.id },
      data: {
        ...(dto.bannerText !== undefined ? { bannerText: dto.bannerText } : {}),
        ...(dto.bannerLink !== undefined ? { bannerLink: dto.bannerLink } : {}),
        ...(dto.bannerBgColor !== undefined ? { bannerBgColor: dto.bannerBgColor } : {}),
        ...(dto.bannerActive !== undefined ? { bannerActive: dto.bannerActive } : {}),
      },
      select: {
        id: true,
        slug: true,
        bannerText: true,
        bannerLink: true,
        bannerBgColor: true,
        bannerActive: true,
      },
    });
  }

  /**
   * Public: Get store announcement banner
   */
  async getStoreBanner(storeSlug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug },
      select: {
        bannerText: true,
        bannerLink: true,
        bannerBgColor: true,
        bannerActive: true,
      },
    });

    if (!store) {
      throw new NotFoundException(`Store "${storeSlug}" not found.`);
    }

    return store;
  }
}
