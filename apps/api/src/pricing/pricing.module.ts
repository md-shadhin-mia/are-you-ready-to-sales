import { Module, Global } from "@nestjs/common";
import { PricingService } from "./pricing.service";
import { PricingController } from "./pricing.controller";
import { AuthModule } from "../auth/auth.module";
import { GamificationModule } from "../gamification/gamification.module";

@Global()
@Module({
  imports: [AuthModule, GamificationModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
