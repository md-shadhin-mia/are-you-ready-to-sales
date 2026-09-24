# Phase 3: Trust & Engagement — Implementation Tasks

**Phase:** Phase 3 — Trust & Engagement  
**Features Covered:**  
- Feature 10: Reviews & Ratings System  
- Feature 11: Store Reputation & Performance  
- Feature 12: Student Dashboard  
**Source Documents:** [`docs/implementation_priority.md`](../implementation_priority.md), [`docs/features.md`](../features.md), [`docs/business_logic.md`](../business_logic.md), [`docs/tech_stack.md`](../tech_stack.md), [`docs/prd.md`](../prd.md)  
**Status:** Ready for Implementation (Prerequisites: Phases 1 & 2)  

---

## 1. Phase Overview & Objectives

Once real orders are placed and fulfilled, Phase 3 establishes marketplace credibility, social proof, and deep student engagement. It implements an industry-grade tri-dimensional review engine separating product quality, store service, and delivery speed, builds a public store reputation algorithm, and provides students with a unified executive dashboard combining real commercial metrics with training progress.

### Target Outcomes
1. **Tri-Dimensional Verified Reviews:** Customers review three distinct dimensions: **Product Quality** (1–5★), **Store Service** (1–5★), and **Delivery** (1–5★) with independent comments.
2. **Strict Verified Purchase Gating:** Reviews can only be submitted by verified customers who completed an order, preventing review fraud.
3. **Automated Review Request Dispatcher:** Background BullMQ delayed job triggers an SMS/Email review invitation 24 hours after an order status becomes `DELIVERED`.
4. **Multi-Level Rating Aggregation:** Instant recalculation of ratings on master products, student stores, and seller performance metrics upon review submission.
5. **Store Reputation Engine:** Computes composite trust metrics: average store rating, completed orders, review volume, repeat customer percentage, and response rate.
6. **Unified Student Dashboard:** Executive screen displaying gross revenue, net profit, total orders, customer count, store rating, performance metrics, and training progress.

---

## 2. Architecture & Codebase Layout

```
├── apps/
│   ├── api/src/
│   │   ├── reviews/                  # Tri-dimensional review service, submission, & moderation
│   │   ├── reputation/               # Store reputation & seller performance scoring
│   │   ├── dashboard/                # Aggregated student metrics & KPI rollups
│   │   ├── jobs/                     # BullMQ worker: review request scheduler
│   │   └── events/                   # Handlers for OrderDelivered, ReviewSubmitted
│   ├── storefront/src/
│   │   ├── components/reviews/       # 3D review breakdown, star meter, verified badges
│   │   └── app/[slug]/review/        # Customer review submission form (token-authenticated)
│   ├── student-dashboard/src/
│   │   ├── pages/dashboard/          # Executive dashboard: KPI cards, charts, activity feed
│   │   ├── pages/reviews/            # Customer reviews moderation & feedback viewer
│   │   └── pages/reputation/         # Store reputation scorecard & improvement tips
│   └── admin-dashboard/src/
│       └── pages/reviews/            # Platform review moderation & dispute management
└── packages/
    └── db/prisma/schema.prisma       # Added Review model, aggregate rating fields
```

---

## 3. Detailed Work Breakdown

### 3.1 Database & Schema Implementation (`packages/db`)

- [ ] **Task 3.1: Reviews & Reputation Schema**
  - Update `packages/db/prisma/schema.prisma`:
    - Model `Review`:
      - `id` (UUID), `orderId` (FK Order), `masterProductId` (FK MasterProduct), `storeId` (FK Store), `customerId` (FK Customer).
      - `productRating` (Int: 1–5), `storeRating` (Int: 1–5), `deliveryRating` (Int: 1–5).
      - `productComment` (Text nullable), `storeComment` (Text nullable), `deliveryComment` (Text nullable).
      - `isVerified` (Boolean default true), `isPublished` (Boolean default true).
      - Timestamps. Unique constraint `[orderId, masterProductId]`.
      - Indices on `masterProductId`, `storeId`, `customerId`.
    - Add to Model `Store`:
      - `responseRatePercent` (Decimal default 100.00).
      - `repeatCustomerPercent` (Decimal default 0.00).
      - `completedOrdersCount` (Int default 0).
    - Add to Model `Order`:
      - `reviewToken` (String unique nullable) — used for passwordless 1-click review submission.
      - `reviewRequestSentAt` (DateTime nullable).
  - Create and apply migration `0003_reviews_and_reputation`.

