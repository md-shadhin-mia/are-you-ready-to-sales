import { Module } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CategoriesController } from "./categories.controller";
import { MasterProductsService } from "./master-products.service";
import { AdminMasterProductsController } from "./admin-master-products.controller";
import { StudentCatalogController } from "./student-catalog.controller";
import { StoresController } from "./stores.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [
    CategoriesController,
    AdminMasterProductsController,
    StudentCatalogController,
    StoresController,
  ],
  providers: [CategoriesService, MasterProductsService],
  exports: [CategoriesService, MasterProductsService],
})
export class CatalogModule {}
