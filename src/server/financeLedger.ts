import crypto from 'crypto';
import ExcelJS from 'exceljs';
import { dbSellerWallets, dbSettlements, dbSellerTransactions, dbAuditLogs, dbSellers, dbCommissionRules } from './v1Router.ts';
import { maskBankAccountNumber, maskEmailAddress, maskPhoneNumber, recordAuditLog } from './auditAndRbac.ts';

// =============================================================================
// DOUBLE-ENTRY FINANCE LEDGER, GIFT CARDS, STORE CREDITS, SETTLEMENTS,
// RECONCILIATION ENGINE & SERVER-SIDE CSV / XLSX EXPORTER
// =============================================================================

export type LedgerSide = 'DEBIT' | 'CREDIT';
export type LedgerStatus = 'POSTED' | 'REVERSED';

export interface LedgerEntryRecord {
  id: string;
  entryGroupId: string;
  accountCode: string;
  entryType: LedgerSide;
  amount: number;
  currency: string;
  orderId?: string;
  sellerId?: string;
  paymentId?: string;
  refundId?: string;
  settlementId?: string;
  referenceNumber: string;
  description: string;
  status: LedgerStatus;
  createdBy: string;
  createdAt: string;
}

export const ACCOUNT_CODES = {
  GATEWAY_RECEIVABLE: 'ASSET:CASHFREE_RECEIVABLE',
  PLATFORM_ESCROW_CASH: 'ASSET:PLATFORM_ESCROW_CASH',
  SELLER_PAYABLE: 'LIABILITY:SELLER_PAYABLE',
  GIFT_CARD_LIABILITY: 'LIABILITY:GIFT_CARD',
  STORE_CREDIT_LIABILITY: 'LIABILITY:STORE_CREDIT',
  TAX_PAYABLE: 'LIABILITY:GST_PAYABLE',
  GST_ON_COMMISSION_PAYABLE: 'LIABILITY:GST_ON_COMMISSION',
  REFUND_PAYABLE: 'LIABILITY:REFUND_PAYABLE',
  PLATFORM_COMMISSION_REV: 'REVENUE:MARKETPLACE_COMMISSION',
  AD_REVENUE: 'REVENUE:SPONSORED_ADS',
  SHIPPING_CLEARING: 'CLEARING:SHIPPING_FEE',
  COUPON_DISCOUNT_EXPENSE: 'EXPENSE:PLATFORM_COUPONS',
} as const;

export const financeLedgerEntries: LedgerEntryRecord[] = [];
const giftCards = new Map<string, GiftCardRecord>();
const giftCardByHash = new Map<string, string>(); // codeHash -> giftCardId
const giftCardTransactions: GiftCardTransactionRecord[] = [];
const giftCardLocks = new Map<string, Promise<void>>();
const giftCardBruteForceAttempts = new Map<string, { count: number; lockedUntil: number }>();

const storeCreditAccounts = new Map<string, StoreCreditAccountRecord>();
const storeCreditTransactions: StoreCreditTransactionRecord[] = [];
const storeCreditLocks = new Map<string, Promise<void>>();

export const reconciliationRuns: ReconciliationRunRecord[] = [];
export const financeExportAudits: FinanceExportAuditRecord[] = [];

const RUNTIME_GIFT_CARD_PEPPER = crypto.randomBytes(32).toString('hex');

function getGiftCardPepper(): string {
  const configured = (process.env.GIFT_CARD_HASH_PEPPER || '').trim();
  return configured || RUNTIME_GIFT_CARD_PEPPER;
}

