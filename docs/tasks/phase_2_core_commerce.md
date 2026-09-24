# Phase 2: Core Commerce — Implementation Tasks

**Phase:** Phase 2 — Core Commerce (MVP)  
**Features Covered:**  
- Feature 4: Student Store Management  
- Feature 5: Student Product Management (Reseller Layer)  
- Feature 6: Pricing & Financial Model  
- Feature 7: Storefront & Customer Shopping Experience  
- Feature 8: Order Management & Fulfillment  
- Feature 9: Customer Management (CRM per store)  
**Source Documents:** [`docs/implementation_priority.md`](../implementation_priority.md), [`docs/features.md`](../features.md), [`docs/business_logic.md`](../business_logic.md), [`docs/tech_stack.md`](../tech_stack.md), [`docs/prd.md`](../prd.md)  
**Status:** Ready for Implementation (Prerequisite: Phase 1)  

---

## 1. Phase Overview & Objectives

Phase 2 turns the foundational system into a live commercial e-commerce platform. It completes the minimum viable "real store" loop: a student opens their store, sets their branding, selects master products, configures markup pricing, and a real customer browses the storefront, adds products to cart, and completes checkout. Platform staff then fulfill and dispatch the physical order.

### Target Outcomes
1. **Student Store Builder:** Students can provision their store on `{slug}.platform.com`, customize theme colors/typography, upload branding (logo, favicon), and publish their storefront.
2. **Reseller Product Catalog:** Students can import master products into their store as `StoreProduct`, override retail titles/descriptions/images, and set retail prices (`selling_price >= base_price`).
3. **Automated Pricing & Profit Engine:** Automatic calculation of customer prices, platform fees, payment fees, shipping fees, and student net profit.
4. **Public Next.js Storefront:** Fast, SEO-ready public e-commerce store with dynamic theming from tenant config, cart drawer, checkout, and order tracking.
5. **Transactional Inventory & Checkout:** Race-condition-free checkout with pessimistic locking (`SELECT ... FOR UPDATE`), bKash, Nagad, SSLCommerz, and Cash on Delivery (COD) payment gateways.
6. **Order Fulfillment Pipeline:** Order state machine from `PENDING_PAYMENT` through `PAID`, `PROCESSING`, `SHIPPED`, and `DELIVERED`, with warehouse courier tracking.
7. **Per-Store CRM:** Private customer directories isolated per store recording order counts, contact details, and lifetime spend.

---

## 2. Architecture & Codebase Layout

```
├── apps/
│   ├── api/src/
│   │   ├── stores/                   # Store builder, branding, theme API
│   │   ├── store-products/           # Reseller product import & price overrides
│   │   ├── pricing/                  # Markup calculation & profit engine
│   │   ├── storefront/               # Headless public endpoints (/api/v1/stores/{slug}/*)
│   │   ├── orders/                   # Order placement, state machine, stock locking
│   │   ├── payments/                 # bKash, Nagad, SSLCommerz, COD adapters
│   │   └── customers/                # Per-store isolated customer CRM
│   ├── storefront/                   # Next.js 14+ public store app
│   │   └── src/
│   │       ├── app/[slug]/           # Dynamic multi-tenant routes (Home, Products, Cart, Checkout)
│   │       ├── components/           # Themed UI (Navbar, ProductCard, CartDrawer, CheckoutForm)
│   │       └── store/useCart.ts      # Zustand cart state with localStorage persistence
│   ├── student-dashboard/src/
│   │   ├── pages/store-builder/      # Live theme customizer & branding editor
│   │   ├── pages/my-products/        # Reseller catalog & pricing modal
│   │   ├── pages/orders/             # Student orders list & earnings breakdown
│   │   └── pages/crm/                # Student customer directory
│   └── admin-dashboard/src/
│       └── pages/fulfillment/        # Central order fulfillment queue & courier dispatch
└── packages/
    └── db/prisma/schema.prisma       # Added StoreProduct, Customer, Order, OrderItem, LedgerEntry
```

---

## 3. Detailed Work Breakdown

### 3.1 Database & Schema Implementation (`packages/db`)

