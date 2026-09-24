# Phase 4: Growth & Training Layer — Implementation Tasks

**Phase:** Phase 4 — Growth & Training Layer  
**Features Covered:**  
- Feature 13: Gamification & Training Progression  
- Feature 14: Marketing Tools  
- Feature 15: Store Analytics & Coaching Engine  
**Source Documents:** [`docs/implementation_priority.md`](../implementation_priority.md), [`docs/features.md`](../features.md), [`docs/business_logic.md`](../business_logic.md), [`docs/tech_stack.md`](../tech_stack.md), [`docs/prd.md`](../prd.md)  
**Status:** Ready for Implementation (Prerequisites: Phases 1, 2 & 3)  

---

## 1. Phase Overview & Objectives

Phase 4 elevates the platform from a standard e-commerce system into an entrepreneurial training incubator. By coupling commercial transactions directly with an event-driven gamification engine, students learn by achieving real business milestones. Students gain marketing capabilities (coupons, banners, referral tracking) and deep conversion funnel analytics coupled with an automated business coaching engine that advises them how to optimize sales.

### Target Outcomes
1. **Event-Driven Gamification:** Domain events (`StoreCreated`, `ProductAdded`, `StorePublished`, `OrderDelivered`, `ReviewReceived`) automatically advance students through 6 career tiers (from **Store Starter** to **Top Performer**).
2. **Milestones & Challenges:** Operational checklists tracking real business milestones (e.g. "Add 5 products", "Get 1st sale", "Reach ৳10,000 revenue", "Maintain 4.5★ rating") with instant XP awards.
3. **Feature Unlocks by Level:** Progressive capability gating: higher levels unlock perks such as custom domain mapping, full master catalog access, and reduced platform commission.
4. **Marketing Tooling Suite:** Student coupon generator (percentage/fixed discounts, usage limits, minimum spend), promotional announcement banners, and referral links with UTM tracking.
5. **Full-Funnel Store Analytics:** Tracking visitor funnel stages (Visitors -> Product Views -> Add to Cart -> Checkout Initiated -> Completed Orders) and calculating real conversion rates and Average Order Value (AOV).
6. **Automated Business Coach:** Rule-based diagnostic engine analyzing funnel bottlenecks and outputting practical learning recommendations (e.g. "High views but low cart adds: revise product imagery and price point").

---

## 2. Architecture & Codebase Layout

```
├── apps/
│   ├── api/src/
│   │   ├── gamification/             # Event listeners, XP calculation, level progression
│   │   ├── marketing/                # Coupons, promo banners, UTM referral tracking
│   │   ├── analytics/                # Funnel ingestor, conversion metrics, coaching engine
│   │   └── jobs/                     # BullMQ worker for daily analytics rollups
│   ├── storefront/src/
│   │   ├── components/marketing/     # Promo announcement bar, hero banners
│   │   ├── hooks/useFunnelTracker.ts # Client event beacon (views, cart adds, checkouts)
│   │   └── app/[slug]/checkout/      # Coupon code validation & discount input
│   ├── student-dashboard/src/
│   │   ├── pages/gamification/       # Career progression hub, XP bar, challenges list
│   │   ├── pages/marketing/          # Coupon generator, banner settings, referral links
│   │   └── pages/analytics/          # Funnel charts, AOV metrics, coaching advice card
│   └── admin-dashboard/src/
│       └── pages/challenges/         # Challenge creation & level threshold configuration
└── packages/
    └── db/prisma/schema.prisma       # Added Challenge, StudentProgress, StudentLevel, Coupon, FunnelEvent
```

---

## 3. Detailed Work Breakdown

### 3.1 Database & Schema Implementation (`packages/db`)

