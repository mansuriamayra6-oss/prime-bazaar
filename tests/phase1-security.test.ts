import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import http from 'http';
import crypto from 'crypto';
import { spawn, type ChildProcess } from 'child_process';

// Ensure server runs in test mode without automatically binding PORT=3000 on import
process.env.PRIMEBAZAAR_TEST_MODE = '1';
process.env.CASHFREE_WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET || 'cf_test_webhook_secret_phase1';
process.env.ADMIN_ACCESS_PASS = process.env.ADMIN_ACCESS_PASS || 'AdminPhase1TestPass!9';

const { app, users, orders, paymentIntents, processedWebhookEvents } = await import('../server');
const { computeCashfreeWebhookSignature, hashPassword, verifyPassword } = await import('../src/server/security');
const { dbSellers, dbProducts } = await import('../src/server/v1Router');

let server: http.Server;
let baseUrl = '';

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

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { status: res.status, headers: res.headers, json, text };
}

beforeAll(async () => {
  await new Promise<void>(resolve => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr !== 'string') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

afterAll(async () => {
  if (server) {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

describe('Phase 1: Security Headers, Error Handling & Health', () => {
  test('GET /api/health returns 200 with security headers and no X-Powered-By or X-Frame-Options', async () => {
    const res = await requestJson('/api/health');
    expect(res.status).toBe(200);
    expect(res.json?.status).toBe('ONLINE');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('x-powered-by')).toBeNull();
    // AI Studio iframe compatibility requires not setting X-Frame-Options
    expect(res.headers.get('x-frame-options')).toBeNull();
  });

  test('Malformed JSON payload returns 400 JSON without stack trace leak', async () => {
    const res = await requestJson('/api/auth/login', {
      method: 'POST',
      rawBody: '{"emailOrPhone": "bad',
    });
    expect(res.status).toBe(400);
    expect(res.json?.success).toBe(false);
    expect(res.text).not.toContain('SyntaxError');
    expect(res.text).not.toContain('node_modules');
  });
});

describe('Phase 1: Password Hashing & Authentication Security', () => {
  const customerEmail = `phase1.customer.${Date.now()}@primebazaar.in`;
  const customerPass = 'StrongPass!2026';
  let customerToken = '';

  test('Password hashing uses scrypt with per-user salt and constant-time verification', () => {
    const h1 = hashPassword('MySecretPass123');
    const h2 = hashPassword('MySecretPass123');
    expect(h1.startsWith('scrypt$')).toBe(true);
    expect(h1).not.toBe(h2);
    expect(verifyPassword('MySecretPass123', h1)).toBe(true);
    expect(verifyPassword('WrongPass123', h1)).toBe(false);
    expect(verifyPassword('MySecretPass123', undefined)).toBe(false);
  });

  test('Customer registration hashes password, strips passwordHash from response, and prevents role escalation', async () => {
    const res = await requestJson('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Priya Sharma',
        email: customerEmail,
        phone: '+91 98111 22334',
        password: customerPass,
        role: 'SUPER_ADMIN', // attempt privilege escalation
      },
    });

    expect(res.status).toBe(201);
    expect(res.json?.success).toBe(true);
    expect(typeof res.json?.token).toBe('string');
    expect(res.json?.user?.role).toBe('CUSTOMER');
    expect(res.json?.user?.passwordHash).toBeUndefined();
    customerToken = res.json.token;

    // Verify stored hash is scrypt and never plaintext
    const stored = Array.from(users.values()).find(u => u.email === customerEmail);
    expect(stored).toBeDefined();
    expect(stored?.passwordHash?.startsWith('scrypt$')).toBe(true);
    expect(stored?.passwordHash).not.toContain(customerPass);
  });

  test('Duplicate customer registration is rejected with 409', async () => {
    const res = await requestJson('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Duplicate User',
        email: customerEmail,
        password: customerPass,
      },
    });
    expect(res.status).toBe(409);
  });

  test('Login works for valid customer and existing demo account, rejects wrong password & unknown email without fallback', async () => {
    // Valid newly registered customer
    const okRes = await requestJson('/api/auth/login', {
      method: 'POST',
      body: { emailOrPhone: customerEmail, password: customerPass },
    });
    expect(okRes.status).toBe(200);
    expect(okRes.json?.user?.email).toBe(customerEmail);
    expect(okRes.json?.user?.passwordHash).toBeUndefined();

    // Existing seeded reviewer account still works cleanly
    const demoRes = await requestJson('/api/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'mansuriamayra6@gmail.com', password: 'demoPass123' },
    });
    expect(demoRes.status).toBe(200);
    expect(demoRes.json?.user?.email).toBe('mansuriamayra6@gmail.com');

    // Wrong password for existing user -> 401
    const wrongPassRes = await requestJson('/api/auth/login', {
      method: 'POST',
      body: { emailOrPhone: customerEmail, password: 'WrongPassword!' },
    });
    expect(wrongPassRes.status).toBe(401);

    // Nonexistent user -> 401 with identical generic message (no defaultDemoUser fallback, no enumeration)
    const unknownRes = await requestJson('/api/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'nonexistent.attacker@example.com', password: 'anyPassword123' },
    });
    expect(unknownRes.status).toBe(401);
    expect(unknownRes.json?.error).toBe(wrongPassRes.json?.error);
  });

  test('Logout revokes token cleanly', async () => {
    const meBefore = await requestJson('/api/auth/me', { token: customerToken });
    expect(meBefore.status).toBe(200);

    const logoutRes = await requestJson('/api/auth/logout', {
      method: 'POST',
      token: customerToken,
    });
    expect(logoutRes.status).toBe(200);

    const meAfter = await requestJson('/api/auth/me', { token: customerToken });
    expect(meAfter.status).toBe(401);
  });
});

