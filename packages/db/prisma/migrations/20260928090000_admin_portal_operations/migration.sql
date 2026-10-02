-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CourierProvider" AS ENUM ('STEADFAST', 'PATHAO', 'REDX', 'PAPERFLY');

-- CreateEnum
CREATE TYPE "RtoInspectionStatus" AS ENUM ('PENDING', 'SEAL_VERIFIED', 'DAMAGED');

-- CreateEnum
CREATE TYPE "ExchangeStatus" AS ENUM ('NEW', 'INVOICED', 'HOLD', 'IN_COURIER', 'COMPLETE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReturnGrading" AS ENUM ('RESELLABLE', 'DAMAGED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE_RECEIPT', 'ORDER_FULFILLMENT', 'EXCHANGE_HOLD', 'EXCHANGE_RELEASE', 'EXCHANGE_DISPATCH', 'RETURN_RESTOCK', 'PURCHASE_RETURN', 'WRITE_OFF', 'AUDIT_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "AdjustmentStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceMatchStatus" AS ENUM ('PENDING', 'MATCHED', 'DISCREPANCY');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PenaltyStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SalarySheetStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- AlterEnum
ALTER TYPE "LedgerEntryType" ADD VALUE 'ADJUSTMENT';

-- AlterEnum
ALTER TYPE "PayoutStatus" ADD VALUE 'HOLD';

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "BranchType" AS ENUM ('PHYSICAL', 'DIGITAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "BatchStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "EnrollmentStatus" AS ENUM ('ENROLLED', 'GRADUATED', 'DROPPED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SellerType" AS ENUM ('MERCHANT', 'INSTRUCTOR', 'SUPPLIER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SellerStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "branch_type" "BranchType" NOT NULL DEFAULT 'PHYSICAL',
    "address" TEXT,
    "city" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "manager_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "branches_code_key" ON "branches"("code");

-- CreateTable
CREATE TABLE IF NOT EXISTS "student_batches" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT,
    "name" TEXT NOT NULL,
    "batch_code" TEXT NOT NULL,
    "instructor_id" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "max_capacity" INTEGER NOT NULL DEFAULT 50,
    "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_batches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "student_batches_batch_code_key" ON "student_batches"("batch_code");
CREATE INDEX IF NOT EXISTS "student_batches_branch_id_idx" ON "student_batches"("branch_id");
CREATE INDEX IF NOT EXISTS "student_batches_status_idx" ON "student_batches"("status");

-- CreateTable
CREATE TABLE IF NOT EXISTS "batch_enrollments" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "batch_enrollments_batch_id_student_id_key" ON "batch_enrollments"("batch_id", "student_id");
CREATE INDEX IF NOT EXISTS "batch_enrollments_student_id_idx" ON "batch_enrollments"("student_id");
CREATE INDEX IF NOT EXISTS "batch_enrollments_batch_id_idx" ON "batch_enrollments"("batch_id");

-- CreateTable
CREATE TABLE IF NOT EXISTS "seller_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "seller_type" "SellerType" NOT NULL DEFAULT 'MERCHANT',
    "status" "SellerStatus" NOT NULL DEFAULT 'PENDING',
    "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "bank_account_title" TEXT,
    "bank_account_number" TEXT,
    "bank_name" TEXT,
    "bank_routing_number" TEXT,
    "bkash_number" TEXT,
    "nagad_number" TEXT,
    "rocket_number" TEXT,
    "rejection_reason" TEXT,
    "suspended_at" TIMESTAMP(3),
    "suspension_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "seller_profiles_user_id_key" ON "seller_profiles"("user_id");

-- CreateTable
CREATE TABLE IF NOT EXISTS "wholesale_orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "shipping_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "payment_method" TEXT NOT NULL,
    "payment_status" TEXT NOT NULL DEFAULT 'UNPAID',
    "shipping_address" JSONB NOT NULL,
    "tracking_number" TEXT,
    "courier_name" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wholesale_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "wholesale_orders_order_number_key" ON "wholesale_orders"("order_number");
CREATE INDEX IF NOT EXISTS "wholesale_orders_user_id_idx" ON "wholesale_orders"("user_id");
CREATE INDEX IF NOT EXISTS "wholesale_orders_status_idx" ON "wholesale_orders"("status");

-- CreateTable
CREATE TABLE IF NOT EXISTS "wholesale_order_items" (
    "id" TEXT NOT NULL,
    "wholesale_order_id" TEXT NOT NULL,
    "master_product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wholesale_order_items_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(9,6),
ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(9,6);

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "credit_balance" DECIMAL(10,2) NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "master_products" ADD COLUMN     "average_cost" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
ADD COLUMN     "brand_id" TEXT,
ADD COLUMN     "reorder_level" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "seller_id" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "invoice_number" TEXT,
ADD COLUMN     "invoiced_at" TIMESTAMP(3),
ADD COLUMN     "status_reason" TEXT;

-- AlterTable
ALTER TABLE "payout_requests" ADD COLUMN     "disbursed_at" TIMESTAMP(3),
ADD COLUMN     "voucher_number" TEXT;

-- AlterTable
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "balance" DECIMAL(12,2) NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "kyc_status" "KycStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "national_id" TEXT;

-- AlterTable
ALTER TABLE "wholesale_orders" ADD COLUMN IF NOT EXISTS "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0.0;

-- CreateTable
CREATE TABLE "document_sequences" (
    "key" TEXT NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "branch_manager_assignments" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "manager_id" TEXT NOT NULL,
    "assigned_by_id" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),

    CONSTRAINT "branch_manager_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_return_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "master_product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_events" (
    "id" TEXT NOT NULL,
    "provider" "CourierProvider" NOT NULL,
    "event_id" TEXT NOT NULL,
    "order_id" TEXT,
    "tracking_number" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rto_inspections" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "RtoInspectionStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "inspected_by_id" TEXT,
    "inspected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rto_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_orders" (
    "id" TEXT NOT NULL,
    "exchange_number" TEXT NOT NULL,
    "original_order_id" TEXT NOT NULL,
    "returned_product_id" TEXT NOT NULL,
    "replacement_product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "status" "ExchangeStatus" NOT NULL DEFAULT 'NEW',
    "proof_photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difference_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "return_delivery_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "settlement_type" TEXT,
    "stock_reserved" BOOLEAN NOT NULL DEFAULT false,
    "grading" "ReturnGrading",
    "inspected_at" TIMESTAMP(3),
    "courier_name" TEXT,
    "reverse_tracking_number" TEXT,
    "forward_tracking_number" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sizes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hex_code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "master_product_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "size_id" TEXT,
    "color_id" TEXT,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "master_product_id" TEXT NOT NULL,
    "movement_type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reserved_delta" INTEGER NOT NULL DEFAULT 0,
    "on_hand_after" INTEGER NOT NULL,
    "reserved_after" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "performed_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_adjustments" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "type" "AdjustmentType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason_code" TEXT NOT NULL,
    "document_url" TEXT NOT NULL,
    "notes" TEXT,
    "status" "AdjustmentStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "requested_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "balance_after" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "resolution" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_gateway_configs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'SANDBOX',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "encrypted_credentials" TEXT NOT NULL,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_gateway_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tin_number" TEXT NOT NULL,
    "business_address" TEXT NOT NULL,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "contract_start_date" TIMESTAMP(3),
    "contract_end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "po_number" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "total_cost" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "expected_date" TIMESTAMP(3),
    "notes" TEXT,
    "invoice_number" TEXT,
    "invoice_amount" DECIMAL(12,2),
    "match_status" "InvoiceMatchStatus" NOT NULL DEFAULT 'PENDING',
    "match_variance_percent" DECIMAL(7,2),
    "created_by_id" TEXT,
    "issued_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "master_product_id" TEXT NOT NULL,
    "quantity_ordered" INTEGER NOT NULL,
    "quantity_received" INTEGER NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" TEXT NOT NULL,
    "grn_number" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "received_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_items" (
    "id" TEXT NOT NULL,
    "goods_receipt_id" TEXT NOT NULL,
    "purchase_order_item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "goods_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_return_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_return_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_returns" (
    "id" TEXT NOT NULL,
    "return_number" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "purchase_order_id" TEXT,
    "master_product_id" TEXT NOT NULL,
    "return_type_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wholesale_credit_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "credit_limit" DECIMAL(12,2) NOT NULL,
    "outstanding_balance" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wholesale_credit_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "employee_code" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "branch_id" TEXT,
    "base_salary" DECIMAL(12,2) NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_commissions" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "order_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "approved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_penalties" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "infraction_code" TEXT NOT NULL,
    "description" TEXT,
    "supervisor_notes" TEXT NOT NULL,
    "status" "PenaltyStatus" NOT NULL DEFAULT 'PENDING',
    "effective_month" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_penalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_sheets" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "status" "SalarySheetStatus" NOT NULL DEFAULT 'DRAFT',
    "total_base" DECIMAL(14,2) NOT NULL DEFAULT 0.0,
    "total_commissions" DECIMAL(14,2) NOT NULL DEFAULT 0.0,
    "total_penalties" DECIMAL(14,2) NOT NULL DEFAULT 0.0,
    "total_net_payable" DECIMAL(14,2) NOT NULL DEFAULT 0.0,
    "generated_by_id" TEXT,
    "finalized_by_id" TEXT,
    "finalized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_sheet_lines" (
    "id" TEXT NOT NULL,
    "salary_sheet_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "base_salary" DECIMAL(12,2) NOT NULL,
    "commissions" DECIMAL(12,2) NOT NULL,
    "penalties" DECIMAL(12,2) NOT NULL,
    "net_payable" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "salary_sheet_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "site_name" TEXT NOT NULL,
    "tagline" TEXT,
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "support_email" TEXT,
    "support_phone" TEXT,
    "address" TEXT,
    "social_links" JSONB NOT NULL DEFAULT '{}',
    "encrypted_api_secrets" TEXT,
    "encrypted_webhooks" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content_html" TEXT NOT NULL,
    "meta_description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "about_content" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "headline" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "mission" TEXT,
    "vision" TEXT,
    "leadership_team" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "about_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "image_url" TEXT NOT NULL,
    "link_url" TEXT,
    "placement" TEXT NOT NULL DEFAULT 'HOME_HERO',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "branch_manager_assignments_branch_id_idx" ON "branch_manager_assignments"("branch_id");

-- CreateIndex
CREATE INDEX "branch_manager_assignments_manager_id_idx" ON "branch_manager_assignments"("manager_id");

-- CreateIndex
CREATE INDEX "order_return_items_order_id_idx" ON "order_return_items"("order_id");

-- CreateIndex
CREATE INDEX "courier_events_order_id_idx" ON "courier_events"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "courier_events_provider_event_id_key" ON "courier_events"("provider", "event_id");

-- CreateIndex
CREATE INDEX "rto_inspections_status_idx" ON "rto_inspections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_orders_exchange_number_key" ON "exchange_orders"("exchange_number");

-- CreateIndex
CREATE INDEX "exchange_orders_status_idx" ON "exchange_orders"("status");

-- CreateIndex
CREATE INDEX "exchange_orders_original_order_id_idx" ON "exchange_orders"("original_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sizes_code_key" ON "sizes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "colors_code_key" ON "colors"("code");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_barcode_key" ON "product_variants"("barcode");

-- CreateIndex
CREATE INDEX "product_variants_master_product_id_idx" ON "product_variants"("master_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_master_product_id_size_id_color_id_key" ON "product_variants"("master_product_id", "size_id", "color_id");

-- CreateIndex
CREATE INDEX "stock_movements_master_product_id_created_at_idx" ON "stock_movements"("master_product_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_movement_type_idx" ON "stock_movements"("movement_type");

-- CreateIndex
CREATE INDEX "seller_adjustments_seller_id_idx" ON "seller_adjustments"("seller_id");

-- CreateIndex
CREATE INDEX "seller_adjustments_status_idx" ON "seller_adjustments"("status");

-- CreateIndex
CREATE INDEX "support_tickets_seller_id_idx" ON "support_tickets"("seller_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "journal_entries_transaction_id_idx" ON "journal_entries"("transaction_id");

-- CreateIndex
CREATE INDEX "journal_entries_account_idx" ON "journal_entries"("account");

-- CreateIndex
CREATE INDEX "journal_entries_reference_type_reference_id_idx" ON "journal_entries"("reference_type", "reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_gateway_configs_provider_key" ON "payment_gateway_configs"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_tin_number_key" ON "suppliers"("tin_number");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_master_product_id_idx" ON "purchase_order_items"("master_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_grn_number_key" ON "goods_receipts"("grn_number");

-- CreateIndex
CREATE INDEX "goods_receipts_purchase_order_id_idx" ON "goods_receipts"("purchase_order_id");

-- CreateIndex
CREATE INDEX "goods_receipt_items_goods_receipt_id_idx" ON "goods_receipt_items"("goods_receipt_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_return_types_code_key" ON "purchase_return_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_returns_return_number_key" ON "purchase_returns"("return_number");

-- CreateIndex
CREATE INDEX "purchase_returns_supplier_id_idx" ON "purchase_returns"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "wholesale_credit_accounts_user_id_key" ON "wholesale_credit_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_code_key" ON "employees"("employee_code");

-- CreateIndex
CREATE INDEX "employees_branch_id_idx" ON "employees"("branch_id");

-- CreateIndex
CREATE INDEX "employee_commissions_employee_id_status_idx" ON "employee_commissions"("employee_id", "status");

-- CreateIndex
CREATE INDEX "employee_commissions_order_id_idx" ON "employee_commissions"("order_id");

-- CreateIndex
CREATE INDEX "employee_penalties_employee_id_status_idx" ON "employee_penalties"("employee_id", "status");

-- CreateIndex
CREATE INDEX "employee_penalties_effective_month_idx" ON "employee_penalties"("effective_month");

-- CreateIndex
CREATE UNIQUE INDEX "salary_sheets_month_key" ON "salary_sheets"("month");

-- CreateIndex
CREATE UNIQUE INDEX "salary_sheet_lines_salary_sheet_id_employee_id_key" ON "salary_sheet_lines"("salary_sheet_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "cms_pages_slug_key" ON "cms_pages"("slug");

-- CreateIndex
CREATE INDEX "platform_banners_is_active_start_date_end_date_idx" ON "platform_banners"("is_active", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "master_products_brand_id_idx" ON "master_products"("brand_id");

-- CreateIndex
CREATE INDEX "master_products_seller_id_idx" ON "master_products"("seller_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_master_product_id_idx" ON "order_items"("master_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_invoice_number_key" ON "orders"("invoice_number");

-- CreateIndex
CREATE INDEX "orders_tracking_number_idx" ON "orders"("tracking_number");

-- CreateIndex
CREATE UNIQUE INDEX "payout_requests_voucher_number_key" ON "payout_requests"("voucher_number");

-- AddForeignKey
ALTER TABLE "master_products" ADD CONSTRAINT "master_products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_products" ADD CONSTRAINT "master_products_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "seller_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_manager_assignments" ADD CONSTRAINT "branch_manager_assignments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_return_items" ADD CONSTRAINT "order_return_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_return_items" ADD CONSTRAINT "order_return_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_events" ADD CONSTRAINT "courier_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rto_inspections" ADD CONSTRAINT "rto_inspections_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_orders" ADD CONSTRAINT "exchange_orders_original_order_id_fkey" FOREIGN KEY ("original_order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_orders" ADD CONSTRAINT "exchange_orders_returned_product_id_fkey" FOREIGN KEY ("returned_product_id") REFERENCES "master_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_orders" ADD CONSTRAINT "exchange_orders_replacement_product_id_fkey" FOREIGN KEY ("replacement_product_id") REFERENCES "master_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_master_product_id_fkey" FOREIGN KEY ("master_product_id") REFERENCES "master_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_master_product_id_fkey" FOREIGN KEY ("master_product_id") REFERENCES "master_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_adjustments" ADD CONSTRAINT "seller_adjustments_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_master_product_id_fkey" FOREIGN KEY ("master_product_id") REFERENCES "master_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_master_product_id_fkey" FOREIGN KEY ("master_product_id") REFERENCES "master_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_return_type_id_fkey" FOREIGN KEY ("return_type_id") REFERENCES "purchase_return_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wholesale_credit_accounts" ADD CONSTRAINT "wholesale_credit_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_commissions" ADD CONSTRAINT "employee_commissions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_commissions" ADD CONSTRAINT "employee_commissions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_penalties" ADD CONSTRAINT "employee_penalties_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_sheet_lines" ADD CONSTRAINT "salary_sheet_lines_salary_sheet_id_fkey" FOREIGN KEY ("salary_sheet_id") REFERENCES "salary_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_sheet_lines" ADD CONSTRAINT "salary_sheet_lines_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- =====================================================================
-- Hand-written SQL (not expressible in the Prisma schema DSL)
-- =====================================================================

-- Inventory invariants: stock can never be negative.
ALTER TABLE "master_products" ADD CONSTRAINT "master_products_stock_non_negative" CHECK ("stock_quantity" >= 0);
ALTER TABLE "master_products" ADD CONSTRAINT "master_products_reserved_non_negative" CHECK ("reserved_quantity" >= 0);

-- Singleton guarantees for platform configuration rows.
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_singleton" CHECK ("id" = 'singleton');
ALTER TABLE "about_content" ADD CONSTRAINT "about_content_singleton" CHECK ("id" = 'singleton');

-- Double-entry lines carry exactly one non-negative side.
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_one_side" CHECK (
  "debit" >= 0 AND "credit" >= 0 AND ("debit" = 0) <> ("credit" = 0)
);

-- FAQ full-text search.
CREATE INDEX "faqs_search_idx" ON "faqs" USING GIN (to_tsvector('english', "question" || ' ' || "answer"));

-- Product courier status rollup, refreshed hourly by ReportsService.
CREATE MATERIALIZED VIEW "mv_daily_courier_stats" AS
SELECT
  date_trunc('day', o."created_at")::date            AS stat_date,
  oi."master_product_id"                             AS master_product_id,
  COALESCE(o."courier_name", 'UNASSIGNED')           AS courier_name,
  o."status"::text                                   AS status,
  COUNT(DISTINCT o."id")::int                        AS orders_count,
  SUM(oi."quantity")::int                            AS units,
  SUM(oi."total_price")::numeric(14, 2)              AS total_amount
FROM "order_items" oi
JOIN "orders" o ON o."id" = oi."order_id"
WHERE o."status" IN ('INVOICED', 'IN_COURIER', 'SHIPPED', 'PARTIAL_DELIVERED', 'DELIVERED', 'COMPLETE', 'COMPLETED', 'RETURNED', 'EXCHANGE')
GROUP BY 1, 2, 3, 4;

CREATE UNIQUE INDEX "mv_daily_courier_stats_uidx" ON "mv_daily_courier_stats" (stat_date, master_product_id, courier_name, status);

-- Supplier profit lifecycle over a rolling 90-day sales window.
CREATE MATERIALIZED VIEW "mv_supplier_lifecycle" AS
WITH purchases AS (
  SELECT
    po."supplier_id",
    poi."master_product_id",
    SUM(poi."quantity_received")::int                          AS units_purchased,
    SUM(poi."quantity_received" * poi."unit_cost")::numeric(14, 2) AS acquisition_cost
  FROM "purchase_order_items" poi
  JOIN "purchase_orders" po ON po."id" = poi."purchase_order_id"
  WHERE po."status" <> 'CANCELLED' AND poi."quantity_received" > 0
  GROUP BY 1, 2
), sales AS (
  SELECT
    oi."master_product_id",
    COALESCE(SUM(oi."quantity") FILTER (WHERE o."status" IN ('PARTIAL_DELIVERED', 'DELIVERED', 'COMPLETE', 'COMPLETED')), 0)::int AS units_sold,
    COALESCE(SUM(oi."total_price") FILTER (WHERE o."status" IN ('PARTIAL_DELIVERED', 'DELIVERED', 'COMPLETE', 'COMPLETED')), 0)::numeric(14, 2) AS sales_revenue,
    COALESCE(SUM(oi."quantity") FILTER (WHERE o."status" = 'RETURNED'), 0)::int AS units_rto
  FROM "order_items" oi
  JOIN "orders" o ON o."id" = oi."order_id"
  WHERE o."created_at" >= NOW() - INTERVAL '90 days'
  GROUP BY 1
)
SELECT
  p."supplier_id"                    AS supplier_id,
  p."master_product_id"              AS master_product_id,
  p.units_purchased,
  p.acquisition_cost,
  COALESCE(s.units_sold, 0)          AS units_sold,
  COALESCE(s.sales_revenue, 0)       AS sales_revenue,
  COALESCE(s.units_rto, 0)           AS units_rto
FROM purchases p
LEFT JOIN sales s ON s."master_product_id" = p."master_product_id";

CREATE UNIQUE INDEX "mv_supplier_lifecycle_uidx" ON "mv_supplier_lifecycle" (supplier_id, master_product_id);
