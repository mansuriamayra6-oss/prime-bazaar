-- Phase 6D, 6F, 6G: Loyalty, International Marketplace, Subscriptions, B2B Wholesale & Digital Downloads (Purely Additive)
CREATE TABLE IF NOT EXISTS "membership_tier_configs" (
  "id" TEXT NOT NULL,
  "tierName" TEXT NOT NULL,
  "minLifetimePts" INTEGER NOT NULL DEFAULT 0,
  "earnMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  "perksJson" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "membership_tier_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "membership_tier_configs_tierName_key" ON "membership_tier_configs"("tierName");

CREATE TABLE IF NOT EXISTS "loyalty_accounts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "coinsBalance" INTEGER NOT NULL DEFAULT 0,
  "lifetimeCoins" INTEGER NOT NULL DEFAULT 0,
  "tierName" TEXT NOT NULL DEFAULT 'SILVER',
  "streakDays" INTEGER NOT NULL DEFAULT 0,
  "lastCheckInDate" TEXT,
  "referralCode" TEXT NOT NULL,
  "referredByUserId" TEXT,
  "personalizationOn" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_accounts_userId_key" ON "loyalty_accounts"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_accounts_referralCode_key" ON "loyalty_accounts"("referralCode");

CREATE TABLE IF NOT EXISTS "reward_transactions" (
  "id" TEXT NOT NULL,
  "loyaltyAccountId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "coinsDelta" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "referenceId" TEXT,
  "expiresAt" TIMESTAMP(3),
  "expiredProcessed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reward_transactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "reward_transactions_loyaltyAccountId_idx" ON "reward_transactions"("loyaltyAccountId");

CREATE TABLE IF NOT EXISTS "referral_invites" (
  "id" TEXT NOT NULL,
  "referrerUserId" TEXT NOT NULL,
  "referredUserId" TEXT,
  "referralCode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "rewardCoins" INTEGER NOT NULL DEFAULT 150,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referral_invites_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "referral_invites_referrerUserId_idx" ON "referral_invites"("referrerUserId");

CREATE TABLE IF NOT EXISTS "country_configs" (
  "id" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "countryName" TEXT NOT NULL,
  "currencyCode" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "shippingFeeInr" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
  "customsDutyPercent" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
  "taxPercent" DECIMAL(5,2) NOT NULL DEFAULT 18.0,
  "codAllowed" BOOLEAN NOT NULL DEFAULT true,
  "cashfreeAllowed" BOOLEAN NOT NULL DEFAULT true,
  "postalPattern" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "country_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "country_configs_countryCode_key" ON "country_configs"("countryCode");

CREATE TABLE IF NOT EXISTS "exchange_rates" (
  "id" TEXT NOT NULL,
  "currencyCode" TEXT NOT NULL,
  "rateFromInr" DECIMAL(12,6) NOT NULL,
  "symbol" TEXT NOT NULL,
  "sourceLabel" TEXT NOT NULL DEFAULT 'Configured FX Reference Rate',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "exchange_rates_currencyCode_key" ON "exchange_rates"("currencyCode");

CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "intervalDays" INTEGER NOT NULL DEFAULT 30,
  "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 10.0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "subscription_plans_productId_idx" ON "subscription_plans"("productId");

CREATE TABLE IF NOT EXISTS "customer_subscriptions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "nextRenewalAt" TIMESTAMP(3) NOT NULL,
  "lastBillingNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "customer_subscriptions_userId_idx" ON "customer_subscriptions"("userId");

CREATE TABLE IF NOT EXISTS "b2b_accounts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "gstin" TEXT NOT NULL,
  "businessType" TEXT NOT NULL DEFAULT 'RETAILER',
  "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "verifiedBy" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "b2b_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "b2b_accounts_userId_key" ON "b2b_accounts"("userId");

CREATE TABLE IF NOT EXISTS "bulk_price_tiers" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "minQty" INTEGER NOT NULL,
  "maxQty" INTEGER,
  "unitPriceInr" DECIMAL(12,2) NOT NULL,
  "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
  CONSTRAINT "bulk_price_tiers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "bulk_price_tiers_productId_idx" ON "bulk_price_tiers"("productId");

CREATE TABLE IF NOT EXISTS "quote_requests" (
  "id" TEXT NOT NULL,
  "b2bUserId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "requestedQty" INTEGER NOT NULL,
  "targetUnitPrice" DECIMAL(12,2),
  "quotedUnitPrice" DECIMAL(12,2),
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "quote_requests_b2bUserId_idx" ON "quote_requests"("b2bUserId");
CREATE INDEX IF NOT EXISTS "quote_requests_sellerId_idx" ON "quote_requests"("sellerId");

CREATE TABLE IF NOT EXISTS "digital_assets" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSizeKb" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "maxDownloads" INTEGER NOT NULL DEFAULT 5,
  "expiryHours" INTEGER NOT NULL DEFAULT 72,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "digital_assets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "digital_assets_productId_key" ON "digital_assets"("productId");

CREATE TABLE IF NOT EXISTS "digital_download_grants" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "downloadsUsed" INTEGER NOT NULL DEFAULT 0,
  "maxDownloads" INTEGER NOT NULL DEFAULT 5,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "revokedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "digital_download_grants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "digital_download_grants_userId_idx" ON "digital_download_grants"("userId");
CREATE INDEX IF NOT EXISTS "digital_download_grants_orderId_idx" ON "digital_download_grants"("orderId");