- [ ] **Task 2.1: Commerce Schema Expansion**
  - Update `packages/db/prisma/schema.prisma` with:
    - Enum `OrderStatus`: `PENDING_PAYMENT`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `COMPLETED`, `CANCELLED`, `RETURNED`, `REFUNDED`.
    - Model `StoreProduct`:
      - `id` (UUID), `storeId` (FK Store), `masterProductId` (FK MasterProduct).
      - `sellingPrice` (Decimal), `compareAtPrice` (Decimal nullable).
      - `customTitle` (String nullable), `customDescription` (Text nullable), `customImages` (Text[]).
      - `tags` (Text[]), `isFeatured` (Boolean default false), `isVisible` (Boolean default true).
      - Timestamps. Unique constraint `[storeId, masterProductId]`. Index on `storeId`.
    - Model `Customer`:
      - `id` (UUID), `storeId` (FK Store), `fullName` (String), `phone` (String), `email` (String nullable).
      - `addresses` (Jsonb default '[]'), `totalOrdersCount` (Int default 0), `totalSpend` (Decimal default 0).
      - Timestamps. Unique constraint `[storeId, phone]`. Index on `storeId`.
    - Model `Order`:
      - `id` (UUID), `storeId` (FK Store), `customerId` (FK Customer), `orderNumber` (String unique).
      - `subtotal` (Decimal), `shippingFee` (Decimal), `discountAmount` (Decimal), `totalAmount` (Decimal).
      - Financial splits: `totalBaseCost` (Decimal), `platformCommission` (Decimal), `paymentFee` (Decimal), `studentNetProfit` (Decimal).
      - `status` (OrderStatus), `paymentMethod` (String), `paymentStatus` (String), `shippingAddress` (Jsonb).
      - `trackingNumber` (String nullable), `courierName` (String nullable).
      - Timestamps. Indices on `storeId`, `customerId`, `status`.
    - Model `OrderItem`:
      - `id` (UUID), `orderId` (FK Order), `storeProductId` (FK StoreProduct nullable), `masterProductId` (FK MasterProduct).
      - `quantity` (Int), `unitBasePrice` (Decimal), `unitSellingPrice` (Decimal), `totalPrice` (Decimal).
    - Model `LedgerEntry`:
      - `id` (UUID), `storeId` (FK Store), `orderId` (FK Order nullable).
      - `entryType` (Enum: `ORDER_PROFIT`, `PLATFORM_FEE`, `PAYOUT_WITHDRAWAL`).
      - `amount` (Decimal), `balanceAfter` (Decimal), `notes` (String nullable), `createdAt`.
  - Create and apply migration `0002_core_commerce`.

---

### 3.2 Backend Implementation (`apps/api`)

- [ ] **Task 2.2: Student Store Management Module (`stores`)**
  - Implement `StoreService`:
    - `POST /api/v1/stores`: Create student store (initial slug, default theme).
    - `GET /api/v1/stores/me`: Get current student's store details.
    - `PATCH /api/v1/stores/me/branding`: Update store name, logo, favicon, tagline, contact info, social links.
    - `PATCH /api/v1/stores/me/theme`: Update `themeConfig` (primaryColor, secondaryColor, fontFamily, borderRadius).
    - `PATCH /api/v1/stores/me/status`: Toggle store status (`DRAFT` <-> `ACTIVE`). Guard: requires at least 1 active product.
    - `GET /api/v1/stores/check-slug`: Verify slug uniqueness.

- [ ] **Task 2.3: Student Product Management Module (`store-products`)**
  - Implement `StoreProductService`:
    - `POST /api/v1/student/products`: Import product from master catalog.
      - Validate `masterProductId` exists and is active.
      - Validate `sellingPrice >= masterProduct.basePrice`.
      - Calculate and return projected profit preview.
    - `GET /api/v1/student/products`: List current student store's imported products with pagination and filters.
    - `PATCH /api/v1/student/products/:id`: Update selling price, compare-at price, custom title, description, custom images, visibility.
    - `DELETE /api/v1/student/products/:id`: Remove product from student store.

