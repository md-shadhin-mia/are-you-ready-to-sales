import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReportsService, computeLifecycleRow, safeDivide, PACKAGING_COST_PER_UNIT, RTO_LOSS_PER_UNIT } from "./reports.service";

describe("ReportsService (Unit)", () => {
  it("safeDivide never returns NaN or Infinity", () => {
    expect(safeDivide(10, 0)).toBeNull();
    expect(safeDivide(0, 0)).toBeNull();
    expect(safeDivide(10, 4)).toBe(2.5);
  });

  it("protects margin and average price on products with 0 units sold", () => {
    const row = computeLifecycleRow({
      supplier_id: "s",
      master_product_id: "p",
      units_purchased: 10,
      acquisition_cost: "1000.00",
      units_sold: 0,
      sales_revenue: "0",
      units_rto: 0,
    });
    expect(row).toMatchObject({ avgUnitCost: 100, avgSellingPrice: null, grossProfit: 0, marginPercent: null });
    expect(Object.values(row).some((v) => typeof v === "number" && !Number.isFinite(v))).toBe(false);
  });

  it("nets acquisition cost, RTO loss and packaging out of revenue", () => {
    const row = computeLifecycleRow({
      supplier_id: "s",
      master_product_id: "p",
      units_purchased: 20,
      acquisition_cost: "2000.00",
      units_sold: 10,
      sales_revenue: "2500.00",
      units_rto: 2,
    });
    const expected = 2500 - 10 * 100 - 2 * RTO_LOSS_PER_UNIT - 10 * PACKAGING_COST_PER_UNIT;
    expect(row).toMatchObject({ avgUnitCost: 100, avgSellingPrice: 250, grossProfit: expected });
    expect(row.marginPercent).toBeCloseTo((expected / 2500) * 100, 2);
  });

  describe("materialized view access", () => {
    let prisma: any;
    let service: ReportsService;

    beforeEach(() => {
      prisma = { $queryRaw: vi.fn(), $executeRawUnsafe: vi.fn() };
      service = new ReportsService(prisma, { get: () => undefined } as any);
    });

    it("falls back to a live aggregate when the materialized view read fails", async () => {
      prisma.$queryRaw
        .mockRejectedValueOnce(new Error('relation "mv_supplier_lifecycle" is not populated'))
        .mockResolvedValueOnce([]);
      const result = await service.getSupplierProfitLifecycle();
      expect(result.source).toBe("live");
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it("serves from the materialized view when healthy", async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]);
      expect((await service.getSupplierProfitLifecycle()).source).toBe("materialized_view");
    });

    it("reports refresh failures without throwing", async () => {
      prisma.$executeRawUnsafe.mockResolvedValueOnce(0).mockRejectedValueOnce(new Error("lock timeout"));
      const result = await service.refreshMaterializedViews();
      expect(result.refreshed).toEqual(["mv_daily_courier_stats"]);
      expect(result.failed).toEqual([{ view: "mv_supplier_lifecycle", error: "lock timeout" }]);
    });
  });
});