- [ ] **Task 4.1: Gamification & Marketing Schema Expansion**
  - Update `packages/db/prisma/schema.prisma`:
    - Model `Challenge`:
      - `id` (UUID), `code` (String unique, e.g. `CH_FIRST_SALE`).
      - `title` (String), `description` (Text), `requiredEvent` (String), `threshold` (Int default 1).
      - `tierLevel` (Int default 1), `xpReward` (Int default 100), `badgeIcon` (String nullable).
    - Model `StudentProgress`:
      - `id` (UUID), `studentId` (FK User), `challengeId` (FK Challenge).
      - `currentCount` (Int default 0), `isCompleted` (Boolean default false), `completedAt` (DateTime nullable).
      - Unique constraint `[studentId, challengeId]`.
    - Model `StudentLevel`:
      - `studentId` (UUID PK, FK User), `currentLevel` (Int default 1), `totalXp` (Int default 0).
      - `levelTitle` (String default 'Store Starter'), `updatedAt` (DateTime).
    - Model `Coupon`:
      - `id` (UUID), `storeId` (FK Store), `code` (String), `discountType` (Enum: `PERCENTAGE`, `FIXED_AMOUNT`).
      - `discountValue` (Decimal), `minSpend` (Decimal default 0), `maxUses` (Int nullable), `usedCount` (Int default 0).
      - `startDate` (DateTime), `endDate` (DateTime nullable), `isActive` (Boolean default true).
      - Unique constraint `[storeId, code]`. Index on `storeId`.
    - Model `StoreFunnelEvent`:
      - `id` (UUID), `storeId` (FK Store), `sessionId` (String), `eventType` (Enum: `PAGE_VIEW`, `PRODUCT_VIEW`, `ADD_TO_CART`, `CHECKOUT_INITIATED`, `ORDER_COMPLETED`).
      - `entityId` (String nullable — e.g. productId or orderId), `metadata` (Jsonb default '{}'), `createdAt` (DateTime default now).
      - Index on `[storeId, eventType, createdAt]`.
  - Create and apply migration `0004_growth_and_training`.
  - Update seed script with the standard 6 qualification levels and 12 baseline challenges.

---

### 3.2 Backend Implementation (`apps/api`)

- [ ] **Task 4.2: Event-Driven Gamification Engine (`gamification`)**
  - Implement `GamificationListener`:
    - Listen for in-process events using `@nestjs/event-emitter`:
      - `@OnEvent('store.created')`: Updates store setup challenge.
      - `@OnEvent('store.product.added')`: Increments product count challenge.
      - `@OnEvent('store.published')`: Unlocks publishing achievement.
      - `@OnEvent('order.delivered')`: Increments completed order count challenge, calculates XP reward.
      - `@OnEvent('review.received')`: Evaluates rating milestone challenges.
      - `@OnEvent('revenue.threshold')`: Awards XP for sales milestones (৳1,000, ৳10,000, ৳50,000).
  - Implement `GamificationService`:
    - `awardXp(studentId, xpAmount)`: Increments `totalXp`, checks level qualification criteria against table:
      - Level 1: Store Starter (0 XP, ৳0 sales)
      - Level 2: Product Seller (500 XP, 1 order, ৳1,000 sales)
      - Level 3: Active Reseller (2,000 XP, 10 orders, ৳10,000 sales, $\ge 4.0\star$)
      - Level 4: Growth Seller (6,000 XP, 50 orders, ৳50,000 sales, $\ge 4.3\star$)
      - Level 5: Pro Seller (15,000 XP, 150 orders, ৳150,000 sales, $\ge 4.5\star$)
      - Level 6: Top Performer (50,000 XP, 500 orders, ৳500,000 sales, $\ge 4.7\star$)
    - Emits `StudentLeveledUp` event when new tier reached.
    - `GET /api/v1/student/gamification/status`: Returns current level, XP, next level target, and active challenge progress.

- [ ] **Task 4.3: Feature Gating by Level (`gamification`)**
  - Implement `LevelGatingGuard`:
    - Restrict custom domain setup to `currentLevel >= 4`.
    - Restrict advanced coupon features to `currentLevel >= 2`.
    - Apply reduced commission rate (from 5% down to 1.5%) for `currentLevel >= 5`.

- [ ] **Task 4.4: Marketing & Coupon Engine (`marketing`)**
  - Implement `CouponService`:
    - `POST /api/v1/student/coupons`: Create coupon code scoped to student's store.
    - `GET /api/v1/student/coupons`: List active/expired coupons with redemption counts.
    - `PATCH /api/v1/student/coupons/:id`: Deactivate or update expiration.
    - `POST /api/v1/stores/:slug/coupons/validate`:
      - Public storefront validation called at checkout.
      - Validates: code exists, active status, date range, minimum cart spend, max uses limit.
      - Returns discount amount and updated subtotal.
  - Implement Promo Banner Service:
    - `PATCH /api/v1/student/marketing/banner`: Set announcement bar text, link, and background color.
    - `GET /api/v1/stores/:slug/banner`: Public endpoint returning active promotional banner.

