# Phase 5: Platform Operations & Monetization — Implementation Tasks

**Phase:** Phase 5 — Platform Operations & Monetization  
**Features Covered:**  
- Feature 16: Institute Admin Portal & Operational Hub (Dashboards [01], Students Expandable, Branches, Batches, Orders 11-status engine, Seller Panel, Payment Requests [3])
- Feature 17: Business Model / Monetization & Financial Ledger  
- Feature 18: Platform Roles & Permissions (Dynamic RBAC)  
**Source Documents:** [`docs/implementation_priority.md`](../implementation_priority.md), [`docs/features.md`](../features.md), [`docs/business_logic.md`](../business_logic.md), [`docs/tech_stack.md`](../tech_stack.md), [`docs/prd.md`](../prd.md)  
**Status:** Ready for Implementation (Prerequisites: Phases 1, 2, 3 & 4)  

---

## 1. Phase Overview & Objectives

Phase 5 completes the platform by scaling the institute's operational governance, deploying the enterprise Admin Portal, and realizing its monetization model. As hundreds of students launch stores across multiple campus branches and cohorts, the institute requires top-down operational visibility, student verification, seller performance auditing, and an immutable double-entry financial settlement ledger for student payouts.

### Target Outcomes
1. **Executive Dashboards with Alert Indicator (`01`):** Real-time monitoring of GMV, store health, pipeline velocity, and priority alert counters.
2. **Expandable Student Management Suite:** Searchable student profiles, KYC document audit workbench, academic and commercial performance records, and one-click store suspension controls.
3. **Campus Branches Management:** Physical and digital campus administration, branch coordinator assignments, regional hub links, and branch-level analytics.
4. **Student Batches & Cohort Scheduling:** Cohort creation, calendar scheduling, student enrollment mapping, faculty/mentor assignment, and cohort commercial sales leaderboards.
5. **Orders Multi-Status Operations Console (11 Queues):** Dedicated operational queues and counters for Order Overview, All Orders (9410), New Orders (8), Complete Orders (0), Partial Delivered (233), Unmatch Orders (4035), Invoiced Orders (8778), Hold Orders (29), Cancelled Orders (131), In Courier (9243), and Exchange Orders.
6. **External Seller Panel:** Onboarding third-party merchants and instructors, commission & wholesale pricing tiers, and compliance scorecards.
7. **Payment Requests Queue & Financial Settlement:** Payout requests queue with real-time pending badge (`3`), immutable ledger validation, bank/MFS disbursement auditing with transaction reference IDs, and rejection workflows.
8. **Dynamic Granular RBAC & Subscription Plans:** Flexible database-backed permissions matrix and tiered student subscriptions.

---

## 2. Architecture & Codebase Layout

```
├── apps/
│   ├── api/src/
│   │   ├── admin/                    # Platform-wide KPIs, branches, batches, sellers & governance controllers
│   │   ├── orders/                   # Multi-status order queues & lifecycle transitions
│   │   ├── finance/                  # Append-only ledger, balance calculator, payout engine
│   │   ├── subscriptions/            # Subscription plans, quotas, and feature gating
│   │   └── auth/                     # Dynamic RBAC guards & permission evaluator
│   ├── admin-dashboard/src/
│   │   ├── components/AdminLayout.tsx# Navigation shell with notification bubble [01] & status badges
│   │   ├── pages/dashboards/         # Executive overview & urgent alerts [01]
│   │   ├── pages/students/           # Expandable student directory, verification, records & restrictions
│   │   ├── pages/branches/           # Campus locations (Physical & Digital)
│   │   ├── pages/batches/            # Student batches & cohort schedules
│   │   ├── pages/orders/             # Expanded 11-status order queues (All, New, Complete, Partial, Unmatch, etc.)
│   │   ├── pages/sellers/            # External merchant & instructor settings
│   │   ├── pages/payouts/            # Financial payment requests queue [3] & settlement auditing
│   │   ├── pages/subscriptions/      # Subscription plans & fee management
│   │   └── pages/roles/              # Role & permission matrix manager
│   └── student-dashboard/src/
│       ├── pages/wallet/             # Earnings balance, payout request, ledger statement
│       └── pages/billing/            # Subscription plan tiers & upgrade screen
└── packages/
    └── db/prisma/schema.prisma       # Added Branch, StudentBatch, BatchEnrollment, SellerProfile, PayoutRequest, Subscription, Permission
```

