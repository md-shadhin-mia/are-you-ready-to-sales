import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StoresModule } from "../stores/stores.module";
import { ReviewsService } from "./reviews.service";
import { RatingAggregatorService } from "./rating-aggregator.service";
import { ReviewsController } from "./reviews.controller";

@Module({
  imports: [PrismaModule, StoresModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, RatingAggregatorService],
  exports: [ReviewsService, RatingAggregatorService],
})
export class ReviewsModule {}
