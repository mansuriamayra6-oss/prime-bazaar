import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import http from 'http';
import crypto from 'crypto';
import ExcelJS from 'exceljs';

process.env.PRIMEBAZAAR_TEST_MODE = '1';
process.env.CASHFREE_WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET || 'cf_test_webhook_secret_phase4';
process.env.ADMIN_ACCESS_PASS = process.env.ADMIN_ACCESS_PASS || 'AdminPhase4TestPass!9';

const { app, orders, paymentIntents } = await import('../server');
const { computeCashfreeWebhookSignature } = await import('../src/server/security');
const {
  setCashfreeTransportForTesting,
  payments,
  refunds,
} = await import('../src/server/cashfreeAndPayments');
const {
  getLedgerSummary,
  reverseLedgerGroup,
  generateFinanceExport,
} = await import('../src/server/financeLedger');
const {
  warehouses,
  warehouseInventories,
  ensureWarehousesSeeded,
  setShippingProviderForTesting,
  setDeliveryOtpDispatcher,
  shipments,
} = await import('../src/server/warehouseAndShipping');
const { taxInvoices } = await import('../src/server/gstInvoiceService');

let server: http.Server;
let baseUrl = '';
let adminToken = '';
let customerToken = '';
let customerUserId = '';

async function requestJson(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
    rawBody?: string;
    headers?: Record<string, string>;
  } = {}
) {
  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  let bodyPayload: string | undefined;
  if (typeof options.rawBody === 'string') {
    bodyPayload = options.rawBody;
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  } else if (options.body !== undefined) {
    bodyPayload = JSON.stringify(options.body);
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: bodyPayload,
  });

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const text = buffer.toString('utf8');
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { status: res.status, headers: res.headers, json, text, buffer };
}

beforeAll(async () => {
  ensureWarehousesSeeded();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  // Authenticate Super Admin
  const adminRes = await requestJson('/api/auth/admin/login', {
    method: 'POST',
    body: {
      email: 'finance.lead@primebazaar.in',
      password: process.env.ADMIN_ACCESS_PASS,
    },
  });
  expect(adminRes.status).toBe(200);
  adminToken = adminRes.json.token;

  // Register dedicated Phase 4 customer
  const regRes = await requestJson('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Rohan Malhotra',
      email: `rohan.phase4.${Date.now()}@primebazaar.in`,
      phone: '+91 98200 11229',
      password: 'Phase4UserPass!99',
    },
  });
  expect(regRes.status).toBe(201);
  customerToken = regRes.json.token;
  customerUserId = regRes.json.user.id;
});

