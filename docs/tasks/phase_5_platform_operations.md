# Phase 5: Platform Operations & Monetization — Implementation Tasks

**Phase:** Phase 5 — Platform Operations & Monetization  
**Features Covered:**  
- Feature 16: Institute Dashboard  
- Feature 17: Business Model / Monetization & Financial Ledger  
- Feature 18: Platform Roles & Permissions (Dynamic RBAC)  
**Source Documents:** [`docs/implementation_priority.md`](../implementation_priority.md), [`docs/features.md`](../features.md), [`docs/business_logic.md`](../business_logic.md), [`docs/tech_stack.md`](../tech_stack.md), [`docs/prd.md`](../prd.md)  
**Status:** Ready for Implementation (Prerequisites: Phases 1, 2, 3 & 4)  

---

## 1. Phase Overview & Objectives

Phase 5 completes the platform by scaling the institute's operational governance and realizing its monetization model. As hundreds of students launch stores, the institute requires top-down operational visibility, student verification, seller performance auditing, and an immutable double-entry financial settlement ledger for student payouts. Additionally, hardcoded role enums are upgraded to a flexible, granular permission system with a staff role-assignment matrix.

### Target Outcomes
1. **Institute Command Center:** Top-down visibility into platform Gross Merchandise Value (GMV), platform net margins, student earnings, active store counts, and warehouse order backlogs.
2. **Student & Seller Governance:** Administration workflows for onboarding verification, seller performance reviews, complaint handling, and store suspensions.
3. **Immutable Financial Ledger:** Append-only ledger accounting (`ledger_entries`) tracking wholesale base deductions, platform commissions, payment gateway fees, and student payouts with zero race conditions.
4. **Student Payout Workflow:** Student withdrawal requests (bKash/Nagad/Bank Transfer) paired with administrative review, approval, and settlement auditing.
5. **Subscription Tier Engine:** Tiered student subscription plans (**Free**, **Starter**, **Professional**, **Business**) with automated feature gating (product catalog limits, custom domains, reduced commission rates).
6. **Dynamic Granular RBAC:** Transitioning from hardcoded roles to database-backed permissions (e.g. `catalog:create`, `orders:dispatch`, `finance:payout`, `students:suspend`) enforced by NestJS guards.

---

## 2. Architecture & Codebase Layout

```
├── apps/
│   ├── api/src/
│   │   ├── admin/                    # Platform-wide KPIs & governance controllers
│   │   ├── finance/                  # Append-only ledger, balance calculator, payout engine
│   │   ├── subscriptions/            # Subscription plans, quotas, and feature gating
│   │   └── auth/                     # Dynamic RBAC guards & permission evaluator
│   ├── admin-dashboard/src/
│   │   ├── pages/overview/           # Platform executive analytics & GMV meters
│   │   ├── pages/students/           # Student verification, seller scorecard & suspensions
│   │   ├── pages/payouts/            # Student withdrawal approvals & ledger auditing
│   │   ├── pages/subscriptions/      # Subscription plans & fee management
│   │   └── pages/roles/              # Role & permission matrix manager
│   └── student-dashboard/src/
│       ├── pages/wallet/             # Earnings balance, payout request, ledger statement
│       └── pages/billing/            # Subscription plan tiers & upgrade screen
└── packages/
    └── db/prisma/schema.prisma       # Added Permission, RolePermission, PayoutRequest, Subscription
```

---

## 3. Detailed Work Breakdown

### 3.1 Database & Schema Implementation (`packages/db`)

- [ ] **Task 5.1: Monetization & Dynamic RBAC Schema Expansion**
  - Update `packages/db/prisma/schema.prisma`:
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
      - `id` (UUID), `storeId` (FK Store), `studentId` (FK User).
      - `amount` (Decimal), `paymentMethod` (Enum: `BKASH`, `NAGAD`, `BANK_TRANSFER`).
      - `accountDetails` (Jsonb — e.g. bank account number, MFS phone).
      - `status` (Enum: `PENDING`, `APPROVED`, `REJECTED`, `PROCESSED`).
      - `transactionReference` (String nullable), `adminNotes` (Text nullable), `reviewedById` (FK User nullable).
      - Timestamps. Indices on `storeId`, `status`.
    - Model `SubscriptionPlan`:
      - `id` (UUID), `name` (String — `Free`, `Starter`, `Professional`, `Business`), `code` (String unique).
      - `monthlyPrice` (Decimal), `yearlyPrice` (Decimal).
      - `maxProducts` (Int), `allowCustomDomain` (Boolean), `platformCommissionPercent` (Decimal), `features` (Text[]).
      - `isActive` (Boolean default true).
    - Model `StudentSubscription`:
      - `id` (UUID), `studentId` (FK User unique), `planId` (FK SubscriptionPlan).
      - `status` (Enum: `ACTIVE`, `PAST_DUE`, `CANCELLED`), `currentPeriodStart` (DateTime), `currentPeriodEnd` (DateTime).
  - Create and apply migration `0005_operations_and_monetization`.
  - Update seed script with core system roles, standard permissions matrix, and default subscription tiers.

