import { Module } from "@nestjs/common";
import { GamificationService } from "./gamification.service";
import { GamificationListener } from "./gamification.listener";
import { GamificationController } from "./gamification.controller";
import { LevelGatingGuard } from "./guards/level-gating.guard";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [GamificationController],
  providers: [GamificationService, GamificationListener, LevelGatingGuard],
  exports: [GamificationService, LevelGatingGuard],
})
export class GamificationModule {}
