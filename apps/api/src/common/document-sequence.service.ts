import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type SqlClient = Pick<PrismaService, "$queryRaw">;

export interface SequenceOptions {
  /** Run inside an existing interactive transaction so the number rolls back with it. */
  tx?: SqlClient;
  /** Zero-padding width of the numeric part. */
  pad?: number;
  /** Date whose year scopes the sequence (defaults to now). */
  date?: Date;
}

export function formatDocumentNumber(prefix: string, year: number, value: number, pad = 6): string {
  return `${prefix}-${year}-${String(value).padStart(pad, "0")}`;
}

/**
 * Allocates gap-free, per-year document numbers (INV-2026-000001, EX-2026-0001, ...).
 * A single INSERT ... ON CONFLICT DO UPDATE is atomic, so concurrent callers never collide.
 */
@Injectable()
export class DocumentSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  async next(prefix: string, options: SequenceOptions = {}): Promise<string> {
    const [value] = await this.nextRange(prefix, 1, options);
    return value;
  }

  async nextRange(prefix: string, count: number, options: SequenceOptions = {}): Promise<string[]> {
    if (!Number.isInteger(count) || count < 1) {
      throw new Error(`Sequence range size must be a positive integer, received ${count}`);
    }

    const year = (options.date ?? new Date()).getUTCFullYear();
    const key = `${prefix}-${year}`;
    const client = options.tx ?? this.prisma;

    const rows = await client.$queryRaw<Array<{ last_value: number }>>`
      INSERT INTO document_sequences (key, last_value, updated_at)
      VALUES (${key}, ${count}, NOW())
      ON CONFLICT (key) DO UPDATE
        SET last_value = document_sequences.last_value + ${count}, updated_at = NOW()
      RETURNING last_value
    `;

    const last = Number(rows[0].last_value);
    return Array.from({ length: count }, (_, i) =>
      formatDocumentNumber(prefix, year, last - count + 1 + i, options.pad),
    );
  }
}
