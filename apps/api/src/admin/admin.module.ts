import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { AuthModule } from "../auth/auth.module";
import { InstituteDashboardService } from "./institute-dashboard.service";
import { StudentGovernanceService } from "./student-governance.service";
import { AdminController } from "./admin.controller";

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [AdminController],
  providers: [InstituteDashboardService, StudentGovernanceService],
  exports: [InstituteDashboardService, StudentGovernanceService],
})
export class AdminModule {}
