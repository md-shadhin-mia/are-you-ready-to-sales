import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { TenancyModule } from "./tenancy/tenancy.module";
import { TenantResolutionMiddleware } from "./tenancy/tenant-resolution.middleware";
import { AuthModule } from "./auth/auth.module";
import { StorageModule } from "./storage/storage.module";
import { CatalogModule } from "./catalog/catalog.module";
import { StoresModule } from "./stores/stores.module";
import { StoreProductsModule } from "./store-products/store-products.module";
import { PricingModule } from "./pricing/pricing.module";
import { CustomersModule } from "./customers/customers.module";
import { OrdersModule } from "./orders/orders.module";
import { StorefrontModule } from "./storefront/storefront.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    TenancyModule,
    AuthModule,
    StorageModule,
    CatalogModule,
    StoresModule,
    StoreProductsModule,
    PricingModule,
    CustomersModule,
    OrdersModule,
    StorefrontModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantResolutionMiddleware).forRoutes("*");
  }
}
