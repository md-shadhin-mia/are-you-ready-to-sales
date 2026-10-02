import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { AuthModule } from "../auth/auth.module";
import { InstituteDashboardService } from "./institute-dashboard.service";
import { StudentGovernanceService } from "./student-governance.service";
import { BranchesService } from "./branches.service";
import { BatchesService } from "./batches.service";
import { SellersService } from "./sellers.service";
import { AdminController } from "./admin.controller";
import { SellerGovernanceService } from "./seller-governance.service";
import { SellerPanelController } from "./seller-panel.controller";

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [AdminController, SellerPanelController],
  providers: [
    InstituteDashboardService,
    StudentGovernanceService,
    BranchesService,
    BatchesService,
    SellersService,
    SellerGovernanceService,
  ],
  exports: [
    SellerGovernanceService,
    InstituteDashboardService,
    StudentGovernanceService,
    BranchesService,
    BatchesService,
    SellersService,
  ],
})
export class AdminModule {}
