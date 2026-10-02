import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import { SecretCipher } from "./secret-cipher";

/**
 * Nest wrapper around SecretCipher keyed by SECRETS_ENCRYPTION_KEY (64 hex chars).
 * Outside production a deterministic development key is derived so local setups work.
 */
@Injectable()
export class SecretCipherService {
  private readonly logger = new Logger(SecretCipherService.name);
  private readonly cipher: SecretCipher;

  constructor(config: ConfigService) {
    const hexKey = config.get<string>("SECRETS_ENCRYPTION_KEY");
    if (hexKey && /^[0-9a-fA-F]{64}$/.test(hexKey)) {
      this.cipher = SecretCipher.fromHexKey(hexKey);
      return;
    }
    if (config.get<string>("NODE_ENV") === "production") {
      throw new Error("SECRETS_ENCRYPTION_KEY must be a 64-character hex string in production");
    }
    this.logger.warn("SECRETS_ENCRYPTION_KEY not set; using a derived development key");
    const seed = config.get<string>("JWT_ACCESS_SECRET") || "dev-access-super-secret-key-at-least-32-chars-long";
    this.cipher = new SecretCipher(createHash("sha256").update(`secrets:${seed}`).digest());
  }

  encryptJson(value: unknown): string {
    return this.cipher.encrypt(JSON.stringify(value));
  }

  decryptJson<T = Record<string, unknown>>(envelope: string): T {
    return JSON.parse(this.cipher.decrypt(envelope)) as T;
  }
}
