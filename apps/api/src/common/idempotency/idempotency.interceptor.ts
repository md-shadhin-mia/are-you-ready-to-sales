import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createHash } from "crypto";
import { catchError, from, mergeMap, Observable, of, throwError } from "rxjs";
import { RedisService } from "../../redis/redis.service";
import { IDEMPOTENCY_TTL_SECONDS, IDEMPOTENT_KEY } from "./idempotency.constants";

interface CachedEntry {
  state: "IN_FLIGHT" | "COMPLETED";
  fingerprint: string;
  statusCode?: number;
  body?: unknown;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const enabled = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!enabled) return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    const key = request.headers["idempotency-key"];
    if (typeof key !== "string" || key.length < 8 || key.length > 128) {
      throw new BadRequestException("An Idempotency-Key header (8-128 characters) is required for this operation");
    }

    const userId = request.user?.id ?? "anonymous";
    const cacheKey = `idempotency:${userId}:${request.method}:${request.originalUrl}:${key}`;
    const fingerprint = createHash("sha256").update(JSON.stringify(request.body ?? {})).digest("hex");
    const client = this.redis.getClient();

    const lock: CachedEntry = { state: "IN_FLIGHT", fingerprint };
    const acquired = await client.set(cacheKey, JSON.stringify(lock), "EX", IDEMPOTENCY_TTL_SECONDS, "NX");

    if (!acquired) {
      const existing = JSON.parse((await client.get(cacheKey)) ?? "null") as CachedEntry | null;
      if (existing && existing.fingerprint !== fingerprint) {
        throw new UnprocessableEntityException("Idempotency-Key was already used with a different request payload");
      }
      if (!existing || existing.state === "IN_FLIGHT") {
        throw new ConflictException("A request with this Idempotency-Key is still being processed");
      }
      response.status(existing.statusCode ?? 200);
      return of(existing.body);
    }

    // Persist the result before emitting it so an immediate replay never observes IN_FLIGHT.
    return next.handle().pipe(
      mergeMap(async (body) => {
        const done: CachedEntry = { state: "COMPLETED", fingerprint, statusCode: response.statusCode, body };
        await client.set(cacheKey, JSON.stringify(done), "EX", IDEMPOTENCY_TTL_SECONDS);
        return body;
      }),
      catchError((error) => from(client.del(cacheKey)).pipe(mergeMap(() => throwError(() => error)))),
    );
  }
}
