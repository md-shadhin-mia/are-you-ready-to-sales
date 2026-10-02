# Phase 1: Foundation — Implementation Tasks

**Phase:** Phase 1 — Foundation  
**Features Covered:**  
- Feature 1: Authentication & Access Control  
- Feature 2: Multi-Tenant Architecture & Data Model  
- Feature 3: Master Product Catalog (Institute-owned)  
**Source Documents:** [`docs/implementation_priority.md`](../implementation_priority.md), [`docs/features.md`](../features.md), [`docs/tech_stack.md`](../tech_stack.md), [`docs/prd.md`](../prd.md)  
**Status:** Ready for Implementation  

---

## 1. Phase Overview & Objectives

Phase 1 establishes the bedrock architecture of the platform. Although public customers cannot yet purchase items in this phase, it builds the entire multi-tenant infrastructure, shared database schema, authentication & role-based access control (RBAC), and the institute's central master product catalog.

### Target Outcomes
1. **Monorepo Foundation:** Working pnpm + Turborepo workspace setup with `apps/api`, `apps/storefront`, `apps/student-dashboard`, `apps/admin-dashboard`, `packages/db`, `packages/ui`, `packages/config`, and `packages/api-client`.
2. **PostgreSQL & Prisma:** Core tables (`users`, `stores`, `categories`, `master_products`, `branches`, `student_batches`) migrated with UUIDs and indices, plus complete `OrderStatus` enum.
3. **Multi-Tenancy Engine:** Host header and subdomain resolution middleware (`{slug}.platform.com`), Redis domain caching, and Prisma tenant auto-scoping.
4. **Auth & RBAC:** JWT access & refresh tokens, Argon2 password hashing, and NestJS role guards with core roles (`SUPER_ADMIN`, `INSTITUTE_ADMIN`, `BRANCH_MANAGER`, `PRODUCT_MANAGER`, `ORDER_MANAGER`, `TRAINING_MANAGER`, `SUPPORT_AGENT`, `SELLER`, `STUDENT`, `CUSTOMER`).
5. **Master Catalog & Media:** Central product CRUD for institute product managers with MinIO S3-compatible image uploads via presigned URLs.
6. **Marketplace Discovery API:** Read-only endpoint allowing authenticated students to explore the institute's product catalog.
7. **Admin Portal Shell & Navigation IA:** Deploy the foundational `AdminLayout` supporting all 7 primary operational menus: Dashboards (with urgent alert badge `01`), Students (expandable menu), Branches, Student Batches, Orders (11-status fulfillment navigation & volume counters), Seller Panel, Payment Requests (with pending badge `3`), alongside Master Catalog and Categories.

---

## 2. Architecture & Codebase Layout

```
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── auth/                 # JWT, Argon2, Guards, Strategies
│   │       ├── common/               # Tenant context, Interceptors, Filters
│   │       ├── tenancy/              # Host resolution & store resolution service
│   │       ├── catalog/              # Master product & category controllers/services
│   │       ├── storage/              # MinIO S3 presigned URL generator
│   │       └── users/                # User management & onboarding state
│   ├── admin-dashboard/              # Vite + React SPA (Institute portal)
│   │   └── src/
│   │       ├── components/AdminLayout.tsx # Multi-group navigation shell with live badge & counter support
│   │       ├── pages/auth/           # Admin login
│   │       ├── pages/dashboards/     # Overview & alert notification bubble [01]
│   │       ├── pages/students/       # Expandable student management placeholder
│   │       ├── pages/branches/       # Campus & branch locations placeholder
│   │       ├── pages/batches/        # Student batches & cohort schedules placeholder
│   │       ├── pages/orders/         # Orders multi-status queues placeholder
│   │       ├── pages/sellers/        # Seller Panel (Merchants & Instructors) placeholder
│   │       ├── pages/payouts/        # Financial payment requests [3] placeholder
│   │       ├── pages/catalog/        # Master product management & uploader
│   │       └── pages/categories/     # Category hierarchy manager
│   ├── student-dashboard/            # Vite + React SPA (Student portal)
│   │   └── src/
│   │       ├── pages/auth/           # Student registration & login
│   │       ├── pages/onboarding/     # Onboarding profile wizard
│   │       └── pages/catalog/        # Central catalog discovery
│   └── storefront/                   # Next.js 14+ (App Router)
│       └── src/
│           └── middleware.ts         # Wildcard tenant resolution & validation
└── packages/
    ├── db/
    │   ├── prisma/schema.prisma      # Phase 1 schema models
    │   └── src/index.ts              # Extended Prisma client with tenant scoping
    ├── ui/                           # Shared Tailwind + shadcn/ui components
    └── api-client/                   # Generated typed fetch client from OpenAPI
```

