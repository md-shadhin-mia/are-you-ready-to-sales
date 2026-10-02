import { Module, forwardRef } from "@nestjs/common";
import { StoresService } from "./stores.service";
import { StoresController } from "./stores.controller";
import { AuthModule } from "../auth/auth.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";

@Module({
  imports: [AuthModule, forwardRef(() => SubscriptionsModule)],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
