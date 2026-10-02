import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { CommissionStatus } from "@repo/db";
import { PrismaService } from "../prisma/prisma.service";

/** Pending (unapproved) lead commissions are revoked when their order is cancelled or returned. */
@Injectable()
export class CommissionRevocationListener {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent("order.reversed", { async: true })
  async handleOrderReversed(event: { orderId: string; status: string }) {
    await this.prisma.employeeCommission.updateMany({
      where: { orderId: event.orderId, status: CommissionStatus.PENDING },
      data: { status: CommissionStatus.REVOKED, notes: `Revoked: order ${event.status}` },
    });
  }
}
