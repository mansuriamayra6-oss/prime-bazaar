import crypto from 'crypto';
import {
  dbSellers,
  dbSellerOrders,
  dbSellerWallets,
  dbSettlements,
  dbCommissionRules,
  dbAuditLogs,
} from './v1Router.ts';
import {
  ACCOUNT_CODES,
  postBalancedLedgerGroup,
  roundMoney,
  financeLedgerEntries,
  reconciliationRuns,
  lookupCommissionPercent,
} from './financeLedger.ts';
import {
  payments,
  refunds,
  getCommittedRefundTotalForOrder,
  getCapturedPaidAmountForOrder,
} from './cashfreeAndPayments.ts';
import { maskBankAccountNumber, recordAuditLog } from './auditAndRbac.ts';

// =============================================================================
// PHASE 8: PAYMENT SPLITS, SELLER KYC/BANK/PICKUP, GST TCS, COMMISSION INVOICES & WEBHOOK LOGS
// =============================================================================

export interface SellerKycRecord {
  id: string;
  sellerId: string;
  panNumber: string;
  gstin?: string;
  aadhaarLast4?: string;
  businessCategory?: string;
  panDocumentUrl?: string;
  gstDocumentUrl?: string;
  chequeDocumentUrl?: string;
  kycStatus: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'RESUBMISSION_REQUIRED';
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  submittedAt: string;
  updatedAt: string;
}

