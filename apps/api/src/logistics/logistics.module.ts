import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrdersModule } from "../orders/orders.module";
import { InventoryModule } from "../inventory/inventory.module";
import { CourierWebhookService } from "./courier-webhook.service";
import { LogisticsService } from "./logistics.service";
import { CourierWebhookController, LogisticsController } from "./logistics.controller";

@Module({
  imports: [AuthModule, OrdersModule, InventoryModule],
  controllers: [CourierWebhookController, LogisticsController],
  providers: [CourierWebhookService, LogisticsService],
})
export class LogisticsModule {}
