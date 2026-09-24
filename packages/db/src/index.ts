import { PrismaClient } from "@prisma/client";

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

/**
 * Creates or returns a scoped Prisma client extension for tenant operations.
 */
export function getTenantPrismaClient(storeId?: string) {
  if (!storeId) {
    return prisma;
  }

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // If the model has storeId field and this is a query operation,
          // we can auto-inject where: { storeId } when needed in future phases
          return query(args);
        },
      },
    },
  });
}

export * from "@prisma/client";
