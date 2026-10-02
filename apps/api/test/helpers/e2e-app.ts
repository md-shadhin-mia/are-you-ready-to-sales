import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { randomUUID } from "crypto";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/prisma/prisma.service";
import { PasswordService } from "../../src/auth/password.service";
import { UserRole } from "@repo/db";

export const SEED_PASSWORD = "Password123!";

export const PERSONAS = {
  superAdmin: "admin@platform.local",
  instituteAdmin: "institute@platform.local",
  productManager: "manager@platform.local",
  orderManager: "ordermanager@platform.local",
  branchManager: "branchmanager@platform.local",
  supportAgent: "support@platform.local",
  seller: "seller@platform.local",
  student: "student1@platform.local",
} as const;

export type Persona = keyof typeof PERSONAS;

export async function bootstrapApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ rawBody: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

export async function loginAs(app: INestApplication, persona: Persona): Promise<string> {
  const res = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send({ email: PERSONAS[persona], password: SEED_PASSWORD });
  if (!res.body.accessToken) {
    throw new Error(`Login failed for ${persona}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.accessToken;
}

/** Short unique suffix so parallel suites never collide on unique columns. */
export function uid(): string {
  return randomUUID().slice(0, 8);
}

let cachedPasswordHash: Promise<string> | undefined;

export async function createUser(
  app: INestApplication,
  overrides: Partial<{ role: UserRole; fullName: string; phone: string; nationalId: string; isVerified: boolean }> = {},
) {
  const prisma = app.get(PrismaService);
  cachedPasswordHash ??= app.get(PasswordService).hash(SEED_PASSWORD);
  const passwordHash = await cachedPasswordHash;
  const tag = uid();
  return prisma.user.create({
    data: {
      email: `e2e-${tag}@platform.test`,
      fullName: overrides.fullName ?? `E2E User ${tag}`,
      phone: overrides.phone ?? `+880170${Math.floor(1000000 + Math.random() * 8999999)}`,
      role: overrides.role ?? UserRole.STUDENT,
      nationalId: overrides.nationalId,
      isVerified: overrides.isVerified ?? false,
      passwordHash,
    },
  });
}

/** Creates an isolated master product so stock-mutating suites never touch seeded inventory. */
export async function createMasterProduct(
  prisma: PrismaService,
  overrides: Partial<{ stockQuantity: number; basePrice: number; reservedQuantity: number; averageCost: number }> = {},
) {
  const category = await prisma.category.findFirstOrThrow({ where: { slug: "electronics" } });
  const tag = uid().toUpperCase();
  return prisma.masterProduct.create({
    data: {
      sku: `E2E-${tag}`,
      title: `E2E Product ${tag}`,
      categoryId: category.id,
      basePrice: overrides.basePrice ?? 500,
      averageCost: overrides.averageCost ?? overrides.basePrice ?? 500,
      stockQuantity: overrides.stockQuantity ?? 20,
      reservedQuantity: overrides.reservedQuantity ?? 0,
      masterDescription: "Fixture product for end-to-end tests",
    },
  });
}