- [ ] **Task 4.5: Store Analytics & Coaching Engine (`analytics`)**
  - Implement Funnel Ingestor:
    - `POST /api/v1/stores/:slug/events`: Lightweight beacon endpoint receiving visitor actions (`PAGE_VIEW`, `PRODUCT_VIEW`, `ADD_TO_CART`, `CHECKOUT_INITIATED`).
    - Batched inserts into `store_funnel_events` to withstand traffic bursts.
  - Implement `StoreAnalyticsService`:
    - `GET /api/v1/student/analytics/funnel?range=30d`:
      - Aggregate counts for: Visitors, Product Views, Add-to-Cart, Checkouts Initiated, Orders Placed.
      - Calculate stage-by-stage drop-off % and overall conversion rate.
      - Calculate Average Order Value (AOV).
  - Implement Automated Coaching Recommendation Generator:
    - Rule 1: `Cart-to-Checkout < 20%` -> "High cart abandonment. Consider offering free shipping or simplifying checkout fields."
    - Rule 2: `View-to-Cart < 5%` -> "Low engagement on product pages. Enhance product photos, add trust badges, or test a promotional discount."
    - Rule 3: `Conversion Rate < 1%` with `Visitors > 500` -> "Traffic is visiting but not buying. Inspect pricing competitiveness against market rates."
    - Rule 4: `Repeat Customer Rate > 25%` -> "Outstanding customer loyalty! Consider launching a referral campaign to acquire similar buyers."

---

### 3.3 Frontend Implementation

- [ ] **Task 4.6: Storefront Marketing & Analytics Beacons (`apps/storefront`)**
  - Announcement Bar Component:
    - Renders sticky top banner if student configured active message (e.g. "Use code EID10 for 10% off!").
  - Checkout Coupon Field:
    - Input with "Apply" button.
    - Displays green discount badge (e.g. "-৳250.00") or red error text ("Coupon expired" / "Minimum spend ৳1,000 required").
  - Funnel Event Tracking Hook (`useFunnelTracker`):
    - Fires beacon on page visit, product detail view, add-to-cart click, and checkout step completion with unique anonymous session ID stored in cookie.
  - Referral Link Handler:
    - Captures `?ref=...` and UTM parameters from landing URL, storing attribution in session storage for order attribution.

- [ ] **Task 4.7: Gamification Hub (`apps/student-dashboard`)**
  - Career Progression Screen (`/gamification`):
    - Level Badge and Title (e.g. "Level 3: Active Reseller").
    - XP Progress Bar with current XP and remaining XP to next tier.
    - Unlocked Perks list vs Locked Perks (grayed out with level requirement).
    - Challenges Checklist:
      - Active challenges with progress indicators (e.g. "Complete 10 Orders: 7/10 completed").
      - Completed challenges section with "Claim XP" button and celebratory confetti.
    - Career Level Roadmap visualization (Level 1 through 6).

- [ ] **Task 4.8: Marketing Suite (`apps/student-dashboard`)**
  - Coupon Manager (`/marketing/coupons`):
    - Data table of existing coupons (Code, Discount, Min Spend, Redemptions, Status).
    - "Create Coupon" modal: Code input, Discount type (Percentage vs Fixed ৳), Amount, Expiry date picker, Minimum cart total.
  - Announcement Bar Editor:
    - Live preview of top bar with background color picker and message input.
  - Referral & Campaign Link Generator:
    - Input destination page, generate tracked link: `https://store.platform.com/products/bag?ref=shadhin&utm_campaign=summer_sale`.
    - Copy-to-clipboard button.

- [ ] **Task 4.9: Store Analytics & Coaching View (`apps/student-dashboard`)**
  - Analytics Dashboard (`/analytics`):
    - Visual Funnel Chart: Horizontal funnel bar showing Visitors -> Views -> Carts -> Checkouts -> Orders.
    - Key Metric Cards: Conversion Rate (%), Average Order Value (AOV), Cart Abandonment Rate (%).
    - "Smart Business Coach" Card:
      - Highlighted advice box with target recommendations generated from real store data.
      - Direct action button (e.g. "Optimize Product Descriptions" or "Create a Promo Coupon").

---

## 4. Unit & Integration Testing Tasks

- [ ] **Task 4.10: Gamification Progression Unit Tests (Vitest)**
  - File: `apps/api/src/gamification/gamification.service.spec.ts`
  - Scenarios:
    - Verify reaching 10 orders and ৳10,000 sales triggers promotion from Level 2 to Level 3.
    - Verify promotion denied if rating requirement ($\ge 4.0\star$) is not satisfied.
    - Verify XP awards correctly sum up and prevent duplicate rewards for the same challenge.
- [ ] **Task 4.11: Coupon Engine Unit Tests (Vitest)**
  - File: `apps/api/src/marketing/coupon.service.spec.ts`
  - Scenarios:
    - Percentage discount calculation (10% off ৳1,500 = ৳150 discount).
    - Fixed amount discount calculation (৳200 off ৳1,000 = ৳800 subtotal).
    - Rejection of expired coupon with `BadRequestException`.
    - Rejection when cart subtotal is below `minSpend`.
    - Rejection when coupon usage exceeds `maxUses`.
