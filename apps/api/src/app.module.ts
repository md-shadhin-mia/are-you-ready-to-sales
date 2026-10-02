import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { CommonModule } from "./common/common.module";
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
import { ReviewsModule } from "./reviews/reviews.module";
import { ReputationModule } from "./reputation/reputation.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { GamificationModule } from "./gamification/gamification.module";
import { MarketingModule } from "./marketing/marketing.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { FinanceModule } from "./finance/finance.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { AdminModule } from "./admin/admin.module";
import { WholesaleModule } from "./wholesale/wholesale.module";
import { InventoryModule } from "./inventory/inventory.module";
import { LogisticsModule } from "./logistics/logistics.module";
import { ExchangesModule } from "./exchanges/exchanges.module";
import { ProcurementModule } from "./procurement/procurement.module";
import { HrModule } from "./hr/hr.module";
import { CmsModule } from "./cms/cms.module";
import { ReportsModule } from "./reports/reports.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    CommonModule,
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
    ReviewsModule,
    ReputationModule,
    DashboardModule,
    GamificationModule,
    MarketingModule,
    AnalyticsModule,
    FinanceModule,
    SubscriptionsModule,
    AdminModule,
    WholesaleModule,
    InventoryModule,
    LogisticsModule,
    ExchangesModule,
    ProcurementModule,
    HrModule,
    CmsModule,
    ReportsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantResolutionMiddleware).forRoutes("*");
  }
}
