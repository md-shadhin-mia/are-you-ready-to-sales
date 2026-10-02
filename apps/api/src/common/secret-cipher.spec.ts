import { describe, it, expect } from "vitest";
import { randomBytes } from "crypto";
import { SecretCipher } from "./secret-cipher";

describe("SecretCipher AES-256-GCM (Unit)", () => {
  const cipher = new SecretCipher(randomBytes(32));

  it("round-trips plaintext", () => {
    const envelope = cipher.encrypt(JSON.stringify({ apiKey: "live_sk_123" }));
    expect(envelope).not.toContain("live_sk_123");
    expect(JSON.parse(cipher.decrypt(envelope))).toEqual({ apiKey: "live_sk_123" });
  });

  it("uses a fresh IV for every encryption", () => {
    expect(cipher.encrypt("same")).not.toBe(cipher.encrypt("same"));
  });

  it("detects tampering through the GCM auth tag", () => {
    const [iv, tag, data] = cipher.encrypt("secret").split(":");
    const flipped = Buffer.from(data, "base64");
    flipped[0] ^= 0xff;
    expect(() => cipher.decrypt([iv, tag, flipped.toString("base64")].join(":"))).toThrow();
  });

  it("rejects keys that are not 32 bytes", () => {
    expect(() => new SecretCipher(randomBytes(16))).toThrow();
  });

  it("builds from a 64-char hex key", () => {
    const hex = randomBytes(32).toString("hex");
    const fromHex = SecretCipher.fromHexKey(hex);
    expect(fromHex.decrypt(fromHex.encrypt("x"))).toBe("x");
  });
});