- [ ] **Task 4.12: Domain Event Gamification Integration Tests (Vitest)**
  - File: `apps/api/test/gamification-events.e2e-spec.ts`
  - Scenarios:
    - Emit `OrderDelivered` event for student store.
    - Verify listener intercepts event, updates `StudentProgress` count in database.
    - Verify completion flag set to true when threshold reached.
    - Verify student's total XP increments and level recalculates.
- [ ] **Task 4.13: Funnel Analytics & Recommendation Integration Tests (Vitest)**
  - File: `apps/api/test/analytics-funnel.e2e-spec.ts`
  - Scenarios:
    - Ingest 100 `PAGE_VIEW` events and 2 `ORDER_COMPLETED` events.
    - Verify funnel query accurately computes a 2.0% conversion rate.
    - Verify coaching engine triggers the low-conversion diagnostic recommendation.

---

## 5. End-to-End (E2E) Testing (Playwright)

- [ ] **Task 4.14: Coupon Creation, Redemption & Milestone Progression (Playwright)**
  - File: `tests/e2e/marketing-gamification-flow.spec.ts`
  - Complete Flow:
    1. **Student Creates Coupon:**
       - Student logs into `student.platform.local/marketing/coupons`.
       - Creates coupon `EID2026`: 10% discount, min spend ৳1,000.
       - Asserts coupon appears in active table.
    2. **Customer Applies Coupon at Checkout:**
       - Customer navigates to `student1.platform.local`.
       - Adds product priced at `৳1,500` to cart.
       - Proceeds to checkout; enters coupon `EID2026` and clicks Apply.
       - Asserts discount of `৳150.00` is deducted; total reflects `৳1,350.00`.
       - Completes checkout with Cash on Delivery.
    3. **Order Delivery & Milestone Trigger:**
       - Admin marks the order as `DELIVERED`.
       - Domain event fires; gamification engine checks "First Promo Sale" challenge.
    4. **Student Level Up & Dashboard Feedback:**
       - Student navigates to `student.platform.local/gamification`.
       - Asserts XP notification badge appears.
       - Asserts "First Promo Sale" challenge marked completed with green checkmark.
       - Level updates to `Level 2: Product Seller` with celebratory dialog.
       - Navigates to `/analytics`; asserts the funnel displays 1 visitor, 1 view, 1 cart, 1 order (100% conversion).

---

## 6. Test Run & Verification Instructions

### 6.1 Database Migration
```bash
# Apply Phase 4 Prisma schema migration
pnpm --filter @repo/db prisma migrate dev --name growth_and_training

# Re-generate Prisma Client
pnpm --filter @repo/db prisma generate
```

### 6.2 Running Unit & Integration Tests
```bash
# Run gamification, coupon, and analytics unit tests
pnpm --filter @repo/api test apps/api/src/gamification
pnpm --filter @repo/api test apps/api/src/marketing
pnpm --filter @repo/api test apps/api/src/analytics

# Run event-driven integration tests
pnpm --filter @repo/api test test/gamification-events.e2e-spec.ts
pnpm --filter @repo/api test test/analytics-funnel.e2e-spec.ts
```

### 6.3 Running Frontend Suite
```bash
# Run tests for student dashboard gamification & analytics UI
pnpm --filter @repo/student-dashboard test
pnpm --filter @repo/storefront test hooks/useFunnelTracker.test.ts
```

### 6.4 Running Playwright E2E Suite
```bash
# Run marketing and gamification E2E test
pnpm exec playwright test tests/e2e/marketing-gamification-flow.spec.ts --project=chromium --headed=false
```

---

## 7. Definition of Done (DoD) Checklist

- [ ] Domain events automatically trigger student challenge progress and XP awards without manual intervention.
- [ ] Career level progression accurately evaluates orders, gross sales, XP, and rating thresholds.
- [ ] Feature gating restricts premium features (custom domains, fee discounts) according to student level.
- [ ] Coupon engine supports percentage and fixed discounts with minimum spend and expiration constraints.
- [ ] Storefront beacon accurately logs funnel events (views, carts, checkouts) into PostgreSQL/Redis.
- [ ] Store analytics computes accurate funnel conversion rates and AOV.
- [ ] Automated business coaching card produces actionable advice based on live store data.
- [ ] All unit, integration, and E2E test suites pass with $\ge 85\%$ test coverage.
