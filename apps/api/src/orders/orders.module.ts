import { Module } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { StoresModule } from "../stores/stores.module";
import { PricingModule } from "../pricing/pricing.module";
import { AuthModule } from "../auth/auth.module";
import { InventoryModule } from "../inventory/inventory.module";
import { FulfillmentService } from "./fulfillment.service";

@Module({
  imports: [StoresModule, PricingModule, AuthModule, InventoryModule],
  controllers: [OrdersController],
  providers: [OrdersService, FulfillmentService],
  exports: [OrdersService, FulfillmentService],
})
export class OrdersModule {}
