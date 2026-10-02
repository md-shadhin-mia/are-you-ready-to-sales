import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapApp, loginAs, uid } from "./helpers/e2e-app";

describe("Site Settings, CMS, About, Banners & FAQ (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdmin: string;
  let institute: string;
  let originalSettings: any;
  let originalAbout: any;
  const pageIds: string[] = [];
  const bannerIds: string[] = [];
  const faqIds: string[] = [];

  const api = () => request(app.getHttpServer());
  const su = () => ({ Authorization: `Bearer ${superAdmin}` });
  const day = 86_400_000;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    superAdmin = await loginAs(app, "superAdmin");
    institute = await loginAs(app, "instituteAdmin");
    originalSettings = await prisma.siteSetting.findUnique({ where: { id: "singleton" } });
    originalAbout = await prisma.aboutContent.findUnique({ where: { id: "singleton" } });
  });

  afterAll(async () => {
    if (originalSettings) {
      const { id, updatedAt, ...rest } = originalSettings;
      await prisma.siteSetting.update({ where: { id }, data: rest });
    }
    if (originalAbout) {
      const { id, updatedAt, ...rest } = originalAbout;
      await prisma.aboutContent.update({ where: { id }, data: rest });
    }
    await prisma.cmsPage.deleteMany({ where: { id: { in: pageIds } } });
    await prisma.platformBanner.deleteMany({ where: { id: { in: bannerIds } } });
    await prisma.faq.deleteMany({ where: { id: { in: faqIds } } });
    await app.close();
  });

  it("general settings are a singleton; API credentials and webhooks are write-only", async () => {
    const res = await api()
      .put("/api/v1/admin/cms/settings")
      .set(su())
      .send({ siteName: "Ready To Sell", apiSecrets: { smsGatewayKey: "sms-secret-777" }, webhooks: { orderCreated: "https://hooks.example.com/o" } })
      .expect(200);
    expect(res.body).toMatchObject({ siteName: "Ready To Sell", apiSecretKeys: ["smsGatewayKey"], webhookKeys: ["orderCreated"] });
    expect(JSON.stringify(res.body)).not.toContain("sms-secret-777");
    expect(await prisma.siteSetting.count()).toBe(1);

    const pub = await api().get("/api/v1/public/settings").expect(200);
    expect(pub.body.siteName).toBe("Ready To Sell");
    expect(JSON.stringify(pub.body)).not.toMatch(/secret|webhook|encrypted/i);

    await api().put("/api/v1/admin/cms/settings").set("Authorization", `Bearer ${institute}`).send({ siteName: "x" }).expect(403);
  });

  it("pages: HTML is sanitized on ingestion and only published pages are public", async () => {
    const slug = `terms-${uid()}`;
    const created = await api()
      .post("/api/v1/admin/cms/pages")
      .set(su())
      .send({ slug, title: "Terms", contentHtml: "<h1>Terms</h1><script>alert('xss')</script><img src=x onerror=alert(1)>" })
      .expect(201);
    pageIds.push(created.body.id);
    expect(created.body.contentHtml).toBe('<h1>Terms</h1><img src="x">');

    await api().get(`/api/v1/public/pages/${slug}`).expect(404);
    await api().put(`/api/v1/admin/cms/pages/${created.body.id}`).set(su()).send({ isPublished: true }).expect(200);
    const pub = await api().get(`/api/v1/public/pages/${slug}`).expect(200);
    expect(pub.body.title).toBe("Terms");
  });

  it("about us validates the leadership payload", async () => {
    await api()
      .put("/api/v1/admin/cms/about")
      .set(su())
      .send({ headline: "H", story: "S", leadershipTeam: [{ name: "A", role: "CEO", photoUrl: "nope", bio: "b", linkedInUrl: "nope" }] })
      .expect(400);
    const leader = { name: "Ayesha", role: "CEO", photoUrl: "https://cdn.example.com/a.jpg", bio: "Founder", linkedInUrl: "https://linkedin.com/in/a" };
    await api().put("/api/v1/admin/cms/about").set(su()).send({ headline: "About us", story: "Our story", leadershipTeam: [leader] }).expect(200);
    const pub = await api().get("/api/v1/public/about").expect(200);
    expect(pub.body.leadershipTeam).toEqual([leader]);
  });

  it("banners: only live campaigns are delivered and reordering is gap-free", async () => {
    const make = (start: number, end: number, isActive = true) =>
      api()
        .post("/api/v1/admin/cms/banners")
        .set(su())
        .send({
          title: `Banner ${uid()}`,
          imageUrl: "https://cdn.example.com/b.jpg",
          startDate: new Date(Date.now() + start * day).toISOString(),
          endDate: new Date(Date.now() + end * day).toISOString(),
          isActive,
        })
        .expect(201);
    const live = await make(-1, 5);
    const future = await make(3, 9);
    const disabled = await make(-1, 5, false);
    bannerIds.push(live.body.id, future.body.id, disabled.body.id);

    const pub = await api().get("/api/v1/public/banners").expect(200);
    const ids = pub.body.map((b: any) => b.id);
    expect(ids).toContain(live.body.id);
    expect(ids).not.toContain(future.body.id);
    expect(ids).not.toContain(disabled.body.id);

    const all = await api().get("/api/v1/admin/cms/banners").set(su()).expect(200);
    const order = all.body.map((b: any) => b.id).reverse();
    const reordered = await api().put("/api/v1/admin/cms/banners/reorder").set(su()).send({ orderedIds: order }).expect(200);
    expect(reordered.body.map((b: any) => b.sortOrder)).toEqual(order.map((_: string, i: number) => i + 1));
    await api().put("/api/v1/admin/cms/banners/reorder").set(su()).send({ orderedIds: order.slice(1) }).expect(400);
  });

  it("FAQ full-text search ranks matching entries", async () => {
    const token = `zorbify${uid().replace(/\d/g, "")}`;
    const hit = await api()
      .post("/api/v1/admin/cms/faqs")
      .set(su())
      .send({ question: `How do I ${token} my payout?`, answer: "Open the wallet and request a withdrawal.", category: "Payments" })
      .expect(201);
    const miss = await api()
      .post("/api/v1/admin/cms/faqs")
      .set(su())
      .send({ question: "How long is delivery?", answer: "Two to three days inside Dhaka.", category: "Shipping" })
      .expect(201);
    faqIds.push(hit.body.id, miss.body.id);

    const res = await api().get("/api/v1/public/faqs").query({ q: token }).expect(200);
    expect(res.body.map((f: any) => f.id)).toEqual([hit.body.id]);
  });
});
