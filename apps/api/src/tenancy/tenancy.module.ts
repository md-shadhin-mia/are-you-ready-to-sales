import { Module, Global } from "@nestjs/common";
import { TenantContext } from "./tenant-context";
import { TenantResolutionMiddleware } from "./tenant-resolution.middleware";
import { ConfigModule } from "@nestjs/config";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [TenantContext, TenantResolutionMiddleware],
  exports: [TenantContext, TenantResolutionMiddleware],
})
export class TenancyModule {}
