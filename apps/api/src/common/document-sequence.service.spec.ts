import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentSequenceService, formatDocumentNumber } from "./document-sequence.service";

describe("DocumentSequenceService (Unit)", () => {
  let prismaMock: any;
  let service: DocumentSequenceService;

  beforeEach(() => {
    prismaMock = { $queryRaw: vi.fn() };
    service = new DocumentSequenceService(prismaMock);
  });

  it("formats numbers as PREFIX-YYYY-zero padded sequence", () => {
    expect(formatDocumentNumber("INV", 2026, 12)).toBe("INV-2026-000012");
    expect(formatDocumentNumber("EX", 2026, 7, 4)).toBe("EX-2026-0007");
  });

  it("allocates the next value atomically for the current year", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ last_value: 42 }]);
    const value = await service.next("INV", { date: new Date("2026-03-01T00:00:00Z") });
    expect(value).toBe("INV-2026-000042");
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("allocates a contiguous range in a single statement", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ last_value: 13 }]);
    const values = await service.nextRange("INV", 3, { date: new Date("2026-03-01T00:00:00Z") });
    expect(values).toEqual(["INV-2026-000011", "INV-2026-000012", "INV-2026-000013"]);
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("uses the transaction client when provided", async () => {
    const tx = { $queryRaw: vi.fn().mockResolvedValue([{ last_value: 1 }]) };
    await service.next("PO", { tx: tx as any, date: new Date("2026-01-01T00:00:00Z") });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
  });

  it("rejects non-positive range sizes", async () => {
    await expect(service.nextRange("INV", 0)).rejects.toThrow();
  });

  it("defaults date to current year when options.date is omitted", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ last_value: 1 }]);
    const value = await service.next("INV");
    const currentYear = new Date().getUTCFullYear();
    expect(value).toBe(`INV-${currentYear}-000001`);
  });
});
