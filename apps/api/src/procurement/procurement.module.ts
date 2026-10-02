import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { InventoryModule } from "../inventory/inventory.module";
import { PurchasesService } from "./purchases.service";
import { SuppliersService } from "./suppliers.service";
import { PurchasesController, SuppliersController } from "./procurement.controller";

@Module({
  imports: [AuthModule, InventoryModule],
  controllers: [SuppliersController, PurchasesController],
  providers: [SuppliersService, PurchasesService],
  exports: [SuppliersService, PurchasesService],
})
export class ProcurementModule {}
