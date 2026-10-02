import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

export const RTO_LOSS_PER_UNIT = 60; // return shipping written off per returned unit (BDT)
export const PACKAGING_COST_PER_UNIT = 15; // packaging per shipped unit (BDT)
export const MATERIALIZED_VIEWS = ["mv_daily_courier_stats", "mv_supplier_lifecycle"] as const;
const DEFAULT_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function safeDivide(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

interface LifecycleRaw {
  supplier_id: string;
  master_product_id: string;
  units_purchased: number | string;
  acquisition_cost: number | string;
  units_sold: number | string;
  sales_revenue: number | string;
  units_rto: number | string;
  supplier_name?: string;
  title?: string;
}

/** 90-day supplier profit lifecycle for one supplier/product pair; every ratio is divide-by-zero safe. */
export function computeLifecycleRow(raw: LifecycleRaw) {
  const unitsPurchased = Number(raw.units_purchased);
  const acquisitionCost = Number(raw.acquisition_cost);
  const unitsSold = Number(raw.units_sold);
  const salesRevenue = Number(raw.sales_revenue);
  const unitsRto = Number(raw.units_rto);

  const avgUnitCost = round2(safeDivide(acquisitionCost, unitsPurchased) ?? 0);
  const avgSellingPrice = safeDivide(salesRevenue, unitsSold);
  const costOfGoodsSold = round2(unitsSold * avgUnitCost);
  const rtoLoss = round2(unitsRto * RTO_LOSS_PER_UNIT);
  const packagingCost = round2(unitsSold * PACKAGING_COST_PER_UNIT);
  const grossProfit = unitsSold === 0 && unitsRto === 0 ? 0 : round2(salesRevenue - costOfGoodsSold - rtoLoss - packagingCost);
  const margin = safeDivide(grossProfit, salesRevenue);

  return {
    supplierId: raw.supplier_id,
    supplierName: raw.supplier_name,
    masterProductId: raw.master_product_id,
    title: raw.title,
    unitsPurchased,
    acquisitionCost,
    avgUnitCost,
    unitsSold,
    salesRevenue,
    avgSellingPrice: avgSellingPrice === null ? null : round2(avgSellingPrice),
    unitsRto,
    costOfGoodsSold,
    rtoLoss,
    packagingCost,
    grossProfit,
    marginPercent: margin === null ? null : round2(margin * 100),
  };
}

type Source = "materialized_view" | "live";

@Injectable()
export class ReportsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReportsService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Hourly refresh is opt-in (ENABLE_SCHEDULED_JOBS=true) so tests and CLIs don't start timers. */
  onModuleInit() {
    if (this.config.get<string>("ENABLE_SCHEDULED_JOBS") !== "true") return;
    const interval = Number(this.config.get<string>("REPORTS_REFRESH_INTERVAL_MS")) || DEFAULT_REFRESH_INTERVAL_MS;
    this.timer = setInterval(() => void this.refreshMaterializedViews(), interval);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async refreshMaterializedViews() {
    const refreshed: string[] = [];
    const failed: Array<{ view: string; error: string }> = [];
    for (const view of MATERIALIZED_VIEWS) {
      try {
        await this.prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY "${view}"`);
        refreshed.push(view);
      } catch (error: any) {
        this.logger.error(`Failed to refresh ${view}: ${error?.message}`);
        failed.push({ view, error: error?.message ?? String(error) });
      }
    }
    return { refreshed, failed, refreshedAt: new Date() };
  }

  /** Reads the materialized view; if that fails, degrades to the equivalent live aggregate. */
  private async withFallback<T>(label: string, fromView: () => Promise<T>, live: () => Promise<T>): Promise<{ source: Source; rows: T }> {
    try {
      return { source: "materialized_view", rows: await fromView() };
    } catch (error: any) {
      this.logger.warn(`${label}: materialized view unavailable (${error?.message}); serving live aggregate`);
      return { source: "live", rows: await live() };
    }
  }

  async getSupplierProfitLifecycle() {
    const { source, rows } = await this.withFallback<LifecycleRaw[]>(
      "supplier-profit-lifecycle",
      () => this.prisma.$queryRaw<LifecycleRaw[]>`
        SELECT mv.*, s.name AS supplier_name, mp.title
        FROM mv_supplier_lifecycle mv
        JOIN suppliers s ON s.id = mv.supplier_id
        JOIN master_products mp ON mp.id = mv.master_product_id
      `,
      () => this.prisma.$queryRaw<LifecycleRaw[]>`
        WITH purchases AS (
          SELECT po.supplier_id, poi.master_product_id,
                 SUM(poi.quantity_received) AS units_purchased,
                 SUM(poi.quantity_received * poi.unit_cost) AS acquisition_cost
          FROM purchase_order_items poi JOIN purchase_orders po ON po.id = poi.purchase_order_id
          WHERE po.status <> 'CANCELLED' AND poi.quantity_received > 0
          GROUP BY 1, 2
        ), sales AS (
          SELECT oi.master_product_id,
            COALESCE(SUM(oi.quantity) FILTER (WHERE o.status IN ('PARTIAL_DELIVERED','DELIVERED','COMPLETE','COMPLETED')), 0) AS units_sold,
            COALESCE(SUM(oi.total_price) FILTER (WHERE o.status IN ('PARTIAL_DELIVERED','DELIVERED','COMPLETE','COMPLETED')), 0) AS sales_revenue,
            COALESCE(SUM(oi.quantity) FILTER (WHERE o.status = 'RETURNED'), 0) AS units_rto
          FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE o.created_at >= NOW() - INTERVAL '90 days'
          GROUP BY 1
        )
        SELECT p.*, COALESCE(s.units_sold, 0) AS units_sold, COALESCE(s.sales_revenue, 0) AS sales_revenue,
               COALESCE(s.units_rto, 0) AS units_rto, sup.name AS supplier_name, mp.title
        FROM purchases p
        LEFT JOIN sales s ON s.master_product_id = p.master_product_id
        JOIN suppliers sup ON sup.id = p.supplier_id
        JOIN master_products mp ON mp.id = p.master_product_id
      `,
    );
    return { source, data: rows.map(computeLifecycleRow) };
  }

  async getProductCourierStatus() {
    type Row = { master_product_id: string; title: string; sku: string; courier_name: string; status: string; units: number | bigint };
    const { source, rows } = await this.withFallback<Row[]>(
      "product-courier-status",
      () => this.prisma.$queryRaw<Row[]>`
        SELECT mv.master_product_id, mp.title, mp.sku, mv.courier_name, mv.status, SUM(mv.units) AS units
        FROM mv_daily_courier_stats mv
        JOIN master_products mp ON mp.id = mv.master_product_id
        GROUP BY 1, 2, 3, 4, 5
      `,
      () => this.prisma.$queryRaw<Row[]>`
        SELECT oi.master_product_id, mp.title, mp.sku, COALESCE(o.courier_name, 'UNASSIGNED') AS courier_name,
               o.status::text AS status, SUM(oi.quantity) AS units
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN master_products mp ON mp.id = oi.master_product_id
        WHERE o.status IN ('INVOICED','IN_COURIER','SHIPPED','PARTIAL_DELIVERED','DELIVERED','COMPLETE','COMPLETED','RETURNED','EXCHANGE')
        GROUP BY 1, 2, 3, 4, 5
      `,
    );

    const byProduct = new Map<string, { masterProductId: string; title: string; sku: string; couriers: Set<string>; statuses: Record<string, number>; totalUnits: number }>();
    for (const r of rows) {
      const entry =
        byProduct.get(r.master_product_id) ??
        { masterProductId: r.master_product_id, title: r.title, sku: r.sku, couriers: new Set<string>(), statuses: {}, totalUnits: 0 };
      const units = Number(r.units);
      entry.couriers.add(r.courier_name);
      entry.statuses[r.status] = (entry.statuses[r.status] ?? 0) + units;
      entry.totalUnits += units;
      byProduct.set(r.master_product_id, entry);
    }

    const data = [...byProduct.values()]
      .map((e) => ({
        ...e,
        couriers: [...e.couriers].sort(),
        returnRatePercent: round2((safeDivide(e.statuses.RETURNED ?? 0, e.totalUnits) ?? 0) * 100),
      }))
      .sort((a, b) => b.totalUnits - a.totalUnits);
    return { source, data };
  }

  /** Purchase volumes, cost and supplier returns per supplier/product (live; procurement volumes are small). */
  async getSupplierProductReport() {
    const rows = await this.prisma.$queryRaw<any[]>`
      WITH received AS (
        SELECT po.supplier_id, poi.master_product_id,
               SUM(poi.quantity_received) AS units_purchased,
               SUM(poi.quantity_received * poi.unit_cost) AS total_cost,
               MAX(po.created_at) AS last_purchased_at
        FROM purchase_order_items poi JOIN purchase_orders po ON po.id = poi.purchase_order_id
        WHERE po.status <> 'CANCELLED'
        GROUP BY 1, 2
      ), returned AS (
        SELECT supplier_id, master_product_id, SUM(quantity) AS units_returned
        FROM purchase_returns GROUP BY 1, 2
      )
      SELECT r.*, s.name AS supplier_name, mp.sku, mp.title, mp.stock_quantity AS available_stock,
             COALESCE(ret.units_returned, 0) AS units_returned
      FROM received r
      JOIN suppliers s ON s.id = r.supplier_id
      JOIN master_products mp ON mp.id = r.master_product_id
      LEFT JOIN returned ret ON ret.supplier_id = r.supplier_id AND ret.master_product_id = r.master_product_id
      ORDER BY s.name, mp.title
    `;
    return rows.map((r) => {
      const unitsPurchased = Number(r.units_purchased);
      const totalCost = round2(Number(r.total_cost));
      const unitsReturned = Number(r.units_returned);
      return {
        supplierId: r.supplier_id,
        supplierName: r.supplier_name,
        masterProductId: r.master_product_id,
        sku: r.sku,
        title: r.title,
        unitsPurchased,
        totalCost,
        avgUnitCost: round2(safeDivide(totalCost, unitsPurchased) ?? 0),
        unitsReturned,
        returnRatePercent: round2((safeDivide(unitsReturned, unitsPurchased) ?? 0) * 100),
        availableStock: Number(r.available_stock),
        lastPurchasedAt: r.last_purchased_at,
      };
    });
  }
}
