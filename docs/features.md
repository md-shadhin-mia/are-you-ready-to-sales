# Feature List

**Project:** Commercial E-Commerce Reseller & Training Platform
**Source:** [`docs/business_logic.md`](./business_logic.md), [`docs/requirement_analysis.md`](./requirement_analysis.md), [`docs/prd.md`](./prd.md)

This document lists all features and sub-features grouped by module. Each top-level feature will be planned one by one (design, data model, APIs, UI, dependencies) in follow-up passes.

Status legend: ⬜ Not planned · 🟡 Planning in progress · ✅ Planned

---

## 1. Authentication & Access Control
- ⬜ 1.1 User registration & login (Student, Customer, Staff)
- ⬜ 1.2 Role management (Super Admin, Institute Admin, Product Manager, Order Manager, Training Manager, Support Agent, Student, Customer)
- ⬜ 1.3 Permission system (granular, e.g. `products.view`, `orders.update`)
- ⬜ 1.4 Student onboarding & verification
- ⬜ 1.5 Account activation / deactivation / suspension
- ⬜ 1.6 Session & multi-tenant identity separation (Student vs Customer vs Institute)

## 2. Master Product Catalog (Institute-owned)
- ⬜ 2.1 Product CRUD (identity, SKU, supplier info)
- ⬜ 2.2 Base pricing management
- ⬜ 2.3 Stock / inventory management
- ⬜ 2.4 Product categories
- ⬜ 2.5 Product images & media management
- ⬜ 2.6 Product availability/status control (per student visibility)
- ⬜ 2.7 Product discovery marketplace for students (browse, view, add to store)

## 3. Student Store (Multi-Tenant) Management
- ⬜ 3.1 Store provisioning (subdomain / custom domain)
- ⬜ 3.2 Store branding (name, logo, favicon, description, contact info)
- ⬜ 3.3 Visual theme customization (colors, typography, buttons, cards, header/footer, product grid)
- ⬜ 3.4 Content management (banners, hero images, promo sections, About/Contact/FAQ/Policies)
- ⬜ 3.5 Store publish/unpublish & status
- ⬜ 3.6 Store settings & configuration

## 4. Student Product Management (Reseller Layer)
- ⬜ 4.1 Add master product to store (`StudentStoreProduct` creation)
- ⬜ 4.2 Selling price / markup configuration
- ⬜ 4.3 Custom title, marketing description, custom images/gallery
- ⬜ 4.4 Product tags & promotional pricing
- ⬜ 4.5 Product status per store (active/hidden)
- ⬜ 4.6 Inventory sync from master product (stock lock during checkout)

## 5. Pricing & Financial Model
- ⬜ 5.1 Base price + markup pricing engine
- ⬜ 5.2 Fee model (platform fee, payment processing fee, shipping fee, institute commission)
- ⬜ 5.3 Net profit calculation for students
- ⬜ 5.4 Discounts & promotional pricing rules
- ⬜ 5.5 Financial settlement/ledger (institute vs student payouts)

## 6. Storefront & Customer Shopping Experience
- ⬜ 6.1 Public storefront browsing (product listing, product detail)
- ⬜ 6.2 Cart management
- ⬜ 6.3 Checkout flow
- ⬜ 6.4 Payment integration (MFS/bKash/Nagad, Card, COD)
- ⬜ 6.5 Order confirmation & tracking
- ⬜ 6.6 Headless/Storefront APIs (`/api/store/{store}/...`) for custom frontends

## 7. Order Management & Fulfillment
- ⬜ 7.1 Order creation & lifecycle states (pending, paid, processing, shipped, delivered, cancelled, returned, refunded)
- ⬜ 7.2 Centralized fulfillment dashboard (institute/order manager)
- ⬜ 7.3 Shipment tracking & courier dispatch
- ⬜ 7.4 Returns & refunds handling
- ⬜ 7.5 Order notifications (SMS/Email)