---

### 3.2 Backend Implementation (`apps/api`)

- [ ] **Task 5.2: Dynamic RBAC Guard & Permission Service (`auth`)**
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

- [ ] **Task 5.3: Immutable Financial Ledger & Wallet Service (`finance`)**
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

- [ ] **Task 5.4: Subscription Plans & Quota Enforcement (`subscriptions`)**
  - Implement `SubscriptionService`:
    - `GET /api/v1/subscriptions/plans`: Public list of available subscription tiers.
    - `GET /api/v1/student/subscription`: Get active subscription tier and limits.
    - `POST /api/v1/student/subscription/upgrade`: Upgrade plan.
  - Implement Subscription Quota Guard:
    - When student imports product from catalog: check `currentProductCount < plan.maxProducts`. If exceeded, throw `403 Forbidden ("Upgrade to Professional plan to import more than 30 products")`.
    - When student configures custom domain: check `plan.allowCustomDomain == true`.

- [ ] **Task 5.5: Institute Executive Overview & Governance API (`admin`)**
  - Implement `InstituteDashboardService`:
    - `GET /api/v1/admin/dashboard/kpis`:
      - Platform Gross Merchandise Value (GMV).
      - Institute Net Revenue (Product Wholesale Margins + Platform Commissions).
      - Total Active Student Stores vs Inactive.
      - Total Registered Students & Completion Rate.
      - Pending Order Backlog count across all warehouses.
      - Outstanding Student Payout Liabilities.
    - `GET /api/v1/admin/students`: Filterable list of students (Search, Store Status, Verification Status).
    - `PATCH /api/v1/admin/students/:id/status`: Suspend or activate student store with audit reason.
    - `GET /api/v1/admin/sellers/scorecard`: Seller performance leaderboard with complaints, return rates, and ratings.

---

### 3.3 Frontend Implementation

- [ ] **Task 5.6: Institute Operations & Governance Console (`apps/admin-dashboard`)**
  - Executive KPI Hub (`/overview`):
    - Real-time financial metric cards (GMV, Platform Net, Outstanding Liabilities).
    - Platform growth charts (Daily GMV, new store registrations).
    - Quick-action urgent alerts (Pending Payouts count, Unfulfilled Orders > 48h).
  - Student & Seller Governance Screen (`/students`):
    - Table with columns: Student Name, Store Name, Subdomain, Level, Total Sales, Store Rating, Status, Actions.
    - "Suspend Store" dialog: Reason dropdown (Fraud, Policy Violation, Inactive) + notes.
    - Seller Performance Drawer: View orders history, customer reviews, complaint tickets.
  - Financial Ledger & Payout Approval Portal (`/finance/payouts`):
    - Data table of pending withdrawal requests.
    - "Approve & Settle" modal: Enter bank transaction reference or bKash TrxID, attach PDF receipt.
    - Downloadable CSV platform revenue reports.
  - Dynamic Roles & Permissions Matrix (`/settings/roles`):
    - Role creation drawer.
    - Checkbox matrix grouped by domain: Catalog (`view`, `create`, `update`, `stock`), Orders (`dispatch`, `cancel`, `refund`), Finance (`view_ledger`, `approve_payout`), Governance (`suspend_student`).

- [ ] **Task 5.7: Student Wallet & Billing Suite (`apps/student-dashboard`)**
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

- [ ] **Task 5.8: Financial Ledger Invariant Unit Tests (Vitest)**
  - File: `apps/api/src/finance/ledger.service.spec.ts`
  - Scenarios:
    - Verify append-only constraint: no updates permitted on existing ledger entries.
    - Verify wallet balance calculation correctly sums credits and subtracts debits.
    - Verify withdrawal request exceeding available balance throws `BadRequestException ("Insufficient funds")`.
    - Double-spend prevention: 2 simultaneous withdrawal requests cannot exceed balance.
