import { Module } from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { CustomersController } from "./customers.controller";
import { StoresModule } from "../stores/stores.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [StoresModule, AuthModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
