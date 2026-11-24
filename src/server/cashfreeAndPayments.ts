import crypto from 'crypto';
import { INITIAL_PRODUCTS, INITIAL_COUPONS } from '../data/mockData.ts';
import { dbProducts, dbAuditLogs } from './v1Router.ts';
import {
  ACCOUNT_CODES,
  postBalancedLedgerGroup,
  roundMoney,
  validateGiftCardForAmount,
  redeemGiftCardAtomically,
  getStoreCreditAccount,
  debitStoreCreditAtomically,
  creditStoreCredit,
} from './financeLedger.ts';
import { issueCreditNoteForInvoice, getInvoicesForOrder } from './gstInvoiceService.ts';
import { recordAuditLog } from './auditAndRbac.ts';

// =============================================================================
// SERVER-AUTHORITATIVE CHECKOUT PRICING, CASHFREE PAYMENTS & REFUNDS
// =============================================================================

export interface CashfreeTransport {
  createOrder(payload: any): Promise<any>;
  getOrderStatus(orderId: string): Promise<any>;
  getOrderPayments(orderId: string): Promise<any[]>;
  createRefund(orderId: string, payload: any): Promise<any>;
  getRefundStatus(orderId: string, refundId: string): Promise<any>;
}

export function getCashfreeRuntimeConfig() {
  const rawEnv = (process.env.CASHFREE_ENV || 'sandbox').trim().toLowerCase();
  const env: 'sandbox' | 'production' =
    rawEnv === 'production' || rawEnv === 'prod' || rawEnv === 'live' ? 'production' : 'sandbox';
  const clientId = (process.env.CASHFREE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.CASHFREE_CLIENT_SECRET || '').trim();
  const apiVersion = (process.env.CASHFREE_API_VERSION || '2025-01-01').trim();
  const webhookSecret = (process.env.CASHFREE_WEBHOOK_SECRET || '').trim();
  const baseUrl = env === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
  return {
    env,
    clientId,
    clientSecret,
    apiVersion,
    webhookSecret,
    baseUrl,
    configured: Boolean(clientId && clientSecret),
  };
}