## 8. Customer Management (CRM per store)
- ⬜ 8.1 Customer profile (name, phone, email, addresses)
- ⬜ 8.2 Customer order history & total spend
- ⬜ 8.3 Per-store customer data isolation
- ⬜ 8.4 Customer segmentation (repeat customers, last order)

## 9. Reviews & Ratings System
- ⬜ 9.1 Product review (quality, value)
- ⬜ 9.2 Store review (seller service, response time)
- ⬜ 9.3 Delivery review
- ⬜ 9.4 Verified purchase review eligibility & workflow
- ⬜ 9.5 Review request automation post-delivery
- ⬜ 9.6 Rating aggregation (product rating, store rating, seller performance)

## 10. Store Reputation & Performance
- ⬜ 10.1 Store rating summary
- ⬜ 10.2 Completed orders / response rate / repeat customer metrics
- ⬜ 10.3 Seller performance scoring
- ⬜ 10.4 Multi-level reputation aggregation (product, store, seller)

## 11. Student Dashboard
- ⬜ 11.1 Business metrics overview (revenue, profit, orders, customers, rating)
- ⬜ 11.2 Learning progress visualization
- ⬜ 11.3 Combined business + training view

## 12. Gamification & Training Progression
- ⬜ 12.1 Level system (Store Starter → Top Performer)
- ⬜ 12.2 Milestone/achievement definitions
- ⬜ 12.3 Challenge system (guided operational tasks)
- ⬜ 12.4 Event-driven progress engine (domain events → progress updates)
- ⬜ 12.5 Notifications/achievement unlocks

## 13. Marketing Tools
- ⬜ 13.1 Coupon creation & discount campaigns
- ⬜ 13.2 Promotional banners
- ⬜ 13.3 Landing pages
- ⬜ 13.4 Referral links
- ⬜ 13.5 Campaign tracking (views, clicks, visitors, add-to-cart, checkout, conversion rate)

## 14. Store Analytics
- ⬜ 14.1 Traffic & funnel metrics (visitors, product views, add-to-cart, checkout, conversion rate)
- ⬜ 14.2 Revenue & profit analytics
- ⬜ 14.3 Average order value tracking
- ⬜ 14.4 Automated insights/recommendations engine

## 15. Institute (Admin) Dashboard
- ⬜ 15.1 Student management (registration, verification, activation, profiles, restrictions)
- ⬜ 15.2 Product management overview
- ⬜ 15.3 Seller management (approved sellers, performance, complaints, suspensions)
- ⬜ 15.4 Order management overview (all states)
- ⬜ 15.5 Platform-wide analytics (students, stores, orders, sales, revenue, ratings)

## 16. Multi-Tenant Architecture & Data Model
- ⬜ 16.1 Tenant isolation (store-scoped data: products, customers, orders, reviews, theme)
- ⬜ 16.2 Master Product vs Student Store Product relationship model
- ⬜ 16.3 Central catalog referencing (avoid duplication)

## 17. Business Model / Monetization
- ⬜ 17.1 Product margin model
- ⬜ 17.2 Platform commission model
- ⬜ 17.3 Subscription plans (Free, Starter, Professional, Business) & feature gating
- ⬜ 17.4 Training subscription revenue stream

## 18. Platform Roles & Permissions (Admin-side)
- ⬜ 18.1 Hard-coded core roles (initial phase)
- ⬜ 18.2 Flexible permission system (future phase)

---

## Planning Order (proposed)

1. Authentication & Access Control
2. Multi-Tenant Architecture & Data Model
3. Master Product Catalog
4. Student Store Management
5. Student Product Management
6. Pricing & Financial Model
7. Storefront & Customer Shopping Experience
8. Order Management & Fulfillment
9. Customer Management
10. Reviews & Ratings System
11. Store Reputation & Performance
12. Student Dashboard
13. Gamification & Training Progression
14. Marketing Tools
15. Store Analytics
16. Institute Dashboard
17. Business Model / Monetization
18. Platform Roles & Permissions

*(Rationale: foundational/data-model features first, then core commerce flow, then layers that depend on it — reviews, dashboards, gamification, analytics, monetization.)*
