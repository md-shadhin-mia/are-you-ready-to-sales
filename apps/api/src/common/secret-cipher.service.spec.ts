import { describe, it, expect } from "vitest";
import { randomBytes } from "crypto";
import { SecretCipherService } from "./secret-cipher.service";

const config = (values: Record<string, string | undefined>) => ({ get: (key: string) => values[key] }) as any;

describe("SecretCipherService (Unit)", () => {
  it("uses SECRETS_ENCRYPTION_KEY when it is a valid 64-char hex key", () => {
    const key = randomBytes(32).toString("hex");
    const a = new SecretCipherService(config({ SECRETS_ENCRYPTION_KEY: key }));
    const b = new SecretCipherService(config({ SECRETS_ENCRYPTION_KEY: key }));
    expect(b.decryptJson(a.encryptJson({ k: "v" }))).toEqual({ k: "v" });
  });

  it("refuses to start in production without a valid key", () => {
    expect(() => new SecretCipherService(config({ NODE_ENV: "production" }))).toThrow(/SECRETS_ENCRYPTION_KEY/);
    expect(() => new SecretCipherService(config({ NODE_ENV: "production", SECRETS_ENCRYPTION_KEY: "short" }))).toThrow();
  });

  it("derives a stable development key outside production", () => {
    const a = new SecretCipherService(config({ JWT_ACCESS_SECRET: "dev-secret" }));
    const b = new SecretCipherService(config({ JWT_ACCESS_SECRET: "dev-secret" }));
    expect(b.decryptJson(a.encryptJson([1, 2]))).toEqual([1, 2]);
  });
});
