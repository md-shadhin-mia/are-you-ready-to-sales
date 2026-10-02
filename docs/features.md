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
- ⬜ 7.1 Order creation & lifecycle states (New, Invoiced, In Courier, Partial Delivered, Complete, Hold, Cancelled, Unmatch, Exchange, Returned, Refunded)
- ⬜ 7.2 Centralized fulfillment dashboard (institute/order manager) with real-time multi-status tracking queues
- ⬜ 7.3 Shipment tracking & courier dispatch integration (Pathao, Steadfast, RedX)
- ⬜ 7.4 Returns, exchanges & replacement processing
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

## 15. Institute Admin Portal & Operational Hub
- ⬜ 15.1 Dashboards (Main Overview Panel)
  - 15.1.1 Executive GMV, revenue, store health & operational KPIs
  - 15.1.2 Real-time urgent alerts with notification bubble/badge indicator (e.g. `01` unread operational action)
  - 15.1.3 Warehouse dispatch velocity & delivery success rate widgets
- ⬜ 15.2 Students (Expandable Management Section)
  - 15.2.1 Searchable student directory and comprehensive student profiles
  - 15.2.2 Identity verification & KYC document audit workflow
  - 15.2.3 Academic enrollment & store affiliation records
  - 15.2.4 Account status governance (activation, suspension with audit reasons, restrictions)
- ⬜ 15.3 Branches Management
  - 15.3.1 Physical and digital campus location CRUD
  - 15.3.2 Branch directors, coordinators, and staff assignment
  - 15.3.3 Physical warehouse hub & regional distribution zone mapping
  - 15.3.4 Branch-wise student enrollment, store activity, and GMV analytics
- ⬜ 15.4 Student Batches Management
  - 15.4.1 Cohort & class creation (batch code, schedule, calendar, enrollment capacity)
  - 15.4.2 Student assignment & batch enrollment mapping
  - 15.4.3 Mentor / training instructor assignment per batch
  - 15.4.4 Cohort commercial performance leaderboard & milestone graduation tracking
- ⬜ 15.5 Orders (Expanded Section — Multi-Status Fulfillment Engine)
  - 15.5.1 Order Overview: General sales summary, GMV breakdown, pipeline conversion metrics
  - 15.5.2 All Orders: Consolidated master queue across all student stores (volume badge e.g. 9410)
  - 15.5.3 New Orders: Unprocessed transactions awaiting confirmation/triage (volume badge e.g. 8)
  - 15.5.4 Complete Orders: Fully fulfilled & delivered transactions closed post-return window (volume badge e.g. 0)
  - 15.5.5 Partial Delivered: Orders with partial item dispatch or split fulfillment (volume badge e.g. 233)
  - 15.5.6 Unmatch Orders: Flagged items with catalog/SKU discrepancies, barcode mismatches, or student store mapping errors (volume badge e.g. 4035)
  - 15.5.7 Invoiced Orders: Orders with official billing documents / tax invoices generated (volume badge e.g. 8778)
  - 15.5.8 Hold Orders: Paused transactions awaiting customer confirmation or stock arrival (volume badge e.g. 29)
  - 15.5.9 Cancelled Orders: Terminated or voided orders with cancellation audit trail (volume badge e.g. 131)
  - 15.5.10 In Courier: Active 3PL shipments in transit with live courier sync (volume badge e.g. 9243)
  - 15.5.11 Exchange Orders: Manage item, course, or merchandise swaps and return replacements
- ⬜ 15.6 Seller Panel
  - 15.6.1 External merchant & instructor onboarding and profile management
  - 15.6.2 Commission rates, royalty models, and product listing permissions
  - 15.6.3 Seller storefront compliance, complaints, and suspension workflows
  - 15.6.4 Seller performance scorecards and reviews
- ⬜ 15.7 Payment Requests
  - 15.7.1 Financial payout request queue with pending badge indicator (e.g. 3)
  - 15.7.2 Payout verification, ledger validation, and KYC check
  - 15.7.3 Approval / rejection workflow with transaction reference ID (bKash/Nagad/Bank)
  - 15.7.4 Settlement audit log and downloadable disbursement receipts

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
16. Institute Admin Portal & Operations (Dashboards, Students, Branches, Batches, Orders 11-status section, Seller Panel, Payment Requests)
17. Business Model / Monetization
18. Platform Roles & Permissions

*(Rationale: foundational/data-model features first, then core commerce flow, then layers that depend on it — reviews, dashboards, gamification, analytics, monetization.)*
