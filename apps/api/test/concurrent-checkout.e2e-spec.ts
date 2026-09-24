import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { StoreStatus } from "@repo/db";

describe("Concurrent Checkout & Inventory Locking (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testStoreSlug = `concurrent-shop-${Date.now()}`;
  const testSku = `CONCUR-SKU-${Date.now()}`;
  let storeId: string;
  let masterProductId: string;
  let storeProductId: string;
  let categoryId: string;
  let studentUserId: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    // Fetch existing student user
    const student = await prisma.user.findFirst({
      where: { email: "student1@platform.local" },
    });
    studentUserId = student!.id;

    // Create a test active store
    const store = await prisma.store.create({
      data: {
        studentId: studentUserId,
        storeName: "Concurrent Test Shop",
        slug: testStoreSlug,
        status: StoreStatus.ACTIVE,
      },
    });
    storeId = store.id;

    // Create category
    const cat = await prisma.category.create({
      data: {
        name: `Concur Cat ${Date.now()}`,
        slug: `concur-cat-${Date.now()}`,
      },
    });
    categoryId = cat.id;

    // Create MasterProduct with strictly 3 items in stock
    const mp = await prisma.masterProduct.create({
      data: {
        sku: testSku,
        title: "Limited Edition Smartwatch",
        categoryId: cat.id,
        basePrice: 1000,
        masterDescription: "Limited Edition Smartwatch Description",
        stockQuantity: 3,
        isActive: true,
      },
    });
    masterProductId = mp.id;

    // Reseller product
    const sp = await prisma.storeProduct.create({
      data: {
        storeId: store.id,
        masterProductId: mp.id,
        sellingPrice: 1500,
        isVisible: true,
      },
    });
    storeProductId = sp.id;
  });

  afterAll(async () => {
    // Cleanup in order of foreign key constraints
    await prisma.ledgerEntry.deleteMany({ where: { storeId } });
    await prisma.orderItem.deleteMany({
      where: { order: { storeId } },
    });
    await prisma.order.deleteMany({ where: { storeId } });
    await prisma.customer.deleteMany({ where: { storeId } });
    await prisma.storeProduct.deleteMany({ where: { storeId } });
    await prisma.masterProduct.deleteMany({ where: { id: masterProductId } });
    await prisma.store.deleteMany({ where: { id: storeId } });
    if (categoryId) {
      await prisma.category.deleteMany({ where: { id: categoryId } });
    }
    await app.close();
  });

  it("should handle 10 concurrent checkouts for 3 stock units: exactly 3 succeed and 7 fail with 409", async () => {
    const totalRequests = 10;
    const checkoutPromises: Promise<request.Response>[] = [];

    for (let i = 0; i < totalRequests; i++) {
      const p = request(app.getHttpServer())
        .post(`/api/v1/stores/${testStoreSlug}/checkout`)
        .send({
          customerName: `Buyer ${i}`,
          customerPhone: `0171100000${i}`,
          customerEmail: `buyer${i}@example.com`,
          shippingAddress: {
            recipientName: `Buyer ${i}`,
            phone: `0171100000${i}`,
            addressLine: `Banani Road ${i}`,
            city: "Dhaka",
            district: "Dhaka",
            isInsideDhaka: true,
          },
          items: [
            {
              storeProductId,
              quantity: 1,
            },
          ],
          paymentMethod: "COD",
        });

      checkoutPromises.push(p);
    }

    // Fire all 10 requests concurrently
    const responses = await Promise.all(checkoutPromises);

    const successful = responses.filter((r) => r.status === 201);
    const conflicts = responses.filter((r) => r.status === 409);

    expect(successful.length).toBe(3);
    expect(conflicts.length).toBe(7);

    // Verify error message on conflicts
    for (const conflict of conflicts) {
      expect(conflict.body.message).toContain("Insufficient stock");
    }

    // Verify remaining inventory in database is strictly 0
    const finalMasterProduct = await prisma.masterProduct.findUnique({
      where: { id: masterProductId },
    });

    expect(finalMasterProduct).toBeDefined();
    expect(finalMasterProduct!.stockQuantity).toBe(0);
  });
});
