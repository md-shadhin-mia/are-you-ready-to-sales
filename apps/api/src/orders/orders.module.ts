import { Module } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { StoresModule } from "../stores/stores.module";
import { PricingModule } from "../pricing/pricing.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [StoresModule, PricingModule, AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
