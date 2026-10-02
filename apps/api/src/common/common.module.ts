import { Global, Module } from "@nestjs/common";
import { RedisModule } from "../redis/redis.module";
import { DocumentSequenceService } from "./document-sequence.service";
import { SecretCipherService } from "./secret-cipher.service";
import { IdempotencyInterceptor } from "./idempotency/idempotency.interceptor";

@Global()
@Module({
  imports: [RedisModule],
  providers: [DocumentSequenceService, SecretCipherService, IdempotencyInterceptor],
  exports: [DocumentSequenceService, SecretCipherService, IdempotencyInterceptor, RedisModule],
})
export class CommonModule {}