---

## 3. Detailed Work Breakdown

### 3.1 Package & Infrastructure Setup
- [ ] **Task 1.1: Monorepo & Docker Compose Environment**
  - Initialize pnpm workspace and Turborepo configuration (`pnpm-workspace.yaml`, `turbo.json`).
  - Create `docker-compose.yml` defining services:
    - `postgres`: PostgreSQL 16 on port `5432` with healthcheck.
    - `redis`: Redis 7 on port `6379` with healthcheck.
    - `minio`: MinIO object storage on ports `9000` (API) and `9001` (Console) with bucket initialization script for `platform-media`.
  - Configure root scripts: `pnpm build`, `pnpm dev`, `pnpm test`, `pnpm lint`.
- [ ] **Task 1.2: Database Package (`packages/db`)**
  - Initialize Prisma with PostgreSQL provider.
  - Implement initial schema in `packages/db/prisma/schema.prisma`:
    - Enum `UserRole`: `SUPER_ADMIN`, `INSTITUTE_ADMIN`, `BRANCH_MANAGER`, `PRODUCT_MANAGER`, `ORDER_MANAGER`, `TRAINING_MANAGER`, `SUPPORT_AGENT`, `SELLER`, `STUDENT`, `CUSTOMER`.
    - Enum `StoreStatus`: `DRAFT`, `ACTIVE`, `SUSPENDED`, `MAINTENANCE`.
    - Enum `OrderStatus`: `NEW`, `INVOICED`, `IN_COURIER`, `PARTIAL_DELIVERED`, `DELIVERED`, `COMPLETE`, `HOLD`, `CANCELLED`, `UNMATCH`, `EXCHANGE`, `RETURNED`, `REFUNDED`.
    - Model `User`: `id` (UUID), `email`, `passwordHash`, `fullName`, `phone`, `role`, `isActive`, `isVerified`, `createdAt`, `updatedAt`.
    - Model `Branch`: `id` (UUID), `name`, `code` (unique — e.g. `DHK-MAIN`), `branchType` (`PHYSICAL`/`DIGITAL`), `address`, `city`, `contactPhone`, `contactEmail`, `managerId` (FK User nullable), `isActive` (Boolean default true), timestamps.
    - Model `StudentBatch`: `id` (UUID), `branchId` (FK Branch nullable), `name`, `batchCode` (unique — e.g. `BATCH-2026-A`), `instructorId` (FK User nullable), `startDate`, `endDate`, `maxCapacity`, `status`, timestamps.
    - Model `Store`: `id` (UUID), `studentId` (FK User), `storeName`, `slug` (unique), `customDomain` (unique nullable), `logoUrl`, `faviconUrl`, `themeConfig` (Json), `brandingInfo` (Json), `status` (StoreStatus), `ratingAvg`, `totalReviewsCount`, timestamps.
    - Model `Category`: `id` (UUID), `name`, `slug` (unique), `parentId` (self-referencing FK nullable), `createdAt`.
    - Model `MasterProduct`: `id` (UUID), `sku` (unique), `title`, `categoryId` (FK Category), `basePrice` (Decimal), `stockQuantity` (Int), `masterDescription` (Text), `masterImages` (Text[]), `isActive` (Boolean), `ratingAvg`, `totalReviewsCount`, timestamps.
  - Generate initial Prisma migration `0001_foundation`.
  - Create seed script (`packages/db/prisma/seed.ts`) creating default Super Admin, Institute Admin, Branch Manager (`Dhaka Main Campus`), sample batch (`BATCH-2026-A`), sample categories, and 5 initial master products.