- [ ] **Task 2.4: Pricing & Financial Calculation Engine (`pricing`)**
  - Implement `PricingCalculatorService`:
    - Calculate customer price: `SellingPrice = BasePrice + Markup`.
    - Calculate fee deductions:
      - `PlatformCommission = SellingPrice * 0.05` (5% default platform commission).
      - `PaymentProcessingFee = TotalAmount * 0.02` (2% for MFS/Cards, 0% for COD).
      - `ShippingFee = Flat ৳80 inside Dhaka / ৳150 outside Dhaka`.
      - `StudentNetProfit = (SellingPrice - BasePrice) - PlatformCommission - PaymentProcessingFee`.
    - Unit calculations exposed via internal service and `POST /api/v1/student/pricing/preview` endpoint.

- [ ] **Task 2.5: Headless Storefront Public API (`storefront`)**
  - Implement public endpoints resolving tenant from subdomain or `X-Tenant-Slug`:
    - `GET /api/v1/stores/:slug/meta`: Returns store branding, active theme configuration, contact information.
    - `GET /api/v1/stores/:slug/products`: Paginated public catalog with search, category filtering, sort (`price_asc`, `price_desc`, `newest`).
    - `GET /api/v1/stores/:slug/products/:productId`: Detailed product view (title, custom description, images, selling price, available stock boolean).

- [ ] **Task 2.6: Order & Stock Transactional Engine (`orders`)**
  - Implement `OrderService` with atomic inventory reservation:
    - `POST /api/v1/stores/:slug/checkout`:
      - Input: customer details (fullName, phone, address), items `[{ storeProductId, quantity }]`, paymentMethod (`BKASH`, `NAGAD`, `CARD`, `COD`).
      - Open Prisma `$transaction`:
        1. Query `MasterProduct` with `SELECT ... FOR UPDATE` row locks.
        2. Check `masterProduct.stockQuantity >= requestedQuantity`. If insufficient, rollback and throw `409 Conflict ("Out of stock")`.
        3. Decrement `stockQuantity` on `MasterProduct`.
        4. Upsert `Customer` record scoped to `store_id` and `phone`. Increment `totalOrdersCount`.
        5. Calculate financial splits (subtotal, shipping, fees, studentNetProfit).
        6. Insert `Order` and `OrderItems`.
        7. If COD, set status `PROCESSING`, paymentStatus `UNPAID`.
        8. If online payment, set status `PENDING_PAYMENT`, generate payment gateway redirect URL.
      - Return `201 Created` with `orderNumber`, `totalAmount`, and payment URL.
    - `GET /api/v1/orders/track/:orderNumber`: Public tracking endpoint returning order status, courier info, and tracking timeline.

- [ ] **Task 2.7: Payment Gateway Integration (`payments`)**
  - Implement payment gateway adapter interface `PaymentGatewayAdapter`:
    - `BKashAdapter`: Sandbox API for payment creation, execute, and query.
    - `SSLCommerzAdapter`: Session creation, IPN callback, payment validation.
    - `CodAdapter`: Instant order confirmation.
  - Endpoints:
    - `POST /api/v1/payments/webhook/:gateway`: Webhook handler validating signatures.
    - On payment success: Transition order to `PAID`, emit domain event `PaymentCompleted`.
    - On payment failure: Rollback stock decrement, transition order to `CANCELLED`.

- [ ] **Task 2.8: Order Fulfillment & Warehouse Dispatch (`orders` + `admin`)**
  - Implement fulfillment endpoints for institute order managers:
    - `GET /api/v1/admin/orders`: Global order queue across all stores with status filters.
    - `PATCH /api/v1/admin/orders/:id/status`: Update status (`PROCESSING` -> `SHIPPED` -> `DELIVERED`).
    - `PATCH /api/v1/admin/orders/:id/dispatch`: Attach `courierName` (e.g. Steadfast, Pathao, RedX) and `trackingNumber`. Automatically updates status to `SHIPPED`.
    - `GET /api/v1/student/orders`: Student view of their store's orders with profit breakdown.

- [ ] **Task 2.9: Customer Management CRM (`customers`)**
  - Implement `CustomerService`:
    - `GET /api/v1/student/customers`: Paginated list of customers for the authenticated student's store.
    - `GET /api/v1/student/customers/:id`: Customer detail view showing addresses and past order history.
    - Enforce tenant isolation via `TenantContext` — student cannot access customer records from other stores.

---

