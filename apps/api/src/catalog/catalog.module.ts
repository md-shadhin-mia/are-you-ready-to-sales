import { Module } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CategoriesController } from "./categories.controller";
import { MasterProductsService } from "./master-products.service";
import { AdminMasterProductsController } from "./admin-master-products.controller";
import { StudentCatalogController } from "./student-catalog.controller";
import { StoresController } from "./stores.controller";
import { AuthModule } from "../auth/auth.module";
import { TaxonomyService } from "./taxonomy.service";
import { TaxonomyController } from "./taxonomy.controller";

@Module({
  imports: [AuthModule],
  controllers: [
    CategoriesController,
    AdminMasterProductsController,
    StudentCatalogController,
    StoresController,
    TaxonomyController,
  ],
  providers: [CategoriesService, MasterProductsService, TaxonomyService],
  exports: [CategoriesService, MasterProductsService, TaxonomyService],
})
export class CatalogModule {}
