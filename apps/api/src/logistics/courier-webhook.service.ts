import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";
import { CourierProvider, OrderStatus } from "@repo/db";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { OrdersService } from "../orders/orders.service";
import { OrderStateMachine } from "../orders/order-state-machine";

const DEDUPE_TTL_SECONDS = 7 * 24 * 60 * 60;
const DEV_SECRET = "dev-courier-webhook-secret";

/** Courier event vocabulary (normalized to lowercase) -> platform order status. */
const EVENT_STATUS: Record<string, OrderStatus> = {
  picked_up: OrderStatus.IN_COURIER,
  in_transit: OrderStatus.IN_COURIER,
  delivered: OrderStatus.DELIVERED,
  returned: OrderStatus.RETURNED,
  returned_to_origin: OrderStatus.RETURNED,
};

interface CourierPayload {
  eventId?: string;
  trackingNumber?: string;
  status?: string;
}

@Injectable()
export class CourierWebhookService {
  private readonly logger = new Logger(CourierWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly orders: OrdersService,
    private readonly config: ConfigService,
  ) {}

  private parseProvider(raw: string): CourierProvider {
    const provider = raw.toUpperCase() as CourierProvider;
    if (!Object.values(CourierProvider).includes(provider)) {
      throw new BadRequestException(`Unsupported courier provider "${raw}"`);
    }
    return provider;
  }

  private secretFor(provider: CourierProvider): string {
    const secret =
      this.config.get<string>(`COURIER_WEBHOOK_SECRET_${provider}`) || this.config.get<string>("COURIER_WEBHOOK_SECRET");
    if (secret) return secret;
    if (this.config.get<string>("NODE_ENV") === "production") {
      throw new UnauthorizedException("Courier webhook secret is not configured");
    }
    return DEV_SECRET;
  }

  private verifySignature(provider: CourierProvider, rawBody: string, signature?: string) {
    if (!signature) throw new UnauthorizedException("Missing courier signature");
    const expected = createHmac("sha256", this.secretFor(provider)).update(rawBody).digest();
    const received = Buffer.from(signature, "hex");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new UnauthorizedException("Invalid courier signature");
    }
  }

  async handle(rawProvider: string, rawBody: string, signature?: string) {
    const provider = this.parseProvider(rawProvider);
    this.verifySignature(provider, rawBody, signature);

    let payload: CourierPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new BadRequestException("Webhook body must be JSON");
    }
    if (!payload.eventId || !payload.trackingNumber || !payload.status) {
      throw new BadRequestException("eventId, trackingNumber and status are required");
    }

    const client = this.redis.getClient();
    const dedupeKey = `courier:event:${provider}:${payload.eventId}`;
    const claimed = await client.set(dedupeKey, "1", "EX", DEDUPE_TTL_SECONDS, "NX");
    if (!claimed) {
      return { received: true, duplicate: true, applied: false, orderStatus: null };
    }

    try {
      return await this.process(provider, payload as Required<CourierPayload>);
    } catch (error) {
      await client.del(dedupeKey);
      throw error;
    }
  }

  private async process(provider: CourierProvider, payload: Required<CourierPayload>) {
    const eventType = payload.status.toLowerCase();
    const target = EVENT_STATUS[eventType];
    const order = await this.prisma.order.findFirst({
      where: { trackingNumber: payload.trackingNumber },
      select: { id: true, status: true },
    });

    let applied = false;
    let orderStatus: OrderStatus | null = order?.status ?? null;

    if (order && target) {
      if (order.status === target) {
        applied = true;
      } else if (OrderStateMachine.canTransition(order.status, target)) {
        const updated = await this.orders.updateOrderStatus(order.id, target);
        orderStatus = updated.status;
        applied = true;
        if (target === OrderStatus.RETURNED) {
          await this.prisma.rtoInspection.create({ data: { orderId: order.id } });
        }
      } else {
        this.logger.warn(`Ignoring ${provider} ${eventType} for order ${order.id} in status ${order.status}`);
      }
    }

    try {
      await this.prisma.courierEvent.create({
        data: {
          provider,
          eventId: payload.eventId,
          orderId: order?.id ?? null,
          trackingNumber: payload.trackingNumber,
          eventType,
          applied,
          payload: payload as any,
        },
      });
    } catch (error: any) {
      // Durable dedupe: unique (provider, event_id) catches replays that outlived the Redis key.
      if (error?.code === "P2002") return { received: true, duplicate: true, applied: false, orderStatus };
      throw error;
    }

    return { received: true, duplicate: false, applied, orderStatus };
  }
}