### 3.3 Frontend Implementation

- [ ] **Task 2.10: Next.js Public Storefront (`apps/storefront`)**
  - Implement dynamic theme provider injecting `primaryColor`, `secondaryColor`, `fontFamily`, and `borderRadius` from store metadata into Tailwind CSS variables.
  - Build Storefront Pages:
    - `/[slug]`: Hero banner, featured products carousel, all products grid with filters and search.
    - `/[slug]/product/[id]`: Image gallery, title, pricing, quantity selector, "Add to Cart" and "Buy Now" buttons.
    - `/[slug]/cart`: Floating Cart Drawer and full cart page with quantity adjustment and subtotal calculation.
    - `/[slug]/checkout`: Multi-step checkout form (Customer Info, Delivery Address in Bangladesh divisions/districts, Payment Method selector).
    - `/[slug]/order-confirmation/[orderNumber]`: Order summary with live status badge and payment receipt.
    - `/[slug]/track`: Order lookup by order number and phone number.
  - Implement Zustand cart store in `apps/storefront/src/store/useCart.ts` with local storage synchronization scoped per store slug.

- [ ] **Task 2.11: Student Store Builder & CRM (`apps/student-dashboard`)**
  - Implement Store Customizer:
    - Real-time preview iframe showing storefront with chosen primary/secondary colors, fonts, and logo.
    - Save branding form with logo dropzone.
    - One-click "Publish Store" toggle.
  - Implement "My Products" (Reseller Catalog):
    - Table of imported products with active/hidden status toggle.
    - "Set Price & Markup" modal with live net profit calculator card.
    - Custom marketing copy editor (Custom title, rich description, custom gallery upload).
  - Implement Orders Screen:
    - Order list with customer name, status badge, total amount, student net profit (৳), and courier tracking link.
  - Implement CRM Screen:
    - Customer list with phone number, orders count, total spend, and date of last purchase.

- [ ] **Task 2.12: Institute Fulfillment Console (`apps/admin-dashboard`)**
  - Global Order Operations Screen:
    - Filter orders by: `Pending`, `Processing`, `Ready for Dispatch`, `Shipped`, `Delivered`.
    - "Dispatch Order" modal: Select courier (Pathao / Steadfast / RedX / Paperfly), input tracking ID, print invoice/packing slip.
    - Order detail view showing student store attribution, wholesale cost, customer delivery details.

---

## 4. Unit & Integration Testing Tasks

- [ ] **Task 2.13: Pricing & Profit Unit Tests (Vitest)**
  - File: `apps/api/src/pricing/pricing.service.spec.ts`
  - Scenarios:
    - Verify selling price lower than base price throws `BadRequestException`.
    - Correct calculation of 5% platform fee and 2% payment fee on standard ৳1,500 item with ৳1,000 base cost.
    - Zero payment fee applied for Cash on Delivery.
    - Rounding precision verification for Bangladeshi Taka (no floating-point rounding errors).
- [ ] **Task 2.14: Order State Machine Unit Tests (Vitest)**
  - File: `apps/api/src/orders/order-state-machine.spec.ts`
  - Scenarios:
    - Valid transitions: `PENDING_PAYMENT` -> `PAID` -> `PROCESSING` -> `SHIPPED` -> `DELIVERED`.
    - Invalid transition rejection: `PENDING_PAYMENT` directly to `DELIVERED` throws error.
    - Cancellation rules: Cancelled orders trigger inventory restitution.
- [ ] **Task 2.15: Concurrent Checkout & Stock Lock Integration Tests (Vitest)**
  - File: `apps/api/test/concurrent-checkout.e2e-spec.ts`
  - Scenarios:
    - Seed a master product with exactly 3 items in stock.
    - Dispatch 10 concurrent requests to `POST /api/v1/stores/:slug/checkout` each requesting 1 item.
    - Assert that exactly 3 orders succeed with `201 Created`.
    - Assert that exactly 7 orders fail with `409 Conflict ("Out of stock")`.
    - Verify final `stockQuantity` in database is exactly `0` (no negative stock or overselling).
