import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import http from 'http';

process.env.PRIMEBAZAAR_TEST_MODE = '1';
process.env.CASHFREE_WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET || 'cf_test_webhook_secret_phase6g';
process.env.ADMIN_ACCESS_PASS = process.env.ADMIN_ACCESS_PASS || 'AdminPhase6ExpTest!9';

const { app } = await import('../server');
const { createSession } = await import('../src/server/security');
const { ensureWarehousesSeeded } = await import('../src/server/warehouseAndShipping');

let server: http.Server;
let baseUrl = '';
let superAdminToken = '';
let seller1Token = '';
let seller2Token = '';
let referrerToken = '';
let refereeToken = '';

async function requestJson(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
  } = {}
) {
  const headers: Record<string, string> = {};
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
  let bodyPayload: string | undefined;
  if (options.body !== undefined) {
    bodyPayload = JSON.stringify(options.body);
    headers['Content-Type'] = 'application/json';
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
  ensureWarehousesSeeded();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  const adminRes = await requestJson('/api/auth/admin/login', {
    method: 'POST',
    body: {
      email: 'super@primebazaar.in',
      password: process.env.ADMIN_ACCESS_PASS,
    },
  });
  expect(adminRes.status).toBe(200);
  superAdminToken = adminRes.json.token;

  seller1Token = createSession({
    userId: 'usr_seller_1',
    role: 'SELLER',
    sellerId: 'seller-1',
    email: 'tripathi.devendra@weaverscraft.in',
    name: 'Varanasi Weavers Co.',
  }).token;

  seller2Token = createSession({
    userId: 'usr_seller_2',
    role: 'SELLER',
    sellerId: 'seller-2',
    email: 'studio@mumbaistreet.in',
    name: 'Mumbai Street Studio',
  }).token;

  const r1 = await requestJson('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Loyalty Referrer',
      email: `referrer.${Date.now()}@primebazaar.in`,
      phone: '+91 98101 88001',
      password: 'Phase6Loyalty!1',
    },
  });
  expect(r1.status).toBe(201);
  referrerToken = r1.json.token;

  const r2 = await requestJson('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Loyalty Referee',
      email: `referee.${Date.now()}@primebazaar.in`,
      phone: '+91 98101 88002',
      password: 'Phase6Loyalty!2',
    },
  });
  expect(r2.status).toBe(201);
  refereeToken = r2.json.token;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Phase 6D–6G: Loyalty, Discovery, International, B2B, Subscriptions & Digital Downloads', () => {
  test('Loyalty check-in idempotency, daily spin/scratch caps, referral completion on order, personalization opt-out & expiry sweep', async () => {
    const referrerSummary = await requestJson('/api/loyalty/me', { token: referrerToken });
    expect(referrerSummary.status).toBe(200);
    const referrerCode = referrerSummary.json.account.referralCode;
    const initialReferrerCoins = referrerSummary.json.account.coinsBalance;

    // Daily check-in (1st claim awards coins, 2nd claim is idempotent)
    const checkIn1 = await requestJson('/api/loyalty/check-in', {
      method: 'POST',
      token: refereeToken,
    });
    expect(checkIn1.status).toBe(200);
    expect(checkIn1.json.alreadyClaimed).toBe(false);
    expect(checkIn1.json.awardedCoins).toBeGreaterThan(0);

    const checkIn2 = await requestJson('/api/loyalty/check-in', {
      method: 'POST',
      token: refereeToken,
    });
    expect(checkIn2.status).toBe(200);
    expect(checkIn2.json.alreadyClaimed).toBe(true);
    expect(checkIn2.json.awardedCoins).toBe(0);

    // Scratch card daily cap
    const scratch1 = await requestJson('/api/loyalty/scratch', {
      method: 'POST',
      token: refereeToken,
    });
    expect(scratch1.status).toBe(200);
    expect(scratch1.json.alreadyClaimed).toBe(false);
    const scratch2 = await requestJson('/api/loyalty/scratch', {
      method: 'POST',
      token: refereeToken,
    });
    expect(scratch2.status).toBe(200);
    expect(scratch2.json.alreadyClaimed).toBe(true);

    // Spin wheel 3/day cap
    for (let i = 0; i < 3; i++) {
      const sp = await requestJson('/api/loyalty/spin', { method: 'POST', token: refereeToken });
      expect(sp.status).toBe(200);
    }
    const sp4 = await requestJson('/api/loyalty/spin', { method: 'POST', token: refereeToken });
    expect(sp4.status).toBe(400);

    // Self-referral rejected
    const selfRef = await requestJson('/api/loyalty/referral/apply', {
      method: 'POST',
      token: referrerToken,
      body: { referralCode: referrerCode },
    });
    expect(selfRef.status).toBe(400);

    // Referee applies referrer code
    const applyRef = await requestJson('/api/loyalty/referral/apply', {
      method: 'POST',
      token: refereeToken,
      body: { referralCode: referrerCode },
    });
    expect(applyRef.status).toBe(200);
    expect(applyRef.json.invite.status).toBe('PENDING');

    // Place order as referee -> completes referral and grants digital download for prod-1
    const orderRes = await requestJson('/api/orders', {
      method: 'POST',
      token: refereeToken,
      body: {
        items: [{ productId: 'prod-1', selectedSize: 'M', quantity: 1 }],
        address: {
          fullName: 'Loyalty Referee',
          phone: '+91 98101 88002',
          street: '14 MG Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          pinCode: '560001',
        },
        paymentMethod: 'upi',
      },
    });
    expect(orderRes.status).toBe(201);

    const referrerAfterOrder = await requestJson('/api/loyalty/me', { token: referrerToken });
    expect(referrerAfterOrder.json.account.coinsBalance).toBe(initialReferrerCoins + 150);

    // Personalization opt-out toggle respects privacy in recommendations
    const optOutRes = await requestJson('/api/loyalty/personalization', {
      method: 'PUT',
      token: refereeToken,
      body: { personalizationOn: false },
    });
    expect(optOutRes.status).toBe(200);
    expect(optOutRes.json.personalizationOn).toBe(false);

    const recsOptOut = await requestJson('/api/discovery/recommendations?productId=prod-1', {
      token: refereeToken,
    });
    expect(recsOptOut.status).toBe(200);
    expect(recsOptOut.json.personalized).toBe(false);
    expect(recsOptOut.json.personalizationOptedOut).toBe(true);

    // Expiry sweep with future simulation expires older rewards
    const sweepRes = await requestJson('/api/admin/loyalty/expiry-sweep', {
      method: 'POST',
      token: superAdminToken,
      body: { simulateFutureDays: 365 },
    });
    expect(sweepRes.status).toBe(200);
    expect(sweepRes.json.expiredEntries).toBeGreaterThanOrEqual(1);
    expect(sweepRes.json.totalCoinsExpired).toBeGreaterThan(0);
  });

  test('Smart Discovery typo tolerance, co-occurrence recommendations, and explicit Visual Search fallback', async () => {
    const suggestRes = await requestJson('/api/discovery/search-suggest?q=kurtaa');
    expect(suggestRes.status).toBe(200);
    expect(suggestRes.json.suggestions.length).toBeGreaterThan(0);
    expect(typeof suggestRes.json.correctedQuery).toBe('string');
    expect(suggestRes.json.correctedQuery.length).toBeGreaterThan(0);

    const recsRes = await requestJson('/api/discovery/recommendations?productId=prod-1');
    expect(recsRes.status).toBe(200);
    expect(recsRes.json.frequentlyBoughtTogether.length).toBeGreaterThan(0);

    // Visual Search without GEMINI_API_KEY explicitly discloses fallback source
    const prevKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const visRes = await requestJson('/api/ai/visual-search', {
        method: 'POST',
        body: { hintCategory: 'ethnic', hintKeywords: ['silk', 'kurta'] },
      });
      expect(visRes.status).toBe(200);
      expect(visRes.json.source).toBe('CATALOG_MATCH_NO_GEMINI_KEY');
      expect(visRes.json.aiUsed).toBe(false);
      expect(visRes.json.matches.length).toBeGreaterThan(0);
    } finally {
      if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
    }
  });

  test('International marketplace config, postal validation, duty/VAT quote & COD restriction outside India', async () => {
    const cfgRes = await requestJson('/api/intl/config');
    expect(cfgRes.status).toBe(200);
    expect(cfgRes.json.countries.length).toBeGreaterThanOrEqual(6);
    expect(cfgRes.json.exchangeRates.length).toBeGreaterThanOrEqual(6);

    const invalidAddr = await requestJson('/api/intl/validate-address', {
      method: 'POST',
      body: { countryCode: 'US', postalCode: 'INVALID' },
    });
    expect(invalidAddr.status).toBe(400);

    const validAddr = await requestJson('/api/intl/validate-address', {
      method: 'POST',
      body: { countryCode: 'US', postalCode: '10001' },
    });
    expect(validAddr.status).toBe(200);

    const usQuote = await requestJson('/api/intl/quote', {
      method: 'POST',
      body: { countryCode: 'US', targetCurrency: 'USD', subtotalInr: 2000 },
    });
    expect(usQuote.status).toBe(200);
    expect(usQuote.json.quote.currencyCode).toBe('USD');
    expect(usQuote.json.quote.customsDutyInr).toBe(160);
    expect(usQuote.json.quote.codAllowed).toBe(false);
    expect(usQuote.json.quote.convertedTotal).toBeGreaterThan(0);

    const codBlocked = await requestJson('/api/intl/quote', {
      method: 'POST',
      body: { countryCode: 'GB', subtotalInr: 2000, paymentMethod: 'cod' },
    });
    expect(codBlocked.status).toBe(400);
  });

  test('B2B GSTIN validation & RFQ seller ownership, Subscriptions pause/resume/honest renewal & HMAC Digital Downloads revocation', async () => {
    // B2B GSTIN validation & RFQ isolation
    const badGstin = await requestJson('/api/b2b/register', {
      method: 'POST',
      token: refereeToken,
      body: { companyName: 'Acme Apparel Pvt Ltd', gstin: 'INVALID123' },
    });
    expect(badGstin.status).toBe(400);

    const goodGstin = await requestJson('/api/b2b/register', {
      method: 'POST',
      token: refereeToken,
      body: {
        companyName: 'Acme Apparel Retail Pvt Ltd',
        gstin: '27AABCU9603R1ZM',
        businessType: 'RETAILER',
      },
    });
    expect(goodGstin.status).toBe(201);
    expect(goodGstin.json.account.status).toBe('PENDING_VERIFICATION');

    const rfqRes = await requestJson('/api/b2b/rfqs', {
      method: 'POST',
      token: refereeToken,
      body: {
        productId: 'prod-1',
        requestedQty: 30,
        targetUnitPrice: 1550,
        notes: 'Diwali corporate bulk batch',
      },
    });
    expect(rfqRes.status).toBe(201);
    const rfqId = rfqRes.json.rfq.id;

    // Seller 2 cannot quote Seller 1's RFQ
    const wrongSellerQuote = await requestJson(`/api/b2b/rfqs/${rfqId}/quote`, {
      method: 'POST',
      token: seller2Token,
      body: { quotedUnitPrice: 1500 },
    });
    expect(wrongSellerQuote.status).toBe(403);

    const rightSellerQuote = await requestJson(`/api/b2b/rfqs/${rfqId}/quote`, {
      method: 'POST',
      token: seller1Token,
      body: { quotedUnitPrice: 1599, notes: 'Ready within 4 business days' },
    });
    expect(rightSellerQuote.status).toBe(200);
    expect(rightSellerQuote.json.rfq.status).toBe('QUOTED');
    expect(rightSellerQuote.json.rfq.quotedUnitPrice).toBe(1599);

    // Subscriptions create -> pause -> resume -> honest renewal gate
    const plansRes = await requestJson('/api/subscriptions/plans?productId=prod-1');
    expect(plansRes.status).toBe(200);
    expect(plansRes.json.plans.length).toBeGreaterThanOrEqual(1);
    const planId = plansRes.json.plans[0].id;

    const subCreate = await requestJson('/api/subscriptions', {
      method: 'POST',
      token: refereeToken,
      body: { planId },
    });
    expect(subCreate.status).toBe(201);
    const subId = subCreate.json.subscription.id;

    const pauseRes = await requestJson(`/api/subscriptions/${subId}/action`, {
      method: 'POST',
      token: refereeToken,
      body: { action: 'PAUSE' },
    });
    expect(pauseRes.status).toBe(200);
    expect(pauseRes.json.subscription.status).toBe('PAUSED');

    const resumeRes = await requestJson(`/api/subscriptions/${subId}/action`, {
      method: 'POST',
      token: refereeToken,
      body: { action: 'RESUME' },
    });
    expect(resumeRes.status).toBe(200);
    expect(resumeRes.json.subscription.status).toBe('ACTIVE');

    const prevMandateFlag = process.env.CASHFREE_SUBSCRIPTION_MANDATE_ENABLED;
    delete process.env.CASHFREE_SUBSCRIPTION_MANDATE_ENABLED;
    try {
      const renewRes = await requestJson(`/api/subscriptions/${subId}/renew`, {
        method: 'POST',
        token: refereeToken,
      });
      expect(renewRes.status).toBe(200);
      expect(renewRes.json.charged).toBe(false);
      expect(renewRes.json.renewalStatus).toBe('REQUIRES_CUSTOMER_PAYMENT_CHECKOUT');
    } finally {
      if (prevMandateFlag !== undefined) {
        process.env.CASHFREE_SUBSCRIPTION_MANDATE_ENABLED = prevMandateFlag;
      }
    }

    // Signed Digital Downloads issued on prod-1 order -> download works -> order cancel revokes grant
    const grantsRes = await requestJson('/api/digital-downloads/me', { token: refereeToken });
    expect(grantsRes.status).toBe(200);
    expect(grantsRes.json.grants.length).toBeGreaterThanOrEqual(1);
    const grant = grantsRes.json.grants[0];

    const dlRes = await fetch(`${baseUrl}${grant.downloadUrl}`, {
      headers: { Authorization: `Bearer ${refereeToken}` },
    });
    expect(dlRes.status).toBe(200);
    expect(dlRes.headers.get('X-Downloads-Remaining')).toBe(String(grant.maxDownloads - 1));
    const dlBody = await dlRes.text();
    expect(dlBody).toContain('PRIME BAZAAR');

    // Cancel order -> download grant revoked
    const cancelRes = await requestJson(`/api/orders/${grant.orderId}/cancel`, {
      method: 'POST',
      token: refereeToken,
      body: { reason: 'Testing digital revocation', refundMode: 'STORE_CREDIT' },
    });
    expect(cancelRes.status).toBe(200);

    const revokedDlRes = await fetch(`${baseUrl}${grant.downloadUrl}`, {
      headers: { Authorization: `Bearer ${refereeToken}` },
    });
    expect(revokedDlRes.status).toBe(403);
  });
});