---

## 3. Detailed Work Breakdown

### 3.1 Database & Schema Implementation (`packages/db`)

- [x] **Task 5.1: Monetization, Operations & Dynamic RBAC Schema Expansion**
  - Update `packages/db/prisma/schema.prisma`:
    - Model `Branch`:
      - `id` (UUID), `name` (String), `code` (String unique — e.g. `DHK-MAIN`, `CTG-HUB`), `branchType` (Enum: `PHYSICAL`, `DIGITAL`).
      - `address` (Text nullable), `city` (String nullable), `contactPhone` (String nullable), `contactEmail` (String nullable).
      - `managerId` (FK User nullable), `isActive` (Boolean default true), timestamps.
    - Model `StudentBatch`:
      - `id` (UUID), `branchId` (FK Branch nullable), `name` (String), `batchCode` (String unique — e.g. `BATCH-2026-A`).
      - `instructorId` (FK User nullable), `startDate` (DateTime), `endDate` (DateTime nullable), `maxCapacity` (Int default 50).
      - `status` (Enum: `UPCOMING`, `ACTIVE`, `COMPLETED`), timestamps.
    - Model `BatchEnrollment`:
      - `id` (UUID), `batchId` (FK StudentBatch), `studentId` (FK User).
      - `status` (Enum: `ENROLLED`, `GRADUATED`, `DROPPED`), `enrolledAt` (DateTime default now).
      - Unique constraint `[batchId, studentId]`.
    - Model `SellerProfile`:
      - `id` (UUID), `userId` (FK User unique), `companyName` (String), `sellerType` (Enum: `MERCHANT`, `INSTRUCTOR`, `SUPPLIER`).
      - `tradeLicenseNumber` (String nullable), `tinBinNumber` (String nullable), `commissionRate` (Decimal default 5.00).
      - `complianceScore` (Decimal default 100.00), `status` (Enum: `PENDING`, `APPROVED`, `SUSPENDED`), timestamps.
    - Update `OrderStatus` Enum:
      - Add values: `NEW`, `INVOICED`, `IN_COURIER`, `PARTIAL_DELIVERED`, `COMPLETE`, `HOLD`, `CANCELLED`, `UNMATCH`, `EXCHANGE`.
    - Model `Permission`:
      - `id` (UUID), `slug` (String unique — e.g. `catalog:create`, `orders:dispatch`, `finance:payout`, `students:suspend`, `reports:view`).
      - `name` (String), `description` (Text), `module` (String).
    - Model `Role`:
      - `id` (UUID), `name` (String unique), `description` (Text nullable), `isSystemRole` (Boolean default false).
    - Model `RolePermission`:
      - `roleId` (FK Role), `permissionId` (FK Permission).
      - Primary Key `[roleId, permissionId]`.
    - Model `UserRoleAssignment`:
      - `userId` (FK User), `roleId` (FK Role).
      - Primary Key `[userId, roleId]`.
    - Model `PayoutRequest`:
      - `id` (UUID), `storeId` (FK Store nullable), `studentId` (FK User), `sellerId` (FK SellerProfile nullable).
      - `amount` (Decimal), `paymentMethod` (Enum: `BKASH`, `NAGAD`, `BANK_TRANSFER`).
      - `accountDetails` (Jsonb — e.g. bank account number, MFS phone).
      - `status` (Enum: `PENDING`, `APPROVED`, `REJECTED`, `PROCESSED`).
      - `transactionReference` (String nullable), `adminNotes` (Text nullable), `reviewedById` (FK User nullable).
      - Timestamps. Indices on `studentId`, `status`.
    - Model `SubscriptionPlan`:
      - `id` (UUID), `name` (String — `Free`, `Starter`, `Professional`, `Business`), `code` (String unique).
      - `monthlyPrice` (Decimal), `yearlyPrice` (Decimal).
      - `maxProducts` (Int), `allowCustomDomain` (Boolean), `platformCommissionPercent` (Decimal), `features` (Text[]).
      - `isActive` (Boolean default true).
    - Model `StudentSubscription`:
      - `id` (UUID), `studentId` (FK User unique), `planId` (FK SubscriptionPlan).
      - `status` (Enum: `ACTIVE`, `PAST_DUE`, `CANCELLED`), `currentPeriodStart` (DateTime), `currentPeriodEnd` (DateTime).
  - Create and apply migration `0005_operations_and_monetization`.
  - Update seed script with core system roles, standard permissions matrix, default branches, sample batches, and default subscription tiers.

