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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantResolutionMiddleware).forRoutes("*");
  }
}
