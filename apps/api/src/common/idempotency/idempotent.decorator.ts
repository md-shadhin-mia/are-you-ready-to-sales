import { applyDecorators, SetMetadata, UseInterceptors } from "@nestjs/common";
import { IdempotencyInterceptor } from "./idempotency.interceptor";
import { IDEMPOTENT_KEY } from "./idempotency.constants";

export { IDEMPOTENT_KEY };

/** Requires an Idempotency-Key header and replays the first response for 24 hours. */
export const Idempotent = () =>
  applyDecorators(SetMetadata(IDEMPOTENT_KEY, true), UseInterceptors(IdempotencyInterceptor));
