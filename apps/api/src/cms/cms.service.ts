import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { SiteSetting } from "@repo/db";
import { PrismaService } from "../prisma/prisma.service";
import { SecretCipherService } from "../common/secret-cipher.service";
import { sanitizeHtml } from "./html-sanitizer";
import { CreateFaqDto, CreatePageDto, UpdateAboutDto, UpdateFaqDto, UpdatePageDto, UpdateSiteSettingsDto } from "./cms.dto";

const SINGLETON = "singleton";

@Injectable()
export class CmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: SecretCipherService,
  ) {}

  // ----- General settings (singleton) -----

  private keysOf(envelope: string | null) {
    return envelope ? Object.keys(this.cipher.decryptJson(envelope)).sort() : [];
  }

  private presentSettings(settings: SiteSetting) {
    const { encryptedApiSecrets, encryptedWebhooks, ...visible } = settings;
    return { ...visible, apiSecretKeys: this.keysOf(encryptedApiSecrets), webhookKeys: this.keysOf(encryptedWebhooks) };
  }

  private async loadSettings() {
    const settings = await this.prisma.siteSetting.findUnique({ where: { id: SINGLETON } });
    if (!settings) throw new NotFoundException("Site settings have not been initialized");
    return settings;
  }

  async getSettings() {
    return this.presentSettings(await this.loadSettings());
  }

  async getPublicSettings() {
    const { siteName, tagline, logoUrl, faviconUrl, supportEmail, supportPhone, address, socialLinks } =
      await this.loadSettings();
    return { siteName, tagline, logoUrl, faviconUrl, supportEmail, supportPhone, address, socialLinks };
  }

  async updateSettings(dto: UpdateSiteSettingsDto) {
    const { apiSecrets, webhooks, ...fields } = dto;
    const data = {
      ...fields,
      ...(apiSecrets ? { encryptedApiSecrets: this.cipher.encryptJson(apiSecrets) } : {}),
      ...(webhooks ? { encryptedWebhooks: this.cipher.encryptJson(webhooks) } : {}),
    };
    const settings = await this.prisma.siteSetting.upsert({
      where: { id: SINGLETON },
      create: { siteName: fields.siteName ?? "Platform", ...data },
      update: data,
    });
    return this.presentSettings(settings);
  }

  // ----- Static pages -----

  listPages() {
    return this.prisma.cmsPage.findMany({ orderBy: { title: "asc" } });
  }

  async createPage(dto: CreatePageDto) {
    if (await this.prisma.cmsPage.findUnique({ where: { slug: dto.slug } })) {
      throw new ConflictException(`Page "${dto.slug}" already exists`);
    }
    return this.prisma.cmsPage.create({ data: { ...dto, contentHtml: sanitizeHtml(dto.contentHtml) } });
  }

  async updatePage(id: string, dto: UpdatePageDto) {
    if (!(await this.prisma.cmsPage.findUnique({ where: { id } }))) throw new NotFoundException("Page not found");
    return this.prisma.cmsPage.update({
      where: { id },
      data: { ...dto, ...(dto.contentHtml !== undefined ? { contentHtml: sanitizeHtml(dto.contentHtml) } : {}) },
    });
  }

  async deletePage(id: string) {
    if (!(await this.prisma.cmsPage.findUnique({ where: { id } }))) throw new NotFoundException("Page not found");
    await this.prisma.cmsPage.delete({ where: { id } });
    return { id, deleted: true };
  }

  async getPublishedPage(slug: string) {
    const page = await this.prisma.cmsPage.findFirst({
      where: { slug, isPublished: true },
      select: { slug: true, title: true, contentHtml: true, metaDescription: true, updatedAt: true },
    });
    if (!page) throw new NotFoundException("Page not found");
    return page;
  }

  // ----- About Us (singleton) -----

  async getAbout() {
    const about = await this.prisma.aboutContent.findUnique({ where: { id: SINGLETON } });
    if (!about) throw new NotFoundException("About content has not been published");
    return about;
  }

  updateAbout(dto: UpdateAboutDto) {
    const data = { ...dto, leadershipTeam: dto.leadershipTeam.map((l) => ({ ...l })) };
    return this.prisma.aboutContent.upsert({ where: { id: SINGLETON }, create: data, update: data });
  }

  // ----- FAQ -----

  listFaqs() {
    return this.prisma.faq.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  }

  /** Full-text search over question + answer backed by the faqs_search_idx GIN index. */
  async searchFaqs(q?: string) {
    const query = q?.trim();
    if (!query) {
      return this.prisma.faq.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, question: true, answer: true, category: true },
      });
    }
    return this.prisma.$queryRaw<Array<{ id: string; question: string; answer: string; category: string | null }>>`
      SELECT id, question, answer, category
      FROM faqs
      WHERE is_active = true
        AND to_tsvector('english', question || ' ' || answer) @@ plainto_tsquery('english', ${query})
      ORDER BY ts_rank(to_tsvector('english', question || ' ' || answer), plainto_tsquery('english', ${query})) DESC, sort_order ASC
      LIMIT 50
    `;
  }

  createFaq(dto: CreateFaqDto) {
    return this.prisma.faq.create({ data: dto });
  }

  async updateFaq(id: string, dto: UpdateFaqDto) {
    if (!(await this.prisma.faq.findUnique({ where: { id } }))) throw new NotFoundException("FAQ not found");
    return this.prisma.faq.update({ where: { id }, data: dto });
  }

  async deleteFaq(id: string) {
    if (!(await this.prisma.faq.findUnique({ where: { id } }))) throw new NotFoundException("FAQ not found");
    await this.prisma.faq.delete({ where: { id } });
    return { id, deleted: true };
  }
}