---

### 3.2 Backend Implementation (`apps/api`)

- [x] **Task 5.2: Dynamic RBAC Guard & Permission Service (`auth`)**
  - Implement `DynamicPermissionsGuard`:
    - Reads `@RequirePermission('orders:dispatch')` decorator on controllers/routes.
    - Queries user roles and associated permissions (cached in Redis with 10-minute TTL).
    - Grants access if user has `*` permission (Super Admin) or specific permission slug.
    - Throws `403 Forbidden ("Insufficient permissions: orders:dispatch required")`.
  - Implement Role & Permission Management Endpoints:
    - `GET /api/v1/admin/roles`: List all roles with attached permissions.
    - `POST /api/v1/admin/roles`: Create custom staff role.
    - `PUT /api/v1/admin/roles/:id/permissions`: Assign permissions to role.
    - `POST /api/v1/admin/users/:id/roles`: Assign role to staff member.

- [x] **Task 5.3: Immutable Financial Ledger & Wallet Service (`finance`)**
  - Implement `LedgerService`:
    - Append-only transaction rule: no updating or deleting rows in `ledger_entries`.
    - `recordOrderProfit(orderId, storeId, netProfit)`: Writes `ORDER_PROFIT` credit entry.
    - `recordPlatformFee(orderId, storeId, commission)`: Writes `PLATFORM_FEE` entry.
    - `getStoreBalance(storeId)`: Computes current balance:
      $$\text{Balance} = \sum(\text{Credits}) - \sum(\text{Debits})$$
    - Transactional verification guaranteeing balance never drops below zero.
  - Implement Payout Workflow Endpoints:
    - `POST /api/v1/student/wallet/withdraw`:
      - Student submits payout request for amount $A$.
      - Verification: $A \ge \text{MinPayout} (৳500)$ and $A \le \text{AvailableBalance}$.
      - Creates `PayoutRequest` in `PENDING` state and writes pending debit hold.
    - `GET /api/v1/student/wallet/statement`: Returns paginated ledger statement with running balance.
    - `GET /api/v1/admin/finance/payouts`: Admin queue of pending withdrawal requests.
    - `POST /api/v1/admin/finance/payouts/:id/approve`:
      - Guard: requires `finance:payout` permission.
      - Input: `transactionReference` (e.g. Bank/bKash TrxID).
      - Appends `PAYOUT_WITHDRAWAL` debit to `ledger_entries`, updates request to `PROCESSED`.
    - `POST /api/v1/admin/finance/payouts/:id/reject`:
      - Reverts pending hold, restores student available balance, notes rejection reason.

- [x] **Task 5.4: Subscription Plans & Quota Enforcement (`subscriptions`)**
  - Implement `SubscriptionService`:
    - `GET /api/v1/subscriptions/plans`: Public list of available subscription tiers.
    - `GET /api/v1/student/subscription`: Get active subscription tier and limits.
    - `POST /api/v1/student/subscription/upgrade`: Upgrade plan.
  - Implement Subscription Quota Guard:
    - When student imports product from catalog: check `currentProductCount < plan.maxProducts`. If exceeded, throw `403 Forbidden ("Upgrade to Professional plan to import more than 30 products")`.
    - When student configures custom domain: check `plan.allowCustomDomain == true`.

- [x] **Task 5.5: Executive Dashboards & Alert Notification Engine (`admin`)**
  - Implement `InstituteDashboardService.getOverviewMetrics()`:
    - Platform Gross Merchandise Value (GMV), net platform revenue, active stores count, registered students.
    - Today's new order volume, pick-and-pack backlog, active courier transit count, and delayed shipment flags.
  - Implement Urgent Alert Evaluator (`AlertService`):
    - Computes actionable urgent operational alerts (returns `urgentAlertsCount: 1` for alert bubble `01`).
    - Alert triggers: pending payout requests awaiting audit > 24 hours, unfulfilled orders > 48 hours, or critical merchant compliance reports.
  - Endpoints:
    - `GET /api/v1/admin/dashboard/overview` (Guarded: `INSTITUTE_ADMIN`, `SUPER_ADMIN`).
    - `GET /api/v1/admin/dashboard/alerts` (List active urgent alerts with priority levels and direct action routes).

