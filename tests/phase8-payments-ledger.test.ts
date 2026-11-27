import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import http from 'http';
import crypto from 'crypto';

process.env.PRIMEBAZAAR_TEST_MODE = '1';
process.env.CASHFREE_WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET || 'cf_test_webhook_secret_phase8';
process.env.ADMIN_ACCESS_PASS = process.env.ADMIN_ACCESS_PASS || 'AdminPhase8TestPass!9';

const { app, orders } = await import('../server');
const { computeCashfreeWebhookSignature } = await import('../src/server/security');
const { setCashfreeTransportForTesting } = await import('../src/server/cashfreeAndPayments');
const {
  paymentSplits,
  gstTcsRecords,
  commissionInvoices,
  paymentWebhookLogs,
  sellerBankAccounts,
} = await import('../src/server/paymentFinanceEngine');
const { getLedgerSummary } = await import('../src/server/financeLedger');

let server: http.Server;
let baseUrl = '';
let adminToken = '';
let customerToken = '';
let registeredSellerId = '';
let registeredSellerToken = '';

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
  const headers: Record<string, string> = { ...(options.headers || {}) };
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;

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

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server.address() as any;
  baseUrl = `http://127.0.0.1:${addr.port}`;

  const admRes = await requestJson('/api/auth/admin/login', {
    method: 'POST',
    body: {
      email: 'finance-lead@primebazaar.in',
      password: process.env.ADMIN_ACCESS_PASS,
    },
  });
  expect(admRes.status).toBe(200);
  adminToken = admRes.data.token;

  const custRes = await requestJson('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Phase8 Buyer',
      email: `p8_buyer_${Date.now()}@example.com`,
      phone: '9876548810',
      password: 'BuyerPass123!',
    },
  });
  expect(custRes.status).toBe(201);
  customerToken = custRes.data.token;
});

