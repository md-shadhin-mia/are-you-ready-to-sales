import { Module } from "@nestjs/common";
import { WholesaleService } from "./wholesale.service";
import { WholesaleController } from "./wholesale.controller";
import { WholesaleAdminController } from "./wholesale-admin.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { InventoryModule } from "../inventory/inventory.module";

@Module({
  imports: [PrismaModule, AuthModule, InventoryModule],
  controllers: [WholesaleController, WholesaleAdminController],
  providers: [WholesaleService],
  exports: [WholesaleService],
})
export class WholesaleModule {}
