-- CreateEnum
CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "FunnelEventType" AS ENUM ('PAGE_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_INITIATED', 'ORDER_COMPLETED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "coupon_code" TEXT,
ADD COLUMN     "coupon_id" TEXT,
ADD COLUMN     "referral_code" TEXT,
ADD COLUMN     "utm_campaign" TEXT,
ADD COLUMN     "utm_medium" TEXT,
ADD COLUMN     "utm_source" TEXT;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "banner_active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "banner_bg_color" TEXT,
ADD COLUMN     "banner_link" TEXT,
ADD COLUMN     "banner_text" TEXT;

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "required_event" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL DEFAULT 1,
    "tier_level" INTEGER NOT NULL DEFAULT 1,
    "xp_reward" INTEGER NOT NULL DEFAULT 100,
    "badge_icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_progresses" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "current_count" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "is_claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_progresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_levels" (
    "student_id" TEXT NOT NULL,
    "current_level" INTEGER NOT NULL DEFAULT 1,
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "level_title" TEXT NOT NULL DEFAULT 'Store Starter',
    "unlocked_perks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_levels_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discount_type" "CouponDiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "discount_value" DECIMAL(10,2) NOT NULL,
    "min_spend" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_funnel_events" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "event_type" "FunnelEventType" NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_funnel_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "challenges_code_key" ON "challenges"("code");

-- CreateIndex
CREATE INDEX "student_progresses_student_id_idx" ON "student_progresses"("student_id");

-- CreateIndex
CREATE INDEX "student_progresses_challenge_id_idx" ON "student_progresses"("challenge_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_progresses_student_id_challenge_id_key" ON "student_progresses"("student_id", "challenge_id");

-- CreateIndex
CREATE INDEX "coupons_store_id_idx" ON "coupons"("store_id");

-- CreateIndex
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_store_id_code_key" ON "coupons"("store_id", "code");

-- CreateIndex
CREATE INDEX "store_funnel_events_store_id_event_type_created_at_idx" ON "store_funnel_events"("store_id", "event_type", "created_at");

-- CreateIndex
CREATE INDEX "store_funnel_events_session_id_idx" ON "store_funnel_events"("session_id");

-- CreateIndex
CREATE INDEX "orders_coupon_id_idx" ON "orders"("coupon_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progresses" ADD CONSTRAINT "student_progresses_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progresses" ADD CONSTRAINT "student_progresses_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_levels" ADD CONSTRAINT "student_levels_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_funnel_events" ADD CONSTRAINT "store_funnel_events_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