afterAll(async () => {
  setCashfreeTransportForTesting(null);
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Phase 8: Seller Onboarding KYC/Bank, Payments, Splits, GST TCS, Commission Invoices & Webhooks', () => {
  let createdOrderId = '';
  let createdCfOrderId = '';
  let paidVerifyOrderId = '';

  test('1. POST /api/sellers/register registers vendor cleanly with masked bank details & pending status', async () => {
    const res = await requestJson('/api/sellers/register', {
      method: 'POST',
      body: {
        name: 'Karan Mehta',
        businessName: 'Jaipur Craft Studio',
        email: `jaipur_${Date.now()}@sellers.in`,
        phone: '+91 98290 11223',
        panNumber: 'AAECJ4421K',
        gstNumber: '08AAECJ4421K1Z5',
        bankAccount: {
          accountHolderName: 'Jaipur Craft Studio',
          accountNumber: '551122334455',
          ifscCode: 'SBIN0004421',
          bankName: 'State Bank of India',
        },
        pickupAddress: {
          street: 'MI Road Heritage Lane',
          city: 'Jaipur',
          state: 'Rajasthan',
          pinCode: '302001',
        },
      },
    });
    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(typeof res.data.token).toBe('string');
    expect(res.data.seller.status).toBe('pending_approval');
    expect(res.data.seller.bankAccount.accountNumber).toContain('••••');
    expect(res.data.seller.bankAccount.accountNumber).not.toContain('551122334455');

    registeredSellerId = res.data.seller.id;
    registeredSellerToken = res.data.token;
  });

  test('2. POST /api/sellers/kyc enforces ownership & PAN/GSTIN validation', async () => {
    const unauth = await requestJson('/api/sellers/kyc', {
      method: 'POST',
      body: { panNumber: 'AAECJ4421K' },
    });
    expect(unauth.status).toBe(401);

    const crossSeller = await requestJson('/api/sellers/kyc', {
      method: 'POST',
      token: registeredSellerToken,
      body: { sellerId: 'seller-1', panNumber: 'AAECV1234M' },
    });
    expect(crossSeller.status).toBe(403);

    const badPan = await requestJson('/api/sellers/kyc', {
      method: 'POST',
      token: registeredSellerToken,
      body: { panNumber: 'INVALID' },
    });
    expect(badPan.status).toBe(400);

    const goodKyc = await requestJson('/api/sellers/kyc', {
      method: 'POST',
      token: registeredSellerToken,
      body: {
        panNumber: 'AAECJ4421K',
        gstin: '08AAECJ4421K1Z5',
        aadhaarLast4: '7821',
        businessCategory: 'Fashion',
        panDocumentUrl: '/docs/jaipur_pan.pdf',
      },
    });
    expect(goodKyc.status).toBe(200);
    expect(goodKyc.data.kyc.kycStatus).toBe('UNDER_REVIEW');
  });

  test('3. POST /api/sellers/bank-details resets verified=false, masks account, and admin can verify', async () => {
    const res = await requestJson('/api/sellers/bank-details', {
      method: 'POST',
      token: registeredSellerToken,
      body: {
        accountHolderName: 'Jaipur Craft Studio LLP',
        accountNumber: '987654321098',
        ifscCode: 'HDFC0001099',
        bankName: 'HDFC Bank',
        accountType: 'CURRENT',
      },
    });
    expect(res.status).toBe(200);
    expect(res.data.bankAccount.isVerified).toBe(false);
    expect(res.data.bankAccount.accountNumber).toBe('•••• 1098');
    expect(sellerBankAccounts.get(registeredSellerId)?.isVerified).toBe(false);

    const customerVerifyAttempt = await requestJson(`/api/admin/sellers/${registeredSellerId}/verify-bank`, {
      method: 'POST',
      token: customerToken,
      body: { verified: true },
    });
    expect(customerVerifyAttempt.status).toBe(403);

    const adminVerify = await requestJson(`/api/admin/sellers/${registeredSellerId}/verify-bank`, {
      method: 'POST',
      token: adminToken,
      body: { verified: true, notes: 'Penny drop verified ₹1.00' },
    });
    expect(adminVerify.status).toBe(200);
    expect(adminVerify.data.bankAccount.isVerified).toBe(true);
  });

  test('4. POST /api/payments/create-order computes authoritative quote (ignores tampered price) & supports idempotency', async () => {
    let cfStatusState: 'ACTIVE' | 'PAID' = 'ACTIVE';
    let lastCreatedOrderAmount = 0;

    setCashfreeTransportForTesting({
      createOrder: async (payload) => {
        lastCreatedOrderAmount = payload.order_amount;
        return {
          cf_order_id: 9910022,
          order_id: payload.order_id,
          order_amount: payload.order_amount,
          payment_session_id: 'session_phase8_test_abc',
          order_status: 'ACTIVE',
        };
      },
      getOrderStatus: async (orderId) => ({
        cf_order_id: 9910022,
        order_id: orderId,
        order_amount: lastCreatedOrderAmount || 1899,
        order_status: cfStatusState,
      }),
      createRefund: async (orderId, payload) => ({
        cf_refund_id: `cf_rf_${Date.now()}`,
        refund_id: payload.refund_id,
        order_id: orderId,
        refund_amount: payload.refund_amount,
        refund_status: 'PENDING',
      }),
      getRefundStatus: async (orderId, refundId) => ({
        cf_refund_id: 'cf_rf_synced',
        refund_id: refundId,
        order_id: orderId,
        refund_status: 'SUCCESS',
      }),
      getOrderPayments: async () => [],
    });

    const idemKey = `idem_p8_${Date.now()}`;
    const createPayRes = await requestJson('/api/payments/create-order', {
      method: 'POST',
      token: customerToken,
      body: {
        items: [{ productId: 'prod-1', quantity: 1, price: 1 }], // attempted ₹1 price tampering
        idempotencyKey: idemKey,
        customerName: 'Phase8 Buyer',
        customerPhone: '9876548810',
      },
    });
    expect(createPayRes.status).toBe(201);
    expect(createPayRes.data.amount).toBeGreaterThan(1000); // Server price overrides tampered ₹1
    createdCfOrderId = createPayRes.data.cashfree.orderId;

    // Duplicate idempotency key returns same transaction without recreating Cashfree order
    const replayRes = await requestJson('/api/payments/create-order', {
      method: 'POST',
      token: customerToken,
      body: {
        items: [{ productId: 'prod-1', quantity: 1 }],
        idempotencyKey: idemKey,
      },
    });
    expect(replayRes.status).toBe(200);
    expect(replayRes.data.duplicate).toBe(true);
    expect(replayRes.data.paymentTransaction.id).toBe(createPayRes.data.paymentTransaction.id);

    // Server-side verify MUST fail if Cashfree order status is ACTIVE (not PAID)
    const unpaidVerify = await requestJson('/api/payments/verify', {
      method: 'POST',
      token: customerToken,
      body: {
        paymentMethod: 'cashfree',
        cashfreeOrderId: createdCfOrderId,
        amount: createPayRes.data.amount,
      },
    });
    expect(unpaidVerify.status).toBe(400);

    // Create actual checkout order in pending state, then verify via Cashfree PAID state
    const ordRes = await requestJson('/api/orders', {
      method: 'POST',
      token: customerToken,
      body: {
        items: [{ productId: 'prod-1', quantity: 1 }],
        paymentMethod: 'cashfree',
        cashfreeOrderId: createdCfOrderId,
        address: {
          fullName: 'Phase8 Buyer',
          phone: '+91 98765 48810',
          street: 'Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400050',
        },
      },
    });
    expect(ordRes.status).toBe(201);
    createdOrderId = ordRes.data.order.id;
    expect(ordRes.data.order.paymentStatus).toBe('PENDING');

    // Flip gateway status to PAID & verify tampered higher expected amount fails
    cfStatusState = 'PAID';
    const mismatchVerify = await requestJson('/api/payments/verify', {
      method: 'POST',
      token: customerToken,
      body: {
        paymentMethod: 'cashfree',
        cashfreeOrderId: createdCfOrderId,
        amount: 99999,
      },
    });
    expect(mismatchVerify.status).toBe(400);

    // Legitimate server-side verification succeeds and auto-computes splits, TCS & commission invoice
    const verifiedRes = await requestJson('/api/payments/verify', {
      method: 'POST',
      token: customerToken,
      body: {
        paymentMethod: 'cashfree',
        cashfreeOrderId: createdCfOrderId,
        orderId: createdOrderId,
      },
    });
    expect(verifiedRes.status).toBe(200);
    expect(verifiedRes.data.verified).toBe(true);
    expect(verifiedRes.data.paymentStatus).toBe('PAID');
    paidVerifyOrderId = createdOrderId;
  });

  test('5. POST /api/payments/split computes Commission + 18% GST + 1% Sec 52 TCS & prevents duplicate splits', async () => {
    const custAttempt = await requestJson('/api/payments/split', {
      method: 'POST',
      token: customerToken,
      body: { orderId: paidVerifyOrderId },
    });
    expect(custAttempt.status).toBe(403);

    const beforeInvoiceCount = commissionInvoices.length;
    const beforeTcsCount = gstTcsRecords.length;

    const splitReplay = await requestJson('/api/payments/split', {
      method: 'POST',
      token: adminToken,
      body: { orderId: paidVerifyOrderId },
    });
    expect(splitReplay.status).toBe(200);
    expect(splitReplay.data.duplicate).toBe(true);
    expect(splitReplay.data.splits.length).toBeGreaterThan(0);
    expect(commissionInvoices.length).toBe(beforeInvoiceCount);
    expect(gstTcsRecords.length).toBe(beforeTcsCount);

    const split = splitReplay.data.splits[0];
    expect(split.tcsRate).toBe(1);
    expect(split.tcsAmount).toBeGreaterThan(0);
    expect(split.commissionAmount).toBeGreaterThan(0);
    expect(split.gstOnCommission).toBeGreaterThan(0);
    expect(split.netSellerPayable).toBeGreaterThan(0);

    const ledger = getLedgerSummary();
    expect(ledger.isBalanced).toBe(true);
  });

  test('6. POST /api/webhooks/cashfree enforces HMAC-SHA256 signatures, records immutable webhook logs & prevents replay', async () => {
    const badRes = await requestJson('/api/webhooks/cashfree', {
      method: 'POST',
      rawBody: JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: 'cf_bad_1' } } }),
      headers: {
        'x-webhook-signature': 'tampered_sig',
        'x-webhook-timestamp': String(Math.floor(Date.now() / 1000)),
      },
    });
    expect(badRes.status).toBe(401);
    expect(paymentWebhookLogs.some((l) => l.processingStatus === 'REJECTED' && !l.signatureValid)).toBe(true);

    // Create a fresh order confirmed strictly via /api/webhooks/cashfree
    const cfOrderRef = `cf_wh_p8_${Date.now()}`;
    const rawOrdRes = await requestJson('/api/orders', {
      method: 'POST',
      token: customerToken,
      body: {
        items: [{ productId: 'prod-1', quantity: 1 }],
        paymentMethod: 'cashfree',
        cashfreeOrderId: cfOrderRef,
        address: {
          fullName: 'Webhook Buyer',
          phone: '+91 98765 48810',
          street: 'Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400050',
        },
      },
    });
    expect(rawOrdRes.status).toBe(201);
    const whOrderId = rawOrdRes.data.order.id;

    const payloadStr = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      event_id: `evt_${Date.now()}`,
      data: {
        order: { order_id: cfOrderRef, order_amount: rawOrdRes.data.order.totalAmount },
        payment: { cf_payment_id: `cfp_${Date.now()}`, payment_status: 'SUCCESS', payment_amount: rawOrdRes.data.order.totalAmount },
      },
    });
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = computeCashfreeWebhookSignature(ts, payloadStr, process.env.CASHFREE_WEBHOOK_SECRET!);

    const okRes = await requestJson('/api/webhooks/cashfree', {
      method: 'POST',
      rawBody: payloadStr,
      headers: {
        'x-webhook-signature': sig,
        'x-webhook-timestamp': ts,
        'x-idempotency-key': `wh_idem_${Date.now()}`,
      },
    });
    expect(okRes.status).toBe(200);
    expect(okRes.data.verified).toBe(true);
    expect(okRes.data.duplicate).toBe(false);
    expect(orders.get(whOrderId)?.paymentStatus).toBe('PAID');

    // Replay same signed payload -> duplicate: true
    const dupRes = await requestJson('/api/webhooks/cashfree', {
      method: 'POST',
      rawBody: payloadStr,
      headers: {
        'x-webhook-signature': sig,
        'x-webhook-timestamp': ts,
      },
    });
    expect(dupRes.status).toBe(200);
    expect(dupRes.data.duplicate).toBe(true);
    expect(paymentWebhookLogs.some((l) => l.processingStatus === 'PROCESSED' && l.signatureValid)).toBe(true);
  });

  test('7. POST /api/refunds/create supports partial refunds, prevents over-refund, and reverses Section 52 TCS proportionally', async () => {
    const partialAmount = 400;
    const tcsBefore = gstTcsRecords.filter((r) => r.orderId === paidVerifyOrderId).length;

    const partialRes = await requestJson('/api/refunds/create', {
      method: 'POST',
      token: adminToken,
      body: {
        orderId: paidVerifyOrderId,
        amount: partialAmount,
        refundMode: 'STORE_CREDIT',
        reason: 'Partial item adjustment',
        idempotencyKey: `rf_partial_${paidVerifyOrderId}`,
      },
    });
    expect(partialRes.status).toBe(201);
    expect(partialRes.data.refund.status).toBe('SUCCESS');
    expect(orders.get(paidVerifyOrderId)?.paymentStatus).toBe('PARTIAL_REFUND');
    expect(partialRes.data.updatedSplits[0]?.splitStatus).toBe('PARTIAL_REFUNDED');
    expect(
      gstTcsRecords.filter((r) => r.orderId === paidVerifyOrderId && r.recordType === 'REFUND_REVERSAL').length
    ).toBeGreaterThanOrEqual(1);
    expect(gstTcsRecords.filter((r) => r.orderId === paidVerifyOrderId).length).toBeGreaterThan(tcsBefore);

    // Over-refund exceeding remaining captured amount MUST be rejected
    const overRes = await requestJson('/api/refunds/create', {
      method: 'POST',
      token: adminToken,
      body: {
        orderId: paidVerifyOrderId,
        amount: 999999,
        refundMode: 'STORE_CREDIT',
        reason: 'Invalid excessive refund',
        idempotencyKey: `rf_excess_${paidVerifyOrderId}`,
      },
    });
    expect(overRes.status).toBe(400);
  });

  test('8. GET /api/sellers/settlements enforces strict seller isolation & returns wallet/masked bank', async () => {
    const crossSellerRes = await requestJson('/api/sellers/settlements?sellerId=seller-1', {
      token: registeredSellerToken,
    });
    expect(crossSellerRes.status).toBe(403);

    const ownRes = await requestJson('/api/sellers/settlements', {
      token: registeredSellerToken,
    });
    expect(ownRes.status).toBe(200);
    expect(ownRes.data.sellerId).toBe(registeredSellerId);
    expect(ownRes.data.bankAccount.accountNumber).toBe('•••• 1098');
  });

  test('9. Admin finance reports (reconciliation, GST TCS, commission, dashboard, rule update) require Admin RBAC & mask secrets', async () => {
    for (const ep of [
      '/api/admin/payment-reconciliation',
      '/api/admin/gst-tcs-report',
      '/api/admin/commission-report',
      '/api/admin/finance/dashboard',
    ]) {
      const custBlock = await requestJson(ep, { token: customerToken });
      expect(custBlock.status).toBe(403);

      const admOk = await requestJson(ep, { token: adminToken });
      expect(admOk.status).toBe(200);
      expect(admOk.data.success).toBe(true);
      const serialized = JSON.stringify(admOk.data);
      expect(serialized).not.toContain('cf_test_webhook_secret');
      expect(serialized).not.toContain('987654321098'); // raw bank account never leaked
    }

    const commUpdate = await requestJson('/api/admin/commission-rules/womens-fashion', {
      method: 'PATCH',
      token: adminToken,
      body: { commissionPercent: 14 },
    });
    expect(commUpdate.status).toBe(200);
    expect(commUpdate.data.rule.commissionPercent).toBe(14);
  });
});
