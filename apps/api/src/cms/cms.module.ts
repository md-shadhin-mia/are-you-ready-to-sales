import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CmsService } from "./cms.service";
import { BannersService } from "./banners.service";
import { CmsAdminController, CmsPublicController } from "./cms.controller";

@Module({
  imports: [AuthModule],
  controllers: [CmsAdminController, CmsPublicController],
  providers: [CmsService, BannersService],
})
export class CmsModule {}