export interface SellerBankAccountRecord {
  id: string;
  sellerId: string;
  accountHolderName: string;
  accountNumber: string;
  accountLast4: string;
  ifscCode: string;
  bankName: string;
  branchName?: string;
  accountType: 'CURRENT' | 'SAVINGS';
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SellerPickupAddressRecord {
  id: string;
  sellerId: string;
  label: string;
  contactName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransactionRecord {
  id: string;
  orderId: string;
  paymentId?: string;
  idempotencyKey: string;
  gateway: string;
  cashfreeOrderId?: string;
  cfPaymentId?: string;
  paymentSessionId?: string;
  paymentMethod?: string;
  amount: number;
  currency: string;
  status: 'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIAL_REFUND';
  signatureVerified: boolean;
  verifiedAt?: string;
  rawGatewayPayload?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSplitRecord {
  id: string;
  orderId: string;
  orderNumber?: string;
  sellerId: string;
  sellerName: string;
  transactionId?: string;
  idempotencyKey: string;
  grossAmount: number;
  taxableValue: number;
  commissionRate: number;
  commissionAmount: number;
  gstOnCommission: number;
  tcsRate: number;
  tcsAmount: number;
  netSellerPayable: number;
  refundedAmount: number;
  splitStatus: 'ALLOCATED' | 'HOLD' | 'READY_FOR_SETTLEMENT' | 'SETTLED' | 'REVERSED' | 'PARTIAL_REFUNDED';
  settlementId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SellerSettlementRecord {
  id: string;
  settlementNumber: string;
  sellerId: string;
  sellerName: string;
  idempotencyKey: string;
  grossAmount: number;
  commissionAmount: number;
  gstOnCommission: number;
  tcsDeducted: number;
  netPayout: number;
  bankAccountLast4?: string;
  ifscCode?: string;
  bankName?: string;
  utrNumber?: string;
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'TRANSFERRED' | 'FAILED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  settledAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GstTcsRecord {
  id: string;
  orderId: string;
  orderNumber?: string;
  sellerId: string;
  sellerName: string;
  paymentSplitId?: string;
  sellerGstin?: string;
  taxableSupplyValue: number;
  isInterState: boolean;
  cgstTcsRate: number;
  sgstTcsRate: number;
  igstTcsRate: number;
  cgstTcsAmount: number;
  sgstTcsAmount: number;
  igstTcsAmount: number;
  totalTcsAmount: number;
  filingPeriod: string;
  recordType: 'SALE' | 'REFUND_REVERSAL';
  status: 'ACCRUED' | 'FILED' | 'REVERSED';
  createdAt: string;
}

export interface CommissionInvoiceRecord {
  id: string;
  invoiceNumber: string;
  sellerId: string;
  sellerName: string;
  sellerGstin?: string;
  orderId?: string;
  paymentSplitId?: string;
  billingPeriod: string;
  taxableCommission: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  grandTotal: number;
  status: 'ISSUED' | 'PAID' | 'CREDIT_NOTE';
  issuedAt: string;
}

export interface PaymentWebhookLogRecord {
  readonly id: string;
  readonly eventId?: string;
  readonly eventType: string;
  readonly cashfreeOrderId?: string;
  readonly cfPaymentId?: string;
  readonly idempotencyKey?: string;
  readonly signatureValid: boolean;
  readonly processingStatus: 'PROCESSED' | 'DUPLICATE' | 'REJECTED';
  readonly rejectionReason?: string;
  readonly httpStatus: number;
  readonly payloadDigest: string;
  readonly receivedAt: string;
}

// =============================================================================
// IN-MEMORY STORES
// =============================================================================

export const sellerKycRecords = new Map<string, SellerKycRecord>();
export const sellerBankAccounts = new Map<string, SellerBankAccountRecord>();
export const sellerPickupAddresses = new Map<string, SellerPickupAddressRecord[]>();
export const paymentTransactions = new Map<string, PaymentTransactionRecord>();
export const paymentSplits = new Map<string, PaymentSplitRecord>(); // key: `${orderId}:${sellerId}`
export const sellerSettlementRecords = new Map<string, SellerSettlementRecord>();
export const gstTcsRecords: GstTcsRecord[] = [];
export const commissionInvoices: CommissionInvoiceRecord[] = [];
export const paymentWebhookLogs: PaymentWebhookLogRecord[] = [];

const splitOrderLocks = new Map<string, Promise<void>>();
let commissionInvoiceCounter = 1;
let settlementCounter = 1;

async function withSplitLock<T>(orderId: string, fn: () => T | Promise<T>): Promise<T> {
  const prev = splitOrderLocks.get(orderId) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((r) => {
    release = r;
  });
  const chained = prev.then(() => current);
  splitOrderLocks.set(orderId, chained);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (splitOrderLocks.get(orderId) === chained) {
      splitOrderLocks.delete(orderId);
    }
  }
}

export function getCurrentFilingPeriod(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function nextCommissionInvoiceNumber(): string {
  const num = String(commissionInvoiceCounter++).padStart(4, '0');
  return `PB-COM-${new Date().getFullYear()}-${num}`;
}

export function nextSettlementNumber(): string {
  const num = String(settlementCounter++).padStart(4, '0');
  return `PB-SET-${new Date().getFullYear()}-${num}`;
}

// Seed baseline records from existing sellers & seeded order so dashboard & tests start with consistent relational state
function seedPhase8FinanceBaseline() {
  if (sellerKycRecords.size > 0) return;

  const now = new Date().toISOString();
  for (const seller of dbSellers.values()) {
    sellerKycRecords.set(seller.id, {
      id: `kyc_${seller.id}`,
      sellerId: seller.id,
      panNumber: seller.panNumber || 'AAECV1234M',
      gstin: seller.gstNumber !== 'Unregistered' ? seller.gstNumber : undefined,
      businessCategory: 'Fashion & Apparel',
      panDocumentUrl: seller.kycDocuments?.[0]?.documentUrl || `/docs/${seller.id}_pan.pdf`,
      gstDocumentUrl: seller.kycDocuments?.[1]?.documentUrl || `/docs/${seller.id}_gst.pdf`,
      kycStatus: seller.approvalStatus === 'APPROVED' ? 'VERIFIED' : 'PENDING',
      verifiedBy: seller.approvalStatus === 'APPROVED' ? 'admin-super' : undefined,
      verifiedAt: seller.approvalStatus === 'APPROVED' ? seller.createdAt : undefined,
      submittedAt: seller.createdAt,
      updatedAt: now,
    });

    if (seller.bankAccount) {
      const accNum = String(seller.bankAccount.accountNumber || '0000');
      sellerBankAccounts.set(seller.id, {
        id: `bank_${seller.id}`,
        sellerId: seller.id,
        accountHolderName: seller.bankAccount.accountHolderName,
        accountNumber: accNum,
        accountLast4: accNum.slice(-4),
        ifscCode: seller.bankAccount.ifscCode,
        bankName: seller.bankAccount.bankName,
        accountType: 'CURRENT',
        isVerified: seller.approvalStatus === 'APPROVED',
        verifiedBy: seller.approvalStatus === 'APPROVED' ? 'admin-super' : undefined,
        verifiedAt: seller.approvalStatus === 'APPROVED' ? seller.createdAt : undefined,
        createdAt: seller.createdAt,
        updatedAt: now,
      });
    }

    if (seller.pickupAddress) {
      sellerPickupAddresses.set(seller.id, [
        {
          id: `pick_${seller.id}_1`,
          sellerId: seller.id,
          label: 'Primary Fulfillment Warehouse',
          contactName: seller.sellerName,
          phone: seller.phone,
          addressLine1: seller.pickupAddress.street,
          city: seller.pickupAddress.city,
          state: seller.pickupAddress.state,
          pincode: seller.pickupAddress.pinCode,
          isDefault: true,
          isActive: true,
          createdAt: seller.createdAt,
          updatedAt: now,
        },
      ]);
    }
  }

  // Seed initial payment transaction, split, GST TCS, and commission invoice for seeded ord-101 / so-101-a
  const so1 = dbSellerOrders.get('so-101-a');
  if (so1) {
    const txnId = 'ptxn_seed_101';
    paymentTransactions.set(txnId, {
      id: txnId,
      orderId: so1.orderId,
      idempotencyKey: `ptxn_${so1.orderId}`,
      gateway: 'CASHFREE',
      cashfreeOrderId: 'cf_seed_ord_101',
      cfPaymentId: '9988776611',
      paymentMethod: 'upi',
      amount: so1.subtotal,
      currency: 'INR',
      status: 'PAID',
      signatureVerified: true,
      verifiedAt: so1.createdAt,
      createdAt: so1.createdAt,
      updatedAt: so1.updatedAt,
    });

    const taxableVal = roundMoney(so1.subtotal / 1.12);
    const totalTcs = roundMoney(taxableVal * 0.01);
    const cgstTcs = 0; // UP -> Maharashtra inter-state
    const sgstTcs = 0;
    const igstTcs = totalTcs;
    const netPayable = roundMoney(so1.subtotal - so1.commissionAmount - so1.gstOnCommission - totalTcs);
    const splitId = 'split_ord-101_seller-1';

    paymentSplits.set(`${so1.orderId}:${so1.sellerId}`, {
      id: splitId,
      orderId: so1.orderId,
      orderNumber: 'PB-ORD-92841',
      sellerId: so1.sellerId,
      sellerName: so1.sellerName,
      transactionId: txnId,
      idempotencyKey: `split_${so1.orderId}_${so1.sellerId}`,
      grossAmount: so1.subtotal,
      taxableValue: taxableVal,
      commissionRate: so1.commissionRate,
      commissionAmount: so1.commissionAmount,
      gstOnCommission: so1.gstOnCommission,
      tcsRate: 1.0,
      tcsAmount: totalTcs,
      netSellerPayable: netPayable,
      refundedAmount: 0,
      splitStatus: 'READY_FOR_SETTLEMENT',
      createdAt: so1.createdAt,
      updatedAt: so1.updatedAt,
    });

    gstTcsRecords.push({
      id: 'tcs_seed_101',
      orderId: so1.orderId,
      orderNumber: 'PB-ORD-92841',
      sellerId: so1.sellerId,
      sellerName: so1.sellerName,
      paymentSplitId: splitId,
      sellerGstin: dbSellers.get(so1.sellerId)?.gstNumber,
      taxableSupplyValue: taxableVal,
      isInterState: true,
      cgstTcsRate: 0,
      sgstTcsRate: 0,
      igstTcsRate: 1.0,
      cgstTcsAmount: cgstTcs,
      sgstTcsAmount: sgstTcs,
      igstTcsAmount: igstTcs,
      totalTcsAmount: totalTcs,
      filingPeriod: '2026-10',
      recordType: 'SALE',
      status: 'ACCRUED',
      createdAt: so1.createdAt,
    });

    const halfTax = roundMoney(so1.gstOnCommission / 2);
    commissionInvoices.push({
      id: 'cinv_seed_101',
      invoiceNumber: nextCommissionInvoiceNumber(),
      sellerId: so1.sellerId,
      sellerName: so1.sellerName,
      sellerGstin: dbSellers.get(so1.sellerId)?.gstNumber,
      orderId: so1.orderId,
      paymentSplitId: splitId,
      billingPeriod: '2026-10',
      taxableCommission: so1.commissionAmount,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 18.0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: so1.gstOnCommission,
      totalTax: so1.gstOnCommission,
      grandTotal: roundMoney(so1.commissionAmount + so1.gstOnCommission),
      status: 'ISSUED',
      issuedAt: so1.createdAt,
    });
    void halfTax;
  }

  for (const s of dbSettlements) {
    sellerSettlementRecords.set(s.id, {
      id: s.id,
      settlementNumber: nextSettlementNumber(),
      sellerId: s.sellerId,
      sellerName: s.sellerName,
      idempotencyKey: `seed_${s.id}`,
      grossAmount: s.grossAmount,
      commissionAmount: s.commissionDeducted,
      gstOnCommission: s.gstOnCommission,
      tcsDeducted: roundMoney(s.grossAmount * 0.01),
      netPayout: s.netPayout,
      bankAccountLast4: String(s.bankAccount || '').slice(-4),
      bankName: s.bankName,
      utrNumber: s.utrNumber,
      status: s.status as any,
      settledAt: s.processedAt,
      createdAt: s.requestedAt,
      updatedAt: s.processedAt || s.requestedAt,
    });
  }
}

seedPhase8FinanceBaseline();

// =============================================================================
// IMMUTABLE WEBHOOK LOGGING
// =============================================================================

export function recordPaymentWebhookLog(params: {
  eventId?: string;
  eventType: string;
  cashfreeOrderId?: string;
  cfPaymentId?: string;
  idempotencyKey?: string;
  signatureValid: boolean;
  processingStatus: 'PROCESSED' | 'DUPLICATE' | 'REJECTED';
  rejectionReason?: string;
  httpStatus: number;
  rawBody?: Buffer | string;
  payload?: any;
}): PaymentWebhookLogRecord {
  const digestSource = params.rawBody
    ? Buffer.isBuffer(params.rawBody)
      ? params.rawBody
      : Buffer.from(params.rawBody)
    : Buffer.from(JSON.stringify(params.payload || {}));

  const entry: PaymentWebhookLogRecord = Object.freeze({
    id: `whl_${crypto.randomBytes(6).toString('hex')}`,
    eventId: params.eventId,
    eventType: params.eventType || 'UNKNOWN_EVENT',
    cashfreeOrderId: params.cashfreeOrderId,
    cfPaymentId: params.cfPaymentId,
    idempotencyKey: params.idempotencyKey,
    signatureValid: params.signatureValid,
    processingStatus: params.processingStatus,
    rejectionReason: params.rejectionReason,
    httpStatus: params.httpStatus,
    payloadDigest: crypto.createHash('sha256').update(digestSource).digest('hex'),
    receivedAt: new Date().toISOString(),
  });

  paymentWebhookLogs.unshift(entry);
  if (paymentWebhookLogs.length > 500) {
    paymentWebhookLogs.pop();
  }
  return entry;
}

// =============================================================================
// SELLER KYC, BANK DETAILS & PICKUP ADDRESSES
// =============================================================================

export function sanitizeBankForApi(bank: SellerBankAccountRecord | undefined) {
  if (!bank) return null;
  return {
    id: bank.id,
    sellerId: bank.sellerId,
    accountHolderName: bank.accountHolderName,
    accountNumber: maskBankAccountNumber(bank.accountNumber),
    accountLast4: bank.accountLast4,
    ifscCode: bank.ifscCode,
    bankName: bank.bankName,
    branchName: bank.branchName,
    accountType: bank.accountType,
    isVerified: bank.isVerified,
    verifiedBy: bank.verifiedBy,
    verifiedAt: bank.verifiedAt,
    updatedAt: bank.updatedAt,
  };
}

export function upsertSellerKyc(params: {
  sellerId: string;
  panNumber: string;
  gstin?: string;
  aadhaarLast4?: string;
  businessCategory?: string;
  panDocumentUrl?: string;
  gstDocumentUrl?: string;
  chequeDocumentUrl?: string;
  actorId: string;
  actorName: string;
}) {
  const seller = dbSellers.get(params.sellerId);
  if (!seller) {
    throw new Error('Seller profile not found.');
  }

  const panClean = String(params.panNumber || '').trim().toUpperCase();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panClean)) {
    throw new Error('Invalid PAN format. Expected 10-character PAN (e.g. AAECV1234M).');
  }

  let gstClean: string | undefined;
  if (params.gstin && params.gstin.trim() && params.gstin.trim().toUpperCase() !== 'UNREGISTERED') {
    gstClean = params.gstin.trim().toUpperCase();
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstClean)) {
      throw new Error('Invalid 15-character GSTIN format.');
    }
  }

