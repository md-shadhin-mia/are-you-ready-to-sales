import { Module } from "@nestjs/common";
import { StoreProductsService } from "./store-products.service";
import { StoreProductsController } from "./store-products.controller";
import { StoresModule } from "../stores/stores.module";
import { PricingModule } from "../pricing/pricing.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [StoresModule, PricingModule, AuthModule],
  controllers: [StoreProductsController],
  providers: [StoreProductsService],
  exports: [StoreProductsService],
})
export class StoreProductsModule {}