---

### 3.2 Backend Implementation (`apps/api`)

- [ ] **Task 1.3: Tenant Context & Multi-Tenancy Engine**
  - Create `TenancyModule` and `TenantContext` request-scoped provider.
  - Implement `TenantResolutionMiddleware`:
    - Inspect incoming `req.headers['host']`.
    - Match `*.platform.com` to extract `{slug}`.
    - Support custom domain lookup via Redis (`domain_map:{host}`).
    - Support fallback header `X-Tenant-Slug` for headless API requests.
    - Fetch store metadata from Redis/Postgres; inject `tenant` into request scope.
    - Throw `403 Forbidden` if store status is `SUSPENDED`.
  - Create Prisma Client Extension in `packages/db` that automatically injects `where: { storeId: tenantId }` into tenant-scoped queries.

- [ ] **Task 1.4: Authentication & Authorization Module (`auth`)**
  - Implement `AuthModule` with Passport JWT Strategy and Refresh Token rotation.
  - Create `PasswordService` using `argon2` for password hashing and verification.
  - Endpoints:
    - `POST /api/v1/auth/register` (Student registration: email, password, full name, phone).
    - `POST /api/v1/auth/login` (Returns access token [15m expiry] and refresh token [7d expiry]).
    - `POST /api/v1/auth/refresh` (Validates refresh token against Redis whitelist, issues new tokens).
    - `POST /api/v1/auth/logout` (Invalidates refresh token in Redis).
    - `GET /api/v1/auth/me` (Returns current user profile & role).
  - Implement Guards:
    - `JwtAuthGuard`: Protects private endpoints.
    - `RolesGuard` + `@Roles(...roles: UserRole[])` decorator: Restricts endpoint access by role enum.

- [ ] **Task 1.5: Object Storage Service (`storage`)**
  - Implement `StorageModule` using `@aws-sdk/client-s3` pointing to MinIO.
  - Implement `StorageService.getPresignedUploadUrl(bucket, key, contentType, expiresIn)`:
    - Restrict uploads to MIME types: `image/jpeg`, `image/png`, `image/webp`.
    - Max size validation guard (5 MB).
  - Endpoint:
    - `POST /api/v1/admin/media/presigned-url` (Guarded: `INSTITUTE_ADMIN`, `PRODUCT_MANAGER`).

- [ ] **Task 1.6: Master Product Catalog Module (`catalog`)**
  - Implement `CategoryService` and `CategoryController`:
    - `GET /api/v1/categories` (Public/Auth tree list).
    - `POST /api/v1/categories` (Guarded: `INSTITUTE_ADMIN`, `PRODUCT_MANAGER`).
    - `PUT /api/v1/categories/:id` (Update category).
    - `DELETE /api/v1/categories/:id` (Delete category if no child products).
  - Implement `MasterProductService` and `MasterProductController`:
    - `POST /api/v1/admin/master-products` (Create product with SKU, title, categoryId, basePrice, stockQuantity, masterDescription, masterImages).
    - `GET /api/v1/admin/master-products` (Paginated list with search, category filter, stock level filter).
    - `GET /api/v1/admin/master-products/:id` (Product detail with SKU and supplier info).
    - `PATCH /api/v1/admin/master-products/:id` (Update details, base price, toggle active status).
    - `PATCH /api/v1/admin/master-products/:id/stock` (Adjust stock count with audit log note).
  - Implement Student Marketplace Catalog Endpoint:
    - `GET /api/v1/student/catalog` (Guarded: `STUDENT`. Returns active master products with wholesale base price and stock availability).
    - `GET /api/v1/student/catalog/:id` (Detail view for student to inspect before importing to store).

- [ ] **Task 1.7: OpenAPI & Typed Client Generation**
  - Configure `@nestjs/swagger` in `apps/api/src/main.ts` exporting OpenAPI 3.0 at `/api/docs`.
  - Add script to generate TypeScript definitions into `packages/api-client` using `openapi-typescript`.