const httpCashfreeTransport: CashfreeTransport = {
  async createOrder(payload) {
    const cfg = getCashfreeRuntimeConfig();
    if (!cfg.configured) throw new Error('Cashfree credentials not configured.');
    const resp = await fetch(`${cfg.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'x-client-id': cfg.clientId,
        'x-client-secret': cfg.clientSecret,
        'x-api-version': cfg.apiVersion,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.message || `Cashfree error ${resp.status}`);
    return data;
  },
  async getOrderStatus(orderId) {
    const cfg = getCashfreeRuntimeConfig();
    if (!cfg.configured) throw new Error('Cashfree credentials not configured.');
    const resp = await fetch(`${cfg.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
      headers: {
        'x-client-id': cfg.clientId,
        'x-client-secret': cfg.clientSecret,
        'x-api-version': cfg.apiVersion,
        Accept: 'application/json',
      },
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.message || `Cashfree status error ${resp.status}`);
    return data;
  },
  async getOrderPayments(orderId) {
    const cfg = getCashfreeRuntimeConfig();
    if (!cfg.configured) throw new Error('Cashfree credentials not configured.');
    const resp = await fetch(`${cfg.baseUrl}/orders/${encodeURIComponent(orderId)}/payments`, {
      headers: {
        'x-client-id': cfg.clientId,
        'x-client-secret': cfg.clientSecret,
        'x-api-version': cfg.apiVersion,
        Accept: 'application/json',
      },
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.message || `Cashfree payments lookup error ${resp.status}`);
    return Array.isArray(data) ? data : [];
  },
  async createRefund(orderId, payload) {
    const cfg = getCashfreeRuntimeConfig();
    if (!cfg.configured) throw new Error('Cashfree credentials not configured.');
    const resp = await fetch(`${cfg.baseUrl}/orders/${encodeURIComponent(orderId)}/refunds`, {
      method: 'POST',
      headers: {
        'x-client-id': cfg.clientId,
        'x-client-secret': cfg.clientSecret,
        'x-api-version': cfg.apiVersion,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.message || `Cashfree refund error ${resp.status}`);
    return data;
  },
  async getRefundStatus(orderId, refundId) {
    const cfg = getCashfreeRuntimeConfig();
    if (!cfg.configured) throw new Error('Cashfree credentials not configured.');
    const resp = await fetch(
      `${cfg.baseUrl}/orders/${encodeURIComponent(orderId)}/refunds/${encodeURIComponent(refundId)}`,
      {
        headers: {
          'x-client-id': cfg.clientId,
          'x-client-secret': cfg.clientSecret,
          'x-api-version': cfg.apiVersion,
          Accept: 'application/json',
        },
      }
    );
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.message || `Cashfree refund status error ${resp.status}`);
    return data;
  },
};

let testCashfreeTransport: CashfreeTransport | null = null;
export function setCashfreeTransportForTesting(transport: CashfreeTransport | null) {
  testCashfreeTransport = transport;
}
export function getCashfreeTransport(): CashfreeTransport {
  return testCashfreeTransport || httpCashfreeTransport;
}

// =============================================================================
// CATALOG SERVER PRICE LOOKUP & AUTHORITATIVE CHECKOUT QUOTE
// =============================================================================

export interface CheckoutItemRequest {
  productId?: string;
  variantId?: string;
  selectedSize?: string;
  selectedColor?: string;
  quantity: number;
  product?: { id?: string };
}

export interface PricedCheckoutItem {
  productId: string;
  variantId: string;
  sku: string;
  title: string;
  brand: string;
  category: string;
  sellerId: string;
  sellerName: string;
  image: string;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  lineSubtotal: number;
  lineDiscount: number;
  lineTotal: number;
}

export function resolveAuthoritativeCatalogItem(reqItem: CheckoutItemRequest): {
  productId: string;
  variantId: string;
  sku: string;
  title: string;
  brand: string;
  category: string;
  sellerId: string;
  sellerName: string;
  image: string;
  unitPrice: number;
  gstRate: number;
} {
  const productId = String(reqItem.productId || reqItem.product?.id || '').trim();
  if (!productId) throw new Error('Each cart item must include a valid productId.');

  const dbProd = dbProducts.get(productId);
  if (dbProd) {
    const matchedVariant =
      (reqItem.variantId && dbProd.variants.find((v) => v.id === reqItem.variantId)) ||
      (reqItem.selectedSize && dbProd.variants.find((v) => v.size === reqItem.selectedSize)) ||
      dbProd.variants[0];
    return {
      productId: dbProd.id,
      variantId: matchedVariant?.id || dbProd.id,
      sku: matchedVariant?.sku || dbProd.id.toUpperCase(),
      title: dbProd.name,
      brand: dbProd.brandName,
      category: dbProd.categoryId.replace(/^cat-/, ''),
      sellerId: dbProd.sellerId,
      sellerName: dbProd.sellerName,
      image: dbProd.images?.[0] || '',
      unitPrice: roundMoney(matchedVariant?.price || 999),
      gstRate: Number(dbProd.taxGstPercent || 12),
    };
  }

  const catalogProd = INITIAL_PRODUCTS.find((p) => p.id === productId);
  if (!catalogProd) {
    throw new Error(`Product ${productId} not found in catalog.`);
  }

  return {
    productId: catalogProd.id,
    variantId: reqItem.variantId || catalogProd.id,
    sku: catalogProd.sku || catalogProd.id.toUpperCase(),
    title: catalogProd.title,
    brand: catalogProd.brand,
    category: catalogProd.category,
    sellerId: catalogProd.sellerId,
    sellerName: catalogProd.sellerName,
    image: catalogProd.images?.[0] || '',
    unitPrice: roundMoney(catalogProd.price),
    gstRate: Number(catalogProd.gstRate || 12),
  };
}

export function calculateAuthoritativeQuote(params: {
  items: CheckoutItemRequest[];
  couponCode?: string;
  giftCardCode?: string;
  useStoreCredit?: boolean;
  requestedStoreCreditAmount?: number;
  userId?: string;
  coinsUsed?: number;
}) {
  if (!Array.isArray(params.items) || params.items.length === 0) {
    throw new Error('Cart must contain at least one item.');
  }

  const pricedItems: PricedCheckoutItem[] = [];
  let itemsSubtotal = 0;

  for (const raw of params.items) {
    const qty = Math.floor(Number(raw.quantity || 1));
    if (!Number.isFinite(qty) || qty <= 0 || qty > 50) {
      throw new Error('Item quantity must be between 1 and 50.');
    }
    const resolved = resolveAuthoritativeCatalogItem(raw);
    const lineSubtotal = roundMoney(resolved.unitPrice * qty);
    itemsSubtotal = roundMoney(itemsSubtotal + lineSubtotal);

    pricedItems.push({
      ...resolved,
      selectedSize: raw.selectedSize || 'Standard',
      selectedColor: raw.selectedColor || 'Default',
      quantity: qty,
      lineSubtotal,
      lineDiscount: 0,
      lineTotal: lineSubtotal,
    });
  }

  // Authoritative Coupon Evaluation
  let couponDiscount = 0;
  let appliedCouponCode: string | null = null;
  if (params.couponCode && params.couponCode.trim()) {
    const cleanCode = params.couponCode.trim().toUpperCase();
    const coupon = INITIAL_COUPONS.find((c) => c.code.toUpperCase() === cleanCode);
    if (!coupon) {
      throw new Error(`Coupon code ${cleanCode} is invalid.`);
    }
    if (itemsSubtotal < coupon.minOrderAmount) {
      throw new Error(`Coupon ${cleanCode} requires minimum order of ₹${coupon.minOrderAmount}.`);
    }
    if (coupon.discountType === 'flat') {
      couponDiscount = Math.min(itemsSubtotal, coupon.discountValue);
    } else {
      couponDiscount = Math.min(600, roundMoney((itemsSubtotal * coupon.discountValue) / 100));
    }
    appliedCouponCode = cleanCode;
  }

  // Loyalty Coins (1 coin = ₹1, capped at 10% of order)
  const coinDiscount = Math.min(
    Math.max(0, Math.floor(Number(params.coinsUsed || 0))),
    Math.floor(itemsSubtotal * 0.1)
  );
  const totalDiscount = roundMoney(Math.min(itemsSubtotal, couponDiscount + coinDiscount));

  // Distribute discount proportionally across items
  if (totalDiscount > 0 && itemsSubtotal > 0) {
    let allocated = 0;
    pricedItems.forEach((it, idx) => {
      const share =
        idx === pricedItems.length - 1
          ? roundMoney(totalDiscount - allocated)
          : roundMoney((it.lineSubtotal / itemsSubtotal) * totalDiscount);
      allocated = roundMoney(allocated + share);
      it.lineDiscount = share;
      it.lineTotal = roundMoney(Math.max(0, it.lineSubtotal - share));
    });
  }

  const netMerchandise = roundMoney(itemsSubtotal - totalDiscount);
  const deliveryFee = netMerchandise >= 999 ? 0 : 49;
  const grossPayableBeforeWallet = roundMoney(netMerchandise + deliveryFee);

  // Extract GST summary
  let taxAmount = 0;
  for (const it of pricedItems) {
    const taxable = roundMoney(it.lineTotal / (1 + it.gstRate / 100));
    taxAmount = roundMoney(taxAmount + roundMoney(it.lineTotal - taxable));
  }

  // Validate Gift Card (optional)
  let giftCardAmount = 0;
  let giftCardPreview: ReturnType<typeof validateGiftCardForAmount> | null = null;
  if (params.giftCardCode && params.giftCardCode.trim()) {
    giftCardPreview = validateGiftCardForAmount({
      code: params.giftCardCode.trim(),
      orderSubtotal: grossPayableBeforeWallet,
      rateLimitKey: params.userId || 'anon',
    });
    giftCardAmount = Math.min(giftCardPreview.applicableAmount, grossPayableBeforeWallet);
  }

  // Validate Store Credit (optional)
  let storeCreditAmount = 0;
  const remainingAfterGc = roundMoney(grossPayableBeforeWallet - giftCardAmount);
  if (params.useStoreCredit && params.userId && remainingAfterGc > 0) {
    const { account } = getStoreCreditAccount(params.userId);
    const maxRequested =
      typeof params.requestedStoreCreditAmount === 'number'
        ? Math.min(account.balance, params.requestedStoreCreditAmount)
        : account.balance;
    storeCreditAmount = roundMoney(Math.min(Math.max(0, maxRequested), remainingAfterGc));
  }

  const finalGatewayPayable = roundMoney(Math.max(0, grossPayableBeforeWallet - giftCardAmount - storeCreditAmount));

  return {
    items: pricedItems,
    itemsSubtotal,
    couponCode: appliedCouponCode,
    couponDiscount,
    coinDiscount,
    discountAmount: totalDiscount,
    deliveryFee,
    taxAmount,
    grossPayableBeforeWallet,
    giftCardAmount,
    giftCardPreview,
    storeCreditAmount,
    finalGatewayPayable,
  };
}

// =============================================================================
// PAYMENT RECORDS, RETRIES, REFUNDS & IDEMPOTENCY
// =============================================================================

export interface PaymentRecord {
  id: string;
  orderId: string;
  idempotencyKey?: string;
  gateway: 'CASHFREE' | 'WALLET_ONLY' | 'COD';
  gatewayReference: string;
  cfPaymentId?: string;
  paymentSessionId?: string;
  paymentMethod: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'PARTIAL_REFUND' | 'REFUNDED';
  rawProviderStatus?: string;
  attemptNumber: number;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundRecord {
  id: string;
  orderId: string;
  orderItemId?: string;
  returnId?: string;
  paymentId?: string;
  idempotencyKey: string;
  amount: number;
  refundMode: 'ORIGINAL_METHOD' | 'STORE_CREDIT';
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  reason: string;
  transactionReference: string;
  providerStatus?: string;
  providerPayload?: any;
  processedBy: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const payments = new Map<string, PaymentRecord>();
export const refunds = new Map<string, RefundRecord>();
export const orderIdempotencyMap = new Map<string, string>(); // idempotencyKey -> orderId
const refundLocks = new Map<string, Promise<void>>();

async function withRefundLock<T>(orderId: string, fn: () => Promise<T>): Promise<T> {
  const prev = refundLocks.get(orderId) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((r) => {
    release = r;
  });
  const chained = prev.then(() => current);
  refundLocks.set(orderId, chained);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (refundLocks.get(orderId) === chained) refundLocks.delete(orderId);
  }
}

export function getCapturedPaidAmountForOrder(orderId: string): number {
  let paid = 0;
  for (const p of payments.values()) {
    if (p.orderId === orderId && (p.status === 'PAID' || p.status === 'PARTIAL_REFUND' || p.status === 'REFUNDED')) {
      paid = roundMoney(paid + p.amount);
    }
  }
  return paid;
}

export function getCommittedRefundTotalForOrder(orderId: string): number {
  let total = 0;
  for (const r of refunds.values()) {
    if (r.orderId === orderId && (r.status === 'SUCCESS' || r.status === 'PENDING')) {
      total = roundMoney(total + r.amount);
    }
  }
  return total;
}

export async function initiateOrderRefund(params: {
  orderId: string;
  orderUserId: string;
  orderFinalPaidAmount: number;
  orderTotalWithWallets: number;
  paymentMethod: string;
  amount: number;
  refundMode: 'ORIGINAL_METHOD' | 'STORE_CREDIT';
  reason: string;
  idempotencyKey: string;
  orderItemId?: string;
  returnId?: string;
  actorId: string;
  actorName: string;
  onOrderRefundStateChange?: (newPaymentStatus: 'PARTIAL_REFUND' | 'REFUNDED', totalRefunded: number) => void;
}): Promise<{ refund: RefundRecord; duplicate: boolean; creditNote?: any }> {
  const cleanKey = params.idempotencyKey.trim();
  if (!cleanKey) {
    throw new Error('Refund idempotencyKey is required.');
  }

  return withRefundLock(params.orderId, async () => {
    for (const existing of refunds.values()) {
      if (existing.idempotencyKey === cleanKey) {
        return { refund: existing, duplicate: true };
      }
    }

    const reqAmount = roundMoney(params.amount);
    if (!Number.isFinite(reqAmount) || reqAmount <= 0) {
      throw new Error('Refund amount must be positive.');
    }

    const capturedGatewayPaid = getCapturedPaidAmountForOrder(params.orderId);
    const maxAllowedTotal = Math.max(capturedGatewayPaid, roundMoney(params.orderFinalPaidAmount));
    const maxCapForMode =
      params.refundMode === 'STORE_CREDIT'
        ? Math.max(maxAllowedTotal, roundMoney(params.orderTotalWithWallets))
        : maxAllowedTotal;

    if (maxCapForMode <= 0) {
      throw new Error('Cannot refund an order that has no captured or wallet payment.');
    }

    const alreadyCommitted = getCommittedRefundTotalForOrder(params.orderId);
    if (roundMoney(alreadyCommitted + reqAmount) > roundMoney(maxCapForMode + 0.01)) {
      throw new Error(
        `Refund amount ₹${reqAmount} exceeds remaining refundable balance ₹${roundMoney(maxCapForMode - alreadyCommitted)}.`
      );
    }

    const paidPayment = Array.from(payments.values()).find(
      (p) => p.orderId === params.orderId && (p.status === 'PAID' || p.status === 'PARTIAL_REFUND')
    );

    const txnRef = `rf_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();

    const refund: RefundRecord = {
      id: `ref_${crypto.randomBytes(5).toString('hex')}`,
      orderId: params.orderId,
      orderItemId: params.orderItemId,
      returnId: params.returnId,
      paymentId: paidPayment?.id,
      idempotencyKey: cleanKey,
      amount: reqAmount,
      refundMode: params.refundMode,
      status: 'PENDING',
      reason: params.reason.trim() || 'Customer refund request',
      transactionReference: txnRef,
      processedBy: params.actorId,
      createdAt: now,
      updatedAt: now,
    };

    refunds.set(refund.id, refund);

    // 1. Refund to Store Credit (atomic immediate credit, does not depend on Cashfree gateway)
    if (params.refundMode === 'STORE_CREDIT') {
      await creditStoreCredit({
        userId: params.orderUserId,
        amount: reqAmount,
        type: 'CREDIT_REFUND',
        reason: `Refund to Store Credit for order ${params.orderId}: ${refund.reason}`,
        actorId: params.actorId,
        actorName: params.actorName,
        orderId: params.orderId,
        refundId: refund.id,
      });

      refund.status = 'SUCCESS';
      refund.providerStatus = 'STORE_CREDIT_CREDITED';
      refund.processedAt = new Date().toISOString();
      refund.updatedAt = refund.processedAt;

      const totalAfter = getCommittedRefundTotalForOrder(params.orderId);
      const isFull = totalAfter >= roundMoney(maxCapForMode - 0.01);
      params.onOrderRefundStateChange?.(isFull ? 'REFUNDED' : 'PARTIAL_REFUND', totalAfter);

      const { invoices } = getInvoicesForOrder(params.orderId);
      let creditNote: any = null;
      if (invoices.length > 0) {
        creditNote = issueCreditNoteForInvoice({
          invoiceId: invoices[0].id,
          refundId: refund.id,
          refundAmount: reqAmount,
          reason: refund.reason,
          issuedBy: params.actorId,
          actorName: params.actorName,
        });
      }

      return { refund, duplicate: false, creditNote };
    }

    // 2. Original Method Gateway Refund (MUST NEVER mark SUCCESS before Cashfree / webhook confirms!)
    if (!paidPayment || paidPayment.gateway !== 'CASHFREE') {
      throw new Error('Cashfree payment reference missing for original payment method refund.');
    }

    const transport = getCashfreeTransport();
    const cfResp = await transport.createRefund(paidPayment.gatewayReference, {
      refund_amount: reqAmount,
      refund_id: txnRef,
      refund_note: refund.reason,
    });

    refund.providerPayload = cfResp;
    refund.providerStatus = String(cfResp?.refund_status || 'PENDING').toUpperCase();
    refund.updatedAt = new Date().toISOString();

    // Only mark SUCCESS if provider synchronously returned terminal SUCCESS; otherwise keep PENDING for webhook/sync!
    if (refund.providerStatus === 'SUCCESS') {
      finalizeRefundSuccess({
        refund,
        maxCapForMode,
        actorId: params.actorId,
        actorName: params.actorName,
        onOrderRefundStateChange: params.onOrderRefundStateChange,
      });
    } else if (refund.providerStatus === 'FAILED' || refund.providerStatus === 'CANCELLED') {
      refund.status = refund.providerStatus === 'CANCELLED' ? 'CANCELLED' : 'FAILED';
    }

    recordAuditLog({
      actorType: 'ADMIN',
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: 'ADMIN',
      action: 'REFUND_INITIATED',
      entityType: 'REFUND',
      entityId: refund.id,
      afterState: { amount: reqAmount, status: refund.status, providerStatus: refund.providerStatus, mode: refund.refundMode },
      reason: refund.reason,
      details: `Initiated ₹${reqAmount} refund (${refund.refundMode}) on order ${params.orderId}. Status: ${refund.status}.`,
      legacyAuditSink: dbAuditLogs,
    });

    return { refund, duplicate: false };
  });
}

export function finalizeRefundSuccess(params: {
  refund: RefundRecord;
  maxCapForMode: number;
  actorId: string;
  actorName: string;
  onOrderRefundStateChange?: (newPaymentStatus: 'PARTIAL_REFUND' | 'REFUNDED', totalRefunded: number) => void;
}) {
  const { refund } = params;
  if (refund.status === 'SUCCESS') return null;

  refund.status = 'SUCCESS';
  refund.providerStatus = 'SUCCESS';
  refund.processedAt = new Date().toISOString();
  refund.updatedAt = refund.processedAt;

  postBalancedLedgerGroup({
    referenceNumber: `REFUND:${refund.transactionReference}`,
    description: `Gateway refund confirmed (${refund.transactionReference})`,
    createdBy: params.actorId,
    orderId: refund.orderId,
    paymentId: refund.paymentId,
    refundId: refund.id,
    lines: [
      { accountCode: ACCOUNT_CODES.SELLER_PAYABLE, entryType: 'DEBIT', amount: refund.amount },
      { accountCode: ACCOUNT_CODES.PLATFORM_ESCROW_CASH, entryType: 'CREDIT', amount: refund.amount },
    ],
  });

  const totalAfter = getCommittedRefundTotalForOrder(refund.orderId);
  const isFull = totalAfter >= roundMoney(params.maxCapForMode - 0.01);
  params.onOrderRefundStateChange?.(isFull ? 'REFUNDED' : 'PARTIAL_REFUND', totalAfter);

  const { invoices } = getInvoicesForOrder(refund.orderId);
  if (invoices.length > 0) {
    try {
      return issueCreditNoteForInvoice({
        invoiceId: invoices[0].id,
        refundId: refund.id,
        refundAmount: refund.amount,
        reason: refund.reason,
        issuedBy: params.actorId,
        actorName: params.actorName,
      });
    } catch {
      return null;
    }
  }
  return null;
}

export async function syncRefundStatusFromProvider(params: {
  refundId: string;
  maxCapForMode: number;
  actorId: string;
  actorName: string;
  onOrderRefundStateChange?: (newPaymentStatus: 'PARTIAL_REFUND' | 'REFUNDED', totalRefunded: number) => void;
}) {
  const refund = refunds.get(params.refundId);
  if (!refund) throw new Error('Refund record not found.');
  if (refund.refundMode !== 'ORIGINAL_METHOD') return refund;

  const payment = refund.paymentId ? payments.get(refund.paymentId) : undefined;
  if (!payment) throw new Error('Associated payment record not found.');

  const transport = getCashfreeTransport();
  const statusData = await transport.getRefundStatus(payment.gatewayReference, refund.transactionReference);
  refund.providerPayload = statusData;
  const provStatus = String(statusData?.refund_status || 'PENDING').toUpperCase();
  refund.providerStatus = provStatus;
  refund.updatedAt = new Date().toISOString();

  if (provStatus === 'SUCCESS') {
    finalizeRefundSuccess({
      refund,
      maxCapForMode: params.maxCapForMode,
      actorId: params.actorId,
      actorName: params.actorName,
      onOrderRefundStateChange: params.onOrderRefundStateChange,
    });
  } else if (provStatus === 'FAILED' || provStatus === 'CANCELLED') {
    refund.status = provStatus === 'CANCELLED' ? 'CANCELLED' : 'FAILED';
  }

  return refund;
}

export function applyWebhookRefundUpdate(params: {
  refundReference: string;
  orderId?: string;
  refundStatus: string;
  payload: any;
  maxCapForMode: number;
  onOrderRefundStateChange?: (newPaymentStatus: 'PARTIAL_REFUND' | 'REFUNDED', totalRefunded: number) => void;
}): RefundRecord | null {
  let target: RefundRecord | undefined;
  for (const r of refunds.values()) {
    if (
      r.transactionReference === params.refundReference ||
      (params.orderId && r.orderId === params.orderId && r.status === 'PENDING')
    ) {
      target = r;
      break;
    }
  }
  if (!target) return null;

  const norm = params.refundStatus.toUpperCase();
  target.providerStatus = norm;
  target.providerPayload = params.payload;
  target.updatedAt = new Date().toISOString();

  if (norm === 'SUCCESS') {
    finalizeRefundSuccess({
      refund: target,
      maxCapForMode: params.maxCapForMode,
      actorId: 'cashfree-webhook',
      actorName: 'Cashfree Webhook',
      onOrderRefundStateChange: params.onOrderRefundStateChange,
    });
  } else if (norm === 'FAILED' || norm === 'CANCELLED') {
    target.status = norm === 'CANCELLED' ? 'CANCELLED' : 'FAILED';
  }
  return target;
}

// Helper for checkout payment consumption of Gift Card + Store Credit
export async function applyWalletsToOrder(params: {
  orderId: string;
  userId: string;
  giftCardCode?: string;
  giftCardAmount: number;
  storeCreditAmount: number;
}) {
  let gcRedeemed = 0;
  let scRedeemed = 0;

  if (params.giftCardCode && params.giftCardAmount > 0) {
    const res = await redeemGiftCardAtomically({
      code: params.giftCardCode,
      requestedAmount: params.giftCardAmount,
      orderSubtotal: params.giftCardAmount,
      orderId: params.orderId,
      actorId: params.userId,
    });
    gcRedeemed = res.redeemedAmount;
  }

  if (params.storeCreditAmount > 0) {
    const res = await debitStoreCreditAtomically({
      userId: params.userId,
      requestedAmount: params.storeCreditAmount,
      orderId: params.orderId,
      actorId: params.userId,
    });
    scRedeemed = res.debitedAmount;
  }

  return { gcRedeemed, scRedeemed };
}
