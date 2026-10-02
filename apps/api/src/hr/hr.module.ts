import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EmployeesService } from "./employees.service";
import { PayrollService } from "./payroll.service";
import { CommissionRevocationListener } from "./commission-revocation.listener";
import { EmployeesController, PayrollController } from "./hr.controller";

@Module({
  imports: [AuthModule],
  controllers: [EmployeesController, PayrollController],
  providers: [EmployeesService, PayrollService, CommissionRevocationListener],
})
export class HrModule {}