export function normalizeGiftCardCode(rawCode: string): string {
  return rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function hashGiftCardCode(rawCode: string): string {
  const clean = normalizeGiftCardCode(rawCode);
  return crypto.createHmac('sha256', getGiftCardPepper()).update(clean).digest('hex');
}

export function roundMoney(val: number): number {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

// Per-resource mutex serializer to prevent concurrent gift card / store credit overspending
async function withMutex<T>(lockMap: Map<string, Promise<void>>, key: string, fn: () => Promise<T>): Promise<T> {
  const previous = lockMap.get(key) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.then(() => current);
  lockMap.set(key, chained);

  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (lockMap.get(key) === chained) {
      lockMap.delete(key);
    }
  }
}

// =============================================================================
// 1. DOUBLE-ENTRY LEDGER ENGINE (DEBIT === CREDIT INVARIANT + REVERSAL ONLY)
// =============================================================================

export function postBalancedLedgerGroup(params: {
  referenceNumber: string;
  description: string;
  createdBy: string;
  orderId?: string;
  sellerId?: string;
  paymentId?: string;
  refundId?: string;
  settlementId?: string;
  lines: Array<{ accountCode: string; entryType: LedgerSide; amount: number; sellerId?: string }>;
}): LedgerEntryRecord[] {
  const positiveLines = params.lines.filter((l) => roundMoney(l.amount) > 0);
  if (positiveLines.length < 2) {
    throw new Error('Ledger entry group must contain at least one debit and one credit line.');
  }

  let debitTotal = 0;
  let creditTotal = 0;
  for (const l of positiveLines) {
    const amt = roundMoney(l.amount);
    if (l.entryType === 'DEBIT') debitTotal += amt;
    else creditTotal += amt;
  }

  if (Math.abs(roundMoney(debitTotal) - roundMoney(creditTotal)) > 0.01) {
    throw new Error(
      `Unbalanced double-entry ledger group (${params.referenceNumber}): DEBIT=${debitTotal.toFixed(2)} !== CREDIT=${creditTotal.toFixed(2)}`
    );
  }

  const groupId = `ldg_grp_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();
  const created: LedgerEntryRecord[] = [];

  for (const line of positiveLines) {
    const record: LedgerEntryRecord = Object.freeze({
      id: `ldg_${crypto.randomBytes(6).toString('hex')}`,
      entryGroupId: groupId,
      accountCode: line.accountCode,
      entryType: line.entryType,
      amount: roundMoney(line.amount),
      currency: 'INR',
      orderId: params.orderId,
      sellerId: line.sellerId || params.sellerId,
      paymentId: params.paymentId,
      refundId: params.refundId,
      settlementId: params.settlementId,
      referenceNumber: params.referenceNumber,
      description: params.description,
      status: 'POSTED' as const,
      createdBy: params.createdBy,
      createdAt: now,
    });
    financeLedgerEntries.push(record);
    created.push(record);
  }

  return created;
}

export function reverseLedgerGroup(params: {
  originalEntryGroupId: string;
  reason: string;
  createdBy: string;
  refundId?: string;
}): LedgerEntryRecord[] {
  const originals = financeLedgerEntries.filter((e) => e.entryGroupId === params.originalEntryGroupId);
  if (originals.length === 0) {
    throw new Error(`Ledger entry group ${params.originalEntryGroupId} not found.`);
  }
  const alreadyReversed = financeLedgerEntries.some(
    (e) => e.referenceNumber === `REV:${params.originalEntryGroupId}`
  );
  if (alreadyReversed) {
    throw new Error(`Ledger entry group ${params.originalEntryGroupId} has already been reversed.`);
  }

  return postBalancedLedgerGroup({
    referenceNumber: `REV:${params.originalEntryGroupId}`,
    description: `Reversal of ${originals[0].referenceNumber}: ${params.reason}`,
    createdBy: params.createdBy,
    orderId: originals[0].orderId,
    sellerId: originals[0].sellerId,
    paymentId: originals[0].paymentId,
    refundId: params.refundId || originals[0].refundId,
    lines: originals.map((orig) => ({
      accountCode: orig.accountCode,
      entryType: orig.entryType === 'DEBIT' ? 'CREDIT' : 'DEBIT',
      amount: orig.amount,
      sellerId: orig.sellerId,
    })),
  });
}

export function getLedgerSummary(filters?: { sellerId?: string; orderId?: string }) {
  const entries = financeLedgerEntries.filter((e) => {
    if (filters?.sellerId && e.sellerId !== filters.sellerId) return false;
    if (filters?.orderId && e.orderId !== filters.orderId) return false;
    return true;
  });

  const accountBalances: Record<string, { debits: number; credits: number; net: number }> = {};
  let totalDebits = 0;
  let totalCredits = 0;

  for (const e of entries) {
    if (!accountBalances[e.accountCode]) {
      accountBalances[e.accountCode] = { debits: 0, credits: 0, net: 0 };
    }
    if (e.entryType === 'DEBIT') {
      accountBalances[e.accountCode].debits = roundMoney(accountBalances[e.accountCode].debits + e.amount);
      totalDebits = roundMoney(totalDebits + e.amount);
    } else {
      accountBalances[e.accountCode].credits = roundMoney(accountBalances[e.accountCode].credits + e.amount);
      totalCredits = roundMoney(totalCredits + e.amount);
    }
    accountBalances[e.accountCode].net = roundMoney(
      accountBalances[e.accountCode].credits - accountBalances[e.accountCode].debits
    );
  }

  return {
    entryCount: entries.length,
    totalDebits,
    totalCredits,
    isBalanced: Math.abs(totalDebits - totalCredits) <= 0.01,
    accountBalances,
    entries: [...entries].reverse(),
  };
}

// =============================================================================
// 2. UNIFIED COMMISSION, ESCROW & SELLER SETTLEMENT SERVICE
// =============================================================================

export function lookupCommissionPercent(categorySlug?: string): number {
  const clean = (categorySlug || '').trim().toLowerCase();
  const rule = dbCommissionRules.get(clean);
  if (rule) return Number(rule.commissionPercent);
  return 12; // Platform default
}

export function computeSellerCommissionBreakdown(grossSubtotal: number, commissionPercent: number) {
  const gross = roundMoney(grossSubtotal);
  const commissionAmount = roundMoney((gross * commissionPercent) / 100);
  const gstOnCommission = roundMoney(commissionAmount * 0.18);
  const netSellerEarnings = Math.max(0, roundMoney(gross - commissionAmount - gstOnCommission));
  return {
    gross,
    commissionPercent,
    commissionAmount,
    gstOnCommission,
    netSellerEarnings,
  };
}

export function recordSellerEscrowForOrder(params: {
  orderId: string;
  suborderNumber: string;
  sellerId: string;
  grossSubtotal: number;
  categorySlug?: string;
  actorId: string;
}) {
  const commissionPercent = lookupCommissionPercent(params.categorySlug);
  const breakdown = computeSellerCommissionBreakdown(params.grossSubtotal, commissionPercent);

  let wallet = dbSellerWallets.get(params.sellerId);
  if (!wallet) {
    wallet = {
      sellerId: params.sellerId,
      balance: 0,
      pendingSettlement: 0,
      lifetimeEarnings: 0,
      totalWithdrawn: 0,
      currency: 'INR',
    };
    dbSellerWallets.set(params.sellerId, wallet);
  }
  wallet.pendingSettlement = roundMoney(wallet.pendingSettlement + breakdown.netSellerEarnings);

  dbSellerTransactions.push({
    id: `stxn_${crypto.randomBytes(5).toString('hex')}`,
    sellerId: params.sellerId,
    type: 'CREDIT',
    amount: breakdown.netSellerEarnings,
    balanceAfter: wallet.balance,
    referenceId: params.suborderNumber,
    description: `Escrow hold for ${params.suborderNumber} (Gross ₹${breakdown.gross}, Commission ₹${breakdown.commissionAmount}, GST ₹${breakdown.gstOnCommission})`,
    createdAt: new Date().toISOString(),
  });

  postBalancedLedgerGroup({
    referenceNumber: `SUBORDER:${params.suborderNumber}`,
    description: `Order split revenue & commission allocation for ${params.suborderNumber}`,
    createdBy: params.actorId,
    orderId: params.orderId,
    sellerId: params.sellerId,
    lines: [
      { accountCode: ACCOUNT_CODES.PLATFORM_ESCROW_CASH, entryType: 'DEBIT', amount: breakdown.gross },
      { accountCode: ACCOUNT_CODES.SELLER_PAYABLE, entryType: 'CREDIT', amount: breakdown.netSellerEarnings },
      { accountCode: ACCOUNT_CODES.PLATFORM_COMMISSION_REV, entryType: 'CREDIT', amount: breakdown.commissionAmount },
      { accountCode: ACCOUNT_CODES.GST_ON_COMMISSION_PAYABLE, entryType: 'CREDIT', amount: breakdown.gstOnCommission },
    ],
  });

  return breakdown;
}

export function releaseEscrowToSellerWallet(params: {
  sellerId: string;
  suborderNumber: string;
  netSellerEarnings: number;
  actorId: string;
}) {
  const wallet = dbSellerWallets.get(params.sellerId);
  if (!wallet) return null;

  const releaseAmt = Math.min(wallet.pendingSettlement, roundMoney(params.netSellerEarnings));
  wallet.pendingSettlement = roundMoney(Math.max(0, wallet.pendingSettlement - releaseAmt));
  wallet.balance = roundMoney(wallet.balance + releaseAmt);
  wallet.lifetimeEarnings = roundMoney(wallet.lifetimeEarnings + releaseAmt);

  dbSellerTransactions.push({
    id: `stxn_${crypto.randomBytes(5).toString('hex')}`,
    sellerId: params.sellerId,
    type: 'SETTLEMENT',
    amount: releaseAmt,
    balanceAfter: wallet.balance,
    referenceId: params.suborderNumber,
    description: `Escrow released to withdrawable wallet for delivered suborder ${params.suborderNumber}`,
    createdAt: new Date().toISOString(),
  });

  return wallet;
}

export function createSellerSettlementRequest(params: {
  sellerId: string;
  amount: number;
  idempotencyKey?: string;
  actorId: string;
}) {
  if (params.idempotencyKey) {
    const existing = dbSettlements.find((s: any) => s.idempotencyKey === params.idempotencyKey);
    if (existing) {
      return { settlement: existing, duplicate: true };
    }
  }

  const seller = dbSellers.get(params.sellerId);
  if (!seller) throw new Error('Seller not found.');
  const wallet = dbSellerWallets.get(params.sellerId);
  if (!wallet) throw new Error('Seller wallet not initialized.');

  const reqAmount = roundMoney(params.amount);
  if (!Number.isFinite(reqAmount) || reqAmount <= 0) {
    throw new Error('Settlement amount must be greater than zero.');
  }
  if (reqAmount > wallet.balance) {
    throw new Error(`Insufficient withdrawable balance. Available: ₹${wallet.balance.toFixed(2)}`);
  }

  wallet.balance = roundMoney(wallet.balance - reqAmount);

  const settlementId = `stl_${crypto.randomBytes(5).toString('hex')}`;
  const settlement: any = {
    id: settlementId,
    idempotencyKey: params.idempotencyKey || settlementId,
    sellerId: params.sellerId,
    sellerName: seller.businessName,
    grossAmount: reqAmount,
    commissionDeducted: 0, // Already deducted per suborder via ledger
    gstOnCommission: 0,
    netPayout: reqAmount,
    bankAccount: maskBankAccountNumber(seller.bankAccount?.accountNumber),
    bankName: seller.bankAccount?.bankName || 'Linked Bank',
    status: 'PENDING',
    requestedAt: new Date().toISOString(),
  };

  dbSettlements.push(settlement);

  dbSellerTransactions.push({
    id: `stxn_${crypto.randomBytes(5).toString('hex')}`,
    sellerId: params.sellerId,
    type: 'DEBIT',
    amount: -reqAmount,
    balanceAfter: wallet.balance,
    referenceId: settlementId,
    description: `Settlement payout requested (${settlement.bankAccount})`,
    createdAt: new Date().toISOString(),
  });

  recordAuditLog({
    actorType: 'SELLER',
    actorId: params.actorId,
    actorName: seller.businessName,
    actorRole: 'SELLER',
    action: 'SETTLEMENT_REQUESTED',
    entityType: 'SETTLEMENT',
    entityId: settlementId,
    afterState: { amount: reqAmount, status: 'PENDING' },
    details: `Seller requested settlement of ₹${reqAmount} to ${settlement.bankAccount}.`,
    legacyAuditSink: dbAuditLogs,
  });

  return { settlement, duplicate: false };
}

export function approveSellerSettlement(params: {
  settlementId: string;
  actorId: string;
  actorName: string;
  utrNumber?: string;
}) {
  const settlement: any = dbSettlements.find((s) => s.id === params.settlementId);
  if (!settlement) throw new Error('Settlement record not found.');
  if (settlement.status === 'APPROVED' || settlement.status === 'TRANSFERRED') {
    return { settlement, duplicate: true };
  }
  if (settlement.status === 'REJECTED') {
    throw new Error('Rejected settlement cannot be approved.');
  }

  const utr = params.utrNumber?.trim() || `PBUTR${Date.now().toString().slice(-10)}`;
  settlement.status = 'TRANSFERRED';
  settlement.utrNumber = utr;
  settlement.approvedBy = params.actorId;
  settlement.processedAt = new Date().toISOString();

  const wallet = dbSellerWallets.get(settlement.sellerId);
  if (wallet) {
    wallet.totalWithdrawn = roundMoney(wallet.totalWithdrawn + settlement.netPayout);
  }

  postBalancedLedgerGroup({
    referenceNumber: `SETTLEMENT:${settlement.id}`,
    description: `Seller settlement disbursed (${utr})`,
    createdBy: params.actorId,
    sellerId: settlement.sellerId,
    settlementId: settlement.id,
    lines: [
      { accountCode: ACCOUNT_CODES.SELLER_PAYABLE, entryType: 'DEBIT', amount: settlement.netPayout },
      { accountCode: ACCOUNT_CODES.PLATFORM_ESCROW_CASH, entryType: 'CREDIT', amount: settlement.netPayout },
    ],
  });

  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: 'ADMIN',
    action: 'SETTLEMENT_APPROVED',
    entityType: 'SETTLEMENT',
    entityId: settlement.id,
    afterState: { status: settlement.status, utrNumber: utr, netPayout: settlement.netPayout },
    details: `Approved and disbursed settlement ₹${settlement.netPayout} (UTR: ${utr}).`,
    legacyAuditSink: dbAuditLogs,
  });

  return { settlement, duplicate: false };
}

// =============================================================================
// 3. SECURE GIFT CARD SERVICE (CSPRNG + HMAC-SHA256 + ATOMIC MUTEX)
// =============================================================================

export interface GiftCardRecord {
  id: string;
  codeHash: string;
  codeLast4: string;
  initialAmount: number;
  remainingBalance: number;
  currency: string;
  isActive: boolean;
  expiresAt?: string | null;
  minOrderAmount: number;
  issuedBy: string;
  recipientEmail?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GiftCardTransactionRecord {
  id: string;
  giftCardId: string;
  orderId?: string;
  type: 'ISSUE' | 'REDEEM' | 'REFUND_RESTORE' | 'ADMIN_ADJUST' | 'DEACTIVATE';
  amount: number;
  balanceAfter: number;
  actorId: string;
  notes?: string;
  createdAt: string;
}

function generateGiftCardPlainCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(12);
  let chars = '';
  for (let i = 0; i < 12; i++) {
    chars += alphabet[bytes[i] % alphabet.length];
  }
  return `PBGC-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

export function sanitizeGiftCardPublic(card: GiftCardRecord) {
  return {
    id: card.id,
    maskedCode: `PBGC-••••-••••-${card.codeLast4}`,
    codeLast4: card.codeLast4,
    initialAmount: card.initialAmount,
    remainingBalance: card.remainingBalance,
    currency: card.currency,
    isActive: card.isActive,
    expiresAt: card.expiresAt || null,
    minOrderAmount: card.minOrderAmount,
    recipientEmail: card.recipientEmail || null,
    notes: card.notes || null,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

export function createGiftCard(params: {
  initialAmount: number;
  expiresAt?: string | null;
  minOrderAmount?: number;
  recipientEmail?: string;
  notes?: string;
  issuedBy: string;
  actorName: string;
}) {
  const initialAmount = roundMoney(params.initialAmount);
  if (!Number.isFinite(initialAmount) || initialAmount < 50 || initialAmount > 100000) {
    throw new Error('Gift card amount must be between ₹50 and ₹1,00,000.');
  }

  const minOrderAmount = Math.max(0, roundMoney(params.minOrderAmount || 0));
  if (params.expiresAt) {
    const exp = new Date(params.expiresAt);
    if (Number.isNaN(exp.getTime()) || exp.getTime() <= Date.now()) {
      throw new Error('Gift card expiry date must be a valid future date.');
    }
  }

  const plainCode = generateGiftCardPlainCode();
  const codeHash = hashGiftCardCode(plainCode);
  const codeLast4 = plainCode.slice(-4);
  const now = new Date().toISOString();

  const card: GiftCardRecord = {
    id: `gc_${crypto.randomBytes(6).toString('hex')}`,
    codeHash,
    codeLast4,
    initialAmount,
    remainingBalance: initialAmount,
    currency: 'INR',
    isActive: true,
    expiresAt: params.expiresAt || null,
    minOrderAmount,
    issuedBy: params.issuedBy,
    recipientEmail: params.recipientEmail?.trim() || null,
    notes: params.notes?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };

  giftCards.set(card.id, card);
  giftCardByHash.set(codeHash, card.id);

  giftCardTransactions.push({
    id: `gctx_${crypto.randomBytes(5).toString('hex')}`,
    giftCardId: card.id,
    type: 'ISSUE',
    amount: initialAmount,
    balanceAfter: initialAmount,
    actorId: params.issuedBy,
    notes: params.notes || 'Gift card issued by admin',
    createdAt: now,
  });

  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.issuedBy,
    actorName: params.actorName,
    actorRole: 'ADMIN',
    action: 'GIFT_CARD_CREATED',
    entityType: 'GIFT_CARD',
    entityId: card.id,
    afterState: { codeLast4, initialAmount, minOrderAmount, expiresAt: card.expiresAt },
    details: `Issued gift card ending in ${codeLast4} worth ₹${initialAmount}.`,
    legacyAuditSink: dbAuditLogs,
  });

  return {
    giftCard: sanitizeGiftCardPublic(card),
    // Returned ONCE at creation time so admin can securely hand off to recipient; never persisted in plaintext
    oneTimeCode: plainCode,
  };
}

export function listGiftCards() {
  return Array.from(giftCards.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(sanitizeGiftCardPublic);
}

export function updateGiftCardStatus(params: {
  giftCardId: string;
  isActive: boolean;
  actorId: string;
  actorName: string;
  reason?: string;
}) {
  const card = giftCards.get(params.giftCardId);
  if (!card) throw new Error('Gift card not found.');
  const before = { isActive: card.isActive };
  card.isActive = Boolean(params.isActive);
  card.updatedAt = new Date().toISOString();

  giftCardTransactions.push({
    id: `gctx_${crypto.randomBytes(5).toString('hex')}`,
    giftCardId: card.id,
    type: 'DEACTIVATE',
    amount: 0,
    balanceAfter: card.remainingBalance,
    actorId: params.actorId,
    notes: params.reason || `Status changed to ${card.isActive ? 'ACTIVE' : 'INACTIVE'}`,
    createdAt: card.updatedAt,
  });

  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: 'ADMIN',
    action: card.isActive ? 'GIFT_CARD_ACTIVATED' : 'GIFT_CARD_DEACTIVATED',
    entityType: 'GIFT_CARD',
    entityId: card.id,
    beforeState: before,
    afterState: { isActive: card.isActive },
    reason: params.reason,
    details: `Gift card ending in ${card.codeLast4} set to ${card.isActive ? 'active' : 'inactive'}.`,
    legacyAuditSink: dbAuditLogs,
  });

  return sanitizeGiftCardPublic(card);
}

export function validateGiftCardForAmount(params: {
  code: string;
  orderSubtotal: number;
  rateLimitKey?: string;
}) {
  const rlKey = params.rateLimitKey || 'global';
  const brute = giftCardBruteForceAttempts.get(rlKey);
  if (brute && Date.now() < brute.lockedUntil) {
    throw new Error('Too many invalid gift card attempts. Please try again in a few minutes.');
  }

  const codeHash = hashGiftCardCode(params.code);
  const cardId = giftCardByHash.get(codeHash);
  const card = cardId ? giftCards.get(cardId) : undefined;

  if (!card) {
    const nextCount = (brute?.count || 0) + 1;
    giftCardBruteForceAttempts.set(rlKey, {
      count: nextCount,
      lockedUntil: nextCount >= 8 ? Date.now() + 10 * 60 * 1000 : 0,
    });
    throw new Error('Invalid or unrecognized gift card code.');
  }

  giftCardBruteForceAttempts.delete(rlKey);

  if (!card.isActive) {
    throw new Error('This gift card has been deactivated.');
  }
  if (card.expiresAt && new Date(card.expiresAt).getTime() <= Date.now()) {
    throw new Error('This gift card has expired.');
  }
  if (card.remainingBalance <= 0) {
    throw new Error('This gift card has zero remaining balance.');
  }
  if (params.orderSubtotal < card.minOrderAmount) {
    throw new Error(`Minimum order amount of ₹${card.minOrderAmount} is required to redeem this gift card.`);
  }

  const applicableAmount = Math.min(card.remainingBalance, roundMoney(params.orderSubtotal));
  return {
    cardId: card.id,
    maskedCode: `PBGC-••••-••••-${card.codeLast4}`,
    remainingBalance: card.remainingBalance,
    applicableAmount: roundMoney(applicableAmount),
    minOrderAmount: card.minOrderAmount,
    expiresAt: card.expiresAt || null,
  };
}

export async function redeemGiftCardAtomically(params: {
  code: string;
  requestedAmount: number;
  orderSubtotal: number;
  orderId: string;
  actorId: string;
}) {
  const codeHash = hashGiftCardCode(params.code);
  const cardId = giftCardByHash.get(codeHash);
  if (!cardId) {
    throw new Error('Invalid gift card code.');
  }

  return withMutex(giftCardLocks, cardId, async () => {
    const card = giftCards.get(cardId);
    if (!card || !card.isActive) throw new Error('Gift card is inactive.');
    if (card.expiresAt && new Date(card.expiresAt).getTime() <= Date.now()) {
      throw new Error('Gift card has expired.');
    }
    if (params.orderSubtotal < card.minOrderAmount) {
      throw new Error(`Minimum order amount of ₹${card.minOrderAmount} is required.`);
    }

    const redeemAmount = roundMoney(Math.min(params.requestedAmount, card.remainingBalance, params.orderSubtotal));
    if (redeemAmount <= 0) {
      throw new Error('Insufficient gift card balance.');
    }

    card.remainingBalance = roundMoney(card.remainingBalance - redeemAmount);
    card.updatedAt = new Date().toISOString();

    const txn: GiftCardTransactionRecord = {
      id: `gctx_${crypto.randomBytes(5).toString('hex')}`,
      giftCardId: card.id,
      orderId: params.orderId,
      type: 'REDEEM',
      amount: -redeemAmount,
      balanceAfter: card.remainingBalance,
      actorId: params.actorId,
      notes: `Redeemed against order ${params.orderId}`,
      createdAt: card.updatedAt,
    };
    giftCardTransactions.push(txn);

    postBalancedLedgerGroup({
      referenceNumber: `GC:${txn.id}`,
      description: `Gift card redemption for order ${params.orderId}`,
      createdBy: params.actorId,
      orderId: params.orderId,
      lines: [
        { accountCode: ACCOUNT_CODES.GIFT_CARD_LIABILITY, entryType: 'DEBIT', amount: redeemAmount },
        { accountCode: ACCOUNT_CODES.PLATFORM_ESCROW_CASH, entryType: 'CREDIT', amount: redeemAmount },
      ],
    });

    return {
      giftCardId: card.id,
      redeemedAmount: redeemAmount,
      remainingBalance: card.remainingBalance,
      transaction: txn,
    };
  });
}

// =============================================================================
// 4. STORE CREDIT WALLET & IMMUTABLE LEDGER
// =============================================================================

export interface StoreCreditAccountRecord {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  updatedAt: string;
}

export interface StoreCreditTransactionRecord {
  id: string;
  accountId: string;
  userId: string;
  orderId?: string;
  refundId?: string;
  type: 'CREDIT_ADMIN' | 'CREDIT_REFUND' | 'DEBIT_ORDER' | 'ADMIN_REVERSAL';
  amount: number;
  balanceAfter: number;
  reason: string;
  actorId: string;
  createdAt: string;
}

export function getStoreCreditAccount(userId: string): {
  account: StoreCreditAccountRecord;
  transactions: StoreCreditTransactionRecord[];
} {
  let account = storeCreditAccounts.get(userId);
  if (!account) {
    account = {
      id: `sca_${crypto.randomBytes(5).toString('hex')}`,
      userId,
      balance: 0,
      currency: 'INR',
      updatedAt: new Date().toISOString(),
    };
    storeCreditAccounts.set(userId, account);
  }
  const txns = storeCreditTransactions
    .filter((t) => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { account, transactions: txns };
}

export async function creditStoreCredit(params: {
  userId: string;
  amount: number;
  type: 'CREDIT_ADMIN' | 'CREDIT_REFUND';
  reason: string;
  actorId: string;
  actorName?: string;
  orderId?: string;
  refundId?: string;
}) {
  const creditAmt = roundMoney(params.amount);
  if (!Number.isFinite(creditAmt) || creditAmt <= 0) {
    throw new Error('Store credit amount must be positive.');
  }

  return withMutex(storeCreditLocks, params.userId, async () => {
    const { account } = getStoreCreditAccount(params.userId);
    account.balance = roundMoney(account.balance + creditAmt);
    account.updatedAt = new Date().toISOString();

    const txn: StoreCreditTransactionRecord = {
      id: `sctx_${crypto.randomBytes(5).toString('hex')}`,
      accountId: account.id,
      userId: params.userId,
      orderId: params.orderId,
      refundId: params.refundId,
      type: params.type,
      amount: creditAmt,
      balanceAfter: account.balance,
      reason: params.reason.trim() || 'Store credit issued',
      actorId: params.actorId,
      createdAt: account.updatedAt,
    };
    storeCreditTransactions.push(txn);

    postBalancedLedgerGroup({
      referenceNumber: `SC:${txn.id}`,
      description: `Store credit issued to user ${params.userId}: ${txn.reason}`,
      createdBy: params.actorId,
      orderId: params.orderId,
      refundId: params.refundId,
      lines: [
        {
          accountCode:
            params.type === 'CREDIT_REFUND'
              ? ACCOUNT_CODES.REFUND_PAYABLE
              : ACCOUNT_CODES.COUPON_DISCOUNT_EXPENSE,
          entryType: 'DEBIT',
          amount: creditAmt,
        },
        { accountCode: ACCOUNT_CODES.STORE_CREDIT_LIABILITY, entryType: 'CREDIT', amount: creditAmt },
      ],
    });

    recordAuditLog({
      actorType: params.type === 'CREDIT_ADMIN' ? 'ADMIN' : 'SYSTEM',
      actorId: params.actorId,
      actorName: params.actorName || params.actorId,
      actorRole: params.type === 'CREDIT_ADMIN' ? 'ADMIN' : 'SYSTEM',
      action: 'STORE_CREDIT_ISSUED',
      entityType: 'STORE_CREDIT',
      entityId: account.id,
      afterState: { userId: params.userId, amount: creditAmt, balanceAfter: account.balance },
      reason: txn.reason,
      details: `Issued ₹${creditAmt} store credit to user ${params.userId}.`,
      legacyAuditSink: dbAuditLogs,
    });

    return { account, transaction: txn };
  });
}

export async function debitStoreCreditAtomically(params: {
  userId: string;
  requestedAmount: number;
  orderId: string;
  actorId: string;
}) {
  const reqAmt = roundMoney(params.requestedAmount);
  if (!Number.isFinite(reqAmt) || reqAmt <= 0) {
    throw new Error('Requested store credit debit must be positive.');
  }

  return withMutex(storeCreditLocks, params.userId, async () => {
    const { account } = getStoreCreditAccount(params.userId);
    if (account.balance <= 0) {
      throw new Error('No store credit balance available.');
    }
    const debitAmt = roundMoney(Math.min(reqAmt, account.balance));
    account.balance = roundMoney(account.balance - debitAmt);
    account.updatedAt = new Date().toISOString();

    const txn: StoreCreditTransactionRecord = {
      id: `sctx_${crypto.randomBytes(5).toString('hex')}`,
      accountId: account.id,
      userId: params.userId,
      orderId: params.orderId,
      type: 'DEBIT_ORDER',
      amount: -debitAmt,
      balanceAfter: account.balance,
      reason: `Redeemed at checkout for order ${params.orderId}`,
      actorId: params.actorId,
      createdAt: account.updatedAt,
    };
    storeCreditTransactions.push(txn);

    postBalancedLedgerGroup({
      referenceNumber: `SC:${txn.id}`,
      description: `Store credit redeemed for order ${params.orderId}`,
      createdBy: params.actorId,
      orderId: params.orderId,
      lines: [
        { accountCode: ACCOUNT_CODES.STORE_CREDIT_LIABILITY, entryType: 'DEBIT', amount: debitAmt },
        { accountCode: ACCOUNT_CODES.PLATFORM_ESCROW_CASH, entryType: 'CREDIT', amount: debitAmt },
      ],
    });

    return { debitedAmount: debitAmt, balanceAfter: account.balance, transaction: txn };
  });
}

// =============================================================================
// 5. CASHFREE RECONCILIATION ENGINE
// =============================================================================

export type ReconciliationMatchStatus =
  | 'MATCHED'
  | 'UNMATCHED_INTERNAL'
  | 'UNMATCHED_PROVIDER'
  | 'AMOUNT_MISMATCH'
  | 'DUPLICATE'
  | 'FAILED'
  | 'PENDING';

export interface ProviderTransactionSnapshot {
  cashfreeOrderId: string;
  cashfreePaymentId?: string;
  amount: number;
  status: 'PAID' | 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUNDED';
  type?: 'PAYMENT' | 'REFUND';
}

export interface ReconciliationItemRecord {
  id: string;
  orderId?: string;
  paymentId?: string;
  refundId?: string;
  cashfreeOrderId?: string;
  cashfreePaymentId?: string;
  internalAmount: number;
  providerAmount: number;
  matchStatus: ReconciliationMatchStatus;
  notes: string;
}

export interface ReconciliationRunRecord {
  id: string;
  fromDate: string;
  toDate: string;
  runBy: string;
  totalChecked: number;
  matchedCount: number;
  unmatchedCount: number;
  mismatchCount: number;
  duplicateCount: number;
  items: ReconciliationItemRecord[];
  createdAt: string;
}

export function runCashfreeReconciliation(params: {
  fromDate: string;
  toDate: string;
  runBy: string;
  internalPayments: Array<{
    id: string;
    orderId: string;
    gatewayReference: string;
    cfPaymentId?: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  providerRecords: ProviderTransactionSnapshot[];
}): ReconciliationRunRecord {
  const fromMs = new Date(params.fromDate).getTime();
  const toMs = new Date(params.toDate).getTime();

  const windowPayments = params.internalPayments.filter((p) => {
    const t = new Date(p.createdAt).getTime();
    if (Number.isFinite(fromMs) && t < fromMs) return false;
    if (Number.isFinite(toMs) && t > toMs) return false;
    return true;
  });

  const providerByOrder = new Map<string, ProviderTransactionSnapshot[]>();
  for (const pr of params.providerRecords) {
    const list = providerByOrder.get(pr.cashfreeOrderId) || [];
    list.push(pr);
    providerByOrder.set(pr.cashfreeOrderId, list);
  }

  const seenProviderKeys = new Set<string>();
  const items: ReconciliationItemRecord[] = [];
  let matchedCount = 0;
  let unmatchedCount = 0;
  let mismatchCount = 0;
  let duplicateCount = 0;

  for (const p of windowPayments) {
    const candidates = providerByOrder.get(p.gatewayReference) || [];
    if (candidates.length === 0) {
      const status: ReconciliationMatchStatus =
        p.status === 'FAILED' ? 'FAILED' : p.status === 'PENDING' ? 'PENDING' : 'UNMATCHED_INTERNAL';
      if (status === 'UNMATCHED_INTERNAL') unmatchedCount++;
      items.push({
        id: `reci_${crypto.randomBytes(4).toString('hex')}`,
        orderId: p.orderId,
        paymentId: p.id,
        cashfreeOrderId: p.gatewayReference,
        cashfreePaymentId: p.cfPaymentId,
        internalAmount: roundMoney(p.amount),
        providerAmount: 0,
        matchStatus: status,
        notes:
          status === 'UNMATCHED_INTERNAL'
            ? 'Internal payment missing from Cashfree settlement report.'
            : `Internal payment is ${p.status}.`,
      });
      continue;
    }

    if (candidates.length > 1) {
      duplicateCount++;
      items.push({
        id: `reci_${crypto.randomBytes(4).toString('hex')}`,
        orderId: p.orderId,
        paymentId: p.id,
        cashfreeOrderId: p.gatewayReference,
        cashfreePaymentId: candidates.map((c) => c.cashfreePaymentId).filter(Boolean).join(','),
        internalAmount: roundMoney(p.amount),
        providerAmount: roundMoney(candidates.reduce((s, c) => s + c.amount, 0)),
        matchStatus: 'DUPLICATE',
        notes: `Detected ${candidates.length} provider records for ${p.gatewayReference}.`,
      });
      seenProviderKeys.add(p.gatewayReference);
      continue;
    }

    const prov = candidates[0];
    seenProviderKeys.add(p.gatewayReference);
    const diff = Math.abs(roundMoney(p.amount) - roundMoney(prov.amount));
    if (diff > 0.01) {
      mismatchCount++;
      items.push({
        id: `reci_${crypto.randomBytes(4).toString('hex')}`,
        orderId: p.orderId,
        paymentId: p.id,
        cashfreeOrderId: p.gatewayReference,
        cashfreePaymentId: prov.cashfreePaymentId,
        internalAmount: roundMoney(p.amount),
        providerAmount: roundMoney(prov.amount),
        matchStatus: 'AMOUNT_MISMATCH',
        notes: `Internal ₹${p.amount} vs Cashfree ₹${prov.amount}.`,
      });
    } else if (p.status === 'PAID' && (prov.status === 'PAID' || prov.status === 'SUCCESS')) {
      matchedCount++;
      items.push({
        id: `reci_${crypto.randomBytes(4).toString('hex')}`,
        orderId: p.orderId,
        paymentId: p.id,
        cashfreeOrderId: p.gatewayReference,
        cashfreePaymentId: prov.cashfreePaymentId,
        internalAmount: roundMoney(p.amount),
        providerAmount: roundMoney(prov.amount),
        matchStatus: 'MATCHED',
        notes: 'Verified exact amount & status match.',
      });
    } else {
      mismatchCount++;
      items.push({
        id: `reci_${crypto.randomBytes(4).toString('hex')}`,
        orderId: p.orderId,
        paymentId: p.id,
        cashfreeOrderId: p.gatewayReference,
        cashfreePaymentId: prov.cashfreePaymentId,
        internalAmount: roundMoney(p.amount),
        providerAmount: roundMoney(prov.amount),
        matchStatus: prov.status === 'FAILED' ? 'FAILED' : 'PENDING',
        notes: `Status divergence: internal=${p.status}, provider=${prov.status}.`,
      });
    }
  }

  for (const [orderKey, list] of providerByOrder.entries()) {
    if (!seenProviderKeys.has(orderKey)) {
      for (const prov of list) {
        unmatchedCount++;
        items.push({
          id: `reci_${crypto.randomBytes(4).toString('hex')}`,
          cashfreeOrderId: prov.cashfreeOrderId,
          cashfreePaymentId: prov.cashfreePaymentId,
          internalAmount: 0,
          providerAmount: roundMoney(prov.amount),
          matchStatus: 'UNMATCHED_PROVIDER',
          notes: 'Present in Cashfree report without matching internal order payment.',
        });
      }
    }
  }

  const run: ReconciliationRunRecord = {
    id: `recrun_${crypto.randomBytes(5).toString('hex')}`,
    fromDate: params.fromDate,
    toDate: params.toDate,
    runBy: params.runBy,
    totalChecked: items.length,
    matchedCount,
    unmatchedCount,
    mismatchCount,
    duplicateCount,
    items,
    createdAt: new Date().toISOString(),
  };
  reconciliationRuns.unshift(run);
  return run;
}

// =============================================================================
// 6. SERVER-SIDE CSV / XLSX FINANCE & ANALYTICS EXPORTER
// =============================================================================

export interface FinanceExportAuditRecord {
  id: string;
  exportType: 'CSV' | 'XLSX';
  reportType: string;
  filters: Record<string, any>;
  requestedBy: string;
  recordCount: number;
  createdAt: string;
}

function escapeCsvCell(val: unknown): string {
  const str = val === null || val === undefined ? '' : String(val);
  // Prevent CSV spreadsheet formula injection (=, +, -, @)
  const neutralized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (/[",\n\r]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
}

export async function generateFinanceExport(params: {
  format: 'csv' | 'xlsx';
  reportType: string;
  headers: string[];
  rows: Array<Array<string | number | boolean | null | undefined>>;
  filters: Record<string, any>;
  requestedBy: string;
  actorName: string;
}): Promise<{ buffer: Buffer; contentType: string; filename: string; audit: FinanceExportAuditRecord }> {
  const safeReport = params.reportType.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const stamp = new Date().toISOString().slice(0, 10);

  let buffer: Buffer;
  let contentType: string;
  let filename: string;

  if (params.format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Prime Bazaar Finance Engine';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(safeReport.slice(0, 28) || 'Report');

    const headerRow = sheet.addRow(params.headers);
    headerRow.font = { bold: true };
    for (const row of params.rows) {
      sheet.addRow(row.map((cell) => (cell === null || cell === undefined ? '' : cell)));
    }
    sheet.columns.forEach((col) => {
      col.width = 20;
    });

    const raw = await workbook.xlsx.writeBuffer();
    buffer = Buffer.from(raw);
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    filename = `prime_bazaar_${safeReport}_${stamp}.xlsx`;
  } else {
    const lines = [
      params.headers.map(escapeCsvCell).join(','),
      ...params.rows.map((r) => r.map(escapeCsvCell).join(',')),
    ];
    buffer = Buffer.from(lines.join('\r\n'), 'utf8');
    contentType = 'text/csv; charset=utf-8';
    filename = `prime_bazaar_${safeReport}_${stamp}.csv`;
  }

  const audit: FinanceExportAuditRecord = {
    id: `exp_${crypto.randomBytes(5).toString('hex')}`,
    exportType: params.format.toUpperCase() as 'CSV' | 'XLSX',
    reportType: params.reportType,
    filters: params.filters,
    requestedBy: params.requestedBy,
    recordCount: params.rows.length,
    createdAt: new Date().toISOString(),
  };
  financeExportAudits.unshift(audit);

  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.requestedBy,
    actorName: params.actorName,
    actorRole: 'ADMIN',
    action: 'FINANCE_REPORT_EXPORTED',
    entityType: 'FINANCE_EXPORT',
    entityId: audit.id,
    afterState: { exportType: audit.exportType, reportType: audit.reportType, recordCount: audit.recordCount },
    details: `Exported ${audit.recordCount} rows of ${audit.reportType} (${audit.exportType}).`,
    legacyAuditSink: dbAuditLogs,
  });

  return { buffer, contentType, filename, audit };
}

export function maskCustomerContactForExport(params: { email?: string; phone?: string }) {
  return {
    email: maskEmailAddress(params.email),
    phone: maskPhoneNumber(params.phone),
  };
}
