import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrapApp, createMasterProduct, loginAs, uid } from "./helpers/e2e-app";

describe("Products & Master Catalog Configuration (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let pm: string;
  let student: string;
  const categoryIds: string[] = [];
  const brandIds: string[] = [];
  const productIds: string[] = [];
  const optionIds = { sizes: [] as string[], colors: [] as string[] };

  const api = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${pm}` });

  async function category(parentId?: string) {
    const tag = uid();
    const res = await api().post("/api/v1/categories").set(auth()).send({ name: `Cat ${tag}`, slug: `cat-${tag}`, parentId });
    if (res.body.id) categoryIds.push(res.body.id);
    return res;
  }

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    pm = await loginAs(app, "productManager");
    student = await loginAs(app, "student");
  });

  afterAll(async () => {
    await prisma.productVariant.deleteMany({ where: { masterProductId: { in: productIds } } });
    await prisma.masterProduct.deleteMany({ where: { id: { in: productIds } } });
    await prisma.brand.deleteMany({ where: { id: { in: brandIds } } });
    await prisma.size.deleteMany({ where: { id: { in: optionIds.sizes } } });
    await prisma.color.deleteMany({ where: { id: { in: optionIds.colors } } });
    for (const id of [...categoryIds].reverse()) await prisma.category.delete({ where: { id } }).catch(() => {});
    await app.close();
  });

  it("enforces max depth 3 and rejects circular parents", async () => {
    const root = await category();
    const child = await category(root.body.id);
    const sub = await category(child.body.id);
    expect(sub.status).toBe(201);
    expect((await category(sub.body.id)).status).toBe(400);

    const res = await api().put(`/api/v1/categories/${root.body.id}`).set(auth()).send({ parentId: sub.body.id }).expect(400);
    expect(res.body.message).toMatch(/circular/i);
  });

  it("brands: CRUD, 409 on delete with attached products, deactivate instead", async () => {
    const tag = uid();
    const brand = await api()
      .post("/api/v1/admin/catalog/brands")
      .set(auth())
      .send({ name: `Brand ${tag}`, slug: `brand-${tag}` })
      .expect(201);
    brandIds.push(brand.body.id);
    await api().post("/api/v1/admin/catalog/brands").set(auth()).send({ name: "Dup", slug: `brand-${tag}` }).expect(409);

    const product = await createMasterProduct(prisma);
    productIds.push(product.id);
    await prisma.masterProduct.update({ where: { id: product.id }, data: { brandId: brand.body.id } });

    await api().delete(`/api/v1/admin/catalog/brands/${brand.body.id}`).set(auth()).expect(409);
    const deactivated = await api()
      .put(`/api/v1/admin/catalog/brands/${brand.body.id}`)
      .set(auth())
      .send({ isActive: false })
      .expect(200);
    expect(deactivated.body.isActive).toBe(false);

    const list = await api().get("/api/v1/admin/catalog/brands").set(auth()).expect(200);
    expect(list.body.find((b: any) => b.id === brand.body.id)).toMatchObject({ productsCount: 1 });
  });

  it("generates a 3x2 variant matrix with unique SKUs and EAN-13 barcodes, idempotently", async () => {
    const tag = uid().toUpperCase();
    const sizes = await Promise.all(
      ["S", "M", "L"].map((c) =>
        api().post("/api/v1/admin/catalog/sizes").set(auth()).send({ name: `${c}-${tag}`, code: `${c}${tag}` }).expect(201),
      ),
    );
    const colors = await Promise.all(
      ["RD", "BL"].map((c) =>
        api()
          .post("/api/v1/admin/catalog/colors")
          .set(auth())
          .send({ name: `${c}-${tag}`, code: `${c}${tag}`, hexCode: "#112233" })
          .expect(201),
      ),
    );
    optionIds.sizes.push(...sizes.map((s) => s.body.id));
    optionIds.colors.push(...colors.map((c) => c.body.id));
    await api().post("/api/v1/admin/catalog/colors").set(auth()).send({ name: "Bad", code: `X${tag}`, hexCode: "blue" }).expect(400);

    const product = await createMasterProduct(prisma);
    productIds.push(product.id);
    const body = { sizeIds: optionIds.sizes, colorIds: optionIds.colors };

    const res = await api()
      .post(`/api/v1/admin/catalog/products/${product.id}/variants/generate`)
      .set(auth())
      .send(body)
      .expect(201);
    expect(res.body.created).toBe(6);
    const skus = res.body.variants.map((v: any) => v.sku);
    const barcodes = res.body.variants.map((v: any) => v.barcode);
    expect(new Set(skus).size).toBe(6);
    expect(new Set(barcodes).size).toBe(6);
    for (const code of barcodes) {
      expect(code).toMatch(/^\d{13}$/);
    }

    const again = await api()
      .post(`/api/v1/admin/catalog/products/${product.id}/variants/generate`)
      .set(auth())
      .send(body)
      .expect(201);
    expect(again.body.created).toBe(0);

    const list = await api().get(`/api/v1/admin/catalog/products/${product.id}/variants`).set(auth()).expect(200);
    expect(list.body).toHaveLength(6);
  });

  it("taxonomy management is forbidden for students", async () => {
    await api().post("/api/v1/admin/catalog/brands").set("Authorization", `Bearer ${student}`).send({}).expect(403);
  });
});
