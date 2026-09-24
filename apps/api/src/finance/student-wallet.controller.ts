import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { LedgerService } from "./ledger.service";
import { PayoutService, RequestPayoutDto } from "./payout.service";
import { StoresService } from "../stores/stores.service";

@Controller("api/v1/student/wallet")
@UseGuards(JwtAuthGuard)
export class StudentWalletController {
  constructor(
    private readonly ledgerService: LedgerService,
    private readonly payoutService: PayoutService,
    private readonly storesService: StoresService,
  ) {}

  @Get("summary")
  async getWalletSummary(@Request() req: any) {
    const store = await this.storesService.getMyStore(req.user.id);
    return this.payoutService.getWalletSummary(req.user.id, store.id);
  }

  @Get("statement")
  async getLedgerStatement(
    @Request() req: any,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const store = await this.storesService.getMyStore(req.user.id);
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.ledgerService.getLedgerStatement(store.id, pageNum, limitNum);
  }

  @Post("withdraw")
  async requestPayout(
    @Request() req: any,
    @Body() dto: RequestPayoutDto,
  ) {
    const store = await this.storesService.getMyStore(req.user.id);
    return this.payoutService.requestPayout(req.user.id, store.id, dto);
  }

  @Get("payouts")
  async getStudentPayouts(@Request() req: any) {
    const store = await this.storesService.getMyStore(req.user.id);
    return this.payoutService.getStudentPayouts(req.user.id, store.id);
  }
}
