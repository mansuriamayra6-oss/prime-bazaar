-- Phase 6 Stage 1: Additive upgrade to categories for all 34 dynamic marketplace categories
ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "tagline" TEXT,
  ADD COLUMN IF NOT EXISTS "promoTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "sector" TEXT,
  ADD COLUMN IF NOT EXISTS "seoTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "seoDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "attributeSchema" JSONB,
  ADD COLUMN IF NOT EXISTS "subcategoriesJson" JSONB,
  ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "categories_isActive_displayOrder_idx"
  ON "categories" ("isActive", "displayOrder");