  if (params.aadhaarLast4 && !/^\d{4}$/.test(String(params.aadhaarLast4).trim())) {
    throw new Error('aadhaarLast4 must be exactly 4 digits.');
  }

  const now = new Date().toISOString();
  const existing = sellerKycRecords.get(params.sellerId);
  const record: SellerKycRecord = {
    id: existing?.id || `kyc_${crypto.randomBytes(5).toString('hex')}`,
    sellerId: params.sellerId,
    panNumber: panClean,
    gstin: gstClean,
    aadhaarLast4: params.aadhaarLast4 ? String(params.aadhaarLast4).trim() : existing?.aadhaarLast4,
    businessCategory: params.businessCategory?.trim() || existing?.businessCategory,
    panDocumentUrl: params.panDocumentUrl?.trim() || existing?.panDocumentUrl,
    gstDocumentUrl: params.gstDocumentUrl?.trim() || existing?.gstDocumentUrl,
    chequeDocumentUrl: params.chequeDocumentUrl?.trim() || existing?.chequeDocumentUrl,
    kycStatus: 'UNDER_REVIEW',
    submittedAt: existing?.submittedAt || now,
    updatedAt: now,
  };

  sellerKycRecords.set(params.sellerId, record);
  seller.panNumber = panClean;
  if (gstClean) seller.gstNumber = gstClean;

