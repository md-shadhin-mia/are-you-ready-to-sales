# Technology Stack: Monorepo, Modern, Lightweight

**Project:** Commercial E-Commerce Reseller & Training Platform
**Status:** Decided
**Supersedes:** The "Recommended Technology Stack & Architecture" section in [`docs/prd.md`](./prd.md) (§3), which listed undecided backend languages and a microservices + Kafka/RabbitMQ + API gateway topology. This document is the concrete, final decision.

---

## 1. Summary

A single **pnpm + Turborepo monorepo** housing a **NestJS modular monolith** backend, a **Next.js** public storefront, and two **Vite + React SPA** dashboards, backed by **PostgreSQL, Redis, and MinIO**, self-hosted via **Docker Compose** on a VPS behind **Caddy**.

The guiding principle: get the benefits of clear domain separation (from `docs/features.md`) without the operational cost of microservices, a message broker, or a managed-cloud bill, while staying on a modern, fully-TypeScript toolchain.

---

## 2. Repository Layout

```
apps/
  api/                    # NestJS modular monolith — all backend domains
  storefront/             # Next.js 14+ (App Router) — public customer-facing store
  student-dashboard/      # Vite + React SPA — student/reseller portal
  admin-dashboard/        # Vite + React SPA — institute admin/staff portal
packages/
  ui/                     # Shared Tailwind + shadcn/ui components
  config/                 # Shared tsconfig, eslint, tailwind config
  api-client/             # Typed fetch client generated from the API's OpenAPI spec
  db/                     # Prisma schema + generated client (used only by apps/api)
```

**Monorepo tooling:** pnpm workspaces + Turborepo — chosen over Nx for a smaller plugin surface and faster, simpler incremental caching. Fits "lightweight."

---

## 3. Backend — `apps/api` (NestJS, modular monolith)

One deployable API app, internally organized into domain modules that mirror the groups in `docs/features.md`:

```
auth · catalog (master products) · stores · store-products · pricing
orders · payments · customers · reviews · reputation
gamification · marketing · analytics · admin
```

| Concern | Choice | Why |
|---|---|---|
| Framework | **NestJS** | Structured DI + module boundaries make a modular monolith maintainable as domains grow, without splitting into separate services. |
| ORM | **Prisma** against **PostgreSQL 16** | Type-safe queries, easy migrations, good fit for the relational multi-tenant schema already drafted in `docs/prd.md` §4. |
| Domain events | **`@nestjs/event-emitter`** (in-process) | Implements the event-driven training design (`business_logic.md` §20 — `OrderDelivered`, `ReviewReceived`, etc.) without a message broker. |
| Async/deferred jobs | **BullMQ + Redis** | Delayed review requests, notifications, nightly analytics rollups, milestone recomputation — retryable background work without Kafka/RabbitMQ. |
| Multi-tenancy | Shared DB/schema, `store_id` column + Prisma middleware auto-scoping, tenant resolved from subdomain via an interceptor | Simplest correct approach to start; Postgres Row-Level Security can be layered on later for defense-in-depth. |
| Auth | JWT access + refresh tokens (`@nestjs/jwt` + Passport), Argon2 password hashing | Standard, stateless, framework-idiomatic. |
| Roles | Hard-coded `user_role` enum first (`business_logic.md` §15), guard designed to swap in a permission table later | Matches the phased approach already specified in the business logic doc. |
| Validation & API docs | `class-validator`/`class-transformer` DTOs → `@nestjs/swagger` → OpenAPI spec | One source of truth drives both request validation and API documentation. |
| Typed API client | `packages/api-client`, generated from the OpenAPI spec via `openapi-typescript` | End-to-end type safety across all 3 frontends without adopting tRPC (which doesn't fit Nest's controller model as naturally). |
| File uploads | MinIO (S3-compatible) via `@aws-sdk/client-s3`, presigned URLs | Product images, store logos, banners — self-hostable, no vendor lock-in. |
| Payments | bKash, Nagad, SSLCommerz (covers cards), Cash on Delivery | Matches the ৳ / Bangladesh market context throughout the source docs. |