describe('Phase 1: Role-Based Access Control (RBAC) & Seller Ownership Isolation', () => {
  let customerToken = '';
  let adminToken = '';
  let seller1Token = '';
  let seller1Id = '';
  let seller2Token = '';
  let seller2Id = '';
  let seller2ProductId = '';

  beforeAll(async () => {
    // 1. Create customer
    const custRes = await requestJson('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Riya Customer',
        email: `riya.rbac.${Date.now()}@primebazaar.in`,
        phone: '+91 98220 00111',
        password: 'CustomerPass!1',
      },
    });
    customerToken = custRes.json.token;

    // 2. Authenticate admin via ADMIN_ACCESS_PASS
    const adminRes = await requestJson('/api/auth/admin/login', {
      method: 'POST',
      body: {
        email: 'superadmin@primebazaar.in',
        password: process.env.ADMIN_ACCESS_PASS,
      },
    });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.json.token;

    // 3. Register Seller 1 & Seller 2 via v1 seller auth
    const s1Res = await requestJson('/api/v1/auth/seller/register', {
      method: 'POST',
      body: {
        sellerName: 'Seller One',
        businessName: 'Jaipur Block Prints',
        email: `seller1.${Date.now()}@primebazaar.in`,
        phone: `+91 97111 ${Math.floor(10000 + Math.random() * 89999)}`,
        password: 'SellerOnePass!1',
      },
    });
    expect(s1Res.status).toBe(201);
    seller1Token = s1Res.json.token;
    seller1Id = s1Res.json.seller.id;

    const s2Res = await requestJson('/api/v1/auth/seller/register', {
      method: 'POST',
      body: {
        sellerName: 'Seller Two',
        businessName: 'Surat Silk Emporium',
        email: `seller2.${Date.now()}@primebazaar.in`,
        phone: `+91 97222 ${Math.floor(10000 + Math.random() * 89999)}`,
        password: 'SellerTwoPass!2',
      },
    });
    expect(s2Res.status).toBe(201);
    seller2Token = s2Res.json.token;
    seller2Id = s2Res.json.seller.id;

    // Seller 2 creates a product
    const p2Res = await requestJson('/api/v1/seller/products', {
      method: 'POST',
      token: seller2Token,
      body: {
        sellerId: seller2Id,
        name: 'Surat Pure Zari Dupatta',
        price: 1299,
        mrp: 2499,
      },
    });
    expect(p2Res.status).toBe(201);
    seller2ProductId = p2Res.json.product.id;
  });

  test('Seller password login rejects invalid credentials with 401 and does NOT fall back to seller-1', async () => {
    const badLogin = await requestJson('/api/v1/auth/seller/login', {
      method: 'POST',
      body: { emailOrPhone: 'unknown.merchant@primebazaar.in', password: 'wrong' },
    });
    expect(badLogin.status).toBe(401);

    const s1Email = dbSellers.get(seller1Id)?.email;
    const goodLogin = await requestJson('/api/v1/auth/seller/login', {
      method: 'POST',
      body: { emailOrPhone: s1Email, password: 'SellerOnePass!1' },
    });
    expect(goodLogin.status).toBe(200);
    expect(goodLogin.json?.seller?.id).toBe(seller1Id);
  });

  test('Unauthenticated requests to protected admin & seller routes return 401', async () => {
    const endpoints = [
      { method: 'GET', path: '/api/v1/admin/sellers' },
      { method: 'GET', path: '/api/v1/admin/orders' },
      { method: 'GET', path: '/api/v1/admin/reports/overview' },
      { method: 'GET', path: '/api/admin/metrics' },
      { method: 'GET', path: '/api/sellers' },
      { method: 'PATCH', path: `/api/sellers/${seller1Id}/status` },
      { method: 'POST', path: `/api/sellers/${seller1Id}/payout` },
      { method: 'GET', path: '/api/v1/seller/profile' },
      { method: 'GET', path: '/api/v1/seller/products' },
      { method: 'GET', path: '/api/v1/seller/wallet' },
    ];

    for (const ep of endpoints) {
      const res = await requestJson(ep.path, { method: ep.method });
      expect(res.status).toBe(401);
    }
  });

  test('Customers cannot access admin or seller endpoints (HTTP 403)', async () => {
    const forbiddenForCustomer = [
      { method: 'GET', path: '/api/v1/admin/sellers' },
      { method: 'POST', path: `/api/v1/admin/sellers/${seller1Id}/approve` },
      { method: 'GET', path: '/api/admin/metrics' },
      { method: 'GET', path: '/api/sellers' },
      { method: 'PATCH', path: `/api/sellers/${seller1Id}/status`, body: { status: 'active' } },
      { method: 'GET', path: '/api/v1/seller/profile' },
      { method: 'GET', path: '/api/v1/seller/orders' },
      { method: 'GET', path: '/api/v1/seller/wallet' },
    ];

    for (const ep of forbiddenForCustomer) {
      const res = await requestJson(ep.path, {
        method: ep.method,
        token: customerToken,
        body: ep.body,
      });
      expect(res.status).toBe(403);
    }
  });

  test('Sellers cannot access admin endpoints (HTTP 403)', async () => {
    const adminEndpoints = [
      { method: 'GET', path: '/api/v1/admin/sellers' },
      { method: 'POST', path: `/api/v1/admin/sellers/${seller1Id}/approve` },
      { method: 'GET', path: '/api/v1/admin/commissions' },
      { method: 'GET', path: '/api/admin/metrics' },
      { method: 'PATCH', path: `/api/sellers/${seller1Id}/status`, body: { status: 'active' } },
    ];

    for (const ep of adminEndpoints) {
      const res = await requestJson(ep.path, {
        method: ep.method,
        token: seller1Token,
        body: ep.body,
      });
      expect(res.status).toBe(403);
    }
  });

  test('Sellers cannot read or mutate another seller\'s resources (cross-seller isolation returns 403)', async () => {
    // Seller 1 accessing Seller 2 profile, wallet, products, payouts
    const profileCross = await requestJson(`/api/v1/seller/profile?sellerId=${seller2Id}`, {
      token: seller1Token,
    });
    expect(profileCross.status).toBe(403);

    const walletCross = await requestJson(`/api/v1/seller/wallet?sellerId=${seller2Id}`, {
      token: seller1Token,
    });
    expect(walletCross.status).toBe(403);

    const prodReadCross = await requestJson(`/api/v1/seller/products/${seller2ProductId}`, {
      token: seller1Token,
    });
    expect(prodReadCross.status).toBe(403);

    const prodUpdateCross = await requestJson(`/api/v1/seller/products/${seller2ProductId}`, {
      method: 'PUT',
      token: seller1Token,
      body: { price: 1 },
    });
    expect(prodUpdateCross.status).toBe(403);

    const prodDeleteCross = await requestJson(`/api/v1/seller/products/${seller2ProductId}`, {
      method: 'DELETE',
      token: seller1Token,
    });
    expect(prodDeleteCross.status).toBe(403);
    expect(dbProducts.has(seller2ProductId)).toBe(true);

    const legacyPayoutCross = await requestJson(`/api/sellers/${seller2Id}/payout`, {
      method: 'POST',
      token: seller1Token,
      body: { amount: 100 },
    });
    expect(legacyPayoutCross.status).toBe(403);

    // /api/sellers returns ONLY seller 1's own record for seller 1
    const sellerListOwn = await requestJson('/api/sellers', { token: seller1Token });
    expect(sellerListOwn.status).toBe(200);
    expect(sellerListOwn.json?.sellers?.length).toBe(1);
    expect(sellerListOwn.json?.sellers?.[0]?.id).toBe(seller1Id);

    // Seller 1 can access their OWN v1 profile & products cleanly
    const ownProfile = await requestJson('/api/v1/seller/profile', { token: seller1Token });
    expect(ownProfile.status).toBe(200);
    expect(ownProfile.json?.profile?.id).toBe(seller1Id);
  });

  test('Admins can access admin routes, approve sellers, and record real admin actor in audit logs', async () => {
    const metricsRes = await requestJson('/api/admin/metrics', { token: adminToken });
    expect(metricsRes.status).toBe(200);

    const approveRes = await requestJson(`/api/v1/admin/sellers/${seller1Id}/approve`, {
      method: 'POST',
      token: adminToken,
    });
    expect(approveRes.status).toBe(200);
    expect(approveRes.json?.seller?.approvalStatus).toBe('APPROVED');

    const logsRes = await requestJson('/api/v1/admin/audit-logs', { token: adminToken });
    expect(logsRes.status).toBe(200);
    expect(logsRes.json?.auditLogs?.[0]?.actorId).toBe('admin-super');
  });
});

