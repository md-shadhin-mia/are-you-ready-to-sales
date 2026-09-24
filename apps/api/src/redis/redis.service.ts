import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>("REDIS_URL") || "redis://localhost:6382";
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, "EX", ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        if (this.client.status === "ready" || this.client.status === "connect") {
          await this.client.quit();
        }
      } catch {
        // ignore if already closed
      }
    }
  }
}
