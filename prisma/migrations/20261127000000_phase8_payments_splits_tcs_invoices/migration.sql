-- Phase 8: Marketplace Payment Splits, Settlements, Seller KYC/Pickup, GST TCS, Commission Invoices & Webhook Logs
-- Strictly additive migration (preserves all existing production tables and data).

CREATE TABLE IF NOT EXISTS "seller_kyc" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "panNumber" TEXT NOT NULL,
  "gstin" TEXT,
  "aadhaarLast4" TEXT,
  "businessCategory" TEXT,
  "panDocumentUrl" TEXT,
  "gstDocumentUrl" TEXT,
  "chequeDocumentUrl" TEXT,
  "kycStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "verifiedBy" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seller_kyc_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "seller_kyc_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "seller_kyc_sellerId_key" ON "seller_kyc"("sellerId");
CREATE INDEX IF NOT EXISTS "seller_kyc_kycStatus_idx" ON "seller_kyc"("kycStatus");

CREATE TABLE IF NOT EXISTS "seller_pickup_addresses" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT 'Primary Warehouse',
  "contactName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "addressLine1" TEXT NOT NULL,
  "addressLine2" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "pincode" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seller_pickup_addresses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "seller_pickup_addresses_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "seller_pickup_addresses_sellerId_idx" ON "seller_pickup_addresses"("sellerId");

CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "paymentId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "gateway" TEXT NOT NULL DEFAULT 'CASHFREE',
  "cashfreeOrderId" TEXT,
  "cfPaymentId" TEXT,
  "paymentSessionId" TEXT,
  "paymentMethod" TEXT,
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "rawGatewayPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payment_transactions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_transactions_idempotencyKey_key" ON "payment_transactions"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "payment_transactions_orderId_idx" ON "payment_transactions"("orderId");
CREATE INDEX IF NOT EXISTS "payment_transactions_cashfreeOrderId_idx" ON "payment_transactions"("cashfreeOrderId");
CREATE INDEX IF NOT EXISTS "payment_transactions_cfPaymentId_idx" ON "payment_transactions"("cfPaymentId");

CREATE TABLE IF NOT EXISTS "seller_settlements" (
  "id" TEXT NOT NULL,
  "settlementNumber" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "grossAmount" DECIMAL(12, 2) NOT NULL,
  "commissionAmount" DECIMAL(12, 2) NOT NULL,
  "gstOnCommission" DECIMAL(12, 2) NOT NULL,
  "tcsDeducted" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
  "netPayout" DECIMAL(12, 2) NOT NULL,
  "bankAccountLast4" TEXT,
  "ifscCode" TEXT,
  "bankName" TEXT,
  "utrNumber" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "settledAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seller_settlements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "seller_settlements_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "seller_settlements_settlementNumber_key" ON "seller_settlements"("settlementNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "seller_settlements_idempotencyKey_key" ON "seller_settlements"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "seller_settlements_sellerId_status_idx" ON "seller_settlements"("sellerId", "status");

CREATE TABLE IF NOT EXISTS "payment_splits" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "transactionId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "grossAmount" DECIMAL(12, 2) NOT NULL,
  "taxableValue" DECIMAL(12, 2) NOT NULL,
  "commissionRate" DECIMAL(5, 2) NOT NULL,
  "commissionAmount" DECIMAL(12, 2) NOT NULL,
  "gstOnCommission" DECIMAL(12, 2) NOT NULL,
  "tcsRate" DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
  "tcsAmount" DECIMAL(12, 2) NOT NULL,
  "netSellerPayable" DECIMAL(12, 2) NOT NULL,
  "refundedAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
  "splitStatus" TEXT NOT NULL DEFAULT 'ALLOCATED',
  "settlementId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_splits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_splits_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payment_splits_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payment_splits_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "payment_splits_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "seller_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_splits_idempotencyKey_key" ON "payment_splits"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_splits_orderId_sellerId_key" ON "payment_splits"("orderId", "sellerId");
CREATE INDEX IF NOT EXISTS "payment_splits_sellerId_splitStatus_idx" ON "payment_splits"("sellerId", "splitStatus");

CREATE TABLE IF NOT EXISTS "gst_tcs_records" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "paymentSplitId" TEXT,
  "sellerGstin" TEXT,
  "taxableSupplyValue" DECIMAL(12, 2) NOT NULL,
  "isInterState" BOOLEAN NOT NULL DEFAULT false,
  "cgstTcsRate" DECIMAL(5, 2) NOT NULL DEFAULT 0.5,
  "sgstTcsRate" DECIMAL(5, 2) NOT NULL DEFAULT 0.5,
  "igstTcsRate" DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
  "cgstTcsAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
  "sgstTcsAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
  "igstTcsAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
  "totalTcsAmount" DECIMAL(12, 2) NOT NULL,
  "filingPeriod" TEXT NOT NULL,
  "recordType" TEXT NOT NULL DEFAULT 'SALE',
  "status" TEXT NOT NULL DEFAULT 'ACCRUED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gst_tcs_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gst_tcs_records_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "gst_tcs_records_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "gst_tcs_records_paymentSplitId_fkey" FOREIGN KEY ("paymentSplitId") REFERENCES "payment_splits"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "gst_tcs_records_sellerId_filingPeriod_idx" ON "gst_tcs_records"("sellerId", "filingPeriod");
CREATE INDEX IF NOT EXISTS "gst_tcs_records_orderId_idx" ON "gst_tcs_records"("orderId");

CREATE TABLE IF NOT EXISTS "commission_invoices" (
  "id" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "orderId" TEXT,
  "paymentSplitId" TEXT,
  "billingPeriod" TEXT NOT NULL,
  "taxableCommission" DECIMAL(12, 2) NOT NULL,
  "cgstRate" DECIMAL(5, 2) NOT NULL DEFAULT 9.0,
  "sgstRate" DECIMAL(5, 2) NOT NULL DEFAULT 9.0,
  "igstRate" DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
  "cgstAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
  "sgstAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
  "igstAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
  "totalTax" DECIMAL(12, 2) NOT NULL,
  "grandTotal" DECIMAL(12, 2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ISSUED',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commission_invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commission_invoices_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "commission_invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "commission_invoices_paymentSplitId_fkey" FOREIGN KEY ("paymentSplitId") REFERENCES "payment_splits"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "commission_invoices_invoiceNumber_key" ON "commission_invoices"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "commission_invoices_sellerId_billingPeriod_idx" ON "commission_invoices"("sellerId", "billingPeriod");

CREATE TABLE IF NOT EXISTS "payment_webhook_logs" (
  "id" TEXT NOT NULL,
  "eventId" TEXT,
  "eventType" TEXT NOT NULL,
  "cashfreeOrderId" TEXT,
  "cfPaymentId" TEXT,
  "idempotencyKey" TEXT,
  "signatureValid" BOOLEAN NOT NULL DEFAULT false,
  "processingStatus" TEXT NOT NULL DEFAULT 'RECEIVED',
  "rejectionReason" TEXT,
  "httpStatus" INTEGER NOT NULL DEFAULT 200,
  "payload" JSONB,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_webhook_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payment_webhook_logs_cashfreeOrderId_idx" ON "payment_webhook_logs"("cashfreeOrderId");
CREATE INDEX IF NOT EXISTS "payment_webhook_logs_idempotencyKey_idx" ON "payment_webhook_logs"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "payment_webhook_logs_eventType_receivedAt_idx" ON "payment_webhook_logs"("eventType", "receivedAt");