  const docs: any[] = [];
  if (record.panDocumentUrl || panClean) {
    docs.push({
      id: `doc_pan_${params.sellerId}`,
      documentType: 'PAN',
      documentUrl: record.panDocumentUrl || `/kyc/${params.sellerId}_pan.pdf`,
      verificationStatus: 'PENDING',
      submittedAt: now,
    });
  }
  if (gstClean || record.gstDocumentUrl) {
    docs.push({
      id: `doc_gst_${params.sellerId}`,
      documentType: 'GSTIN',
      documentUrl: record.gstDocumentUrl || `/kyc/${params.sellerId}_gst.pdf`,
      verificationStatus: 'PENDING',
      submittedAt: now,
    });
  }
  if (docs.length > 0) {
    seller.kycDocuments = docs;
  }

  recordAuditLog({
    actorType: 'SELLER',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: 'SELLER',
    action: 'SELLER_KYC_SUBMITTED',
    entityType: 'SELLER_KYC',
    entityId: record.id,
    afterState: { sellerId: params.sellerId, kycStatus: record.kycStatus, hasGstin: Boolean(gstClean) },
    details: `Submitted KYC dossier for seller ${seller.businessName}.`,
    legacyAuditSink: dbAuditLogs,
  });

  return record;
}

export function upsertSellerBankDetails(params: {
  sellerId: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName?: string;
  accountType?: 'CURRENT' | 'SAVINGS';
  actorId: string;
  actorName: string;
}) {
  const seller = dbSellers.get(params.sellerId);
  if (!seller) {
    throw new Error('Seller profile not found.');
  }

  const holder = String(params.accountHolderName || '').trim();
  const cleanAccount = String(params.accountNumber || '').replace(/\s+/g, '');
  const ifscClean = String(params.ifscCode || '').trim().toUpperCase();
  const bankName = String(params.bankName || '').trim();

  if (holder.length < 2) throw new Error('Account holder name is required.');
  if (!/^\d{6,20}$/.test(cleanAccount)) {
    throw new Error('Bank account number must contain 6 to 20 digits.');
  }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscClean)) {
    throw new Error('Invalid IFSC code format (expected 11 characters, e.g. SBIN0001248).');
  }
  if (bankName.length < 2) throw new Error('Bank name is required.');

  const now = new Date().toISOString();
  const existing = sellerBankAccounts.get(params.sellerId);
  const record: SellerBankAccountRecord = {
    id: existing?.id || `bank_${crypto.randomBytes(5).toString('hex')}`,
    sellerId: params.sellerId,
    accountHolderName: holder,
    accountNumber: cleanAccount,
    accountLast4: cleanAccount.slice(-4),
    ifscCode: ifscClean,
    bankName,
    branchName: params.branchName?.trim(),
    accountType: params.accountType === 'SAVINGS' ? 'SAVINGS' : 'CURRENT',
    isVerified: false, // Bank changes always require admin penny-drop/verification
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  sellerBankAccounts.set(params.sellerId, record);
  seller.bankAccount = {
    accountHolderName: holder,
    accountNumber: cleanAccount,
    ifscCode: ifscClean,
    bankName,
  };

  recordAuditLog({
    actorType: 'SELLER',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: 'SELLER',
    action: 'SELLER_BANK_UPDATED',
    entityType: 'SELLER_BANK',
    entityId: record.id,
    afterState: { sellerId: params.sellerId, bankName, ifscCode: ifscClean, accountLast4: record.accountLast4 },
    details: `Updated payout bank account ending ${record.accountLast4} (${ifscClean}) for ${seller.businessName}.`,
    legacyAuditSink: dbAuditLogs,
  });

  return sanitizeBankForApi(record)!;
}

export function verifySellerBankByAdmin(params: {
  sellerId: string;
  verified: boolean;
  notes?: string;
  actorId: string;
  actorName: string;
}) {
  const bank = sellerBankAccounts.get(params.sellerId);
  if (!bank) {
    throw new Error('Seller has not submitted bank account details yet.');
  }
  const now = new Date().toISOString();
  bank.isVerified = params.verified;
  bank.verifiedBy = params.verified ? params.actorId : undefined;
  bank.verifiedAt = params.verified ? now : undefined;
  bank.verificationNotes = params.notes?.trim();
  bank.updatedAt = now;

  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: 'ADMIN',
    action: params.verified ? 'SELLER_BANK_VERIFIED' : 'SELLER_BANK_REJECTED',
    entityType: 'SELLER_BANK',
    entityId: bank.id,
    afterState: { sellerId: params.sellerId, isVerified: bank.isVerified, notes: bank.verificationNotes },
    details: `${params.verified ? 'Verified' : 'Rejected'} seller bank account ••••${bank.accountLast4}.`,
    legacyAuditSink: dbAuditLogs,
  });

  return sanitizeBankForApi(bank)!;
}

