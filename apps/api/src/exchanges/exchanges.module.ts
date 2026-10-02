import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { InventoryModule } from "../inventory/inventory.module";
import { ExchangeOrdersController } from "./exchange-orders.controller";
import { ExchangeOrdersService } from "./exchange-orders.service";

@Module({
  imports: [AuthModule, InventoryModule],
  controllers: [ExchangeOrdersController],
  providers: [ExchangeOrdersService],
})
export class ExchangesModule {}
