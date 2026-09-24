import { Module } from "@nestjs/common";
import { CouponService } from "./coupon.service";
import { BannerService } from "./banner.service";
import { MarketingController } from "./marketing.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [MarketingController],
  providers: [CouponService, BannerService],
  exports: [CouponService, BannerService],
})
export class MarketingModule {}
