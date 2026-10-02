import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@repo/db";

/**
 * Landed cost and reservation internals are hidden from every query by default so no
 * student/seller-facing endpoint can leak them. Internal inventory and procurement code
 * opts in with an explicit `select` or raw SQL.
 */
export const GLOBAL_OMIT = {
  masterProduct: { averageCost: true, reservedQuantity: true },
} as const;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ omit: GLOBAL_OMIT });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
