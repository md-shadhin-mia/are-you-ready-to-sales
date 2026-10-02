import { describe, it, expect, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { sanitizeHtml } from "./html-sanitizer";
import { BannersService, isBannerLive } from "./banners.service";
import { UpdateAboutDto } from "./cms.dto";

describe("CMS (Unit)", () => {
  describe("sanitizeHtml()", () => {
    it("strips <script> tags before storage", () => {
      const clean = sanitizeHtml("<p>Hello</p><script>alert('xss')</script>");
      expect(clean).toBe("<p>Hello</p>");
    });

    it("strips iframes and inline event handlers", () => {
      const clean = sanitizeHtml(
        `<iframe src="https://evil.example"></iframe><img src="x.png" onerror="alert(1)"><a href="javascript:alert(1)">x</a>`,
      );
      expect(clean).not.toMatch(/iframe|onerror|javascript:/i);
      expect(clean).toContain('<img src="x.png">');
    });

    it("keeps safe editorial markup", () => {
      const html = '<h2>Returns</h2><ul><li><strong>7 days</strong></li></ul><a href="https://example.com">Policy</a>';
      expect(sanitizeHtml(html)).toBe(html);
    });
  });

  describe("banners", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const banner = (start: string, end: string, isActive = true) => ({ isActive, startDate: new Date(start), endDate: new Date(end) });

    it("is live only when active and NOW() is between start and end", () => {
      expect(isBannerLive(banner("2026-06-01", "2026-06-30"), now)).toBe(true);
      expect(isBannerLive(banner("2026-06-01", "2026-06-30", false), now)).toBe(false);
      expect(isBannerLive(banner("2026-07-01", "2026-07-30"), now)).toBe(false);
      expect(isBannerLive(banner("2026-05-01", "2026-06-01"), now)).toBe(false);
    });

    it("reorders atomically with gap-free positions and rejects partial orderings", async () => {
      const prisma: any = {
        platformBanner: { findMany: vi.fn().mockResolvedValue([{ id: "a" }, { id: "b" }, { id: "c" }]), update: vi.fn() },
        $transaction: vi.fn(async (ops: any) => (Array.isArray(ops) ? Promise.all(ops) : ops(prisma))),
      };
      const service = new BannersService(prisma);
      await expect(service.reorder(["a", "b"])).rejects.toBeInstanceOf(BadRequestException);

      await service.reorder(["c", "a", "b"]);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.platformBanner.update.mock.calls.map(([args]: any) => [args.where.id, args.data.sortOrder])).toEqual([
        ["c", 1],
        ["a", 2],
        ["b", 3],
      ]);
    });
  });

  describe("About Us leadership payload", () => {
    const check = (member: Record<string, unknown>) =>
      validate(plainToInstance(UpdateAboutDto, { headline: "H", story: "S", leadershipTeam: [member] }));

    it("accepts a complete member with RFC 3986 URLs", async () => {
      const errors = await check({
        name: "Ayesha Rahman",
        role: "CEO",
        photoUrl: "https://cdn.example.com/ayesha.jpg",
        bio: "Founder",
        linkedInUrl: "https://www.linkedin.com/in/ayesha",
      });
      expect(errors).toHaveLength(0);
    });

    it("rejects malformed URLs and missing fields", async () => {
      const errors = await check({ name: "X", role: "CTO", photoUrl: "not a url", bio: "b", linkedInUrl: "ftp//broken" });
      expect(errors.length).toBeGreaterThan(0);
      expect(await check({ name: "X" })).not.toHaveLength(0);
    });
  });
});
