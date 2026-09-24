import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StoresModule } from "../stores/stores.module";
import { StudentDashboardService } from "./student-dashboard.service";
import { StudentDashboardController } from "./student-dashboard.controller";

@Module({
  imports: [PrismaModule, StoresModule],
  controllers: [StudentDashboardController],
  providers: [StudentDashboardService],
  exports: [StudentDashboardService],
})
export class DashboardModule {}
