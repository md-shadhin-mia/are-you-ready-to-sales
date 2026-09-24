-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "review_request_sent_at" TIMESTAMP(3),
ADD COLUMN     "review_token" TEXT;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "completed_orders_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "repeat_customer_percent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "response_rate_percent" DECIMAL(5,2) NOT NULL DEFAULT 100.00;

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "master_product_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "product_rating" INTEGER NOT NULL,
    "store_rating" INTEGER NOT NULL,
    "delivery_rating" INTEGER NOT NULL,
    "product_comment" TEXT,
    "store_comment" TEXT,
    "delivery_comment" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT true,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_master_product_id_idx" ON "reviews"("master_product_id");

-- CreateIndex
CREATE INDEX "reviews_store_id_idx" ON "reviews"("store_id");

-- CreateIndex
CREATE INDEX "reviews_customer_id_idx" ON "reviews"("customer_id");

-- CreateIndex
CREATE INDEX "reviews_is_published_idx" ON "reviews"("is_published");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_order_id_master_product_id_key" ON "reviews"("order_id", "master_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_review_token_key" ON "orders"("review_token");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_master_product_id_fkey" FOREIGN KEY ("master_product_id") REFERENCES "master_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