---

## 4. Data & Infrastructure (Docker Compose, self-hosted VPS)

```
postgres      → PostgreSQL 16, primary datastore
redis         → Redis 7, cache + sessions + BullMQ backend
minio         → S3-compatible object storage for media
api           → NestJS app
storefront    → Next.js app
student-dashboard → static build, served by Caddy
admin-dashboard    → static build, served by Caddy
caddy         → reverse proxy, automatic HTTPS, wildcard subdomain routing
```

Caddy over Nginx+Certbot: automatic HTTPS and simpler config for the wildcard subdomain pattern (`{store-slug}.platform.com`) each student store needs.

---

## 5. Frontend

| App | Stack | Why |
|---|---|---|
| **Storefront** (public) | Next.js 14+ App Router, SSR/ISR | Public, SEO-critical, one storefront serves every tenant via host-header-based store resolution in middleware. |
| **Student dashboard** | Vite + React + React Router SPA | Auth-gated, no SEO/SSR need — a plain SPA is lighter to build and deploy. |
| **Admin dashboard** | Vite + React + React Router SPA | Same reasoning as student dashboard. |
| Shared UI | Tailwind CSS + shadcn/ui in `packages/ui` | Consistent look across all 3 frontends without a heavy component-library runtime. |
| Data/state | TanStack Query (server state) + Zustand (light local state) | Minimal, well-supported, no boilerplate-heavy alternatives (e.g. Redux). |

---

## 6. Testing & CI

- **Vitest** everywhere (api, packages, both React SPAs) instead of splitting between Jest and Vitest — one test runner monorepo-wide.
- **Playwright** for e2e (storefront checkout flow, dashboard critical paths).
- **GitHub Actions** + Turborepo caching, scoped to affected packages only.

---

## 7. Alternatives Considered & Rejected

| Option | Rejected because |
|---|---|
| Nx | Heavier plugin/graph system than needed; Turborepo is simpler for this repo's size. |
| Microservices + API gateway + Kafka/RabbitMQ (original PRD draft) | High operational overhead for the actual scale needed at launch; a modular monolith gives the same domain separation with far less infrastructure. |
| Managed PaaS (Vercel/Railway/Neon) | User chose self-hosted VPS + Docker Compose for full control and cost predictability. |
| tRPC | Doesn't fit NestJS's controller/decorator model as naturally as REST + OpenAPI; REST also keeps the storefront API genuinely headless-friendly for third-party consumption (`business_logic.md` §7). |
| Next.js for the dashboards too | Dashboards are entirely auth-gated with no SEO requirement — SSR is unnecessary weight there; Next.js is reserved for the storefront where SSR/SEO actually matters. |
| Fastify / Hono (bare) | Would be lighter at the framework layer, but NestJS's module/DI structure was preferred for organizing this many business domains inside one app. |

---

## 8. Feature-Module Mapping

Each backend module under `apps/api/src/` corresponds to a group in [`docs/features.md`](./features.md):

| `features.md` group | `apps/api` module |
|---|---|
| 1. Authentication & Access Control | `auth` |
| 2. Master Product Catalog | `catalog` |
| 3. Student Store Management | `stores` |
| 4. Student Product Management | `store-products` |
| 5. Pricing & Financial Model | `pricing` |
| 6. Storefront & Customer Shopping Experience | `storefront` (public controllers) |
| 7. Order Management & Fulfillment | `orders` |
| 8. Customer Management | `customers` |
| 9. Reviews & Ratings System | `reviews` |
| 10. Store Reputation & Performance | `reputation` |
| 11–12. Student Dashboard / Gamification | `gamification` |
| 13. Marketing Tools | `marketing` |
| 14–15. Store Analytics / Institute Dashboard | `analytics`, `admin` |
| 16–17. Multi-Tenant Architecture / Business Model | cross-cutting (Prisma schema + `pricing`/`admin`) |
| 18. Platform Roles & Permissions | `auth` (role/permission guards) |

This keeps the feature-planning docs and the codebase structure in lockstep as each feature from `docs/features.md` is implemented.
