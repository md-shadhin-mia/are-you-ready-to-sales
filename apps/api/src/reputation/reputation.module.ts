import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StoresModule } from "../stores/stores.module";
import { ReputationService } from "./reputation.service";
import { ReputationController } from "./reputation.controller";

@Module({
  imports: [PrismaModule, StoresModule],
  controllers: [ReputationController],
  providers: [ReputationService],
  exports: [ReputationService],
})
export class ReputationModule {}