---

### 3.3 Frontend Implementation

- [ ] **Task 1.8: Shared UI Package (`packages/ui`)**
  - Setup Tailwind CSS preset and shadcn/ui components: Button, Input, Form, Dialog, DropdownMenu, Table, Badge, Card, Toast.
- [ ] **Task 1.9: Admin Dashboard Shell & Catalog (`apps/admin-dashboard`)**
  - Implement Authentication Flow (Login page, JWT session storage in memory/cookies, TanStack Query auth provider).
  - Implement Protected `AdminLayout` Navigation Shell with Primary Operational Menus & Badges:
    - **1. Dashboards:** Overview panel with notification bubble displaying `01` urgent alert count.
    - **2. Students:** Expandable accordion menu section (*Directory & Profiles*, *Verification & KYC*, *Student Records*, *Restrictions*).
    - **3. Branches:** Campus location management placeholder route (`/branches`).
    - **4. Student Batches:** Cohorts & class schedules placeholder route (`/batches`).
    - **5. Orders (Expanded Section):** Multi-status tracking navigation with live volume count indicators:
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
    - **6. Seller Panel:** External merchant & instructor management placeholder route (`/sellers`).
    - **7. Payment Requests:** Financial payout requests navigation with pending badge counter `3` (`/payouts`).
    - **Catalog Management:** Navigation items for *Master Catalog* and *Categories*.
  - Implement Category Management Screen:
    - Category tree view, Add Category modal, Edit/Delete actions.
  - Implement Master Product Management Screen:
    - Data table of all catalog products with columns: SKU, Image, Title, Category, Base Price, Stock Quantity, Status, Actions.
    - Filter by category, low stock badge, search bar.
    - "Add New Master Product" drawer/modal:
      - Title, SKU, Category selector, Base Price (৳), Initial Stock Quantity, Description (rich text/markdown).
      - Direct-to-MinIO image dropzone using presigned URL upload flow.
- [ ] **Task 1.10: Student Dashboard (`apps/student-dashboard`)**
  - Implement Student Auth Screens (Register, Login, Forgot Password).
  - Implement Student Onboarding Wizard:
    - Step 1: Profile details (Full Name, Phone).
    - Step 2: Desired Store Name and Subdomain Slug verification check (`/api/v1/stores/check-slug?slug=xyz`).
  - Implement "Institute Product Marketplace" Screen:
    - Grid view of master products available for reselling.
    - Card displays: Title, Category, Institute Wholesale Base Price (`৳1,000`), Available Stock (`In Stock: 250 units`).
    - "View Details" modal showing full description and image gallery.
- [ ] **Task 1.11: Storefront Tenant Resolver Routing (`apps/storefront`)**
  - Next.js 14 App Router `middleware.ts`:
    - Intercept requests, extract subdomain hostname.
    - Verify tenant status against backend/Redis.
    - If tenant invalid or suspended, rewrite to `/[locale]/_error/store-not-found` or `store-suspended`.
    - If valid, forward tenant slug via `x-tenant-slug` header.

---

## 4. Unit & Integration Testing Tasks

- [ ] **Task 1.12: Unit Tests (Vitest)**
  - `apps/api/src/auth/password.service.spec.ts`: Test Argon2 hashing, verification, timing attack resilience.
  - `apps/api/src/auth/jwt.strategy.spec.ts`: Test valid token extraction, expired token rejection.
  - `apps/api/src/auth/roles.guard.spec.ts`: Test role matching for `BRANCH_MANAGER`, `SELLER`, `PRODUCT_MANAGER`, `STUDENT`, and forbidden access scenarios.
  - `apps/api/src/tenancy/tenant-resolution.service.spec.ts`: Test parsing host headers (`store1.platform.com`, `customdomain.com`, `localhost:3000`).
  - `apps/api/src/catalog/dto-validation.spec.ts`: Test `CreateMasterProductDto` validation rules (negative price rejection, SKU format).
  - `apps/admin-dashboard/src/components/AdminLayout.spec.tsx`: Test rendering of all 7 operational navigation sections, expandable student menu items, and notification/volume badge values (`01` on Dashboards, `3` on Payment Requests, order volume badges).
