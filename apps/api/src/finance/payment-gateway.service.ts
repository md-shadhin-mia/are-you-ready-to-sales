import { Injectable, NotFoundException } from "@nestjs/common";
import { PaymentGatewayConfig } from "@repo/db";
import { PrismaService } from "../prisma/prisma.service";
import { SecretCipherService } from "../common/secret-cipher.service";

export interface UpsertGatewayInput {
  displayName: string;
  mode?: string;
  isActive?: boolean;
  credentials: Record<string, string>;
}

/** Payment gateway credentials are AES-256-GCM encrypted at rest and never returned by the API. */
@Injectable()
export class PaymentGatewayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: SecretCipherService,
  ) {}

  private present(config: PaymentGatewayConfig) {
    const credentialKeys = Object.keys(this.cipher.decryptJson(config.encryptedCredentials)).sort();
    return {
      provider: config.provider,
      displayName: config.displayName,
      mode: config.mode,
      isActive: config.isActive,
      credentialKeys,
      updatedAt: config.updatedAt,
    };
  }

  async list() {
    const configs = await this.prisma.paymentGatewayConfig.findMany({ orderBy: { provider: "asc" } });
    return configs.map((c) => this.present(c));
  }

  async upsert(rawProvider: string, input: UpsertGatewayInput, userId: string) {
    const provider = rawProvider.toUpperCase();
    const encryptedCredentials = this.cipher.encryptJson(input.credentials);
    const data = {
      displayName: input.displayName,
      mode: input.mode ?? "SANDBOX",
      isActive: input.isActive ?? false,
      encryptedCredentials,
      updatedById: userId,
    };
    const saved = await this.prisma.paymentGatewayConfig.upsert({
      where: { provider },
      create: { provider, ...data },
      update: data,
    });
    return this.present(saved);
  }

  /** Internal use only (gateway adapters); never expose through a controller. */
  async getCredentials(rawProvider: string): Promise<Record<string, string>> {
    const config = await this.prisma.paymentGatewayConfig.findUnique({ where: { provider: rawProvider.toUpperCase() } });
    if (!config) throw new NotFoundException(`Payment gateway "${rawProvider}" is not configured`);
    return this.cipher.decryptJson(config.encryptedCredentials);
  }
}
