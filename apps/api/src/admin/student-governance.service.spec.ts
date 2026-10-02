import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { KycStatus, OrderStatus, PayoutStatus, StoreStatus, UserRole } from "@repo/db";
import { StudentGovernanceService } from "./student-governance.service";

describe("StudentGovernanceService (Unit)", () => {
  let prisma: any;
  let redis: any;
  let permissions: any;
  let service: StudentGovernanceService;

  const draftStore = (productCount: number) => ({
    id: "store-1",
    slug: "fixture-store",
    storeName: "Fixture Store",
    customDomain: null,
    status: StoreStatus.DRAFT,
    _count: { storeProducts: productCount },
  });

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(async ({ data }: any) => ({ id: "stu-1", ...data })),
      },
      store: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(async ({ data }: any) => ({ id: "store-1", ...data })),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      storeProduct: { updateMany: vi.fn().mockResolvedValue({ count: 3 }) },
      order: { findMany: vi.fn().mockResolvedValue([]) },
      payoutRequest: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      branch: { findMany: vi.fn().mockResolvedValue([]) },
      $queryRaw: vi.fn().mockResolvedValue([]),
      $transaction: vi.fn(async (cb: any) => cb(prisma)),
    };
    redis = { del: vi.fn(), getClient: () => ({ incr: vi.fn() }) };
    permissions = { resolveUserPermissions: vi.fn().mockResolvedValue([]) };
    service = new StudentGovernanceService(prisma, redis, permissions);
  });

  describe("verifyKyc()", () => {
    it("marks the student verified and activates a fully set-up DRAFT store", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "stu-1", role: UserRole.STUDENT, stores: [draftStore(2)] });

      const result = await service.verifyKyc("stu-1", KycStatus.VERIFIED, "admin-1");

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isVerified: true, kycStatus: KycStatus.VERIFIED } }),
      );
      expect(prisma.store.update).toHaveBeenCalledWith({ where: { id: "store-1" }, data: { status: StoreStatus.ACTIVE } });
      expect(result.activatedStoreIds).toEqual(["store-1"]);
      expect(redis.del).toHaveBeenCalledWith("tenant:slug:fixture-store");
    });

    it("keeps the store in DRAFT when mandatory setup is incomplete", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "stu-1", role: UserRole.STUDENT, stores: [draftStore(0)] });
      const result = await service.verifyKyc("stu-1", KycStatus.VERIFIED);
      expect(prisma.store.update).not.toHaveBeenCalled();
      expect(result.activatedStoreIds).toEqual([]);
    });

    it("rejecting KYC clears verification and never activates stores", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "stu-1", role: UserRole.STUDENT, stores: [draftStore(2)] });
      await service.verifyKyc("stu-1", KycStatus.REJECTED);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isVerified: false, kycStatus: KycStatus.REJECTED } }),
      );
      expect(prisma.store.update).not.toHaveBeenCalled();
    });

    it("refuses to move KYC back to PENDING", async () => {
      await expect(service.verifyKyc("stu-1", KycStatus.PENDING)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws NotFound for unknown or non-student users", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "x", role: UserRole.SELLER, stores: [] });
      await expect(service.verifyKyc("x", KycStatus.VERIFIED)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("suspendStudent()", () => {
    it("suspends stores, hides products, and quarantines pending payouts in one transaction", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "stu-1",
        role: UserRole.STUDENT,
        stores: [{ id: "store-1", slug: "fixture-store", customDomain: "shop.example.com" }],
      });

      const result = await service.suspendStudent("stu-1", "Fraudulent listings", "admin-1");

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.store.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["store-1"] } },
        data: { status: StoreStatus.SUSPENDED },
      });
      expect(prisma.storeProduct.updateMany).toHaveBeenCalledWith({
        where: { storeId: { in: ["store-1"] }, isVisible: true },
        data: { isVisible: false },
      });
      expect(prisma.payoutRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { storeId: { in: ["store-1"] }, status: { in: [PayoutStatus.PENDING, PayoutStatus.APPROVED] } },
          data: expect.objectContaining({ status: PayoutStatus.HOLD }),
        }),
      );
      expect(result).toMatchObject({ productsHidden: 3, payoutsQuarantined: 1, suspendedStoreIds: ["store-1"] });
      expect(redis.del).toHaveBeenCalledWith("domain_map:shop.example.com");
    });

    it("propagates failures so the transaction rolls back and caches stay untouched", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "stu-1",
        role: UserRole.STUDENT,
        stores: [{ id: "store-1", slug: "s", customDomain: null }],
      });
      prisma.storeProduct.updateMany.mockRejectedValue(new Error("write failed"));
      await expect(service.suspendStudent("stu-1", "x", "admin-1")).rejects.toThrow("write failed");
      expect(redis.del).not.toHaveBeenCalled();
    });

    it("throws NotFound when the student has no store", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "stu-1", role: UserRole.STUDENT, stores: [] });
      await expect(service.suspendStudent("stu-1", "x", "a")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("calculateNetProfit()", () => {
    const completeOrder = {
      orderNumber: "ORD-1",
      status: OrderStatus.COMPLETE,
      platformCommission: 50,
      paymentFee: 10,
      refundDeductions: 20,
      items: [
        { unitSellingPrice: 1200, unitBasePrice: 900, quantity: 2 },
        { unitSellingPrice: "150.50", unitBasePrice: "100.25", quantity: 1 },
      ],
    };

    it("applies Σ(selling - base) - platform fee - payment fee - refunds", () => {
      // (300*2 + 50.25) - 50 - 10 - 20 = 570.25
      expect(service.calculateNetProfit([completeOrder])).toBe(570.25);
    });

    it("returns 0 for no orders", () => {
      expect(service.calculateNetProfit([])).toBe(0);
    });

    it("throws BadRequest when uncompleted orders are factored in", () => {
      expect(() =>
        service.calculateNetProfit([completeOrder, { ...completeOrder, orderNumber: "ORD-2", status: OrderStatus.DELIVERED }]),
      ).toThrow(BadRequestException);
    });
  });

  describe("NID masking", () => {
    it("redacts national ID for viewers without the KYC audit permission", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "stu-1", nationalId: "1990123456789", batchEnrollments: [] });
      const result: any = await service.getStudentById("stu-1", { id: "admin-1", role: UserRole.INSTITUTE_ADMIN });
      expect(result.nationalId).toBe("*********6789");
    });

    it("reveals national ID to KYC auditors", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "stu-1", nationalId: "1990123456789", batchEnrollments: [] });
      permissions.resolveUserPermissions.mockResolvedValue(["students:kyc_audit"]);
      const result: any = await service.getStudentById("stu-1", { id: "auditor", role: UserRole.INSTITUTE_ADMIN });
      expect(result.nationalId).toBe("1990123456789");
    });

    it("reveals national ID to super admins and enforces campus scope", async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: "stu-1",
        nationalId: "1990123456789",
        batchEnrollments: [{ batch: { branchId: "b-dhaka" } }],
      });
      // Super admin can audit without checking granular permission
      const superAdminRes: any = await service.getStudentById("stu-1", { id: "sa-1", role: UserRole.SUPER_ADMIN });
      expect(superAdminRes.nationalId).toBe("1990123456789");

      // Student not found throws
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.getStudentById("stu-none")).rejects.toThrow("Student with ID \"stu-none\" not found");

      // Campus scope violation
      prisma.user.findUnique.mockResolvedValueOnce({
        id: "stu-other",
        batchEnrollments: [{ batch: { branchId: "b-ctg" } }],
      });
      prisma.branch.findMany.mockResolvedValueOnce([{ id: "b-dhaka" }]);
      await expect(
        service.getStudentById("stu-other", { id: "mgr-1", role: UserRole.BRANCH_MANAGER }),
      ).rejects.toThrow("Student is not enrolled in a campus you manage");
    });
  });

  describe("updateStoreStatus()", () => {
    it("updates store status and invalidates domain cache if custom domain exists", async () => {
      prisma.store.findUnique.mockResolvedValueOnce(null);
      await expect(service.updateStoreStatus("s-missing", StoreStatus.ACTIVE)).rejects.toThrow("Store not found");

      prisma.store.findUnique.mockResolvedValueOnce({
        id: "s-1",
        slug: "shop-1",
        customDomain: "shop.example.com",
      });
      prisma.store.update.mockResolvedValueOnce({
        id: "s-1",
        status: StoreStatus.SUSPENDED,
        student: { id: "stu-1", fullName: "Student", email: "stu@example.com" },
      });

      const res = await service.updateStoreStatus("s-1", StoreStatus.SUSPENDED, "Rule violation", "admin-1");
      expect(res.reason).toBe("Rule violation");
      expect(redis.del).toHaveBeenCalledWith("tenant:slug:shop-1");
      expect(redis.del).toHaveBeenCalledWith("domain_map:shop.example.com");
    });
  });

  describe("getSellerScorecard()", () => {
    it("ranks stores by gross sales descending", async () => {
      prisma.store.findMany.mockResolvedValueOnce([
        {
          id: "s-1",
          storeName: "Store 1",
          slug: "s-1",
          status: StoreStatus.ACTIVE,
          ratingAvg: 4.5,
          totalReviewsCount: 10,
          completedOrdersCount: 5,
          responseRatePercent: 95,
          student: { fullName: "A", email: "a@test.com" },
          orders: [{ totalAmount: "1000.00", status: OrderStatus.COMPLETED }],
        },
        {
          id: "s-2",
          storeName: "Store 2",
          slug: "s-2",
          status: StoreStatus.ACTIVE,
          ratingAvg: 4.8,
          totalReviewsCount: 20,
          completedOrdersCount: 15,
          responseRatePercent: 98,
          student: { fullName: "B", email: "b@test.com" },
          orders: [{ totalAmount: "5000.00", status: OrderStatus.COMPLETED }],
        },
      ]);

      const scorecard = await service.getSellerScorecard();
      expect(scorecard).toHaveLength(2);
      expect(scorecard[0].storeId).toBe("s-2");
      expect(scorecard[0].grossSales).toBe(5000);
      expect(scorecard[1].storeId).toBe("s-1");
      expect(scorecard[1].grossSales).toBe(1000);
    });
  });

  describe("getProfitSummary()", () => {
    it("evaluates student profit, payouts, and flags ineligibility reasons", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "stu-1", batchEnrollments: [] });
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: "stu-1",
        isVerified: false,
        kycStatus: KycStatus.PENDING,
        stores: [{ id: "store-1" }],
      });
      prisma.order.findMany.mockResolvedValue([
        {
          id: "o-1",
          status: OrderStatus.COMPLETE,
          platformCommission: 50,
          paymentFee: 10,
          refundDeductions: 0,
          items: [{ unitSellingPrice: 500, unitBasePrice: 300, quantity: 1 }],
        },
      ]);
      prisma.payoutRequest.groupBy.mockResolvedValue([
        { status: PayoutStatus.PROCESSED, _sum: { amount: "50.00" } },
        { status: PayoutStatus.PENDING, _sum: { amount: "20.00" } },
      ]);

      const summary = await service.getProfitSummary("stu-1");
      expect(summary.netProfit).toBe(140);
      expect(summary.totalPaidOut).toBe(50);
      expect(summary.pendingPayouts).toBe(20);
      expect(summary.availableForPayout).toBe(70);
      expect(summary.eligibleForPayout).toBe(false);
      expect(summary.ineligibilityReasons).toContain("KYC verification is incomplete");
      expect(summary.ineligibilityReasons).toContain("Available profit is below the BDT 500 minimum payout");
    });
  });

  describe("getStudentPerformance()", () => {
    it("returns formatted aggregate rows and pagination metadata", async () => {
      prisma.$queryRaw.mockResolvedValueOnce([
        {
          id: "u-1",
          full_name: "John Doe",
          email: "john@example.com",
          phone: "01711111111",
          is_verified: true,
          kyc_status: "VERIFIED",
          store_id: "s-1",
          store_name: "Store 1",
          store_status: "ACTIVE",
          gross_sales: "10000.00",
          net_profit_earned: "3000.00",
          total_paid_out: "1000.00",
          completed_orders_count: "8",
          total_count: "1",
        },
      ]);

      const res = await service.getStudentPerformance({
        isVerified: true,
        storeStatus: StoreStatus.ACTIVE,
        search: "John",
        page: 1,
        limit: 10,
      });

      expect(res.data).toHaveLength(1);
      expect(res.data[0].grossSales).toBe(10000);
      expect(res.data[0].netProfitEarned).toBe(3000);
      expect(res.meta.total).toBe(1);

      // Empty results
      prisma.$queryRaw.mockResolvedValueOnce([]);
      const emptyRes = await service.getStudentPerformance({});
      expect(emptyRes.data).toHaveLength(0);
      expect(emptyRes.meta.total).toBe(0);
    });
  });
});
