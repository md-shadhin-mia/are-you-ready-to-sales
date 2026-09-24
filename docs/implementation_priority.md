# Feature Implementation Priority

**Project:** Commercial E-Commerce Reseller & Training Platform
**Source:** [`docs/features.md`](./features.md)

This document sequences the 18 feature groups from `features.md` into build phases. Each phase must be functionally solid before the next phase depends on it — phases are cumulative, not parallel tracks.

---

## Phase 1 — Foundation
*Nothing else works without these. No UI value yet, but everything is built on top of it.*  
📋 **Detailed Implementation Plan:** [`docs/tasks/phase_1_foundation.md`](./tasks/phase_1_foundation.md)

| # | Feature | What it does |
|---|---|---|
| 1 | **Authentication & Access Control** | Lets users (students, customers, staff) register and log in, assigns roles (Institute Admin, Product Manager, Student, etc.), and controls who can do what. |
| 2 | **Multi-Tenant Architecture & Data Model** | Keeps every student store's products, customers, orders, and reviews isolated from every other store while sharing one database and one master catalog. |
| 3 | **Master Product Catalog (Institute-owned)** | The institute's central list of sellable products — pricing, stock, images, categories — that students later pick from. |

---

## Phase 2 — Core Commerce
*The minimum viable "real store" loop: a student can open a store, add products, and a customer can buy something.*  
📋 **Detailed Implementation Plan:** [`docs/tasks/phase_2_core_commerce.md`](./tasks/phase_2_core_commerce.md)

| # | Feature | What it does |
|---|---|---|
| 4 | **Student Store Management** | Gives each student their own storefront (subdomain, branding, theme, pages) that they can customize and publish. |
| 5 | **Student Product Management (Reseller Layer)** | Lets a student pull a catalog product into their store, set their own selling price, and customize its title/images/description. |
| 6 | **Pricing & Financial Model** | Calculates the customer price from base price + markup, and works out what the student actually earns after fees. |
| 7 | **Storefront & Customer Shopping Experience** | The public-facing shopping flow — browse, cart, checkout, payment — that real customers use on a student's store. |
| 8 | **Order Management & Fulfillment** | Tracks every order from placement through payment, shipping, and delivery, and gives staff a dashboard to fulfill them. |
| 9 | **Customer Management (CRM per store)** | Gives each student a private view of their own customers — contact info, order history, spend — isolated from other stores. |

---

## Phase 3 — Trust & Engagement
*Once real orders are flowing, this phase builds the credibility and feedback loop that makes the marketplace trustworthy and sticky.*  
📋 **Detailed Implementation Plan:** [`docs/tasks/phase_3_trust_engagement.md`](./tasks/phase_3_trust_engagement.md)

| # | Feature | What it does |
|---|---|---|
| 10 | **Reviews & Ratings System** | Lets verified customers rate the product, the store's service, and delivery separately, so one bad delivery doesn't wreck a product's rating. |
| 11 | **Store Reputation & Performance** | Rolls up ratings and order stats into a public reputation score for each student's store. |
| 12 | **Student Dashboard** | A single screen combining a student's business numbers (revenue, orders, rating) with their training progress. |

---

## Phase 4 — Growth & Training Layer
*Turns the platform from "a store" into "a guided learning business," and gives students tools to actually grow sales.*  
📋 **Detailed Implementation Plan:** [`docs/tasks/phase_4_growth_training.md`](./tasks/phase_4_growth_training.md)

| # | Feature | What it does |
|---|---|---|
| 13 | **Gamification & Training Progression** | Automatically tracks real business milestones (first sale, 10 orders, 4.5★ rating) and turns them into levels and achievements. |
| 14 | **Marketing Tools** | Gives students coupons, promo banners, landing pages, and referral links to drive traffic and sales to their store. |
| 15 | **Store Analytics** | Shows students their funnel (views → cart → checkout → orders) and suggests what to improve. |

---

## Phase 5 — Platform Operations & Monetization
*Scales the institute's ability to run and profit from the whole ecosystem once many stores are active.*  
📋 **Detailed Implementation Plan:** [`docs/tasks/phase_5_platform_operations.md`](./tasks/phase_5_platform_operations.md)

| # | Feature | What it does |
|---|---|---|
| 16 | **Institute Dashboard** | Gives the institute a top-down view across all students, stores, products, and orders on the platform. |
| 17 | **Business Model / Monetization** | Implements how the institute earns — product margin, platform commission, and student subscription plans. |
| 18 | **Platform Roles & Permissions** | Upgrades the initial hard-coded roles into a flexible, granular permission system as the team and platform grow. |

---

## Rationale

- **Phase 1** has no user-facing output but is a hard dependency for everything else (you can't have a store without tenants, products, or logins).
- **Phase 2** is the smallest slice that produces a real, sellable store — this is the MVP milestone.
- **Phase 3** only makes sense once real orders exist to review and report on.
- **Phase 4** is the platform's differentiator (training + growth tools) but depends on real commercial data from Phases 2–3 to be meaningful.
- **Phase 5** is institute-scale tooling and monetization — valuable once there are enough active stores to manage and monetize.
