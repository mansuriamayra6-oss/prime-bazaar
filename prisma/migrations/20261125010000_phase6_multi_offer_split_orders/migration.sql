-- Phase 6B & 6C: Multi-Seller Offers & Split-Order Fulfillment (Purely Additive)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OfferCondition') THEN
    CREATE TYPE "OfferCondition" AS ENUM ('NEW', 'REFURBISHED', 'OPEN_BOX');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "seller_offers" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "sellerSku" TEXT NOT NULL,
  "condition" "OfferCondition" NOT NULL DEFAULT 'NEW',
  "price" DECIMAL(12,2) NOT NULL,
  "mrp" DECIMAL(12,2) NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "deliveryDays" INTEGER NOT NULL DEFAULT 3,
  "shippingFee" DECIMAL(8,2) NOT NULL DEFAULT 0.0,
  "codAvailable" BOOLEAN NOT NULL DEFAULT true,
  "variantsJson" JSONB,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seller_offers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "seller_offers_productId_sellerId_condition_key"
  ON "seller_offers"("productId", "sellerId", "condition");
CREATE INDEX IF NOT EXISTS "seller_offers_productId_isActive_idx"
  ON "seller_offers"("productId", "isActive");
CREATE INDEX IF NOT EXISTS "seller_offers_sellerId_idx"
  ON "seller_offers"("sellerId");

ALTER TABLE "warehouse_inventories" ADD COLUMN IF NOT EXISTS "offerId" TEXT;
CREATE INDEX IF NOT EXISTS "warehouse_inventories_offerId_idx" ON "warehouse_inventories"("offerId");

ALTER TABLE "seller_orders" ADD COLUMN IF NOT EXISTS "shippingFee" DECIMAL(10,2) NOT NULL DEFAULT 0.0;
ALTER TABLE "seller_orders" ADD COLUMN IF NOT EXISTS "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0;
ALTER TABLE "seller_orders" ADD COLUMN IF NOT EXISTS "fulfillmentGroup" TEXT;

ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "offerId" TEXT;
CREATE INDEX IF NOT EXISTS "order_items_offerId_idx" ON "order_items"("offerId");