- [x] **Task 5.6: Expandable Students Governance & KYC API (`admin`)**
  - Implement `StudentGovernanceService`:
    - Searchable directory with multi-field filters (Search by student name, phone, NID, store subdomain `{slug}.platform.com`, branch, batch, account status).
    - Identity verification workbench: review submitted National ID (NID), passport, and student verification files.
    - Academic & commercial records aggregation: combines course milestone progress with real store GMV and net profit earned.
    - One-click account suspension mechanism with required audit reason notes.
  - Endpoints:
    - `GET /api/v1/admin/students` (Paginated list with filters).
    - `GET /api/v1/admin/students/:id` (Full student detail, KYC docs, enrolled batches, linked store metrics).
    - `PATCH /api/v1/admin/students/:id/status` (Suspend or activate student store with audit reason note).
    - `POST /api/v1/admin/students/:id/verify-kyc` (Approve or reject KYC documents).

- [x] **Task 5.7: Campus Branches & Regional Logistics API (`admin`)**
  - Implement `BranchService`:
    - Campus profile management (Dhaka Main Campus, Chittagong Regional Hub, Sylhet Digital Center, Virtual Campus).
    - Assign campus directors and coordinators with branch-scoped data isolation.
    - Map local fulfillment depots, warehouse pickup points, and delivery zones to specific branches.
    - Compute branch-wise student enrollment, store activity, and gross commercial sales.
  - Endpoints:
    - `GET /api/v1/admin/branches`: List all physical and digital campus branches with student counts.
    - `POST /api/v1/admin/branches`: Create new branch (name, code, branchType, address, managerId).
    - `PUT /api/v1/admin/branches/:id`: Update branch metadata and assigned campus manager.
    - `GET /api/v1/admin/branches/:id/analytics`: Branch-scoped sales and store performance metrics.

- [x] **Task 5.8: Student Batches & Cohort Scheduling API (`admin`)**
  - Implement `StudentBatchService`:
    - Cohort definition engine (batch code e.g. `BATCH-2026-A`, branchId, instructorId, start/end dates, maxCapacity).
    - Student bulk enrollment mapping (individual assignment or batch CSV import).
    - Training instructor / mentor assignment per batch.
    - Real-time cohort commercial leaderboard comparing aggregate revenue, order volume, and milestone completion.
  - Endpoints:
    - `GET /api/v1/admin/batches`: List cohorts filtered by branchId and status.
    - `POST /api/v1/admin/batches`: Create cohort.
    - `POST /api/v1/admin/batches/:id/enrollments`: Bulk enroll students into batch.
    - `GET /api/v1/admin/batches/:id/leaderboard`: Batch commercial performance ranking.

- [x] **Task 5.9: Orders Multi-Status Fulfillment API (`orders` + `admin`)**
  - Implement `AdminOrdersService`:
    - Multi-status queue aggregator returning counts for all 11 status categories:
      `{ all: 9410, new: 8, complete: 0, partialDelivered: 233, unmatch: 4035, invoiced: 8778, hold: 29, cancelled: 131, inCourier: 9243, exchange: 14 }`.
    - Batch tax invoice generation: locks line items, issues invoice number, transitions order to `INVOICED`.
    - Hold transaction management: pauses order with required reason (customer delivery reschedule, phone verification, stock).
    - Discrepancy quarantine & audit reconciliation (`UNMATCH`): flags barcode mismatch, SKU desync, or price difference.
    - 3PL Courier dispatch: assigns courier tracking number (Pathao, Steadfast, RedX) and updates state to `IN_COURIER`.
    - Exchange workflow: initiates replacement or course swap transaction without corrupting original financial ledger.
  - Endpoints:
    - `GET /api/v1/admin/orders/counts`: Return count metrics across all 11 order queues.
    - `GET /api/v1/admin/orders`: Filterable by status (`NEW`, `INVOICED`, `IN_COURIER`, `PARTIAL_DELIVERED`, `COMPLETE`, `HOLD`, `CANCELLED`, `UNMATCH`, `EXCHANGE`).
    - `POST /api/v1/admin/orders/:id/invoice`: Generate tax bill and transition order to `INVOICED`.
    - `POST /api/v1/admin/orders/:id/hold`: Pause order with reason.
    - `POST /api/v1/admin/orders/:id/unmatch/flag` & `POST /api/v1/admin/orders/:id/unmatch/reconcile`.
    - `POST /api/v1/admin/orders/:id/dispatch`: Attach courier tracking and transition to `IN_COURIER`.
    - `POST /api/v1/admin/orders/:id/exchange`: Process item swap or damaged replacement.