- [ ] **Task 5.9: Dynamic RBAC Guard Unit Tests (Vitest)**
  - File: `apps/api/src/auth/dynamic-permissions.guard.spec.ts`
  - Scenarios:
    - User with `orders:dispatch` permission allowed to dispatch order.
    - User with only `orders:dispatch` attempting to approve payout (`finance:payout`) blocked with `403 Forbidden`.
    - Super Admin with `*` granted access to all endpoints.
- [ ] **Task 5.10: Subscription Quota Integration Tests (Vitest)**
  - File: `apps/api/test/subscription-quotas.e2e-spec.ts`
  - Scenarios:
    - Student on Free plan (limit 10 products) imports 10 products -> Succeeds.
    - Attempt to import 11th product -> Fails with `403 Forbidden ("Plan limit reached")`.
    - Attempt to set custom domain on Free plan -> Blocked with upgrade prompt.
- [ ] **Task 5.11: Payout Workflow Integration Tests (Vitest)**
  - File: `apps/api/test/payout-workflow.e2e-spec.ts`
  - Scenarios:
    - Student requests withdrawal of ৳2,000 against ৳5,000 balance.
    - Available balance drops to ৳3,000 (pending hold).
    - Admin approves with TrxID `BK-991188`.
    - Verify `PAYOUT_WITHDRAWAL` ledger row created with correct `balanceAfter`.
    - Verify student receives settlement record.

---

## 5. End-to-End (E2E) Testing (Playwright)

- [ ] **Task 5.12: Student Payout & Admin Settlement Lifecycle (Playwright)**
  - File: `tests/e2e/payout-governance-flow.spec.ts`
  - Complete Flow:
    1. **Student Requests Payout:**
       - Student logs into `student.platform.local/wallet`.
       - Available balance displays `৳6,500.00`.
       - Clicks "Request Payout"; selects "bKash", enters phone `01711223344`, amount `৳5,000`.
       - Submits request; available balance immediately updates to `৳1,500.00`, pending request listed as `PENDING`.
    2. **Admin Reviews & Approves Payout:**
       - Institute Admin logs into `admin.platform.local/finance/payouts`.
       - Finds pending payout for `৳5,000` from student store.
       - Clicks "Approve & Settle", enters bKash TrxID `BKASH-TX-2026-8812`.
       - Submits approval; status changes to `PROCESSED`.
    3. **Student Verifies Settlement:**
       - Student refreshes `/wallet`.
       - Transaction ledger displays new row: `Payout Withdrawal (bKash Trx: BKASH-TX-2026-8812)`, Debit `-৳5,000.00`, Balance After `৳1,500.00`.
    4. **Dynamic RBAC Verification:**
       - Admin navigates to `/settings/roles`, creates role "Junior Support" with ONLY `orders:read` permission.
       - Assigns role to user `support@institute.com`.
       - Logs in as support user: verifies Order list is accessible, but Financial Payouts and Catalog Edit buttons are hidden and API calls return `403 Forbidden`.

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
```

### 6.3 Running Admin & Student Billing UI Tests
```bash
# Run Vitest on Admin Roles Matrix & Student Wallet UI
pnpm --filter @repo/admin-dashboard test
pnpm --filter @repo/student-dashboard test pages/wallet
```

### 6.4 Running Full Playwright E2E Suite
```bash
# Execute Phase 5 Playwright E2E test
pnpm exec playwright test tests/e2e/payout-governance-flow.spec.ts --project=chromium --headed=false
```

---

## 7. Definition of Done (DoD) Checklist

- [ ] Immutable append-only ledger strictly guarantees financial balance integrity with zero race conditions.
- [ ] Student withdrawal requests and administrative payout approvals function seamlessly with external transaction IDs.
- [ ] Tiered subscription plans (Free, Starter, Professional, Business) strictly enforce product limits and custom domain access.
- [ ] Dynamic RBAC permissions guard replaces hardcoded role checks, enabling granular permission assignment.
- [ ] Institute executive dashboard accurately calculates platform GMV, wholesale profits, and liabilities.
- [ ] Student governance workflows enable administrative store suspension with audit logging.
- [ ] All unit, integration, and E2E test suites pass with $\ge 85\%$ test coverage across all financial and authorization modules.