export function upsertSellerPickupAddress(params: {
  sellerId: string;
  label?: string;
  contactName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
}) {
  const seller = dbSellers.get(params.sellerId);
  if (!seller) throw new Error('Seller not found.');
  const now = new Date().toISOString();
  const list = sellerPickupAddresses.get(params.sellerId) || [];
  const rec: SellerPickupAddressRecord = {
    id: `pick_${crypto.randomBytes(5).toString('hex')}`,
    sellerId: params.sellerId,
    label: params.label?.trim() || 'Primary Warehouse',
    contactName: params.contactName.trim(),
    phone: params.phone.trim(),
    addressLine1: params.addressLine1.trim(),
    addressLine2: params.addressLine2?.trim(),
    city: params.city.trim(),
    state: params.state.trim(),
    pincode: params.pincode.trim(),
    isDefault: list.length === 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  list.push(rec);
  sellerPickupAddresses.set(params.sellerId, list);
  seller.pickupAddress = {
    street: rec.addressLine1,
    city: rec.city,
    state: rec.state,
    pinCode: rec.pincode,
  };
  return rec;
}

// =============================================================================
// PAYMENT TRANSACTIONS + IDEMPOTENT SPLITS + GST TCS + COMMISSION INVOICES
// =============================================================================

export function upsertPaymentTransaction(params: {
  orderId: string;
  paymentId?: string;
  idempotencyKey: string;
  gateway: string;
  cashfreeOrderId?: string;
  cfPaymentId?: string;
  paymentSessionId?: string;
  paymentMethod?: string;
  amount: number;
  currency?: string;
  status: PaymentTransactionRecord['status'];
  signatureVerified?: boolean;
  verifiedAt?: string;
  rawGatewayPayload?: any;
}): PaymentTransactionRecord {
  const existing = Array.from(paymentTransactions.values()).find(
    (t) => t.idempotencyKey === params.idempotencyKey || (params.cashfreeOrderId && t.cashfreeOrderId === params.cashfreeOrderId)
  );
  const now = new Date().toISOString();
  if (existing) {
    existing.status = params.status;
    if (params.cfPaymentId) existing.cfPaymentId = params.cfPaymentId;
    if (params.paymentId) existing.paymentId = params.paymentId;
    if (params.signatureVerified !== undefined) existing.signatureVerified = params.signatureVerified;
    if (params.verifiedAt) existing.verifiedAt = params.verifiedAt;
    if (params.rawGatewayPayload) existing.rawGatewayPayload = params.rawGatewayPayload;
    existing.updatedAt = now;
    return existing;
  }

  const created: PaymentTransactionRecord = {
    id: `ptxn_${crypto.randomBytes(6).toString('hex')}`,
    orderId: params.orderId,
    paymentId: params.paymentId,
    idempotencyKey: params.idempotencyKey,
    gateway: params.gateway,
    cashfreeOrderId: params.cashfreeOrderId,
    cfPaymentId: params.cfPaymentId,
    paymentSessionId: params.paymentSessionId,
    paymentMethod: params.paymentMethod,
    amount: roundMoney(params.amount),
    currency: params.currency || 'INR',
    status: params.status,
    signatureVerified: Boolean(params.signatureVerified),
    verifiedAt: params.verifiedAt,
    rawGatewayPayload: params.rawGatewayPayload,
    createdAt: now,
    updatedAt: now,
  };
  paymentTransactions.set(created.id, created);
  return created;
}

export async function computeAndRecordPaymentSplitsForOrder(params: {
  order: any;
  transactionId?: string;
  forceVerified?: boolean;
  actorId?: string;
}) {
  const order = params.order;
  if (!order || !order.id) {
    throw new Error('Valid order object is required to compute payment splits.');
  }

  return withSplitLock(order.id, async () => {
    const isPaid = order.paymentStatus === 'PAID' || order.paymentMethod === 'WALLET_ONLY' || Boolean(params.forceVerified);
    if (!isPaid && order.paymentMethod !== 'cod') {
      throw new Error(`Order ${order.orderNumber || order.id} payment is ${order.paymentStatus}. Server-verified payment is required before splitting funds.`);
    }
    if (order.status === 'cancelled') {
      throw new Error(`Order ${order.orderNumber || order.id} is cancelled and cannot generate payment splits.`);
    }

    // Build seller buckets from sellerSuborders if available, else group order.items
    const suborders = Array.from(dbSellerOrders.values()).filter((so) => so.orderId === order.id);
    const sellerBuckets = new Map<
      string,
      {
        sellerId: string;
        sellerName: string;
        grossAmount: number;
        taxableValue: number;
        commissionRate: number;
        commissionAmount: number;
        gstOnCommission: number;
      }
    >();

    if (suborders.length > 0) {
      for (const so of suborders) {
        if (so.fulfillmentStatus === 'CANCELLED') continue;
        const gross = roundMoney(so.subtotal);
        let taxable = 0;
        for (const item of so.items || []) {
          const lineGross = roundMoney(Number(item.unitPrice) * Number(item.quantity));
          const gstRate = Number(item.taxRate ?? 12);
          taxable = roundMoney(taxable + lineGross / (1 + gstRate / 100));
        }
        if (taxable <= 0) taxable = roundMoney(gross / 1.12);

        const primaryCat = order.items?.find((it: any) => (it.product?.sellerId || 'seller-1') === so.sellerId)?.product?.category;
        const ruleRate = so.commissionRate || lookupCommissionPercent(primaryCat);
        const commAmt = so.commissionAmount || roundMoney((gross * ruleRate) / 100);
        const commGst = so.gstOnCommission || roundMoney(commAmt * 0.18);

        sellerBuckets.set(so.sellerId, {
          sellerId: so.sellerId,
          sellerName: so.sellerName,
          grossAmount: gross,
          taxableValue: taxable,
          commissionRate: ruleRate,
          commissionAmount: commAmt,
          gstOnCommission: commGst,
        });
      }
    } else {
      for (const item of order.items || []) {
        const sId = item.product?.sellerId || 'seller-1';
        const sName = item.product?.sellerName || dbSellers.get(sId)?.businessName || 'Verified Seller';
        const lineGross = roundMoney((Number(item.priceAtPurchase ?? item.product?.price ?? 0) * Number(item.quantity || 1)) - Number(item.lineDiscount || 0));
        const gstRate = Number(item.product?.gstRate ?? 12);
        const lineTaxable = roundMoney(lineGross / (1 + gstRate / 100));
        const commRate = lookupCommissionPercent(item.product?.category);
        const commAmt = roundMoney((lineGross * commRate) / 100);
        const commGst = roundMoney(commAmt * 0.18);

        const prev = sellerBuckets.get(sId) || {
          sellerId: sId,
          sellerName: sName,
          grossAmount: 0,
          taxableValue: 0,
          commissionRate: commRate,
          commissionAmount: 0,
          gstOnCommission: 0,
        };
        prev.grossAmount = roundMoney(prev.grossAmount + lineGross);
        prev.taxableValue = roundMoney(prev.taxableValue + lineTaxable);
        prev.commissionAmount = roundMoney(prev.commissionAmount + commAmt);
        prev.gstOnCommission = roundMoney(prev.gstOnCommission + commGst);
        sellerBuckets.set(sId, prev);
      }
    }

    if (sellerBuckets.size === 0) {
      throw new Error('No eligible seller items found to compute payment splits.');
    }

    const existingForOrder: PaymentSplitRecord[] = [];
    for (const [key, val] of paymentSplits.entries()) {
      if (key.startsWith(`${order.id}:`)) {
        existingForOrder.push(val);
      }
    }
    if (existingForOrder.length >= sellerBuckets.size) {
      const tcsForOrder = gstTcsRecords.filter((t) => t.orderId === order.id);
      const invoicesForOrder = commissionInvoices.filter((c) => c.orderId === order.id);
      return {
        duplicate: true,
        splits: existingForOrder,
        gstTcsRecords: tcsForOrder,
        commissionInvoices: invoicesForOrder,
      };
    }

    const now = new Date().toISOString();
    const filingPeriod = getCurrentFilingPeriod();
    const destState = String(order.shippingAddress?.state || 'Maharashtra').trim();
    const platformState = 'Maharashtra';

    const createdSplits: PaymentSplitRecord[] = [];
    const createdTcs: GstTcsRecord[] = [];
    const createdInvoices: CommissionInvoiceRecord[] = [];

    for (const bucket of sellerBuckets.values()) {
      const compositeKey = `${order.id}:${bucket.sellerId}`;
      const alreadySplit = paymentSplits.get(compositeKey);
      if (alreadySplit) {
        createdSplits.push(alreadySplit);
        continue;
      }

      const seller = dbSellers.get(bucket.sellerId);
      const sellerState = String(seller?.pickupAddress?.state || 'Maharashtra').trim();

      // Section 52 GST TCS: 1% on Net Taxable Supply (0.5% CGST + 0.5% SGST intra-state OR 1% IGST inter-state)
      const isSupplyInterState = sellerState.toLowerCase() !== destState.toLowerCase();
      const totalTcsAmount = roundMoney(bucket.taxableValue * 0.01);
      const cgstTcsAmount = isSupplyInterState ? 0 : roundMoney(bucket.taxableValue * 0.005);
      const sgstTcsAmount = isSupplyInterState ? 0 : roundMoney(totalTcsAmount - cgstTcsAmount);
      const igstTcsAmount = isSupplyInterState ? totalTcsAmount : 0;

      const netSellerPayable = roundMoney(
        Math.max(0, bucket.grossAmount - bucket.commissionAmount - bucket.gstOnCommission - totalTcsAmount)
      );

      const splitRecord: PaymentSplitRecord = {
        id: `split_${crypto.randomBytes(5).toString('hex')}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        sellerId: bucket.sellerId,
        sellerName: bucket.sellerName,
        transactionId: params.transactionId,
        idempotencyKey: `split_${order.id}_${bucket.sellerId}`,
        grossAmount: bucket.grossAmount,
        taxableValue: bucket.taxableValue,
        commissionRate: bucket.commissionRate,
        commissionAmount: bucket.commissionAmount,
        gstOnCommission: bucket.gstOnCommission,
        tcsRate: 1.0,
        tcsAmount: totalTcsAmount,
        netSellerPayable,
        refundedAmount: 0,
        splitStatus: order.paymentMethod === 'cod' && !isPaid ? 'HOLD' : 'ALLOCATED',
        createdAt: now,
        updatedAt: now,
      };
      paymentSplits.set(compositeKey, splitRecord);
      createdSplits.push(splitRecord);

      const tcsRecord: GstTcsRecord = {
        id: `tcs_${crypto.randomBytes(5).toString('hex')}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        sellerId: bucket.sellerId,
        sellerName: bucket.sellerName,
        paymentSplitId: splitRecord.id,
        sellerGstin: seller?.gstNumber && seller.gstNumber !== 'Unregistered' ? seller.gstNumber : undefined,
        taxableSupplyValue: bucket.taxableValue,
        isInterState: isSupplyInterState,
        cgstTcsRate: isSupplyInterState ? 0 : 0.5,
        sgstTcsRate: isSupplyInterState ? 0 : 0.5,
        igstTcsRate: isSupplyInterState ? 1.0 : 0,
        cgstTcsAmount,
        sgstTcsAmount,
        igstTcsAmount,
        totalTcsAmount,
        filingPeriod,
        recordType: 'SALE',
        status: 'ACCRUED',
        createdAt: now,
      };
      gstTcsRecords.unshift(tcsRecord);
      createdTcs.push(tcsRecord);

      // Commission Tax Invoice (18% GST on Platform Commission)
      const isCommissionInterState = sellerState.toLowerCase() !== platformState.toLowerCase();
      const cgstComm = isCommissionInterState ? 0 : roundMoney(bucket.gstOnCommission / 2);
      const sgstComm = isCommissionInterState ? 0 : roundMoney(bucket.gstOnCommission - cgstComm);
      const igstComm = isCommissionInterState ? bucket.gstOnCommission : 0;

      const commInvoice: CommissionInvoiceRecord = {
        id: `cinv_${crypto.randomBytes(5).toString('hex')}`,
        invoiceNumber: nextCommissionInvoiceNumber(),
        sellerId: bucket.sellerId,
        sellerName: bucket.sellerName,
        sellerGstin: seller?.gstNumber && seller.gstNumber !== 'Unregistered' ? seller.gstNumber : undefined,
        orderId: order.id,
        paymentSplitId: splitRecord.id,
        billingPeriod: filingPeriod,
        taxableCommission: bucket.commissionAmount,
        cgstRate: isCommissionInterState ? 0 : 9.0,
        sgstRate: isCommissionInterState ? 0 : 9.0,
        igstRate: isCommissionInterState ? 18.0 : 0,
        cgstAmount: cgstComm,
        sgstAmount: sgstComm,
        igstAmount: igstComm,
        totalTax: bucket.gstOnCommission,
        grandTotal: roundMoney(bucket.commissionAmount + bucket.gstOnCommission),
        status: 'ISSUED',
        issuedAt: now,
      };
      commissionInvoices.unshift(commInvoice);
      createdInvoices.push(commInvoice);

      // Post double-entry split ledger entries only if escrow split hasn't already posted for this seller/order
      const splitRef = `SPLIT:${order.orderNumber || order.id}:${bucket.sellerId}`;
      const alreadyLedgered = financeLedgerEntries.some((e) => e.referenceNumber === splitRef);
      if (!alreadyLedgered && bucket.grossAmount > 0) {
        postBalancedLedgerGroup({
          referenceNumber: splitRef,
          description: `Payment split, commission, GST & TCS allocation for ${bucket.sellerName}`,
          createdBy: params.actorId || 'system-split',
          orderId: order.id,
          sellerId: bucket.sellerId,
          lines: [
            { accountCode: ACCOUNT_CODES.PLATFORM_ESCROW_CASH, entryType: 'DEBIT', amount: bucket.grossAmount },
            { accountCode: ACCOUNT_CODES.PLATFORM_COMMISSION_REV, entryType: 'CREDIT', amount: bucket.commissionAmount },
            { accountCode: ACCOUNT_CODES.GST_ON_COMMISSION_PAYABLE, entryType: 'CREDIT', amount: bucket.gstOnCommission },
            { accountCode: ACCOUNT_CODES.TAX_PAYABLE, entryType: 'CREDIT', amount: totalTcsAmount },
            { accountCode: ACCOUNT_CODES.SELLER_PAYABLE, entryType: 'CREDIT', amount: netSellerPayable },
          ],
        });
      }
    }

    return {
      duplicate: false,
      splits: createdSplits,
      gstTcsRecords: createdTcs,
      commissionInvoices: createdInvoices,
    };
  });
}

export function applyRefundToSplitsAndTcs(params: {
  orderId: string;
  refundAmount: number;
  orderTotal: number;
  reason?: string;
}) {
  const orderSplits = Array.from(paymentSplits.values()).filter((s) => s.orderId === params.orderId);
  if (orderSplits.length === 0) return { updatedSplits: [], tcsAdjustments: [] };

  const totalSplitGross = orderSplits.reduce((sum, s) => sum + s.grossAmount, 0) || params.orderTotal || 1;
  const updatedSplits: PaymentSplitRecord[] = [];
  const tcsAdjustments: GstTcsRecord[] = [];
  const now = new Date().toISOString();
  const filingPeriod = getCurrentFilingPeriod();

  for (const sp of orderSplits) {
    const shareRatio = sp.grossAmount / totalSplitGross;
    const sellerRefundPortion = roundMoney(Math.min(sp.grossAmount - sp.refundedAmount, params.refundAmount * shareRatio));
    if (sellerRefundPortion <= 0) continue;

    sp.refundedAmount = roundMoney(sp.refundedAmount + sellerRefundPortion);
    const isFull = sp.refundedAmount >= sp.grossAmount - 0.01;
    sp.splitStatus = isFull ? 'REVERSED' : 'PARTIAL_REFUNDED';
    sp.updatedAt = now;
    updatedSplits.push(sp);

    // Proportional GST TCS adjustment (negative reversal)
    const refundTaxableRatio = sellerRefundPortion / (sp.grossAmount || 1);
    const tcsReverseTotal = -roundMoney(sp.tcsAmount * refundTaxableRatio);
    if (tcsReverseTotal < 0) {
      const origTcs = gstTcsRecords.find((t) => t.paymentSplitId === sp.id && t.recordType === 'SALE');
      const isInterState = origTcs ? origTcs.isInterState : false;
      const cgstRev = isInterState ? 0 : roundMoney(tcsReverseTotal / 2);
      const sgstRev = isInterState ? 0 : roundMoney(tcsReverseTotal - cgstRev);
      const igstRev = isInterState ? tcsReverseTotal : 0;

      const revRecord: GstTcsRecord = {
        id: `tcs_rev_${crypto.randomBytes(5).toString('hex')}`,
        orderId: sp.orderId,
        orderNumber: sp.orderNumber,
        sellerId: sp.sellerId,
        sellerName: sp.sellerName,
        paymentSplitId: sp.id,
        sellerGstin: origTcs?.sellerGstin,
        taxableSupplyValue: -roundMoney(sp.taxableValue * refundTaxableRatio),
        isInterState,
        cgstTcsRate: origTcs?.cgstTcsRate ?? (isInterState ? 0 : 0.5),
        sgstTcsRate: origTcs?.sgstTcsRate ?? (isInterState ? 0 : 0.5),
        igstTcsRate: origTcs?.igstTcsRate ?? (isInterState ? 1.0 : 0),
        cgstTcsAmount: cgstRev,
        sgstTcsAmount: sgstRev,
        igstTcsAmount: igstRev,
        totalTcsAmount: tcsReverseTotal,
        filingPeriod,
        recordType: 'REFUND_REVERSAL',
        status: 'REVERSED',
        createdAt: now,
      };
      gstTcsRecords.unshift(revRecord);
      tcsAdjustments.push(revRecord);
    }

    if (isFull) {
      for (const ci of commissionInvoices) {
        if (ci.paymentSplitId === sp.id && ci.status === 'ISSUED') {
          ci.status = 'CREDIT_NOTE';
        }
      }
    }
  }

  return { updatedSplits, tcsAdjustments };
}

// =============================================================================
// ADMIN REPORTS & DASHBOARD KPI AGGREGATIONS
// =============================================================================

export function getFinanceDashboardSummary(ordersMap: Map<string, any>) {
  const allOrders = Array.from(ordersMap.values());
  const nonCancelledOrders = allOrders.filter((o) => o.status !== 'cancelled');
  const gmv = roundMoney(
    nonCancelledOrders.reduce((sum, o) => sum + Number(o.totalAmount ?? o.finalAmount ?? 0), 0)
  );

  // Marketplace Revenue = Commission + GST on Commission across active splits + fallback suborders
  const allSplits = Array.from(paymentSplits.values());
  const netCommission = roundMoney(
    allSplits
      .filter((s) => s.splitStatus !== 'REVERSED')
      .reduce((sum, s) => sum + s.commissionAmount + s.gstOnCommission, 0)
  );
  const suborderComm = roundMoney(
    Array.from(dbSellerOrders.values())
      .filter((so) => so.fulfillmentStatus !== 'CANCELLED' && !paymentSplits.has(`${so.orderId}:${so.sellerId}`))
      .reduce((sum, so) => sum + Number(so.commissionAmount || 0) + Number(so.gstOnCommission || 0), 0)
  );
  const marketplaceRevenue = roundMoney(netCommission + suborderComm);

  // Seller Payable = active wallet balances + pending settlement across all sellers
  let sellerPayable = 0;
  for (const w of dbSellerWallets.values()) {
    sellerPayable = roundMoney(sellerPayable + Number(w.balance || 0) + Number(w.pendingSettlement || 0));
  }

  // GST TCS Net Accrued
  const gstTcs = roundMoney(gstTcsRecords.reduce((sum, r) => sum + Number(r.totalTcsAmount || 0), 0));

  // Refunds total (committed/processed + pending)
  const refundsTotal = roundMoney(
    Array.from(refunds.values())
      .filter((r) => r.status !== 'FAILED' && r.status !== 'CANCELLED')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0)
  );

  return {
    kpis: {
      marketplaceRevenue,
      grossMerchandiseValue: gmv,
      sellerPayable,
      gstTcs,
      refunds: refundsTotal,
    },
    counts: {
      paymentTransactions: paymentTransactions.size,
      paymentSplits: paymentSplits.size,
      gstTcsRecords: gstTcsRecords.length,
      commissionInvoices: commissionInvoices.length,
      refunds: refunds.size,
      settlements: dbSettlements.length + sellerSettlementRecords.size,
      webhookLogs: paymentWebhookLogs.length,
    },
  };
}

