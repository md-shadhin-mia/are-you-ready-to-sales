import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomBytes } from "crypto";
import { SecretCipher } from "../common/secret-cipher";
import { PaymentGatewayService } from "./payment-gateway.service";

describe("PaymentGatewayService (Unit)", () => {
  let prisma: any;
  let stored: any;
  let service: PaymentGatewayService;

  beforeEach(() => {
    const cipher = new SecretCipher(randomBytes(32));
    const cipherService = {
      encryptJson: (v: unknown) => cipher.encrypt(JSON.stringify(v)),
      decryptJson: (e: string) => JSON.parse(cipher.decrypt(e)),
    };
    stored = null;
    prisma = {
      paymentGatewayConfig: {
        upsert: vi.fn(async ({ create }: any) => (stored = { ...create, updatedAt: new Date() })),
        findUnique: vi.fn(async () => stored),
        findMany: vi.fn(async () => (stored ? [stored] : [])),
      },
    };
    service = new PaymentGatewayService(prisma, cipherService as any);
  });

  it("stores credentials only as an AES-256-GCM envelope", async () => {
    await service.upsert("bkash", { displayName: "bKash", credentials: { appSecret: "live-secret-123" } }, "admin");
    expect(stored.encryptedCredentials).not.toContain("live-secret-123");
    expect(stored.encryptedCredentials.split(":")).toHaveLength(3);
  });

  it("never returns secrets from the API, only credential key names", async () => {
    const result = await service.upsert("bkash", { displayName: "bKash", credentials: { appKey: "k", appSecret: "s" } }, "a");
    expect(result).toEqual(expect.objectContaining({ provider: "BKASH", credentialKeys: ["appKey", "appSecret"] }));
    expect(JSON.stringify(result)).not.toContain("encryptedCredentials");
    expect(JSON.stringify(await service.list())).not.toMatch(/"s"|appSecret":/);
  });

  it("decrypts credentials for internal gateway calls", async () => {
    await service.upsert("nagad", { displayName: "Nagad", credentials: { merchantId: "M-1" } }, "a");
    expect(await service.getCredentials("nagad")).toEqual({ merchantId: "M-1" });
  });

  it("throws NotFoundException when retrieving credentials for unconfigured provider", async () => {
    prisma.paymentGatewayConfig.findUnique.mockResolvedValueOnce(null);
    await expect(service.getCredentials("unknown")).rejects.toThrow('Payment gateway "unknown" is not configured');
  });
});
