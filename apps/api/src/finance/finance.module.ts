import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { AuthModule } from "../auth/auth.module";
import { StoresModule } from "../stores/stores.module";
import { LedgerService } from "./ledger.service";
import { PayoutService } from "./payout.service";
import { StudentWalletController } from "./student-wallet.controller";
import { FinanceAdminController } from "./finance-admin.controller";

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, StoresModule],
  controllers: [StudentWalletController, FinanceAdminController],
  providers: [LedgerService, PayoutService],
  exports: [LedgerService, PayoutService],
})
export class FinanceModule {}