- [x] **Task 5.10: External Seller Panel & Merchant Governance API (`admin`)**
  - Implement `SellerGovernanceService`:
    - Onboarding registry for third-party brand suppliers and external instructors.
    - Commission & wholesale base price agreement configuration per seller.
    - Seller performance scorecards (fulfillment SLA, defect rates, dispute logs, customer review scores).
  - Endpoints:
    - `GET /api/v1/admin/sellers`: List external merchants and instructors.
    - `POST /api/v1/admin/sellers`: Onboard new merchant or instructor partner.
    - `POST /api/v1/admin/sellers/:id/commission`: Set custom wholesale margins and commission rates.
    - `GET /api/v1/admin/sellers/:id/scorecard`: Audit seller fulfillment speed, defect rates, and complaints.

- [x] **Task 5.11: Financial Payment Requests & Settlement API (`finance` + `admin`)**
  - Implement `PaymentRequestService`:
    - High-priority pending payout request queue with real-time count indicator (`3`).
    - Automated ledger validation checking available cleared net profit before permitting disbursement.
    - Multi-channel payout execution (bKash Merchant/Disbursement, Nagad, BEFTN bank wire).
    - Transaction reference recording (e.g. `BK-981188-TRX`) and ledger debit posting upon approval.
    - Rejection workflow with documented remarks, immediately restoring held balance to student wallet.
  - Endpoints:
    - `GET /api/v1/admin/finance/payment-requests`: Pending withdrawal queue (with count indicator `3`).
    - `POST /api/v1/admin/finance/payment-requests/:id/approve`: Settle payout with external transaction reference.
    - `POST /api/v1/admin/finance/payment-requests/:id/reject`: Reject with documented notes and unlock held wallet balance.

---

### 3.3 Frontend Implementation (`apps/admin-dashboard` & `apps/student-dashboard`)

- [x] **Task 5.12: Admin Portal Navigation Shell & Layout (`apps/admin-dashboard`)**
  - File: `apps/admin-dashboard/src/components/AdminLayout.tsx`
  - Implement persistent sidebar with active tab highlighting and dynamic badges:
    1. **Dashboards** (displays red notification alert bubble `01`).
    2. **Students** (expandable accordion menu: *Directory & Profiles*, *Verification & KYC*, *Student Records*, *Restrictions*).
    3. **Branches** (campus locations navigation).
    4. **Student Batches** (cohorts and class scheduling navigation).
    5. **Orders** (expanded menu with 11 live count indicators):
       - *Order Overview*
       - *All Orders (9410)*
       - *New Orders (8)*
       - *Complete Orders (0)*
       - *Partial Delivered (233)*
       - *Unmatch Orders (4035)*
       - *Invoiced Orders (8778)*
       - *Hold Orders (29)*
       - *Cancelled Orders (131)*
       - *In Courier (9243)*
       - *Exchange Orders*
    6. **Seller Panel** (external merchant & instructor settings).
    7. **Payment Requests** (financial payout requests with pending badge count `3`).
    - *Master Catalog & Categories* sub-navigation under Catalog.
  - Top bar with admin profile dropdown, branch switcher, and system status indicator.

- [x] **Task 5.13: Executive Dashboards Screen (`apps/admin-dashboard`)**
  - File: `apps/admin-dashboard/src/pages/dashboards/ExecutiveDashboardPage.tsx`
  - Real-time financial metric cards (Platform GMV, Net Margin, Active Stores count, Registered Students).
  - Urgent alert banner displaying the `01` actionable notification with quick-action links.
  - Warehouse dispatch velocity charts & 3PL delivery SLA gauges.