---

### 3.2 Backend Implementation (`apps/api`)

- [ ] **Task 3.2: Tri-Dimensional Review Engine (`reviews`)**
  - Implement `ReviewService`:
    - `POST /api/v1/stores/:slug/reviews`:
      - Input: `orderNumber`, `customerPhone` or `reviewToken`, `masterProductId`, `productRating`, `storeRating`, `deliveryRating`, comments.
      - Validation:
        1. Order must exist and match `storeId` and `customerPhone` / `reviewToken`.
        2. Order status must be `DELIVERED` or `COMPLETED`.
        3. Item must belong to the order items list.
        4. Prevent duplicate reviews: verify no existing review for `[orderId, masterProductId]`.
      - Store review record.
      - Trigger atomic aggregate recalculation.
      - Emit domain event `ReviewReceived`.
    - `GET /api/v1/stores/:slug/products/:productId/reviews`:
      - Paginated reviews for product with average scores and verified badges.
    - `GET /api/v1/stores/:slug/reviews`:
      - Public store reviews evaluating store service and fulfillment.

- [ ] **Task 3.3: Atomic Rating Aggregator (`reviews` + `reputation`)**
  - Implement `RatingAggregatorService`:
    - Recalculate Master Product Rating:
      - Average `productRating` across all published reviews for `masterProductId`.
      - Update `master_products.rating_avg` and `master_products.total_reviews_count`.
    - Recalculate Store Rating:
      - Average `storeRating` across all reviews for `storeId`.
      - Update `stores.rating_avg` and `stores.total_reviews_count`.
    - Execute within a database transaction or atomic background queue to prevent lock contention.

- [ ] **Task 3.4: Automated Review Request Scheduler (BullMQ + Redis)**
  - Implement BullMQ Queue `review-requests`:
    - Listen for `OrderDelivered` domain event (`@OnEvent('order.delivered')`).
    - Generate unique secure `reviewToken` on `Order`.
    - Schedule delayed BullMQ job with 24-hour delay (`delay: 24 * 60 * 60 * 1000`).
    - Job execution:
      - Sends SMS/Email notification to customer with direct review link: `https://{store-slug}.platform.com/review?token={reviewToken}`.
      - Sets `order.reviewRequestSentAt = NOW()`.

- [ ] **Task 3.5: Store Reputation & Performance Calculator (`reputation`)**
  - Implement `ReputationService`:
    - Calculate Repeat Customer Rate: `(Customers with >= 2 orders) / (Total Customers) * 100`.
    - Calculate Order Completion Rate: `(Completed Orders) / (Total Orders - Cancelled) * 100`.
    - Calculate Seller Performance Composite Score:
      - Formula: `(StoreRating * 0.5) + (CompletionRate/20 * 0.3) + (RepeatCustomerRate/20 * 0.2)`.
    - `GET /api/v1/stores/:slug/reputation`: Public endpoint returning trust badge data.

- [ ] **Task 3.6: Student Executive Dashboard API (`dashboard`)**
  - Implement `StudentDashboardService`:
    - `GET /api/v1/student/dashboard/summary`:
      - Total Gross Revenue (৳) & percentage change vs previous period.
      - Total Net Profit (৳) & profit margin %.
      - Total Completed Orders & average order value (AOV).
      - Active Customers count & repeat customer %.
      - Average Store Rating (★) & review count.
      - Recent 5 orders and recent 5 customer reviews.
      - Learning curriculum progress preview (% complete per module).
    - `GET /api/v1/student/dashboard/chart-data?range=30d`:
      - Time-series data points of daily revenue and order counts for charting.

