export interface FeatureMetadata {
  id: string;
  title: string;
  category: string;
  description: string;
  status: "Functional" | "Coming Soon" | "In Design" | "Under Development";
  targetRelease?: string;
  plannedCapabilities: string[];
  databaseSchema?: {
    modelName: string;
    fields: string[];
  };
  apiEndpoints?: {
    method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
    endpoint: string;
    description: string;
  }[];
  mockMetrics?: {
    label: string;
    value: string;
    change?: string;
  }[];
}

export const FEATURE_METADATA_MAP: Record<string, FeatureMetadata> = {
  // Exchange Orders
  exchange_overview: {
    id: "exchange_overview",
    title: "Exchange Overview",
    category: "Exchange Orders",
    description: "Summary of exchange metrics and replacement performance across all sales channels.",
    status: "In Design",
    targetRelease: "Sprint 24 (Next Release)",
    plannedCapabilities: [
      "Total exchange rate tracking against baseline sales",
      "Average replacement turnaround time breakdown",
      "Common return root-cause analytics (sizing, defect, mismatch)",
      "Financial impact and reverse logistics cost calculator",
    ],
    databaseSchema: {
      modelName: "ExchangeAnalytics",
      fields: ["totalRequests", "approvedCount", "processingCount", "netCostImpact", "avgTurnaroundDays"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/exchanges/analytics/overview", description: "Aggregated exchange performance metrics" },
      { method: "GET", endpoint: "/api/exchanges/analytics/reasons", description: "Frequency breakdown of return and exchange causes" },
    ],
    mockMetrics: [
      { label: "Active Exchanges", value: "48", change: "+5% vs last week" },
      { label: "Avg Resolution Time", value: "2.4 Days", change: "-12% improvement" },
      { label: "Exchange Ratio", value: "1.8%", change: "Within safety benchmark" },
    ],
  },
  exchange_new: {
    id: "exchange_new",
    title: "New Exchange Orders",
    category: "Exchange Orders",
    description: "Recently submitted exchange requests requiring initial inspection and approval.",
    status: "Under Development",
    targetRelease: "Sprint 24",
    plannedCapabilities: [
      "Customer photographic proof and reason review interface",
      "One-click verification and replacement order creation",
      "Immediate SKU reservation in master inventory",
      "Automated SMS/Email notification to customer with return guidelines",
    ],
    databaseSchema: {
      modelName: "ExchangeOrder",
      fields: ["id", "originalOrderId", "status: NEW", "reason", "proofImages", "requestedSku", "createdAt"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/exchanges?status=NEW", description: "Fetch queue of unreviewed exchange requests" },
      { method: "PATCH", endpoint: "/api/exchanges/:id/approve", description: "Approve exchange and generate return waybill" },
      { method: "PATCH", endpoint: "/api/exchanges/:id/reject", description: "Decline exchange with administrative reason note" },
    ],
    mockMetrics: [
      { label: "Pending Approvals", value: "12", change: "Action required" },
      { label: "SLA Adherence", value: "94.2%", change: "< 4hr review target" },
    ],
  },
  exchange_complete: {
    id: "exchange_complete",
    title: "Complete Exchange Orders",
    category: "Exchange Orders",
    description: "Successfully processed exchanges where returned goods were audited and replacements delivered.",
    status: "In Design",
    targetRelease: "Sprint 25",
    plannedCapabilities: [
      "Complete historical audit log of completed replacement cycles",
      "Restock inspection verification (resellable vs damaged)",
      "Customer satisfaction rating correlation for exchanged orders",
    ],
    databaseSchema: {
      modelName: "ExchangeOrder",
      fields: ["id", "status: COMPLETE", "completedAt", "inspectedBy", "restockedInventoryId"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/exchanges?status=COMPLETE", description: "Fetch fulfilled exchanges" },
    ],
  },
  exchange_invoiced: {
    id: "exchange_invoiced",
    title: "Invoiced Exchange Orders",
    category: "Exchange Orders",
    description: "Exchanges that have been billed, accounting for price differential or supplementary delivery fees.",
    status: "In Design",
    targetRelease: "Sprint 25",
    plannedCapabilities: [
      "Differential invoice generation for price upgrade/downgrade",
      "Accounting ledger reconciliation with automated journal entry",
      "Automated courier invoice matching",
    ],
    databaseSchema: {
      modelName: "ExchangeInvoice",
      fields: ["id", "exchangeId", "priceAdjustment", "shippingFeeDifferential", "paidStatus"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/exchanges/invoices", description: "List all billed exchange transactions" },
    ],
  },
  exchange_hold: {
    id: "exchange_hold",
    title: "Hold Exchange Orders",
    category: "Exchange Orders",
    description: "Paused exchange requests awaiting customer communication, warehouse restock, or manual audit.",
    status: "In Design",
    targetRelease: "Sprint 25",
    plannedCapabilities: [
      "Tagging exchange requests with custom hold reasons (e.g. Stock Awaiting, Address Discrepancy)",
      "Direct chat / call logging module with customer support agents",
      "Automated hold expiry and escalation countdowns",
    ],
    databaseSchema: {
      modelName: "ExchangeOrder",
      fields: ["id", "status: HOLD", "holdReason", "escalateAt", "assignedAgentId"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/exchanges?status=HOLD", description: "List on-hold exchange tickets" },
      { method: "PATCH", endpoint: "/api/exchanges/:id/resume", description: "Release hold and resume processing" },
    ],
  },
  exchange_cancelled: {
    id: "exchange_cancelled",
    title: "Cancelled Exchange Orders",
    category: "Exchange Orders",
    description: "Terminated exchange requests rejected during audit or revoked by the customer.",
    status: "In Design",
    targetRelease: "Sprint 25",
    plannedCapabilities: [
      "Root cause tagging for cancelled exchange requests",
      "Automatic inventory unlock for previously reserved replacement SKUs",
      "Reversible dispute reinstatement flow",
    ],
    databaseSchema: {
      modelName: "ExchangeOrder",
      fields: ["id", "status: CANCELLED", "cancelledAt", "cancellationReason"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/exchanges?status=CANCELLED", description: "List cancelled exchanges" },
    ],
  },
  exchange_courier: {
    id: "exchange_courier",
    title: "Exchange In Courier",
    category: "Exchange Orders",
    description: "Exchanged items currently out for delivery via third-party logistics partners.",
    status: "Under Development",
    targetRelease: "Sprint 24",
    plannedCapabilities: [
      "Real-time courier webhook synchronization (Steadfast, Pathao, RedX)",
      "Reverse pickup tracking alongside replacement delivery consignment",
      "Direct parcel tracking link generation for customer SMS",
    ],
    databaseSchema: {
      modelName: "ExchangeConsignment",
      fields: ["exchangeId", "courierName", "trackingCode", "pickupStatus", "deliveryStatus"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/exchanges/courier/in-transit", description: "Fetch parcels currently in transit" },
    ],
  },

  // Seller Panel
  sellers_adjustment: {
    id: "sellers_adjustment",
    title: "Seller Adjustment",
    category: "Seller Panel",
    description: "Manual adjustments to seller accounts including bonus incentives, penalty debits, and balance corrections.",
    status: "In Design",
    targetRelease: "Sprint 26",
    plannedCapabilities: [
      "Credit and debit adjustments with dual-approval administrative safeguards",
      "Direct integration into seller ledger entries and payout balances",
      "Mandatory documentary proof and audit reason attachments",
    ],
    databaseSchema: {
      modelName: "SellerAdjustment",
      fields: ["id", "sellerId", "adjustmentType: CREDIT | DEBIT", "amount", "reason", "approvedById"],
    },
    apiEndpoints: [
      { method: "POST", endpoint: "/api/admin/sellers/:id/adjustments", description: "Create balance adjustment" },
      { method: "GET", endpoint: "/api/admin/sellers/:id/adjustments", description: "Adjustment audit history" },
    ],
  },
  sellers_support_tickets: {
    id: "sellers_support_tickets",
    title: "Support Tickets",
    category: "Seller Panel",
    description: "Customer service requests, dispute claims, and inquiries submitted by registered vendors.",
    status: "In Design",
    targetRelease: "Sprint 26",
    plannedCapabilities: [
      "Ticketing desk with SLA timers and priority tagging (Urgent, High, Medium, Low)",
      "Multi-party conversation thread between admin, seller, and warehouse staff",
      "Knowledgebase and canned response automation",
    ],
    databaseSchema: {
      modelName: "SellerTicket",
      fields: ["id", "sellerId", "subject", "priority", "status: OPEN | IN_PROGRESS | RESOLVED", "assignedAdminId"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/admin/sellers/tickets", description: "List vendor tickets" },
      { method: "POST", endpoint: "/api/admin/sellers/tickets/:id/replies", description: "Send message in ticket thread" },
    ],
  },

  // Payments
  payments_paid: {
    id: "payments_paid",
    title: "Payment Paid",
    category: "Payments",
    description: "Historical record of successfully completed disbursements and vendor settlements.",
    status: "Under Development",
    targetRelease: "Sprint 24",
    plannedCapabilities: [
      "Complete transaction reference logs with bank transfer and MFS receipt vouchers",
      "Search and filter by date range, payout method (bKash, Nagad, Bank), and recipient",
      "CSV & PDF accounting disbursement statement export",
    ],
    databaseSchema: {
      modelName: "PayoutRequest",
      fields: ["id", "status: PROCESSED", "amount", "paymentMethod", "transactionReference", "processedAt"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/finance/payouts?status=PROCESSED", description: "Disbursed payment records" },
      { method: "GET", endpoint: "/api/finance/payouts/export/pdf", description: "Export monthly payment voucher batch" },
    ],
  },
  payments_methods: {
    id: "payments_methods",
    title: "Payment Methods",
    category: "Payments",
    description: "Configuration of accepted payment gateways, API keys, merchant accounts, and transaction fees.",
    status: "In Design",
    targetRelease: "Sprint 26",
    plannedCapabilities: [
      "Gateway toggle controls for bKash PGW, Nagad Direct, SSLCommerz, and manual Bank Transfer",
      "Sandbox vs Production mode credential management with encrypted secret storage",
      "Configurable gateway surcharge or customer discount rules per payment method",
    ],
    databaseSchema: {
      modelName: "PaymentGatewayConfig",
      fields: ["id", "gateway: BKASH | NAGAD | SSLCOMMERZ | COD", "isEnabled", "isSandbox", "configCredentialsJson"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/finance/gateways", description: "List gateway configurations" },
      { method: "PATCH", endpoint: "/api/finance/gateways/:id", description: "Update credentials and active status" },
    ],
  },

  // Purchases
  purchases_add: {
    id: "purchases_add",
    title: "Add Purchase",
    category: "Purchases",
    description: "Record a new standard direct purchase from an authorized supplier and update physical stock.",
    status: "In Design",
    targetRelease: "Sprint 27",
    plannedCapabilities: [
      "Direct invoice entry with multi-item SKU table and cost calculation",
      "Immediate warehouse stock increment upon save",
      "Supplier ledger balance crediting with payment terms (Cash vs Credit)",
    ],
    databaseSchema: {
      modelName: "PurchaseInvoice",
      fields: ["id", "invoiceNumber", "supplierId", "totalAmount", "paidAmount", "itemsJson", "purchasedAt"],
    },
    apiEndpoints: [
      { method: "POST", endpoint: "/api/purchases", description: "Record direct purchase entry" },
    ],
  },
  purchases_manage: {
    id: "purchases_manage",
    title: "Manage Purchase",
    category: "Purchases",
    description: "View, audit, edit, and void existing procurement invoices and supplier bills.",
    status: "In Design",
    targetRelease: "Sprint 27",
    plannedCapabilities: [
      "Searchable table with date, supplier, invoice number, and payment status filters",
      "Detailed view of purchased SKUs, unit purchase costs, and landed cost breakdowns",
      "Void/reversal workflows with rollback of inventory counts",
    ],
    databaseSchema: {
      modelName: "PurchaseInvoice",
      fields: ["id", "invoiceNumber", "supplierId", "status: ACTIVE | VOIDED", "createdAt"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/purchases", description: "List purchase invoices" },
      { method: "GET", endpoint: "/api/purchases/:id", description: "Get purchase invoice details" },
    ],
  },
  purchases_po_add: {
    id: "purchases_po_add",
    title: "Add Purchase Order",
    category: "Purchases",
    description: "Create a formal Purchase Order (PO) to be issued to external manufacturing vendors.",
    status: "In Design",
    targetRelease: "Sprint 27",
    plannedCapabilities: [
      "Formal PO document generator with PDF export and direct email dispatch to supplier",
      "Expected delivery scheduling with automated overdue alerts",
      "Configurable advance payment and commercial terms specification",
    ],
    databaseSchema: {
      modelName: "PurchaseOrder",
      fields: ["id", "poNumber", "supplierId", "expectedDate", "terms", "status: DRAFT | ISSUED"],
    },
    apiEndpoints: [
      { method: "POST", endpoint: "/api/purchases/orders", description: "Generate new PO" },
    ],
  },
  purchases_po_manage: {
    id: "purchases_po_manage",
    title: "Manage Purchase Order",
    category: "Purchases",
    description: "View and edit existing POs, receive partial deliveries, and track supplier fulfillment rates.",
    status: "In Design",
    targetRelease: "Sprint 27",
    plannedCapabilities: [
      "Goods Received Note (GRN) workflow for partial and complete PO fulfillment",
      "Supplier fulfillment performance tracking against promised delivery dates",
      "Three-way matching between PO, GRN, and Supplier Invoice",
    ],
    databaseSchema: {
      modelName: "PurchaseOrder",
      fields: ["id", "poNumber", "receivedQuantity", "totalQuantity", "status: PARTIAL | COMPLETED"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/purchases/orders", description: "List all purchase orders" },
      { method: "POST", endpoint: "/api/purchases/orders/:id/grn", description: "Record goods received note" },
    ],
  },
  purchases_returns: {
    id: "purchases_returns",
    title: "Purchase Return List",
    category: "Purchases",
    description: "Log of defective or non-compliant merchandise returned back to wholesale suppliers.",
    status: "In Design",
    targetRelease: "Sprint 27",
    plannedCapabilities: [
      "Debit note creation for returned items to deduct from supplier account payable",
      "Automatic deduction from physical inventory stock upon return dispatch",
      "Supplier credit note tracking and refund reconciliation",
    ],
    databaseSchema: {
      modelName: "PurchaseReturn",
      fields: ["id", "returnNumber", "purchaseId", "supplierId", "refundAmount", "status: DISPATCHED | SETTLED"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/purchases/returns", description: "List purchase returns" },
      { method: "POST", endpoint: "/api/purchases/returns", description: "Process purchase return" },
    ],
  },
  purchases_return_types: {
    id: "purchases_return_types",
    title: "Purchase Return Type",
    category: "Purchases",
    description: "Configuration of return reasons, policy classifications, and RMA category codes.",
    status: "In Design",
    targetRelease: "Sprint 27",
    plannedCapabilities: [
      "Classification taxonomy (Defective, Damaged in Transit, Expired, Spec Mismatch)",
      "Default policy rules for return window and warranty claims",
    ],
    databaseSchema: {
      modelName: "PurchaseReturnType",
      fields: ["id", "name", "code", "description", "requiresInspection"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/purchases/return-types", description: "List return reasons" },
    ],
  },

  // Products Attributes
  products_subcategories: {
    id: "products_subcategories",
    title: "Subcategories",
    category: "Products",
    description: "Secondary nested classification of items within parent product categories.",
    status: "Under Development",
    targetRelease: "Sprint 24",
    plannedCapabilities: [
      "Hierarchical parent-child taxonomy tree view",
      "Dynamic slug generation and storefront SEO metadata overrides",
      "Batch product reassignment between subcategories",
    ],
    databaseSchema: {
      modelName: "Category",
      fields: ["id", "name", "slug", "parentId (NotNull)", "children"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/categories?onlySubcategories=true", description: "List subcategories" },
      { method: "POST", endpoint: "/api/categories", description: "Create subcategory under parent category" },
    ],
  },
  products_sizes: {
    id: "products_sizes",
    title: "Sizes",
    category: "Products",
    description: "Configuration of standard and custom size variations (e.g. S, M, L, XL, XXL, Numeric sizes).",
    status: "In Design",
    targetRelease: "Sprint 25",
    plannedCapabilities: [
      "Size chart presets (Apparel, Footwear, Accessories, Free Size)",
      "Standardized SKU variant code generator suffix",
      "Measurement table builder for storefront product detail pages",
    ],
    databaseSchema: {
      modelName: "ProductSize",
      fields: ["id", "name", "code", "sizeGroup", "sortOrder"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/catalog/sizes", description: "List available size variations" },
      { method: "POST", endpoint: "/api/catalog/sizes", description: "Register new size standard" },
    ],
  },
  products_colors: {
    id: "products_colors",
    title: "Colors",
    category: "Products",
    description: "Configuration of color variations with HEX palette previews and swatches.",
    status: "In Design",
    targetRelease: "Sprint 25",
    plannedCapabilities: [
      "Visual color swatch picker with Hex, RGB, and color family grouping",
      "Multi-color / dual-tone pattern support",
      "Direct association with master product photo galleries",
    ],
    databaseSchema: {
      modelName: "ProductColor",
      fields: ["id", "name", "hexCode", "colorFamily"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/catalog/colors", description: "List registered colors" },
      { method: "POST", endpoint: "/api/catalog/colors", description: "Create color swatch" },
    ],
  },
  products_brands: {
    id: "products_brands",
    title: "Brands",
    category: "Products",
    description: "Management of product brand labels, logos, manufacturer certifications, and trademark assets.",
    status: "In Design",
    targetRelease: "Sprint 25",
    plannedCapabilities: [
      "Brand directory with logo uploads, website links, and brand story descriptions",
      "Exclusive brand authorization tagging for authorized campus merchants",
      "Brand-wise sales and margin performance reports",
    ],
    databaseSchema: {
      modelName: "Brand",
      fields: ["id", "name", "slug", "logoUrl", "description", "isActive"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/catalog/brands", description: "List brand entities" },
      { method: "POST", endpoint: "/api/catalog/brands", description: "Create new brand" },
    ],
  },

  // Inventory
  inventory_stock: {
    id: "inventory_stock",
    title: "Stock",
    category: "Inventory",
    description: "Current real-time quantity of items across campus hubs with low-stock alerts.",
    status: "Under Development",
    targetRelease: "Sprint 24",
    plannedCapabilities: [
      "Real-time available, reserved, and incoming stock balances per SKU",
      "Multi-hub warehouse visibility (Dhaka, Chittagong, Sylhet)",
      "Threshold-based low stock visual warnings and restock recommendations",
    ],
    databaseSchema: {
      modelName: "InventoryStock",
      fields: ["productId", "branchId", "onHand", "reserved", "available", "reorderLevel"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/inventory/stock", description: "Fetch inventory stock table" },
      { method: "GET", endpoint: "/api/inventory/stock/alerts", description: "Low stock trigger warnings" },
    ],
    mockMetrics: [
      { label: "Total SKUs Monitored", value: "1,240", change: "Active in Catalog" },
      { label: "Low Stock Items", value: "14", change: "Requires PO" },
      { label: "Out of Stock", value: "3", change: "Immediate action" },
    ],
  },
  inventory_ledger: {
    id: "inventory_ledger",
    title: "Ledger",
    category: "Inventory",
    description: "Historical audit log of all inventory movements (sales, purchases, returns, adjustments).",
    status: "In Design",
    targetRelease: "Sprint 25",
    plannedCapabilities: [
      "Immutable transaction ledger with timestamp, SKU, delta quantity, and balance after",
      "Reference traceability to order number, PO number, or adjustment ID",
      "Exportable CSV audit trail for institutional financial compliance",
    ],
    databaseSchema: {
      modelName: "InventoryLedger",
      fields: ["id", "productId", "movementType", "quantityDelta", "balanceAfter", "referenceId", "createdAt"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/inventory/ledger", description: "Query inventory ledger log" },
    ],
  },
  inventory_adjustments: {
    id: "inventory_adjustments",
    title: "Adjustments",
    category: "Inventory",
    description: "Manual corrections to physical stock counts with reason codes and supervisor sign-offs.",
    status: "In Design",
    targetRelease: "Sprint 25",
    plannedCapabilities: [
      "Stock count reconciliation interface (Physical Count vs System Count)",
      "Reason classification (Damage, Breakage, Shrinkage, Audit Count Discrepancy)",
      "Automatic journal entry generation to write off inventory value",
    ],
    databaseSchema: {
      modelName: "InventoryAdjustment",
      fields: ["id", "productId", "adjustedQuantity", "reasonCode", "notes", "approvedById"],
    },
    apiEndpoints: [
      { method: "POST", endpoint: "/api/inventory/adjustments", description: "Submit manual inventory adjustment" },
    ],
  },

  // Reports
  reports_courier_status: {
    id: "reports_courier_status",
    title: "Product Courier Status",
    category: "Reports",
    description: "Tracking report and delivery success performance analytics for items in transit across couriers.",
    status: "In Design",
    targetRelease: "Sprint 26",
    plannedCapabilities: [
      "Delivery success rate benchmarking (Steadfast vs Pathao vs RedX)",
      "Average transit delay times per district and zone",
      "Return-to-Origin (RTO) rate comparison by logistics partner",
    ],
    databaseSchema: {
      modelName: "CourierAnalytics",
      fields: ["courierName", "totalDispatched", "deliveredCount", "rtoCount", "avgDaysInTransit"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/reports/courier/performance", description: "Courier KPI comparison" },
    ],
  },
  reports_supplier_products: {
    id: "reports_supplier_products",
    title: "Supplier Product Report",
    category: "Reports",
    description: "Comprehensive data on products sourced from specific suppliers including defect and sell-through rates.",
    status: "In Design",
    targetRelease: "Sprint 26",
    plannedCapabilities: [
      "Product sell-through velocity breakdown per supplier",
      "Defect and return rate per vendor batch",
      "Supplier procurement volume and payment settlement overview",
    ],
    databaseSchema: {
      modelName: "SupplierProductReport",
      fields: ["supplierId", "skuCount", "totalUnitsPurchased", "totalUnitsSold", "returnRate"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/reports/suppliers/products", description: "Supplier product analytics" },
    ],
  },
  reports_supplier_profit: {
    id: "reports_supplier_profit",
    title: "Supplier Profit Lifecycle",
    category: "Reports",
    description: "Analytics on profitability, landed costs, and institutional margins per supplier over time.",
    status: "In Design",
    targetRelease: "Sprint 26",
    plannedCapabilities: [
      "Gross profit margin trends by supplier and product category",
      "Impact of supplier price adjustments on end-customer sales volume",
      "Lifecycle profitability projection modeling",
    ],
    databaseSchema: {
      modelName: "SupplierProfitMetrics",
      fields: ["supplierId", "period", "grossRevenue", "cogs", "grossMarginPercent"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/reports/suppliers/profit-lifecycle", description: "Supplier profitability lifecycle" },
    ],
  },

  // Wholesale
  wholesale_create: {
    id: "wholesale_create",
    title: "Create Wholesale",
    category: "Wholesale",
    description: "Initiate a new bulk wholesale order with custom tiered discounts and payment terms.",
    status: "In Design",
    targetRelease: "Sprint 27",
    plannedCapabilities: [
      "B2B order entry with bulk pricing tiers and custom invoice discount overrides",
      "Tax invoice generation with commercial customer BIN/TIN validation",
      "Consolidated freight and logistics dispatch option",
    ],
    databaseSchema: {
      modelName: "WholesaleOrder",
      fields: ["id", "wholesaleNumber", "buyerCompany", "itemsJson", "discountTier", "totalAmount"],
    },
    apiEndpoints: [
      { method: "POST", endpoint: "/api/wholesale/orders", description: "Create wholesale order" },
    ],
  },
  wholesale_manage: {
    id: "wholesale_manage",
    title: "Manage Wholesale",
    category: "Wholesale",
    description: "View and edit existing bulk orders, track payment milestones, and coordinate fulfillment.",
    status: "In Design",
    targetRelease: "Sprint 27",
    plannedCapabilities: [
      "Wholesale pipeline status management (Pending, Confirmed, Partial Dispatched, Delivered)",
      "Multi-installment payment tracking for institutional buyers",
      "Direct warehouse pick-list generation for bulk pallets",
    ],
    databaseSchema: {
      modelName: "WholesaleOrder",
      fields: ["id", "wholesaleNumber", "status", "paymentStatus", "deliveryStatus"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/wholesale/orders", description: "List wholesale orders" },
      { method: "GET", endpoint: "/api/wholesale/orders/:id", description: "Wholesale order details" },
    ],
  },
  wholesale_product_report: {
    id: "wholesale_product_report",
    title: "Product Wise Report",
    category: "Wholesale",
    description: "Wholesale analytics and sales volume reports filtered by specific merchandise items.",
    status: "In Design",
    targetRelease: "Sprint 27",
    plannedCapabilities: [
      "Top wholesale volume driver ranking by revenue and unit count",
      "Wholesale vs Retail margin cannibalization analysis",
      "Seasonal demand forecasting for bulk merchandise",
    ],
    databaseSchema: {
      modelName: "WholesaleProductAnalytics",
      fields: ["productId", "unitsSoldWholesale", "wholesaleRevenue", "avgBulkDiscount"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/wholesale/reports/products", description: "Product-wise wholesale report" },
    ],
  },

  // Suppliers
  suppliers: {
    id: "suppliers",
    title: "Suppliers",
    category: "Suppliers",
    description: "Top-level directory for managing vendor relationships, supplier profiles, contracts, and contact directories.",
    status: "Under Development",
    targetRelease: "Sprint 24",
    plannedCapabilities: [
      "Vendor profiles with trade license, tax ID, and contact directory",
      "Supplier scorecard evaluating on-time delivery and product quality",
      "Outstanding accounts payable summary and payment terms",
    ],
    databaseSchema: {
      modelName: "Supplier",
      fields: ["id", "name", "contactName", "phone", "email", "address", "rating", "isActive"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/suppliers", description: "List supplier profiles" },
      { method: "POST", endpoint: "/api/suppliers", description: "Register new supplier" },
    ],
    mockMetrics: [
      { label: "Active Suppliers", value: "32", change: "+4 this quarter" },
      { label: "Avg Delivery SLA", value: "96.4%", change: "High reliability" },
    ],
  },

  // Site Settings
  settings_general: {
    id: "settings_general",
    title: "General Setting",
    category: "Site Settings",
    description: "Core configuration like institutional site name, brand logos, contact defaults, and currency settings.",
    status: "In Design",
    targetRelease: "Sprint 25",
    plannedCapabilities: [
      "Platform name, slogan, dark/light theme branding, and favicon configuration",
      "Default institutional currency (BDT ৳) and regional tax rate setup",
      "Official institutional support email, hotline numbers, and physical address",
    ],
    databaseSchema: {
      modelName: "SiteSetting",
      fields: ["siteName", "logoUrl", "faviconUrl", "supportEmail", "supportPhone", "currencyCode"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/settings/general", description: "Get general configuration" },
      { method: "PATCH", endpoint: "/api/settings/general", description: "Update site configuration" },
    ],
  },
  settings_pages: {
    id: "settings_pages",
    title: "Manage Page",
    category: "Site Settings",
    description: "Controls the content, SEO metadata, and layout of static website pages (Terms, Privacy, Delivery Policy).",
    status: "In Design",
    targetRelease: "Sprint 25",
    plannedCapabilities: [
      "Rich WYSIWYG markdown / HTML editor for content management",
      "Page slug customizer with meta title and description preview for Google SEO",
      "Publish / Draft status toggle with revision history",
    ],
    databaseSchema: {
      modelName: "CmsPage",
      fields: ["id", "slug", "title", "contentHtml", "metaDescription", "isPublished"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/cms/pages", description: "List CMS pages" },
      { method: "PATCH", endpoint: "/api/cms/pages/:slug", description: "Update page content" },
    ],
  },

  // About Us
  about_us: {
    id: "about_us",
    title: "About Us",
    category: "About Us",
    description: "Manages the public company information, mission statement, institutional leadership, and campus achievements.",
    status: "In Design",
    targetRelease: "Sprint 25",
    plannedCapabilities: [
      "Vision, Mission, and Core Values editor with media embeds",
      "Executive leadership team showcase manager (names, bios, photos, LinkedIn)",
      "Institutional milestones and history timeline editor",
    ],
    databaseSchema: {
      modelName: "AboutUsContent",
      fields: ["missionText", "visionText", "teamMembersJson", "milestonesJson", "bannerImageUrl"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/cms/about-us", description: "Get About Us content" },
      { method: "PUT", endpoint: "/api/cms/about-us", description: "Update About Us content" },
    ],
  },

  // Employees
  employees_list: {
    id: "employees_list",
    title: "Employee List",
    category: "Employees",
    description: "Directory of all internal staff members, branch assignments, designations, and contact profiles.",
    status: "Under Development",
    targetRelease: "Sprint 25",
    plannedCapabilities: [
      "Staff directory with search, department, and branch filters",
      "Role-based privilege indicators and emergency contact records",
      "One-click status toggle (Active, On Leave, Resigned, Terminated)",
    ],
    databaseSchema: {
      modelName: "Employee",
      fields: ["id", "userId", "designation", "branchId", "baseSalary", "joiningDate", "isActive"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/employees", description: "List internal staff members" },
      { method: "GET", endpoint: "/api/employees/:id", description: "Get employee profile" },
    ],
    mockMetrics: [
      { label: "Total Staff", value: "64", change: "Across 4 hubs" },
      { label: "Active Today", value: "61", change: "3 on scheduled leave" },
    ],
  },
  employees_add: {
    id: "employees_add",
    title: "Add Employee",
    category: "Employees",
    description: "Create a new staff profile, assign campus branch, designate department, and set base salary.",
    status: "Under Development",
    targetRelease: "Sprint 25",
    plannedCapabilities: [
      "New hire onboarding form with National ID document upload",
      "Branch assignment (Dhaka, Chittagong, Sylhet, Online)",
      "Initial role assignment in RBAC system with welcome email invite",
    ],
    databaseSchema: {
      modelName: "Employee",
      fields: ["userId", "designation", "department", "branchId", "baseSalary", "nidDocumentUrl"],
    },
    apiEndpoints: [
      { method: "POST", endpoint: "/api/employees", description: "Onboard new employee profile" },
    ],
  },
  employees_commissions: {
    id: "employees_commissions",
    title: "Lead Commissions",
    category: "Employees",
    description: "Tracks performance-based pay, sales conversion bonuses, and lead commissions for staff.",
    status: "In Design",
    targetRelease: "Sprint 26",
    plannedCapabilities: [
      "Commission rules engine (Percentage of order value or fixed fee per verified student enrollment)",
      "Real-time lead attribution tracking via staff referral codes",
      "Commission approval workflow before payroll addition",
    ],
    databaseSchema: {
      modelName: "EmployeeCommission",
      fields: ["id", "employeeId", "orderId", "amount", "status: PENDING | APPROVED | DISBURSED"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/employees/commissions", description: "List employee commissions" },
      { method: "POST", endpoint: "/api/employees/commissions/approve", description: "Approve commission batch" },
    ],
  },
  employees_penalties: {
    id: "employees_penalties",
    title: "Fines / Penalties",
    category: "Employees",
    description: "Logs specific deductions from employee compensation for disciplinary infractions or unexcused absences.",
    status: "In Design",
    targetRelease: "Sprint 26",
    plannedCapabilities: [
      "Penalties logging with documented reason and supervisor approval",
      "Automatic payroll deduction integration during monthly salary generation",
      "Appeal submission and disciplinary review mechanism",
    ],
    databaseSchema: {
      modelName: "EmployeePenalty",
      fields: ["id", "employeeId", "amount", "infractionType", "reasonNotes", "effectiveMonth"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/employees/penalties", description: "List logged penalties" },
      { method: "POST", endpoint: "/api/employees/penalties", description: "Log disciplinary deduction" },
    ],
  },
  employees_salary: {
    id: "employees_salary",
    title: "Salary Sheet",
    category: "Employees",
    description: "Generates the final monthly payroll document combining base salary, lead commissions, and penalty deductions.",
    status: "In Design",
    targetRelease: "Sprint 26",
    plannedCapabilities: [
      "Monthly payroll calculation matrix: Base Salary + Commissions - Deductions/Fines = Net Pay",
      "Bank transfer routing format generation for institutional corporate payroll",
      "PDF pay slip generation for individual employee download",
    ],
    databaseSchema: {
      modelName: "SalarySheet",
      fields: ["id", "month", "year", "totalDisbursed", "status: DRAFT | APPROVED | DISBURSED", "itemsJson"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/employees/payroll/sheets", description: "List monthly salary sheets" },
      { method: "POST", endpoint: "/api/employees/payroll/generate", description: "Generate monthly payroll draft" },
    ],
  },

  // Banner
  banner: {
    id: "banner",
    title: "Banner",
    category: "Marketing",
    description: "Custom section for managing promotional graphics, hero carousel slides, and alert banners on the storefront.",
    status: "Under Development",
    targetRelease: "Sprint 24",
    plannedCapabilities: [
      "Hero slider banner uploads (Desktop & Mobile responsive aspect ratios)",
      "Target click-through URL routing (Category, Product, or External landing page)",
      "Scheduling start and expiry dates for seasonal campaigns",
      "Drag-and-drop sort order reordering",
    ],
    databaseSchema: {
      modelName: "StoreBanner",
      fields: ["id", "title", "desktopImageUrl", "mobileImageUrl", "targetUrl", "isActive", "sortOrder", "expiresAt"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/marketing/banners", description: "List active storefront banners" },
      { method: "POST", endpoint: "/api/marketing/banners", description: "Create promotional banner" },
      { method: "PATCH", endpoint: "/api/marketing/banners/reorder", description: "Reorder display priority" },
    ],
    mockMetrics: [
      { label: "Active Banners", value: "4", change: "Currently Live" },
      { label: "Avg CTR", value: "3.8%", change: "+0.6% this week" },
    ],
  },

  // Faq
  faq: {
    id: "faq",
    title: "Faq",
    category: "Support & Knowledge",
    description: "Custom section for managing frequently asked questions, customer support guides, and categorized answers.",
    status: "Under Development",
    targetRelease: "Sprint 24",
    plannedCapabilities: [
      "Category-based question grouping (Ordering, Delivery, Returns, Payment, Student Program)",
      "Rich text answer formatting with clickable links and bold highlights",
      "Storefront instant accordion search integration",
    ],
    databaseSchema: {
      modelName: "FaqItem",
      fields: ["id", "question", "answer", "category", "sortOrder", "isActive"],
    },
    apiEndpoints: [
      { method: "GET", endpoint: "/api/support/faqs", description: "List FAQ items" },
      { method: "POST", endpoint: "/api/support/faqs", description: "Create FAQ entry" },
      { method: "PATCH", endpoint: "/api/support/faqs/:id", description: "Update FAQ item" },
    ],
    mockMetrics: [
      { label: "Published FAQs", value: "28", change: "Across 5 categories" },
      { label: "Helpful Votes", value: "89%", change: "Positive user feedback" },
    ],
  },
};