export function getGstTcsReport(filters?: { sellerId?: string; filingPeriod?: string }) {
  const rows = gstTcsRecords.filter((r) => {
    if (filters?.sellerId && r.sellerId !== filters.sellerId) return false;
    if (filters?.filingPeriod && r.filingPeriod !== filters.filingPeriod) return false;
    return true;
  });

  const totals = rows.reduce(
    (acc, r) => ({
      taxableSupplyValue: roundMoney(acc.taxableSupplyValue + r.taxableSupplyValue),
      cgstTcsAmount: roundMoney(acc.cgstTcsAmount + r.cgstTcsAmount),
      sgstTcsAmount: roundMoney(acc.sgstTcsAmount + r.sgstTcsAmount),
      igstTcsAmount: roundMoney(acc.igstTcsAmount + r.igstTcsAmount),
      totalTcsAmount: roundMoney(acc.totalTcsAmount + r.totalTcsAmount),
    }),
    { taxableSupplyValue: 0, cgstTcsAmount: 0, sgstTcsAmount: 0, igstTcsAmount: 0, totalTcsAmount: 0 }
  );

  return { totals, count: rows.length, records: rows };
}

export function getCommissionReport(filters?: { sellerId?: string; billingPeriod?: string }) {
  const rules = Array.from(dbCommissionRules.values());
  const invoices = commissionInvoices.filter((ci) => {
    if (filters?.sellerId && ci.sellerId !== filters.sellerId) return false;
    if (filters?.billingPeriod && ci.billingPeriod !== filters.billingPeriod) return false;
    return true;
  });

  const activeInvoices = invoices.filter((i) => i.status !== 'CREDIT_NOTE');
  const totals = activeInvoices.reduce(
    (acc, i) => ({
      taxableCommission: roundMoney(acc.taxableCommission + i.taxableCommission),
      cgstAmount: roundMoney(acc.cgstAmount + i.cgstAmount),
      sgstAmount: roundMoney(acc.sgstAmount + i.sgstAmount),
      igstAmount: roundMoney(acc.igstAmount + i.igstAmount),
      totalTax: roundMoney(acc.totalTax + i.totalTax),
      grandTotal: roundMoney(acc.grandTotal + i.grandTotal),
    }),
    { taxableCommission: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalTax: 0, grandTotal: 0 }
  );

  return {
    totals,
    invoiceCount: invoices.length,
    commissionInvoices: invoices,
    commissionRules: rules,
  };
}

