import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

/**
 * AES-256-GCM envelope encryption. Envelopes are "iv:authTag:ciphertext" in base64,
 * so tampering with any part fails authentication on decrypt.
 */
export class SecretCipher {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) {
      throw new Error("AES-256-GCM requires a 32-byte key");
    }
  }

  static fromHexKey(hex: string): SecretCipher {
    return new SecretCipher(Buffer.from(hex, "hex"));
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(":");
  }

  decrypt(envelope: string): string {
    const [iv, tag, data] = envelope.split(":").map((part) => Buffer.from(part ?? "", "base64"));
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  }
}
