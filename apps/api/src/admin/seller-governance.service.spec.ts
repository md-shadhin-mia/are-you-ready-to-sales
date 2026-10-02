import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AdjustmentStatus, AdjustmentType, SellerStatus, TicketPriority, TicketStatus } from "@repo/db";
import { SellerGovernanceService, computeVendorScore, DUAL_APPROVAL_THRESHOLD } from "./seller-governance.service";

describe("SellerGovernanceService (Unit)", () => {
  let prisma: any;
  let service: SellerGovernanceService;
  let seller: any;

  beforeEach(() => {
    seller = { id: "sel-1", balance: "5000.00", status: SellerStatus.APPROVED };
    prisma = {
      $queryRaw: vi.fn(async () => [{ id: "sel-1", balance: seller.balance }]),
      sellerProfile: {
        findUnique: vi.fn(async () => seller),
        findMany: vi.fn(async () => [seller]),
        groupBy: vi.fn(async () => [{ status: SellerStatus.APPROVED, _count: { _all: 1 } }]),
        aggregate: vi.fn(async () => ({ _sum: { balance: "5000.00" }, _avg: { complianceScore: 85 } })),
        update: vi.fn(async ({ data }: any) => ({ ...seller, ...data })),
      },
      sellerAdjustment: {
        create: vi.fn(async ({ data }: any) => ({ id: "adj-1", ...data })),
        findUnique: vi.fn(),
        findMany: vi.fn(async () => []),
        count: vi.fn(async () => 0),
        update: vi.fn(async ({ data }: any) => ({ id: "adj-1", ...data })),
      },
      order: {
        findMany: vi.fn(async () => []),
      },
      review: {
        aggregate: vi.fn(async () => ({ _avg: { productRating: 4.5 } })),
      },
      supportTicket: {
        create: vi.fn(async ({ data }: any) => ({ id: "t-1", ...data })),
        findUnique: vi.fn(async () => ({ id: "t-1", status: TicketStatus.OPEN, resolvedAt: null })),
        findMany: vi.fn(async () => []),
        groupBy: vi.fn(async () => []),
        count: vi.fn(async () => 0),
        update: vi.fn(async ({ data }: any) => ({ id: "t-1", ...data })),
      },
      masterProduct: { updateMany: vi.fn().mockResolvedValue({ count: 4 }) },
      storeProduct: { updateMany: vi.fn().mockResolvedValue({ count: 9 }) },
      user: { update: vi.fn() },
      $transaction: vi.fn(async (cb: any) => cb(prisma)),
    };
    service = new SellerGovernanceService(prisma);
  });

  const request = (amount: number, type: AdjustmentType = AdjustmentType.CREDIT) =>
    service.requestAdjustment(
      "sel-1",
      { type, amount, reasonCode: "COMMISSION_CORRECTION", documentUrl: "https://docs.example.com/memo.pdf" },
      "admin-a",
    );

  it(`adjustments above BDT ${DUAL_APPROVAL_THRESHOLD} stay PENDING_APPROVAL without touching the balance`, async () => {
    const adj = await request(15000);
    expect(adj.status).toBe(AdjustmentStatus.PENDING_APPROVAL);
    expect(prisma.sellerProfile.update).not.toHaveBeenCalled();
  });

  it("adjustments at or below the threshold apply immediately with a running balance", async () => {
    const adj = await request(10000);
    expect(adj).toMatchObject({ status: AdjustmentStatus.APPROVED, balanceAfter: 15000, approvedById: "admin-a" });
    expect(prisma.sellerProfile.update).toHaveBeenCalledWith({ where: { id: "sel-1" }, data: { balance: 15000 } });
  });

  it("debits cannot overdraw the seller balance", async () => {
    await expect(request(6000, AdjustmentType.DEBIT)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("the requesting admin cannot provide the second approval", async () => {
    prisma.sellerAdjustment.findUnique.mockResolvedValue({
      id: "adj-1",
      sellerId: "sel-1",
      type: AdjustmentType.CREDIT,
      amount: "15000.00",
      status: AdjustmentStatus.PENDING_APPROVAL,
      requestedById: "admin-a",
    });
    await expect(service.approveAdjustment("adj-1", "admin-a")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("a second supervisor's approval applies the pending adjustment", async () => {
    prisma.sellerAdjustment.findUnique.mockResolvedValue({
      id: "adj-1",
      sellerId: "sel-1",
      type: AdjustmentType.CREDIT,
      amount: "15000.00",
      status: AdjustmentStatus.PENDING_APPROVAL,
      requestedById: "admin-a",
    });
    const approved = await service.approveAdjustment("adj-1", "admin-b");
    expect(approved).toMatchObject({ status: AdjustmentStatus.APPROVED, approvedById: "admin-b", balanceAfter: 20000 });
  });

  it("deactivating a seller cascades to unpublishing all of their items", async () => {
    const result = await service.deactivateSeller("sel-1", "Counterfeit goods");
    expect(prisma.masterProduct.updateMany).toHaveBeenCalledWith({ where: { sellerId: "sel-1" }, data: { isActive: false } });
    expect(prisma.storeProduct.updateMany).toHaveBeenCalledWith({
      where: { masterProduct: { sellerId: "sel-1" }, isVisible: true },
      data: { isVisible: false },
    });
    expect(result).toMatchObject({ status: SellerStatus.SUSPENDED, productsDeactivated: 4, listingsHidden: 9 });
  });

  describe("computeVendorScore()", () => {
    it("weights on-time dispatch 40%, review quality 40%, dispute resolution 20%", () => {
      // 0.9*100*0.4 + (4.5/5)*100*0.4 + 0.5*100*0.2 = 36 + 36 + 10
      expect(computeVendorScore({ onTimeDispatchRate: 0.9, qualityReviewAvg: 4.5, disputeResolutionRate: 0.5 })).toBe(82);
    });

    it("clamps inputs to valid ranges", () => {
      expect(computeVendorScore({ onTimeDispatchRate: 2, qualityReviewAvg: 9, disputeResolutionRate: -1 })).toBe(80);
    });
  });

  describe("adjustments & validations", () => {
    it("rejects an adjustment with reason notes", async () => {
      prisma.sellerAdjustment.findUnique.mockResolvedValueOnce({
        id: "adj-1",
        status: AdjustmentStatus.PENDING_APPROVAL,
      });

      const res = await service.rejectAdjustment("adj-1", "admin-b", "Incorrect calculation");
      expect(prisma.sellerAdjustment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AdjustmentStatus.REJECTED,
            notes: "Incorrect calculation",
          }),
        }),
      );
    });

    it("validates adjustment inputs: seller must exist and amount > 0", async () => {
      prisma.sellerProfile.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.requestAdjustment("sel-missing", { amount: 100, type: AdjustmentType.CREDIT } as any, "admin-1"),
      ).rejects.toThrow("Seller not found");

      await expect(
        service.requestAdjustment("sel-1", { amount: 0, type: AdjustmentType.CREDIT } as any, "admin-1"),
      ).rejects.toThrow("Adjustment amount must be positive");
    });

    it("validates pending adjustment: must exist and be PENDING_APPROVAL", async () => {
      prisma.sellerAdjustment.findUnique.mockResolvedValueOnce(null);
      await expect(service.approveAdjustment("adj-missing", "admin-b")).rejects.toThrow(NotFoundException);

      prisma.sellerAdjustment.findUnique.mockResolvedValueOnce({
        id: "adj-1",
        status: AdjustmentStatus.APPROVED,
      });
      await expect(service.approveAdjustment("adj-1", "admin-b")).rejects.toThrow(ConflictException);
    });

    it("lists adjustments with filters", async () => {
      prisma.sellerAdjustment.findMany.mockResolvedValueOnce([
        { id: "adj-1", amount: "500.00", seller: { companyName: "Apex" } },
      ]);
      prisma.sellerAdjustment.count.mockResolvedValueOnce(1);

      const res = await service.listAdjustments({ sellerId: "sel-1", status: AdjustmentStatus.APPROVED });
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });

    it("deactivateSeller throws NotFoundException if seller not found", async () => {
      prisma.sellerProfile.findUnique.mockResolvedValueOnce(null);
      await expect(service.deactivateSeller("sel-missing", "Fraud")).rejects.toThrow(NotFoundException);
    });
  });

  describe("support tickets", () => {
    it("creates, lists, and updates support tickets including resolution timestamp", async () => {
      // Create ticket
      const ticket = await service.createTicket({
        sellerId: "sel-1",
        subject: "Payout inquiry",
        message: "When will payout arrive?",
      });
      expect(ticket.id).toBe("t-1");

      // Seller not found
      prisma.sellerProfile.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.createTicket({ sellerId: "sel-none", subject: "S", message: "M" }),
      ).rejects.toThrow(NotFoundException);

      // List tickets with various filter combinations
      prisma.supportTicket.findMany.mockResolvedValueOnce([{ id: "t-1" }]);
      prisma.supportTicket.count.mockResolvedValueOnce(1);
      const list = await service.listTickets({ status: TicketStatus.OPEN });
      expect(list.data).toHaveLength(1);

      prisma.supportTicket.findMany.mockResolvedValueOnce([]);
      prisma.supportTicket.count.mockResolvedValueOnce(0);
      const listBySellerOnly = await service.listTickets({ sellerId: "sel-1" });
      expect(listBySellerOnly.data).toHaveLength(0);

      prisma.supportTicket.findMany.mockResolvedValueOnce([]);
      prisma.supportTicket.count.mockResolvedValueOnce(0);
      const listAll = await service.listTickets({});
      expect(listAll.data).toHaveLength(0);

      // Update ticket to RESOLVED (sets resolvedAt when previously null)
      await service.updateTicket("t-1", { status: TicketStatus.RESOLVED });
      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: TicketStatus.RESOLVED, resolvedAt: expect.any(Date) }),
        }),
      );

      // Update ticket to CLOSED when resolvedAt is already set (does not re-set resolvedAt)
      prisma.supportTicket.findUnique.mockResolvedValueOnce({
        id: "t-1",
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date(),
      });
      await service.updateTicket("t-1", { status: TicketStatus.CLOSED });

      // Update ticket to IN_PROGRESS (not closing, does not set resolvedAt)
      prisma.supportTicket.findUnique.mockResolvedValueOnce({
        id: "t-1",
        status: TicketStatus.OPEN,
        resolvedAt: null,
      });
      await service.updateTicket("t-1", { status: TicketStatus.IN_PROGRESS });

      // Ticket not found
      prisma.supportTicket.findUnique.mockResolvedValueOnce(null);
      await expect(service.updateTicket("t-missing", { status: TicketStatus.CLOSED })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("recomputeScorecards() and overview()", () => {
    it("recomputes scorecards and updates seller compliance score with full history", async () => {
      prisma.sellerProfile.findMany.mockResolvedValueOnce([
        { id: "sel-1", companyName: "Apex Goods" },
      ]);
      const now = new Date();
      prisma.order.findMany.mockResolvedValueOnce([
        { createdAt: new Date(now.getTime() - 3600000), invoicedAt: now }, // 1 hour = on time
        { createdAt: new Date(now.getTime() - 7200000), invoicedAt: null }, // un-invoiced
        { createdAt: new Date(now.getTime() - 200 * 3600000), invoicedAt: now }, // late (> 48h)
      ]);
      prisma.review.aggregate.mockResolvedValueOnce({
        _avg: { productRating: 4.8 },
      });
      prisma.supportTicket.groupBy.mockResolvedValueOnce([
        { status: TicketStatus.RESOLVED, _count: { _all: 2 } },
        { status: TicketStatus.CLOSED, _count: { _all: 1 } },
        { status: TicketStatus.OPEN, _count: { _all: 1 } },
      ]);

      const cards = await service.recomputeScorecards();
      expect(cards).toHaveLength(1);
      expect(cards[0].sellerId).toBe("sel-1");
      expect(cards[0].score).toBeGreaterThan(0);
      expect(prisma.sellerProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sel-1" },
          data: { complianceScore: expect.any(Number) },
        }),
      );
    });

    it("recomputes scorecards with empty/neutral history for new sellers", async () => {
      prisma.sellerProfile.findMany.mockResolvedValueOnce([
        { id: "sel-2", companyName: "New Shop" },
      ]);
      prisma.order.findMany.mockResolvedValueOnce([]);
      prisma.review.aggregate.mockResolvedValueOnce({
        _avg: { productRating: null },
      });
      prisma.supportTicket.groupBy.mockResolvedValueOnce([]);

      const cards = await service.recomputeScorecards();
      expect(cards).toHaveLength(1);
      expect(cards[0].onTimeDispatchRate).toBe(1);
      expect(cards[0].qualityReviewAvg).toBe(5);
      expect(cards[0].disputeResolutionRate).toBe(1);
      expect(cards[0].score).toBe(100);
    });

    it("aggregates overview metrics for all sellers and support tickets including null aggregates", async () => {
      const summary = await service.overview();
      expect(summary.totalSellers).toBe(1);
      expect(summary.activeSellers).toBe(1);
      expect(summary.pendingSellers).toBe(0);
      expect(summary.suspendedSellers).toBe(0);

      // Null aggregate test
      prisma.sellerProfile.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prisma.sellerProfile.aggregate.mockResolvedValueOnce({
        _sum: { balance: null },
        _avg: { complianceScore: null },
      });
      prisma.sellerAdjustment.count.mockResolvedValueOnce(0);
      prisma.supportTicket.count.mockResolvedValueOnce(0);

      const emptySummary = await service.overview();
      expect(emptySummary.totalSellers).toBe(0);
      expect(emptySummary.totalSellerBalance).toBe(0);
      expect(emptySummary.averageComplianceScore).toBe(0);
    });

    it("throws NotFoundException if seller row is missing when locking during applyToBalance", async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]);
      await expect(
        service.requestAdjustment("sel-1", {
          amount: 500,
          type: AdjustmentType.CREDIT,
          reasonCode: "BONUS",
          documentUrl: "https://example.com/doc.pdf",
        }, "admin-a"),
      ).rejects.toThrow(NotFoundException);
    });

    it("listAdjustments handles empty filter and partial filters", async () => {
      prisma.sellerAdjustment.findMany.mockResolvedValue([]);
      prisma.sellerAdjustment.count.mockResolvedValue(0);

      await service.listAdjustments({});
      await service.listAdjustments({ sellerId: "sel-1" });
      await service.listAdjustments({ status: AdjustmentStatus.PENDING_APPROVAL });
    });
  });
});