describe('Phase 1: Cashfree HMAC-SHA256 Webhook Security & Idempotency', () => {
  const secret = process.env.CASHFREE_WEBHOOK_SECRET || 'cf_test_webhook_secret_phase1';
  const signPayload = (rawBody: string, timestamp: string) =>
    computeCashfreeWebhookSignature(timestamp, rawBody, secret);

  test('Rejects missing, tampered, wrong-secret, or stale (>5 min) webhook signatures with 401', async () => {
    const payload = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: 'CF-BAD-1', order_amount: 1899 },
        payment: { cf_payment_id: 'pay_bad_1', payment_status: 'SUCCESS', payment_amount: 1899 },
      },
    });
    const nowTs = String(Date.now());

    // Missing headers
    const missingRes = await requestJson('/api/payments/cashfree-webhook', {
      method: 'POST',
      rawBody: payload,
    });
    expect(missingRes.status).toBe(401);

    // Wrong signature
    const badSigRes = await requestJson('/api/payments/cashfree-webhook', {
      method: 'POST',
      rawBody: payload,
      headers: {
        'x-webhook-timestamp': nowTs,
        'x-webhook-signature': crypto.randomBytes(32).toString('base64'),
      },
    });
    expect(badSigRes.status).toBe(401);

    // Tampered body with signature computed for original body
    const validSigForOriginal = signPayload(payload, nowTs);
    const tamperedBody = payload.replace('1899', '1');
    const tamperedRes = await requestJson('/api/payments/cashfree-webhook', {
      method: 'POST',
      rawBody: tamperedBody,
      headers: {
        'x-webhook-timestamp': nowTs,
        'x-webhook-signature': validSigForOriginal,
      },
    });
    expect(tamperedRes.status).toBe(401);

    // Stale timestamp (10 minutes old -> outside 5-minute replay window)
    const staleTs = String(Date.now() - 10 * 60 * 1000);
    const staleSig = signPayload(payload, staleTs);
    const staleRes = await requestJson('/api/payments/cashfree-webhook', {
      method: 'POST',
      rawBody: payload,
      headers: {
        'x-webhook-timestamp': staleTs,
        'x-webhook-signature': staleSig,
      },
    });
    expect(staleRes.status).toBe(401);
  });

  test('Accepts valid HMAC-SHA256 signature, updates order/intent, and enforces idempotency on replay', async () => {
    const cfOrderId = `PB-CF-${Date.now()}`;
    const orderId = `ord_wh_${Date.now()}`;

    paymentIntents.set('pi_wh_1', {
      intentId: 'pi_wh_1',
      amount: 2499,
      currency: 'INR',
      status: 'CREATED',
      merchantUpi: 'primebazaar@okhdfcbank',
      upiIntentUrl: 'upi://pay',
      gatewayReference: 'ref',
      cashfreeOrderId: cfOrderId,
      createdAt: new Date().toISOString(),
    });

    orders.set(orderId, {
      id: orderId,
      orderNumber: cfOrderId,
      date: '24 Nov 2026',
      items: [],
      totalAmount: 2499,
      discountAmount: 0,
      shippingFee: 0,
      status: 'confirmed',
      paymentMethod: 'cashfree',
      paymentStatus: 'PENDING',
      invoiceNumber: 'PB-INV-WH-1',
      shippingAddress: {},
      trackingNumber: 'BD-WH-1',
      courierPartner: 'BlueDart Express',
      deliveryPartnerName: 'Partner',
      deliveryPartnerPhone: '+91 98234 11223',
      estimatedDelivery: 'Tomorrow',
      trackingCheckpoints: [],
    });

    const rawBody = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: cfOrderId, order_amount: 2499, order_status: 'PAID' },
        payment: { cf_payment_id: 'cf_pay_9911', payment_status: 'SUCCESS', payment_amount: 2499 },
      },
    });
    const ts = String(Date.now());
    const sig = signPayload(rawBody, ts);

    // First delivery
    const firstRes = await requestJson('/api/payments/cashfree-webhook', {
      method: 'POST',
      rawBody,
      headers: {
        'x-webhook-timestamp': ts,
        'x-webhook-signature': sig,
      },
    });
    expect(firstRes.status).toBe(200);
    expect(firstRes.json?.verified).toBe(true);
    expect(firstRes.json?.duplicate).toBe(false);
    expect(paymentIntents.get('pi_wh_1')?.status).toBe('SUCCESS');
    expect(orders.get(orderId)?.paymentStatus).toBe('PAID');

    // Duplicate delivery -> idempotent=true
    const dupRes = await requestJson('/api/payments/cashfree-webhook', {
      method: 'POST',
      rawBody,
      headers: {
        'x-webhook-timestamp': ts,
        'x-webhook-signature': sig,
      },
    });
    expect(dupRes.status).toBe(200);
    expect(dupRes.json?.duplicate).toBe(true);
    expect(dupRes.json?.idempotent).toBe(true);
    expect(processedWebhookEvents.has(firstRes.json.eventKey)).toBe(true);
  });

  test('Handles PAYMENT_FAILED, PAYMENT_USER_DROPPED, and REFUND_STATUS webhooks cleanly', async () => {
    const failedOrderId = `ord_fail_${Date.now()}`;
    const cfFailedOrder = `PB-CF-FAIL-${Date.now()}`;
    orders.set(failedOrderId, {
      id: failedOrderId,
      orderNumber: cfFailedOrder,
      date: '24 Nov 2026',
      items: [],
      totalAmount: 1500,
      discountAmount: 0,
      shippingFee: 0,
      status: 'confirmed',
      paymentMethod: 'cashfree',
      paymentStatus: 'PENDING',
      invoiceNumber: 'PB-INV-FAIL-1',
      shippingAddress: {},
      trackingNumber: 'BD-FAIL-1',
      courierPartner: 'BlueDart Express',
      deliveryPartnerName: 'Partner',
      deliveryPartnerPhone: '+91 98234 11223',
      estimatedDelivery: 'Tomorrow',
      trackingCheckpoints: [],
    });

    const dropBody = JSON.stringify({
      type: 'PAYMENT_USER_DROPPED_WEBHOOK',
      data: {
        order: { order_id: cfFailedOrder, order_amount: 1500 },
        payment: { cf_payment_id: 'cf_pay_drop', payment_status: 'USER_DROPPED', payment_amount: 1500 },
      },
    });
    const ts1 = String(Date.now());
    const dropRes = await requestJson('/api/payments/cashfree-webhook', {
      method: 'POST',
      rawBody: dropBody,
      headers: {
        'x-webhook-timestamp': ts1,
        'x-webhook-signature': signPayload(dropBody, ts1),
      },
    });
    expect(dropRes.status).toBe(200);
    expect(orders.get(failedOrderId)?.paymentStatus).toBe('FAILED');
    expect(orders.get(failedOrderId)?.status).toBe('cancelled');

    // Refund test on a paid order
    const refundOrderId = `ord_ref_${Date.now()}`;
    const cfRefundOrder = `PB-CF-REF-${Date.now()}`;
    orders.set(refundOrderId, {
      id: refundOrderId,
      orderNumber: cfRefundOrder,
      date: '24 Nov 2026',
      items: [],
      totalAmount: 2000,
      discountAmount: 0,
      shippingFee: 0,
      status: 'confirmed',
      paymentMethod: 'cashfree',
      paymentStatus: 'PAID',
      invoiceNumber: 'PB-INV-REF-1',
      shippingAddress: {},
      trackingNumber: 'BD-REF-1',
      courierPartner: 'BlueDart Express',
      deliveryPartnerName: 'Partner',
      deliveryPartnerPhone: '+91 98234 11223',
      estimatedDelivery: 'Tomorrow',
      trackingCheckpoints: [],
    });

    const refundBody = JSON.stringify({
      type: 'REFUND_STATUS_WEBHOOK',
      data: {
        refund: { cf_refund_id: 'cf_ref_100', order_id: cfRefundOrder, refund_status: 'SUCCESS', refund_amount: 2000 },
      },
    });
    const ts2 = String(Date.now());
    const refRes = await requestJson('/api/payments/cashfree-webhook', {
      method: 'POST',
      rawBody: refundBody,
      headers: {
        'x-webhook-timestamp': ts2,
        'x-webhook-signature': signPayload(refundBody, ts2),
      },
    });
    expect(refRes.status).toBe(200);
    expect(orders.get(refundOrderId)?.paymentStatus).toBe('REFUNDED');
  });
});

describe('Phase 1: Production Port 3010 Server Startup & Health Check', () => {
  test('Server boots on PORT=3010 with /api/health returning 200', async () => {
    let child: ChildProcess | null = null;
    try {
      child = spawn('bun', ['run', 'server.ts'], {
        env: {
          ...process.env,
          PORT: '3010',
          HOST: '127.0.0.1',
          NODE_ENV: 'production',
          PRIMEBAZAAR_TEST_MODE: '0',
        },
        stdio: 'pipe',
      });

      let healthy = false;
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 250));
        try {
          const r = await fetch('http://127.0.0.1:3010/api/health');
          if (r.ok) {
            const data: any = await r.json();
            if (data.status === 'ONLINE') {
              healthy = true;
              break;
            }
          }
        } catch {
          // still starting
        }
      }
      expect(healthy).toBe(true);
    } finally {
      if (child) {
        child.kill('SIGTERM');
      }
    }
  });
});