---

### 3.3 Frontend Implementation

- [ ] **Task 3.7: Public Storefront Reviews UI (`apps/storefront`)**
  - Product Page Reviews Tab:
    - Overall star rating breakdown with progress bars (5★, 4★, 3★, 2★, 1★).
    - Tri-dimensional summary pills: "Product Quality: 4.8★", "Seller Service: 4.9★", "Delivery Speed: 4.6★".
    - Individual review cards with:
      - Customer first name + masked phone (e.g. `Karim U. (018****3344)`).
      - Green `✓ Verified Purchase` badge.
      - Comments with date stamp.
  - Review Submission Page (`/[slug]/review`):
    - Reads `token` or asks for `Order Number` + `Phone Number`.
    - 3-step interactive star rating input for Product, Service, and Delivery.
    - Textareas for comments.
    - Instant validation and submission with success confetti.
  - Public Storefront Reputation Badge:
    - Floating or footer trust badge: "Rated 4.8★ by 150+ Happy Shoppers • 98% Delivery Success".

- [ ] **Task 3.8: Unified Student Dashboard (`apps/student-dashboard`)**
  - Implement Executive Overview (`/dashboard`):
    - 5 KPI summary cards:
      - Gross Sales (`৳125,400`)
      - Net Profit (`৳32,850`)
      - Total Orders (`184`)
      - Total Customers (`151`)
      - Store Rating (`4.7 ★`)
    - Interactive revenue & orders chart using Recharts / shadcn chart (toggle between 7 days, 30 days, 1 year).
    - "Recent Orders" quick table with status badges and profit.
    - "Latest Reviews" widget showing customer comments.
  - Implement Reviews & Feedback Page (`/reviews`):
    - Tabbed view of incoming reviews (All, 5-Star, Critical < 3-Star).
    - Detailed feedback breakdown across Product, Store, and Delivery.
  - Implement Store Reputation Screen (`/reputation`):
    - Performance scorecard with benchmarks and actionable tips (e.g. "Your delivery rating is 4.2★ — packaging securely can improve customer satisfaction").

- [ ] **Task 3.9: Admin Review Moderation (`apps/admin-dashboard`)**
  - Admin Reviews Console:
    - Table of all platform reviews with flags for vulgarity or disputes.
    - Actions: Unpublish review, mark for investigation, view associated order and customer.

---

## 4. Unit & Integration Testing Tasks

- [ ] **Task 3.10: Rating Aggregation Unit Tests (Vitest)**
  - File: `apps/api/src/reviews/rating-aggregator.spec.ts`
  - Scenarios:
    - Test product rating average when 3 reviews are submitted: 5★, 4★, 5★ -> Expect `4.67★`.
    - Test store rating updates independently without affecting other stores.
    - Test delivery rating does not skew the product quality score.
- [ ] **Task 3.11: Review Eligibility & Anti-Fraud Unit Tests (Vitest)**
  - File: `apps/api/src/reviews/review-eligibility.spec.ts`
  - Scenarios:
    - Attempt review on `PROCESSING` or `PENDING_PAYMENT` order -> Throws `ForbiddenException ("Order must be delivered to review")`.
    - Attempt review on item not present in order -> Throws `BadRequestException`.
    - Attempt duplicate review on same order item -> Throws `ConflictException ("Review already submitted")`.
- [ ] **Task 3.12: Review Submission & BullMQ Integration Tests (Vitest)**
  - File: `apps/api/test/reviews.e2e-spec.ts`
  - Scenarios:
    - Simulate order status transition to `DELIVERED`: verify BullMQ job `review-request` is queued with 24-hour delay.
    - Fast-forward / trigger queue processor: verify review token generated and email/SMS mocked dispatch.
    - Submit valid 3D review via token:
      - Verify record created in database.
      - Verify `stores.rating_avg` updated.
      - Verify `master_products.rating_avg` updated.