- [x] **Task 5.14: Expandable Students Governance Suite (`apps/admin-dashboard`)**
  - File: `apps/admin-dashboard/src/pages/students/StudentGovernancePage.tsx`
  - Searchable master roster with tabs for *Directory*, *KYC Review*, *Records*, *Suspensions*.
  - Student profile modal showing enrolled batches, store subdomain, and live store toggle.
  - Document review modal: zoomable NID/Passport preview with "Verify" and "Reject" actions.
  - "Suspend Store" dialog: Reason dropdown (Fraud, Policy Violation, Inactive) + audit note.

- [x] **Task 5.15: Campus Branches Management Screen (`apps/admin-dashboard`)**
  - File: `apps/admin-dashboard/src/pages/branches/BranchesPage.tsx`
  - Campus location cards (Dhaka, Chittagong, Sylhet, Digital Campus) with manager assignment.
  - "Add/Edit Branch" modal: configure branch code, physical address, and associated warehouse hub.
  - Branch analytics drawer: comparative sales and student store density.

- [x] **Task 5.16: Student Batches & Cohorts Screen (`apps/admin-dashboard`)**
  - File: `apps/admin-dashboard/src/pages/batches/BatchesPage.tsx`
  - Cohort schedule calendar and batch list table.
  - "Create Batch" drawer: batch code, branch selector, instructor assignment, start/end dates, max capacity.
  - "Student Assignment" modal: bulk CSV student import or checkbox selection.
  - Cohort commercial sales leaderboard.

- [x] **Task 5.17: Orders Multi-Status Operations Console (`apps/admin-dashboard`)**
  - File: `apps/admin-dashboard/src/pages/orders/OrdersOperationsPage.tsx`
  - Tabbed status bar with active volume badges (Overview, 9410, 8, 0, 233, 4035, 8778, 29, 131, 9243, Exchange).
  - Quick-action modals:
    - "Generate Invoice": Batch invoice creation transitioning new orders to `INVOICED`.
    - "Put on Hold": Pause orders with reason.
    - "Resolve Unmatch Discrepancy": Reconcile barcode/SKU mismatch.
    - "Dispatch Order": Select courier (Pathao / Steadfast / RedX / Paperfly), input tracking ID.
    - "Initiate Exchange": Process product/course swap.
  - Order detail drawer showing student store attribution, wholesale cost, and delivery details.

- [x] **Task 5.18: Seller Panel Screen (`apps/admin-dashboard`)**
  - File: `apps/admin-dashboard/src/pages/sellers/SellerPanelPage.tsx`
  - External merchant and instructor table with status badges (`PENDING`, `APPROVED`, `SUSPENDED`).
  - Commission rate editor modal and compliance scorecard drawer.

- [x] **Task 5.19: Financial Payment Requests Approval Portal (`apps/admin-dashboard`)**
  - File: `apps/admin-dashboard/src/pages/payouts/PayoutApprovalPage.tsx`
  - Data table of pending withdrawal requests with badge `3`.
  - Double-entry ledger validation check indicator.
  - "Approve & Settle" modal: Enter bank transaction reference or bKash TrxID, attach PDF receipt.
  - Downloadable CSV platform revenue reports.

- [x] **Task 5.20: Dynamic Roles & Permissions Matrix (`apps/admin-dashboard`)**
  - File: `apps/admin-dashboard/src/pages/roles/RolesManagerPage.tsx`
  - Role creation drawer.
  - Checkbox matrix grouped by domain: Catalog (`view`, `create`, `update`, `stock`), Orders (`dispatch`, `cancel`, `refund`), Finance (`view_ledger`, `approve_payout`), Governance (`suspend_student`).

- [x] **Task 5.21: Student Wallet & Billing Suite (`apps/student-dashboard`)**
  - Student Wallet & Earnings Screen (`/wallet`):
    - Cards: Available Balance (`৳14,200`), Pending Clearance (`৳2,500`), Total Withdrawn (`৳45,000`).
    - "Request Payout" button & modal:
      - Select payout method: bKash, Nagad, Bank Transfer.
      - Input account details, amount.
      - Live balance validation feedback.
    - Immutable Transaction History Table:
      - Date, Description (e.g. `Profit: Order #ORD-1092`, `Payout Withdrawal: Trx#9981`), Type (Credit/Debit), Amount (৳), Balance After (৳).
  - Subscription Plan & Billing Screen (`/billing`):
    - Tier comparison cards: Free (৳0), Starter (৳499/mo), Professional (৳1,499/mo), Business (৳2,999/mo).
    - Highlight active plan with current period end date.
    - "Upgrade Plan" flow with payment gateway checkout.