- [ ] **Task 1.13: Integration Tests (Vitest + Testcontainers/Postgres)**
  - `apps/api/test/auth.e2e-spec.ts`:
    - Test student registration -> login -> token refresh -> logout cycle.
    - Verify duplicate email registration returns `409 Conflict`.
  - `apps/api/test/master-catalog.e2e-spec.ts`:
    - Test product creation by `PRODUCT_MANAGER` succeeds with `201`.
    - Test product creation by `STUDENT` fails with `403 Forbidden`.
    - Test category deletion prevented when products are linked (`400 Bad Request`).
  - `apps/api/test/tenancy-isolation.e2e-spec.ts`:
    - Seed two stores (`store-alpha`, `store-beta`).
    - Verify that requests with `X-Tenant-Slug: store-alpha` cannot retrieve store-beta context.

---

## 5. End-to-End (E2E) Testing (Playwright)

- [ ] **Task 1.14: E2E Test Suite (`apps/admin-dashboard`)**
  - File: `tests/e2e/admin-catalog-flow.spec.ts`
  - Flow:
    1. Institute Admin logs into `admin.platform.local`.
    2. Verifies `AdminLayout` renders sidebar with Dashboards (`01` badge), expandable Students, Branches, Batches, Orders (multi-status tabs), Seller Panel, and Payment Requests (`3` badge).
    3. Navigates to Master Catalog -> clicks "Add Product".
    4. Fills in SKU `SKU-TEST-001`, Title `Ergonomic Office Chair`, Base Price `৳4,500`, Stock `50`.
    5. Uploads test image via MinIO presigned URL mock.
    6. Saves product; asserts product appears in data table with active status.
- [ ] **Task 1.15: E2E Test Suite (`apps/student-dashboard`)**
  - File: `tests/e2e/student-onboarding-catalog.spec.ts`
  - Flow:
    1. Student visits `student.platform.local/register`.
    2. Registers with email `student1@example.com` and password.
    3. Completes onboarding step 1 (Profile & Store Name).
    4. Navigates to "Product Marketplace".
    5. Verifies the newly created `Ergonomic Office Chair` is listed with Base Price `৳4,500` and stock `50`.

---

## 6. Test Run & Verification Instructions

### 6.1 Prerequisites & Infrastructure
```bash
# 1. Start Docker dependencies
docker compose up -d postgres redis minio

# 2. Verify containers are healthy
docker compose ps
```

### 6.2 Database Migration & Seeding
```bash
# 3. Apply Prisma migrations
pnpm --filter @repo/db prisma migrate dev --name init_foundation

# 4. Run test seed script
pnpm --filter @repo/db prisma db seed
```

### 6.3 Running Unit & Integration Tests
```bash
# 5. Run all unit tests across monorepo
pnpm turbo run test:unit

# 6. Run backend integration tests
pnpm --filter @repo/api test:integration

# 7. Check test coverage (Target: >= 85% for Auth & Tenancy modules)
pnpm --filter @repo/api test:coverage
```

### 6.4 Running E2E Tests
```bash
# 8. Start local servers
pnpm turbo run dev --filter=@repo/api --filter=@repo/admin-dashboard --filter=@repo/student-dashboard

# 9. Run Playwright E2E suites
pnpm --filter @repo/admin-dashboard test:e2e
pnpm --filter @repo/student-dashboard test:e2e
```

---

## 7. Definition of Done (DoD) Checklist

- [ ] All PostgreSQL tables created with appropriate foreign keys and indexes.
- [ ] Password hashing uses Argon2 with recommended memory/time parameters.
- [ ] JWT access & refresh token rotation functional with Redis revocation.
- [ ] Role-based access control enforces permissions across all endpoints.
- [ ] MinIO presigned URLs correctly generate and accept media uploads.
- [ ] Host header and subdomain resolution middleware operational with Redis caching.
- [ ] All unit and integration tests passing with $\ge 85\%$ coverage on security-sensitive code.
- [ ] OpenAPI specification generated and typed API client successfully compiles.
