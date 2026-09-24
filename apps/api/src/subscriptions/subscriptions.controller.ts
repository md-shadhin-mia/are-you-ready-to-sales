import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SubscriptionsService } from "./subscriptions.service";

import { IsString, IsNotEmpty } from "class-validator";

export class UpgradePlanDto {
  @IsString()
  @IsNotEmpty()
  planCode!: string;
}

@Controller("api/v1")
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get("subscriptions/plans")
  async getPublicPlans() {
    return this.subscriptionsService.getPublicPlans();
  }

  @Get("student/subscription")
  @UseGuards(JwtAuthGuard)
  async getStudentSubscription(@Request() req: any) {
    return this.subscriptionsService.getStudentSubscription(req.user.id);
  }

  @Post("student/subscription/upgrade")
  @UseGuards(JwtAuthGuard)
  async upgradeSubscription(
    @Request() req: any,
    @Body() dto: UpgradePlanDto,
  ) {
    return this.subscriptionsService.upgradeSubscription(
      req.user.id,
      dto.planCode,
    );
  }
}