- [ ] **Task 2.16: Multi-Tenant CRM Data Isolation Tests (Vitest)**
  - File: `apps/api/test/crm-tenant-isolation.e2e-spec.ts`
  - Scenarios:
    - Store A and Store B both receive an order from customer phone `+8801700000000`.
    - Verify two distinct customer records are created, each scoped to its respective `store_id`.
    - Authenticate as Student A: verify only Store A customer record and orders are returned.
    - Verify querying `/api/v1/student/customers/:id` of Store B returns `404 Not Found` or `403 Forbidden`.

---

## 5. End-to-End (E2E) Testing (Playwright)

- [ ] **Task 2.17: Full E-Commerce Purchase & Fulfillment Cycle (Playwright)**
  - File: `tests/e2e/core-commerce-loop.spec.ts`
  - Complete End-to-End Flow:
    1. **Student Store Setup:**
       - Student logs into `student.platform.local`.
       - Imports "Wireless Headphones" (Base: ৳1,800) into store.
       - Sets retail price to `৳2,400` (projected profit: ৳480).
       - Customizes theme color to `#059669` (Emerald) and sets store status to `ACTIVE`.
    2. **Customer Browsing & Checkout:**
       - Playwright navigates to `student1.platform.local`.
       - Verifies emerald branding applied.
       - Clicks "Wireless Headphones", clicks "Add to Cart".
       - Opens cart, proceeds to checkout.
       - Fills in customer details: Name "Karim Ullah", Phone "01811223344", Address "Banani, Dhaka".
       - Selects "Cash on Delivery", submits order.
       - Asserts order confirmation page appears with unique order number `ORD-XXXX`.
    3. **Admin Order Fulfillment:**
       - Admin logs into `admin.platform.local/fulfillment`.
       - Locates order `ORD-XXXX`.
       - Clicks "Dispatch Order", enters courier "Steadfast" and tracking number `ST-998877`.
       - Status changes to `SHIPPED`.
       - Marks order as `DELIVERED`.
    4. **Student Profit Verification:**
       - Student refreshes `student.platform.local/orders`.
       - Asserts order `ORD-XXXX` appears with status `DELIVERED` and net profit credit of `৳480`.
       - Navigates to CRM; verifies Karim Ullah is listed with 1 order and ৳2,400 spend.

---

## 6. Test Run & Verification Instructions

### 6.1 Database Migration
```bash
# Apply Phase 2 Prisma schema migration
pnpm --filter @repo/db prisma migrate dev --name core_commerce_models

# Re-generate Prisma Client
pnpm --filter @repo/db prisma generate
```

### 6.2 Running Unit & Concurrency Tests
```bash
# Run pricing engine & state machine unit tests
pnpm --filter @repo/api test apps/api/src/pricing
pnpm --filter @repo/api test apps/api/src/orders

# Run concurrent stock locking stress test
pnpm --filter @repo/api test test/concurrent-checkout.e2e-spec.ts

# Run tenant isolation integration tests
pnpm --filter @repo/api test test/crm-tenant-isolation.e2e-spec.ts
```

### 6.3 Running Frontend Component & Store Tests
```bash
# Run Vitest on Next.js Storefront Cart & Checkout hooks
pnpm --filter @repo/storefront test

# Run Vitest on Student Dashboard Store Builder components
pnpm --filter @repo/student-dashboard test
```

### 6.4 Running Full Playwright E2E Suite
```bash
# Start all services
pnpm turbo run dev

# Execute Core Commerce Playwright suite
pnpm exec playwright test tests/e2e/core-commerce-loop.spec.ts --project=chromium --headed=false
```

---

## 7. Definition of Done (DoD) Checklist

- [ ] Complete commercial loop executable: Student Store -> Catalog Import -> Markup -> Customer Checkout -> Fulfillment -> Student Net Profit.
- [ ] Concurrency stress test confirms zero overselling / race conditions on low inventory items.
- [ ] Cash on Delivery and online payment flows (bKash/SSLCommerz sandbox) fully operational.
- [ ] Public Next.js storefront dynamically renders tenant colors, logo, and typography from tenant config.
- [ ] Strict tenant isolation verified: no cross-tenant leakage of orders or customer CRM records.
- [ ] Customer tracking page allows order tracking by order number and phone.
- [ ] All unit, integration, and E2E tests passing with test coverage $\ge 85\%$.