---

## 4. Unit & Integration Testing Tasks

- [x] **Task 5.22: Financial Ledger Invariant Unit Tests (Vitest)**
  - File: `apps/api/src/finance/ledger.service.spec.ts`
  - Scenarios:
    - Verify append-only constraint: no updates permitted on existing ledger entries.
    - Verify wallet balance calculation correctly sums credits and subtracts debits.
    - Verify withdrawal request exceeding available balance throws `BadRequestException ("Insufficient funds")`.
    - Double-spend prevention: 2 simultaneous withdrawal requests cannot exceed balance.
- [x] **Task 5.23: Dynamic RBAC Guard Unit Tests (Vitest)**
  - File: `apps/api/src/auth/dynamic-permissions.guard.spec.ts`
  - Scenarios:
    - User with `orders:dispatch` permission allowed to dispatch order.
    - User with only `orders:dispatch` attempting to approve payout (`finance:payout`) blocked with `403 Forbidden`.
    - Super Admin with `*` granted access to all endpoints.
- [x] **Task 5.24: Subscription Quota Integration Tests (Vitest)**
  - File: `apps/api/test/subscription-quotas.e2e-spec.ts`
  - Scenarios:
    - Student on Free plan (limit 10 products) imports 10 products -> Succeeds.
    - Attempt to import 11th product -> Fails with `403 Forbidden ("Plan limit reached")`.
    - Attempt to set custom domain on Free plan -> Blocked with upgrade prompt.
- [x] **Task 5.25: Payout Workflow Integration Tests (Vitest)**
  - File: `apps/api/test/payout-workflow.e2e-spec.ts`
  - Scenarios:
    - Student requests withdrawal of ৳2,000 against ৳5,000 balance.
    - Available balance drops to ৳3,000 (pending hold).
    - Admin approves with TrxID `BK-991188`.
    - Verify `PAYOUT_WITHDRAWAL` ledger row created with correct `balanceAfter`.
    - Verify student receives settlement record.
- [x] **Task 5.26: Orders Multi-Status Fulfillment & Aggregation Tests (Vitest)**
  - File: `apps/api/test/admin-orders-fulfillment.e2e-spec.ts`
  - Scenarios:
    - Verify `/api/v1/admin/orders/counts` aggregates correct quantities across all 11 status categories.
    - Transition order from `NEW` to `INVOICED` via batch tax billing; assert line items locked.
    - Pause order with hold reason -> verify status changes to `HOLD`.
    - Quarantine barcode/SKU mismatch -> transitions to `UNMATCH`; reconcile discrepancy -> transitions back.
    - Dispatch order with 3PL tracking ID -> transitions to `IN_COURIER`.
- [x] **Task 5.27: Campus Branches & Batches Integration Tests (Vitest)**
  - File: `apps/api/test/branches-batches.e2e-spec.ts`
  - Scenarios:
    - Create physical and digital campus branches; assign campus manager.
    - Create student batch tied to branch with max capacity 50.
    - Bulk enroll students into batch; verify unique constraint on `[batchId, studentId]`.
    - Verify cohort commercial sales leaderboard accurately aggregates store revenue.

---

## 5. End-to-End (E2E) Testing (Playwright)

- [x] **Task 5.28: Student Payout & Admin Settlement Lifecycle (Playwright)**
  - File: `tests/e2e/payout-governance-flow.spec.ts`
  - Complete Flow:
    1. **Student Requests Payout:**
       - Student logs into `student.platform.local/wallet`.
       - Available balance displays `৳6,500.00`.
       - Clicks "Request Payout"; selects "bKash", enters phone `01711223344`, amount `৳5,000`.
       - Submits request; available balance immediately updates to `৳1,500.00`, pending request listed as `PENDING`.
    2. **Admin Reviews & Approves Payout:**
       - Institute Admin logs into `admin.platform.local/finance/payouts`.
       - Finds pending payout for `৳5,000` from student store (badge count `3`).
       - Clicks "Approve & Settle", enters bKash TrxID `BKASH-TX-2026-8812`.
       - Submits approval; status changes to `PROCESSED`.
    3. **Student Verifies Settlement:**
       - Student refreshes `/wallet`.
       - Transaction ledger displays new row: `Payout Withdrawal (bKash Trx: BKASH-TX-2026-8812)`, Debit `-৳5,000.00`, Balance After `৳1,500.00`.
    4. **Dynamic RBAC Verification:**
       - Admin navigates to `/settings/roles`, creates role "Junior Support" with ONLY `orders:read` permission.
       - Assigns role to user `support@institute.com`.
       - Logs in as support user: verifies Order list is accessible, but Financial Payouts and Catalog Edit buttons are hidden and API calls return `403 Forbidden`.