export function getPaymentReconciliationReport(ordersMap: Map<string, any>) {
  const txns = Array.from(paymentTransactions.values());
  const paymentRows = Array.from(payments.values());
  const orderIdsChecked = new Set<string>();
  const discrepancies: Array<{
    orderId: string;
    orderNumber?: string;
    expectedAmount: number;
    capturedAmount: number;
    gatewayStatus: string;
    orderPaymentStatus: string;
    reason: string;
  }> = [];

  for (const order of ordersMap.values()) {
    orderIdsChecked.add(order.id);
    const expected = roundMoney(Number(order.finalGatewayPayable ?? order.totalAmount ?? 0));
    const captured = roundMoney(getCapturedPaidAmountForOrder(order.id));
    if (order.paymentStatus === 'PAID' && order.paymentMethod !== 'WALLET_ONLY' && expected > 0 && Math.abs(expected - captured) > 1) {
      discrepancies.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        expectedAmount: expected,
        capturedAmount: captured,
        gatewayStatus: captured > 0 ? 'AMOUNT_MISMATCH' : 'MISSING_PAYMENT_RECORD',
        orderPaymentStatus: order.paymentStatus,
        reason: `Expected ₹${expected}, captured payment ledger ₹${captured}`,
      });
    }
  }

  return {
    summary: {
      totalOrdersChecked: orderIdsChecked.size,
      totalTransactions: txns.length,
      totalGatewayPayments: paymentRows.length,
      discrepancyCount: discrepancies.length,
      reconciliationRunsCount: reconciliationRuns.length,
      webhookEventsLogged: paymentWebhookLogs.length,
      matchedCleanly: discrepancies.length === 0,
    },
    discrepancies,
    transactions: txns,
    reconciliationRuns: reconciliationRuns.slice(0, 20),
    webhookLogs: paymentWebhookLogs.slice(0, 50),
  };
}