afterAll(async () => {
  setCashfreeTransportForTesting(null);
  setShippingProviderForTesting(null);
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('Phase 4: Server-Authoritative Pricing, Gift Cards & Store Credits', () => {
  let issuedGiftCardCode = '';
  let issuedGiftCardId = '';

  test('Authoritative quote rejects client price tampering and enforces server pricing', async () => {
    const quoteRes = await requestJson('/api/checkout/quote', {
      method: 'POST',
      token: customerToken,
      body: {
        items: [{ productId: 'prod-1', selectedSize: 'M', quantity: 1 }],
        couponCode: 'MEESHO20',
      },
    });
    expect(quoteRes.status).toBe(200);
    expect(quoteRes.json.quote.itemsSubtotal).toBe(1899);
    expect(quoteRes.json.quote.discountAmount).toBeGreaterThan(0);

    // Attempt to submit an order with spoofed totalAmount = 1 rupee
    const orderRes = await requestJson('/api/orders', {
      method: 'POST',
      token: customerToken,
      body: {
        items: [{ productId: 'prod-1', selectedSize: 'M', quantity: 1 }],
        address: {
          fullName: 'Rohan Malhotra',
          phone: '+91 98200 11229',
          street: '14 Marine Drive',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400020',
        },
        paymentMethod: 'cod',
        totalAmount: 1, // spoof attempt must be ignored
        discountAmount: 1898, // spoof attempt must be ignored
        idempotencyKey: `idem_tamper_${Date.now()}`,
      },
    });
    expect(orderRes.status).toBe(201);
    expect(orderRes.json.order.totalAmount).toBe(1899);
    expect(orderRes.json.order.paymentStatus).toBe('PENDING');

    // Replaying exact idempotencyKey returns duplicate=true without creating second order
    const replayRes = await requestJson('/api/orders', {
      method: 'POST',
      token: customerToken,
      body: {
        items: [{ productId: 'prod-1', selectedSize: 'M', quantity: 1 }],
        address: { fullName: 'Rohan Malhotra', phone: '+91 98200 11229', street: '14 Marine Drive', city: 'Mumbai', state: 'Maharashtra', pinCode: '400020' },
        paymentMethod: 'cod',
        idempotencyKey: orderRes.json.order.idempotencyKey,
      },
    });
    expect(replayRes.status).toBe(200);
    expect(replayRes.json.duplicate).toBe(true);
    expect(replayRes.json.order.id).toBe(orderRes.json.order.id);
  });

  test('Gift card returns raw code ONCE on creation, masks code in listings, blocks expired/inactive/minOrder, and prevents concurrent overspend', async () => {
    const createRes = await requestJson('/api/v1/admin/gift-cards', {
      method: 'POST',
      token: adminToken,
      body: {
        initialAmount: 1200,
        minOrderAmount: 500,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        recipientEmail: 'rohan@primebazaar.in',
        notes: 'VIP Welcome Gift',
      },
    });
    expect(createRes.status).toBe(201);
    expect(String(createRes.json.oneTimeCode).startsWith('PBGC-')).toBe(true);
    issuedGiftCardCode = createRes.json.oneTimeCode;
    issuedGiftCardId = createRes.json.giftCard.id;

    // Listing endpoint must NEVER expose plaintext gift card code
    const listRes = await requestJson('/api/v1/admin/gift-cards', { token: adminToken });
    expect(listRes.status).toBe(200);
    const listed = listRes.json.giftCards.find((g: any) => g.id === issuedGiftCardId);
    expect(listed).toBeDefined();
    expect(listed.maskedCode).toContain('••••');
    expect(listRes.text).not.toContain(issuedGiftCardCode);

    // Below minOrderAmount rejected
    const minErrRes = await requestJson('/api/v1/gift-cards/validate', {
      method: 'POST',
      token: customerToken,
      body: { code: issuedGiftCardCode, orderSubtotal: 300 },
    });
    expect(minErrRes.status).toBe(400);

    // Concurrent checkout attempts using same ₹1200 gift card on ₹1899 item:
    // Both may run concurrently, mutex ensures gift card balance never drops below 0 and total redeemed <= 1200
    const [o1, o2] = await Promise.all([
      requestJson('/api/orders', {
        method: 'POST',
        token: customerToken,
        body: {
          items: [{ productId: 'prod-1', selectedSize: 'M', quantity: 1 }],
          address: { fullName: 'Rohan', phone: '9820011229', street: 'S1', city: 'Mumbai', state: 'Maharashtra', pinCode: '400001' },
          giftCardCode: issuedGiftCardCode,
          paymentMethod: 'upi',
          idempotencyKey: `gc_race_1_${Date.now()}`,
        },
      }),
      requestJson('/api/orders', {
        method: 'POST',
        token: customerToken,
        body: {
          items: [{ productId: 'prod-1', selectedSize: 'M', quantity: 1 }],
          address: { fullName: 'Rohan', phone: '9820011229', street: 'S1', city: 'Mumbai', state: 'Maharashtra', pinCode: '400001' },
          giftCardCode: issuedGiftCardCode,
          paymentMethod: 'upi',
          idempotencyKey: `gc_race_2_${Date.now()}`,
        },
      }),
    ]);

    const totalGcRedeemed =
      Number(o1.json?.order?.giftCardAmount || 0) + Number(o2.json?.order?.giftCardAmount || 0);
    expect(totalGcRedeemed <= 1200).toBe(true);
    expect(totalGcRedeemed).toBe(1200);

    // Subsequent validation shows zero remaining balance
    const emptyVal = await requestJson('/api/v1/gift-cards/validate', {
      method: 'POST',
      token: customerToken,
      body: { code: issuedGiftCardCode, orderSubtotal: 1000 },
    });
    expect(emptyVal.status).toBe(400);

    // Deactivation flow
    const gc2 = await requestJson('/api/v1/admin/gift-cards', {
      method: 'POST',
      token: adminToken,
      body: { initialAmount: 500 },
    });
    await requestJson(`/api/v1/admin/gift-cards/${gc2.json.giftCard.id}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { isActive: false, reason: 'Suspicious bulk request' },
    });
    const inactiveVal = await requestJson('/api/v1/gift-cards/validate', {
      method: 'POST',
      token: customerToken,
      body: { code: gc2.json.oneTimeCode, orderSubtotal: 1000 },
    });
    expect(inactiveVal.status).toBe(400);
  });

  test('Store credit issuance enables 100% WALLET_ONLY checkout at 0 INR gateway payable', async () => {
    const issueSc = await requestJson('/api/v1/admin/store-credits/issue', {
      method: 'POST',
      token: adminToken,
      body: {
        userId: customerUserId,
        amount: 2500,
        reason: 'Service recovery credit',
      },
    });
    expect(issueSc.status).toBe(201);
    expect(issueSc.json.account.balance).toBe(2500);

    const walletOrder = await requestJson('/api/orders', {
      method: 'POST',
      token: customerToken,
      body: {
        items: [{ productId: 'prod-1', selectedSize: 'M', quantity: 1 }],
        address: { fullName: 'Rohan', phone: '9820011229', street: 'S1', city: 'Mumbai', state: 'Maharashtra', pinCode: '400001' },
        useStoreCredit: true,
        paymentMethod: 'cashfree',
        idempotencyKey: `sc_wallet_${Date.now()}`,
      },
    });
    expect(walletOrder.status).toBe(201);
    expect(walletOrder.json.order.paymentMethod).toBe('WALLET_ONLY');
    expect(walletOrder.json.order.finalGatewayPayable).toBe(0);
    expect(walletOrder.json.order.paymentStatus).toBe('PAID');
    expect(walletOrder.json.order.storeCreditAmount).toBe(1899);

    const scBalance = await requestJson('/api/v1/store-credits/me', { token: customerToken });
    expect(scBalance.json.account.balance).toBe(601);
  });
});

describe('Phase 4: Cashfree Payments, Webhooks, Retries & Strict Refund State Machine', () => {
  const cfMockOrders = new Map<string, any>();
  const cfMockRefunds = new Map<string, any>();

  test('Cashfree retry, HMAC webhook signature check, idempotency, partial/full refunds, and credit notes work end-to-end', async () => {
    setCashfreeTransportForTesting({
      async createOrder(payload) {
        const rec = {
          cf_order_id: `cf_${crypto.randomBytes(4).toString('hex')}`,
          order_id: payload.order_id,
          order_amount: payload.order_amount,
          order_status: 'ACTIVE',
          payment_session_id: `session_${crypto.randomBytes(6).toString('hex')}`,
        };
        cfMockOrders.set(payload.order_id, rec);
        return rec;
      },
      async getOrderStatus(orderId) {
        return cfMockOrders.get(orderId) || { order_id: orderId, order_status: 'ACTIVE', order_amount: 1899 };
      },
      async getOrderPayments() {
        return [];
      },
      async createRefund(orderId, payload) {
        const refRec = {
          cf_refund_id: `cf_rf_${crypto.randomBytes(4).toString('hex')}`,
          refund_id: payload.refund_id,
          order_id: orderId,
          refund_amount: payload.refund_amount,
          refund_status: 'PENDING', // Must NEVER auto-succeed before confirmation!
        };
        cfMockRefunds.set(payload.refund_id, refRec);
        return refRec;
      },
      async getRefundStatus(_orderId, refundId) {
        return cfMockRefunds.get(refundId) || { refund_id: refundId, refund_status: 'PENDING' };
      },
    });

    // Place pending Cashfree order
    const pendingOrderRes = await requestJson('/api/orders', {
      method: 'POST',
      token: customerToken,
      body: {
        items: [{ productId: 'prod-1', selectedSize: 'M', quantity: 1 }],
        address: { fullName: 'Rohan', phone: '9820011229', street: 'Link Rd', city: 'Bengaluru', state: 'Karnataka', pinCode: '560001' },
        paymentMethod: 'cashfree',
        idempotencyKey: `cf_ord_${Date.now()}`,
      },
    });
    expect(pendingOrderRes.status).toBe(201);
    const orderId = pendingOrderRes.json.order.id;
    expect(pendingOrderRes.json.order.paymentStatus).toBe('PENDING');

    // Retry payment
    const retryRes = await requestJson('/api/v1/payments/retry', {
      method: 'POST',
      token: customerToken,
      body: { orderId, paymentMethod: 'cashfree' },
    });
    expect(retryRes.status).toBe(201);
    const retryCfOrderId = retryRes.json.cashfree.orderId;
    expect(retryRes.json.cashfree.paymentSessionId).toContain('session_');

    // Send Cashfree PAYMENT_SUCCESS_WEBHOOK with invalid signature -> 401
    const webhookBody = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: retryCfOrderId, order_amount: 1899, order_status: 'PAID' },
        payment: { cf_payment_id: 'cfpay_9911', payment_amount: 1899, payment_status: 'SUCCESS' },
      },
    });
    const ts = String(Math.floor(Date.now() / 1000));
    const badWebhook = await requestJson('/api/payments/cashfree-webhook', {
      method: 'POST',
      rawBody: webhookBody,
      headers: {
        'x-webhook-timestamp': ts,
        'x-webhook-signature': 'invalid_hmac_sig',
      },
    });
    expect(badWebhook.status).toBe(401);

    // Valid HMAC-SHA256 webhook settles PaymentRecord & Order
    const validSig = computeCashfreeWebhookSignature(
      ts,
      webhookBody,
      process.env.CASHFREE_WEBHOOK_SECRET!
    );
    const goodWebhook = await requestJson('/api/payments/cashfree-webhook', {
      method: 'POST',
      rawBody: webhookBody,
      headers: {
        'x-webhook-timestamp': ts,
        'x-webhook-signature': validSig,
      },
    });
    expect(goodWebhook.status).toBe(200);
    expect(goodWebhook.json.duplicate).toBe(false);

    // Replaying identical webhook is idempotent
    const dupWebhook = await requestJson('/api/payments/cashfree-webhook', {
      method: 'POST',
      rawBody: webhookBody,
      headers: {
        'x-webhook-timestamp': ts,
        'x-webhook-signature': validSig,
      },
    });
    expect(dupWebhook.status).toBe(200);
    expect(dupWebhook.json.duplicate).toBe(true);

    // Also mark order itself PAID for refund gateway ref lookup consistency
    const paidOrder = orders.get(orderId)!;
    expect(paidOrder.paymentStatus).toBe('PAID');

    // Customer cannot initiate refunds (403)
    const forbiddenRefund = await requestJson(`/api/v1/orders/${orderId}/refunds`, {
      method: 'POST',
      token: customerToken,
      body: { amount: 500, refundMode: 'ORIGINAL_METHOD', reason: 'Self refund attempt' },
    });
    expect(forbiddenRefund.status).toBe(403);

    // Admin initiates partial ORIGINAL_METHOD refund -> MUST start PENDING until provider confirms!
    const partialRefundKey = `rf_partial_${Date.now()}`;
    const rfRes = await requestJson(`/api/v1/orders/${orderId}/refunds`, {
      method: 'POST',
      token: adminToken,
      body: {
        amount: 500,
        refundMode: 'ORIGINAL_METHOD',
        reason: 'Partial sleeve alteration reimbursement',
        idempotencyKey: partialRefundKey,
      },
    });
    expect(rfRes.status).toBe(201);
    expect(rfRes.json.refund.status).toBe('PENDING');
    expect(paidOrder.paymentStatus).toBe('PAID'); // Still PAID until Cashfree confirms!

    // Duplicate refund with same idempotencyKey returns existing refund (200)
    const rfDup = await requestJson(`/api/v1/orders/${orderId}/refunds`, {
      method: 'POST',
      token: adminToken,
      body: {
        amount: 500,
        refundMode: 'ORIGINAL_METHOD',
        reason: 'Retry same key',
        idempotencyKey: partialRefundKey,
      },
    });
    expect(rfDup.status).toBe(200);
    expect(rfDup.json.duplicate).toBe(true);

    // Provider settles refund -> sync updates refund to SUCCESS, order to PARTIAL_REFUND & generates Credit Note
    const rfRef = rfRes.json.refund.transactionReference;
    cfMockRefunds.get(rfRef).refund_status = 'SUCCESS';
    const syncRes = await requestJson(`/api/v1/refunds/${rfRes.json.refund.id}/sync`, {
      method: 'POST',
      token: adminToken,
    });
    expect(syncRes.status).toBe(200);
    expect(syncRes.json.refund.status).toBe('SUCCESS');
    expect(syncRes.json.orderPaymentStatus).toBe('PARTIAL_REFUND');

    // Over-refund attempt (> remaining ₹1399) must be rejected
    const overRefund = await requestJson(`/api/v1/orders/${orderId}/refunds`, {
      method: 'POST',
      token: adminToken,
      body: {
        amount: 1450,
        refundMode: 'STORE_CREDIT',
        reason: 'Exceeds refundable balance',
        idempotencyKey: `rf_over_${Date.now()}`,
      },
    });
    expect(overRefund.status).toBe(400);

    // Remaining ₹1399 refunded to Store Credit succeeds immediately -> REFUNDED + Credit Note
    const remRefund = await requestJson(`/api/v1/orders/${orderId}/refunds`, {
      method: 'POST',
      token: adminToken,
      body: {
        amount: 1399,
        refundMode: 'STORE_CREDIT',
        reason: 'Remaining balance to wallet',
        idempotencyKey: `rf_rem_${Date.now()}`,
      },
    });
    expect(remRefund.status).toBe(201);
    expect(remRefund.json.refund.status).toBe('SUCCESS');
    expect(remRefund.json.orderPaymentStatus).toBe('REFUNDED');
    expect(remRefund.json.creditNote).toBeDefined();

    // GST Invoice & Credit Note check (interstate IGST because warehouse UP -> Karnataka)
    const invRes = await requestJson(`/api/v1/orders/${orderId}/invoices`, { token: customerToken });
    expect(invRes.status).toBe(200);
    expect(invRes.json.invoices.length).toBeGreaterThan(0);
    expect(invRes.json.creditNotes.length).toBeGreaterThan(1);
    const inv = invRes.json.invoices[0];
    expect(inv.isInterState).toBe(true);
    expect(inv.igstAmount).toBeGreaterThan(0);
    expect(inv.cgstAmount).toBe(0);
    expect(Boolean(inv.items[0].hsnCode)).toBe(true);

    // HTML invoice download works
    const htmlRes = await requestJson(`/api/v1/invoices/${inv.id}/download?format=html`, {
      token: customerToken,
    });
    expect(htmlRes.status).toBe(200);
    expect(htmlRes.text).toContain('PRIME BAZAAR TAX INVOICE');
  });
});

describe('Phase 4: Multi-Warehouse Split Allocation, Transfers, Carrier 503 & Cryptographic Delivery OTP', () => {
  test('Supports multi-warehouse split allocation, inter-warehouse transfers, stock release on cancel, carrier 503 & OTP lockout/override', async () => {
    // 1. Create a secondary warehouse in Karnataka
    const whRes = await requestJson('/api/v1/warehouses', {
      method: 'POST',
      token: adminToken,
      body: {
        code: `WH-BLR-${Date.now().toString().slice(-4)}`,
        name: 'Bengaluru Whitefield Hub',
        address: 'Plot 21, Whitefield',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560066',
      },
    });
    expect(whRes.status).toBe(201);
    const blrWhId = whRes.json.warehouse.id;

    // Seed limited stock (2 units) in Bengaluru hub for a dedicated test SKU so a 3-unit order splits across warehouses
    const splitProductId = 'prod-2';
    await requestJson(`/api/v1/warehouses/${blrWhId}/inventory`, {
      method: 'PUT',
      token: adminToken,
      body: {
        variantId: splitProductId,
        productId: splitProductId,
        productTitle: 'Streetwear Cargo Jacket',
        availableQty: 2,
      },
    });

    // Inter-warehouse transfer from wh-seller-2 -> Bengaluru hub
    const xferRes = await requestJson('/api/v1/warehouses/transfers', {
      method: 'POST',
      token: adminToken,
      body: {
        fromWarehouseId: 'wh-seller-2',
        toWarehouseId: blrWhId,
        variantId: splitProductId,
        quantity: 2,
        notes: 'Rebalancing BLR safety stock',
      },
    });
    expect(xferRes.status).toBe(201);
    const completeXfer = await requestJson(`/api/v1/warehouses/transfers/${xferRes.json.transfer.id}/complete`, {
      method: 'POST',
      token: adminToken,
    });
    expect(completeXfer.status).toBe(200);
    expect(completeXfer.json.transfer.status).toBe('COMPLETED');

    const invAfterXfer = warehouseInventories.get(`${blrWhId}:${splitProductId}`);
    expect(invAfterXfer?.availableQty).toBe(4);

    // Order 6 units destined for Karnataka -> consumes 4 from BLR hub + 2 from wh-seller-2 (split warehouse plan)
    const splitOrderRes = await requestJson('/api/orders', {
      method: 'POST',
      token: customerToken,
      body: {
        items: [{ productId: splitProductId, quantity: 6 }],
        address: { fullName: 'Rohan', phone: '9820011229', street: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka', pinCode: '560038' },
        paymentMethod: 'cod',
        idempotencyKey: `split_${Date.now()}`,
      },
    });
    expect(splitOrderRes.status).toBe(201);
    expect(splitOrderRes.json.splitWarehousePlan.length).toBeGreaterThan(1);
    expect(warehouseInventories.get(`${blrWhId}:${splitProductId}`)?.availableQty).toBe(0);

    // Cancel order releases reserved stock back to BLR hub
    const cancelRes = await requestJson(`/api/orders/${splitOrderRes.json.order.id}/cancel`, {
      method: 'POST',
      token: customerToken,
      body: { reason: 'Changed address' },
    });
    expect(cancelRes.status).toBe(200);
    expect(warehouseInventories.get(`${blrWhId}:${splitProductId}`)?.availableQty).toBe(4);

    // Unconfigured carrier rejects shipment creation with 503 (never fabricates fake AWB!)
    setShippingProviderForTesting({
      name: 'UNCONFIGURED_SHIPROCKET',
      isConfigured: () => false,
      async createShipment() {
        throw new Error('Not configured');
      },
      async trackShipment() {
        throw new Error('Not configured');
      },
    });
    const noCarrierRes = await requestJson('/api/v1/shipments/create', {
      method: 'POST',
      token: adminToken,
      body: { orderId: splitOrderRes.json.order.id, warehouseId: blrWhId },
    });
    expect(noCarrierRes.status).toBe(503);

    // Configure real mock shipping transport & capture dispatched Delivery OTP
    let capturedOtp = '';
    setDeliveryOtpDispatcher(async ({ otpPlain }) => {
      capturedOtp = otpPlain;
      return { delivered: true, channel: 'EMAIL' };
    });
    setShippingProviderForTesting({
      name: 'SHIPROCKET_TEST',
      isConfigured: () => true,
      async createShipment(req) {
        return {
          providerName: 'SHIPROCKET',
          providerShipmentId: `sr_shp_${Date.now()}`,
          providerOrderId: req.suborderNumber,
          courier: 'BlueDart Air',
          trackingNumber: `AWB${Date.now().toString().slice(-8)}`,
          shippingCost: 78,
        };
      },
      async trackShipment() {
        return {
          status: 'IN_TRANSIT',
          events: [{ event: 'Arrived Hub', location: 'Bengaluru Hub', eventDate: new Date().toISOString() }],
        };
      },
    });

    // Place fresh paid order for shipment + OTP flow
    const shipOrderRes = await requestJson('/api/orders', {
      method: 'POST',
      token: customerToken,
      body: {
        items: [{ productId: 'prod-1', selectedSize: 'M', quantity: 1 }],
        address: { fullName: 'Rohan', phone: '9820011229', street: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka', pinCode: '560038' },
        paymentMethod: 'upi',
        idempotencyKey: `shp_ord_${Date.now()}`,
      },
    });
    const shipOrdId = shipOrderRes.json.order.id;

    const createShpRes = await requestJson('/api/v1/shipments/create', {
      method: 'POST',
      token: adminToken,
      body: { orderId: shipOrdId, warehouseId: 'wh-seller-1' },
    });
    expect(createShpRes.status).toBe(201);
    const shpId = createShpRes.json.shipment.id;

    // Generate Delivery OTP -> must NOT expose raw OTP in JSON response!
    const otpGenRes = await requestJson(`/api/v1/shipments/${shpId}/delivery-otp/generate`, {
      method: 'POST',
      token: adminToken,
      body: { email: 'rohan@primebazaar.in' },
    });
    expect(otpGenRes.status).toBe(201);
    expect(/^\d{6}$/.test(capturedOtp)).toBe(true);
    expect(otpGenRes.text).not.toContain(capturedOtp);

    // Wrong OTP attempt 5 times locks verification
    for (let i = 0; i < 5; i++) {
      const badOtpRes = await requestJson(`/api/v1/shipments/${shpId}/delivery-otp/verify`, {
        method: 'POST',
        token: customerToken,
        body: { otp: '000000' },
      });
      expect(badOtpRes.status).toBe(400);
    }
    const lockedAttempt = await requestJson(`/api/v1/shipments/${shpId}/delivery-otp/verify`, {
      method: 'POST',
      token: customerToken,
      body: { otp: capturedOtp },
    });
    expect(lockedAttempt.status).toBe(400);
    expect(lockedAttempt.json.error).toContain('locked');

    // Re-generate fresh OTP and verify succeeds
    await requestJson(`/api/v1/shipments/${shpId}/delivery-otp/generate`, {
      method: 'POST',
      token: adminToken,
      body: { email: 'rohan@primebazaar.in' },
    });
    const goodOtpRes = await requestJson(`/api/v1/shipments/${shpId}/delivery-otp/verify`, {
      method: 'POST',
      token: customerToken,
      body: { otp: capturedOtp },
    });
    expect(goodOtpRes.status).toBe(200);
    expect(goodOtpRes.json.verified).toBe(true);
    expect(goodOtpRes.json.shipment.status).toBe('DELIVERED');

    // Admin Delivery OTP override requires non-empty audit reason
    const shp2Res = await requestJson('/api/v1/shipments/create', {
      method: 'POST',
      token: adminToken,
      body: { orderId: shipOrdId, warehouseId: 'wh-seller-1' },
    });
    const badOverride = await requestJson(`/api/v1/shipments/${shp2Res.json.shipment.id}/delivery-otp/override`, {
      method: 'POST',
      token: adminToken,
      body: { reason: 'ok' },
    });
    expect(badOverride.status).toBe(400);
    const goodOverride = await requestJson(`/api/v1/shipments/${shp2Res.json.shipment.id}/delivery-otp/override`, {
      method: 'POST',
      token: adminToken,
      body: { reason: 'Customer phone unreachable; POD signed at security desk' },
    });
    expect(goodOverride.status).toBe(200);
    expect(goodOverride.json.shipment.status).toBe('DELIVERED');
  });
});

describe('Phase 4: Double-Entry Ledger, Cashfree Reconciliation & Secure CSV/XLSX Exports', () => {
  test('Double-entry ledger maintains Debit === Credit invariant and supports immutable reversal groups', async () => {
    const ledgerRes = await requestJson('/api/v1/admin/ledger', { token: adminToken });
    expect(ledgerRes.status).toBe(200);
    expect(ledgerRes.json.isBalanced).toBe(true);
    expect(ledgerRes.json.totalDebits).toBe(ledgerRes.json.totalCredits);

    const groupId = ledgerRes.json.entries[0].entryGroupId;
    const revRes = await requestJson('/api/v1/admin/ledger/reverse', {
      method: 'POST',
      token: adminToken,
      body: { entryGroupId: groupId, reason: 'Year-end audit adjustment' },
    });
    expect(revRes.status).toBe(201);

    // Double-reversal is rejected
    const revAgain = await requestJson('/api/v1/admin/ledger/reverse', {
      method: 'POST',
      token: adminToken,
      body: { entryGroupId: groupId, reason: 'Duplicate reversal' },
    });
    expect(revAgain.status).toBe(400);

    const afterSummary = getLedgerSummary();
    expect(afterSummary.isBalanced).toBe(true);
  });

  test('Cashfree reconciliation detects MATCHED, AMOUNT_MISMATCH, UNMATCHED_INTERNAL, UNMATCHED_PROVIDER, and DUPLICATE', async () => {
    const paidGatewayRef = Array.from(payments.values()).find((p) => p.gateway === 'CASHFREE')?.gatewayReference || 'cf_missing_ref';
    const reconRes = await requestJson('/api/v1/admin/reconciliation/run', {
      method: 'POST',
      token: adminToken,
      body: {
        providerRecords: [
          { cashfreeOrderId: paidGatewayRef, cashfreePaymentId: 'cfp_1', amount: 99999, status: 'PAID' },
          { cashfreeOrderId: 'cf_orphan_provider_1', cashfreePaymentId: 'cfp_2', amount: 1500, status: 'PAID' },
        ],
      },
    });
    expect(reconRes.status).toBe(201);
    const items = reconRes.json.run.items;
    expect(items.some((i: any) => i.matchStatus === 'AMOUNT_MISMATCH')).toBe(true);
    expect(items.some((i: any) => i.matchStatus === 'UNMATCHED_PROVIDER')).toBe(true);
  });

  test('Finance exports neutralize spreadsheet formula injection in CSV and output valid XLSX + export audit logs', async () => {
    // Unit-level CSV formula-injection neutralization check
    const formulaExport = await generateFinanceExport({
      format: 'csv',
      reportType: 'injection_check',
      headers: ['Name', 'Note'],
      rows: [
        ['=CMD|" /C calc"!A0', '+1+1'],
        ['@SUM(1+1)', '-100'],
      ],
      filters: {},
      requestedBy: 'admin-super',
      actorName: 'Auditor',
    });
    const csvStr = formulaExport.buffer.toString('utf8');
    expect(csvStr).toContain("'=CMD");
    expect(csvStr).toContain("'+1+1");
    expect(csvStr).toContain("'@SUM");
    expect(csvStr).toContain("'-100");

    // HTTP XLSX export returns valid Excel workbook
    const xlsxRes = await requestJson('/api/v1/admin/finance/export?reportType=ledger&format=xlsx', {
      token: adminToken,
    });
    expect(xlsxRes.status).toBe(200);
    expect(xlsxRes.headers.get('content-type')).toContain('spreadsheetml.sheet');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(xlsxRes.buffer as any);
    expect(wb.worksheets.length).toBeGreaterThan(0);
    expect(wb.worksheets[0].rowCount).toBeGreaterThan(1);

    // Export audit log recorded
    const auditsRes = await requestJson('/api/v1/admin/finance/export-audits', { token: adminToken });
    expect(auditsRes.status).toBe(200);
    expect(auditsRes.json.audits.length).toBeGreaterThan(0);
  });
});