- [x] **Task 5.29: Admin Operations & Multi-Status Order Dispatch (Playwright)**
  - File: `tests/e2e/admin-operations-orders.spec.ts`
  - Complete Flow:
    1. Admin logs into `admin.platform.local`.
    2. Navigates sidebar: observes Dashboards alert bubble `01`, expandable Students menu, Branches, Student Batches, Orders (with 11 queue badges), Seller Panel, Payment Requests (badge `3`).
    3. Opens Orders -> New Orders queue (8). Selects order, clicks "Generate Invoice" -> moves to Invoiced Orders (8778).
    4. Enters courier tracking ID (Pathao) -> moves to In Courier (9243).
    5. Navigates to Branches -> creates "Chittagong Regional Hub" -> assigns campus director.
    6. Navigates to Student Batches -> creates "Batch 2026-A", maps students to cohort, views sales leaderboard.

---

## 6. Test Run & Verification Instructions

### 6.1 Database Migration
```bash
# Apply Phase 5 Prisma schema migration
pnpm --filter @repo/db prisma migrate dev --name operations_and_monetization

# Re-generate Prisma Client
pnpm --filter @repo/db prisma generate
```

### 6.2 Running Unit & Integration Tests
```bash
# Run ledger invariants and dynamic RBAC unit tests
pnpm --filter @repo/api test apps/api/src/finance
pnpm --filter @repo/api test apps/api/src/auth/dynamic-permissions.guard.spec.ts

# Run payout and subscription quota integration tests
pnpm --filter @repo/api test test/payout-workflow.e2e-spec.ts
pnpm --filter @repo/api test test/subscription-quotas.e2e-spec.ts

# Run admin orders multi-status fulfillment & branch/batch integration tests
pnpm --filter @repo/api test test/admin-orders-fulfillment.e2e-spec.ts
pnpm --filter @repo/api test test/branches-batches.e2e-spec.ts
```

### 6.3 Running Admin & Student Billing UI Tests
```bash
# Run Vitest on Admin Roles Matrix, Order Queues & Student Wallet UI
pnpm --filter @repo/admin-dashboard test
pnpm --filter @repo/student-dashboard test pages/wallet
```

### 6.4 Running Full Playwright E2E Suite
```bash
# Execute Phase 5 Playwright E2E tests
pnpm exec playwright test tests/e2e/payout-governance-flow.spec.ts --project=chromium --headed=false
pnpm exec playwright test tests/e2e/admin-operations-orders.spec.ts --project=chromium --headed=false
```

---

## 7. Definition of Done (DoD) Checklist

- [x] Immutable append-only ledger strictly guarantees financial balance integrity with zero race conditions.
- [x] Student withdrawal requests and administrative payout approvals function seamlessly with external transaction IDs (badge count `3`).
- [x] Tiered subscription plans (Free, Starter, Professional, Business) strictly enforce product limits and custom domain access.
- [x] Dynamic RBAC permissions guard replaces hardcoded role checks, enabling granular permission assignment.
- [x] Institute executive dashboard accurately calculates platform GMV, wholesale profits, and urgent operational alerts (`01`).
- [x] Expandable student governance suite enables searchable directory, KYC document audit, and administrative store suspension with audit logging.
- [x] Campus branches (physical and digital) and student batches enable cohort management, student assignment, and sales leaderboards.
- [x] Orders multi-status operations console tracks all 11 queues (Overview, 9410, 8, 0, 233, 4035, 8778, 29, 131, 9243, Exchange) with batch invoicing, hold handling, unmatch discrepancy reconciliation, and 3PL courier dispatch.
- [x] Seller panel manages external merchants, instructors, wholesale contract rates, and compliance scorecards.
- [x] All unit, integration, and E2E test suites pass with $\ge 85\%$ test coverage across all financial, governance, and order fulfillment modules.