- [ ] **Task 3.13: Dashboard KPI Calculation Integration Tests (Vitest)**
  - File: `apps/api/test/dashboard-kpis.e2e-spec.ts`
  - Scenarios:
    - Seed 5 orders with different statuses (`DELIVERED`, `CANCELLED`, `PENDING`).
    - Verify summary API only counts completed/delivered orders towards revenue and net profit.
    - Verify customer repeat percentage accurately identifies customers with multiple orders.

---

## 5. End-to-End (E2E) Testing (Playwright)

- [ ] **Task 3.14: Full Verified Review & Dashboard Lifecycle (Playwright)**
  - File: `tests/e2e/review-reputation-flow.spec.ts`
  - Complete Flow:
    1. **Setup Precondition:**
       - Existing order `ORD-777` for "Ergonomic Office Chair" on `store-alpha.platform.local` marked `DELIVERED`.
       - Secure review token generated: `tok_valid_123`.
    2. **Customer Review Submission:**
       - Playwright navigates to `store-alpha.platform.local/review?token=tok_valid_123`.
       - Selects Product Quality: 5★, Store Service: 4★, Delivery: 5★.
       - Enters comment: "Incredible chair, very comfortable for long hours."
       - Submits form; verifies confirmation message.
    3. **Storefront Verification:**
       - Navigates to `store-alpha.platform.local/product/chair`.
       - Asserts reviews count incremented by 1.
       - Asserts comment appears with green `✓ Verified Purchase` badge.
       - Asserts 3D breakdown pills match submitted ratings.
    4. **Student Dashboard Verification:**
       - Student logs into `student.platform.local/dashboard`.
       - Asserts Store Rating displays updated score.
       - Navigates to `/reviews`; asserts newly submitted review appears in recent feedback list.
       - Asserts revenue and profit KPI cards reflect the delivered order.

---

## 6. Test Run & Verification Instructions

### 6.1 Database Migration
```bash
# Apply Phase 3 Prisma schema migration
pnpm --filter @repo/db prisma migrate dev --name reviews_and_reputation

# Re-generate Prisma Client
pnpm --filter @repo/db prisma generate
```

### 6.2 Running Unit & Integration Tests
```bash
# Run review aggregation and eligibility unit tests
pnpm --filter @repo/api test apps/api/src/reviews
pnpm --filter @repo/api test apps/api/src/reputation

# Run review submission and BullMQ scheduler integration tests
pnpm --filter @repo/api test test/reviews.e2e-spec.ts
pnpm --filter @repo/api test test/dashboard-kpis.e2e-spec.ts
```

### 6.3 Running Dashboard Component Tests
```bash
# Run Vitest on Dashboard chart components & summary cards
pnpm --filter @repo/student-dashboard test
pnpm --filter @repo/storefront test components/reviews
```

### 6.4 Running Playwright E2E Suite
```bash
# Start backend and frontends
pnpm turbo run dev

# Run review & reputation E2E tests
pnpm exec playwright test tests/e2e/review-reputation-flow.spec.ts --project=chromium --headed=false
```

---

## 7. Definition of Done (DoD) Checklist

- [ ] Tri-dimensional reviews (Product, Store, Delivery) accurately recorded with independent ratings and comments.
- [ ] Strict verified purchase gating prevents unverified or duplicate reviews.
- [ ] BullMQ delayed queue automatically schedules review requests after order delivery.
- [ ] Atomic rating aggregation updates both master product and student store ratings without data races.
- [ ] Public storefront showcases verified reviews and trust badges.
- [ ] Student dashboard provides unified real-time visibility into revenue, profit, orders, customers, and store reputation.
- [ ] All unit, integration, and E2E test suites pass with $\ge 85\%$ code coverage.
