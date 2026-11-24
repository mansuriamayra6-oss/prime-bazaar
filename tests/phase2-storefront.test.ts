import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import http from 'http';

process.env.PRIMEBAZAAR_TEST_MODE = '1';
process.env.CASHFREE_WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET || 'cf_test_webhook_secret_phase2';
process.env.ADMIN_ACCESS_PASS = process.env.ADMIN_ACCESS_PASS || 'AdminPhase2TestPass!9';

const { app } = await import('../server');
const { INITIAL_PRODUCTS } = await import('../src/data/mockData');
const {
  FASHION_DEPARTMENTS,
  EXPANDABLE_DEPARTMENTS,
  matchesCategoryAndSubcategory,
  buildBreadcrumbs,
} = await import('../src/data/categories');

let server: http.Server;
let baseUrl = '';

async function requestJson(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
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
  if (options.body !== undefined) {
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
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>(resolve => {
    server.close(() => resolve());
  });
});

describe('Phase 2: Fashion-First Mega Menu Taxonomy & Breadcrumbs', () => {
  test('Fashion departments prioritize apparel/shoes/bags/watches/jewelry/beauty and keep non-fashion expandable', () => {
    const fashionIds = FASHION_DEPARTMENTS.map(d => d.id);
    expect(fashionIds).toContain('womens-fashion');
    expect(fashionIds).toContain('mens-fashion');
    expect(fashionIds).toContain('kids-fashion');
    expect(fashionIds).toContain('footwear');
    expect(fashionIds).toContain('bags');
    expect(fashionIds).toContain('watches');
    expect(fashionIds).toContain('jewellery');
    expect(fashionIds).toContain('accessories');
    expect(fashionIds).toContain('beauty');

    const moreIds = EXPANDABLE_DEPARTMENTS.map(d => d.id);
    expect(moreIds).toContain('electronics');
    expect(moreIds).toContain('home-kitchen');
    expect(moreIds).toContain('sports-outdoor');
  });

  test('Department and subcategory matchers map existing catalog items accurately', () => {
    const womensKurtis = INITIAL_PRODUCTS.filter(p =>
      matchesCategoryAndSubcategory(p, 'womens-fashion', 'anarkali-kurti')
    );
    expect(womensKurtis.some(p => p.id === 'prod-1')).toBe(true);

    const sarees = INITIAL_PRODUCTS.filter(p =>
      matchesCategoryAndSubcategory(p, 'womens-fashion', 'sarees')
    );
    expect(sarees.some(p => p.id === 'prod-4')).toBe(true);

    const mensJackets = INITIAL_PRODUCTS.filter(p =>
      matchesCategoryAndSubcategory(p, 'mens-fashion', 'cargo-jackets')
    );
    expect(mensJackets.some(p => p.id === 'prod-2')).toBe(true);

    const bags = INITIAL_PRODUCTS.filter(p =>
      matchesCategoryAndSubcategory(p, 'bags', null)
    );
    expect(bags.some(p => p.id === 'prod-6')).toBe(true);
  });

  test('Hierarchical breadcrumbs render full trail for department, subcategory, and PDP', () => {
    const subTrail = buildBreadcrumbs({
      selectedCategory: 'womens-fashion',
      selectedSubcategory: 'sarees',
    });
    expect(subTrail.map(b => b.label)).toEqual([
      'Home',
      'Fashion',
      "Women's Fashion",
      'Handloom & Chanderi Sarees',
    ]);

    const pdpTrail = buildBreadcrumbs({
      selectedCategory: 'all',
      product: INITIAL_PRODUCTS[0],
    });
    expect(pdpTrail[0].label).toBe('Home');
    expect(pdpTrail[pdpTrail.length - 1].label).toBe(INITIAL_PRODUCTS[0].title);
    expect(pdpTrail[pdpTrail.length - 1].isCurrent).toBe(true);
  });
});

describe('Phase 2: Product Q&A, Reviews, Photo/Video Upload & Cart State APIs', () => {
  test('Product Q&A requires auth to post and sanitizes HTML script payloads', async () => {
    const unauthPost = await requestJson('/api/storefront/products/prod-1/qa', {
      method: 'POST',
      body: { question: 'Is dry cleaning required for this silk kurta?' },
    });
    expect(unauthPost.status).toBe(401);

    const loginRes = await requestJson('/api/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'mansuriamayra6@gmail.com', password: 'demoPass123' },
    });
    expect(loginRes.status).toBe(200);
    const demoToken = loginRes.json.token;

    const createRes = await requestJson('/api/storefront/products/prod-1/qa', {
      method: 'POST',
      token: demoToken,
      body: { question: '<script>alert(1)</script>Is the organza dupatta lightweight for summer?' },
    });
    expect(createRes.status).toBe(201);
    expect(createRes.json.question.question).not.toContain('<script>');
    expect(createRes.json.question.question).toContain('Is the organza dupatta lightweight for summer?');

    const answerRes = await requestJson(
      `/api/storefront/products/prod-1/qa/${createRes.json.question.id}/answers`,
      {
        method: 'POST',
        token: demoToken,
        body: { answer: 'Yes, it drapes lightly and feels airy.' },
      }
    );
    expect(answerRes.status).toBe(201);
    // Demo user ordered prod-1 in seedOrder so responderRole resolves to verified_buyer
    expect(answerRes.json.answer.responderRole).toBe('verified_buyer');
  });

  test('Review media upload validates MIME allowlist & magic bytes and rejects fake/disallowed files', async () => {
    const loginRes = await requestJson('/api/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'mansuriamayra6@gmail.com', password: 'demoPass123' },
    });
    const demoToken = loginRes.json.token;

    // 1. Disallowed SVG upload rejected
    const svgRes = await requestJson('/api/storefront/uploads/review-media', {
      method: 'POST',
      token: demoToken,
      body: {
        mimeType: 'image/svg+xml',
        dataBase64: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString('base64'),
      },
    });
    expect(svgRes.status).toBe(400);

    // 2. Spoofed MIME header with wrong magic bytes rejected
    const spoofedRes = await requestJson('/api/storefront/uploads/review-media', {
      method: 'POST',
      token: demoToken,
      body: {
        mimeType: 'image/png',
        dataBase64: Buffer.from('<html>not a real png file</html>').toString('base64'),
      },
    });
    expect(spoofedRes.status).toBe(400);

    // 3. Valid PNG header succeeds and serves with nosniff
    const validPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);
    const uploadRes = await requestJson('/api/storefront/uploads/review-media', {
      method: 'POST',
      token: demoToken,
      body: {
        mimeType: 'image/png',
        dataBase64: validPng.toString('base64'),
        caption: 'Unboxing photo',
      },
    });
    expect(uploadRes.status).toBe(201);
    expect(uploadRes.json.media.type).toBe('image');

    const mediaFetch = await fetch(`${baseUrl}${uploadRes.json.media.url}`);
    expect(mediaFetch.status).toBe(200);
    expect(mediaFetch.headers.get('content-type')).toContain('image/png');
    expect(mediaFetch.headers.get('x-content-type-options')).toBe('nosniff');
  });

  test('Verified purchase badge derives strictly from backend orders & duplicate review reports are prevented', async () => {
    // Register a brand new user who has NOT ordered prod-1
    const regRes = await requestJson('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Non Buyer Tester',
        email: `nonbuyer_${Date.now()}@example.com`,
        password: 'password123',
      },
    });
    expect(regRes.status).toBe(201);
    const nonBuyerToken = regRes.json.token;

    // Review on prod-1 by non-buyer must have verifiedPurchase: false
    const nonBuyerReview = await requestJson('/api/storefront/products/prod-1/reviews', {
      method: 'POST',
      token: nonBuyerToken,
      body: { rating: 4, comment: 'Looks lovely in product studio shots!' },
    });
    expect(nonBuyerReview.status).toBe(201);
    expect(nonBuyerReview.json.review.verifiedPurchase).toBe(false);

    // Demo user who purchased prod-1 gets verifiedPurchase: true
    const demoLogin = await requestJson('/api/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'mansuriamayra6@gmail.com', password: 'demoPass123' },
    });
    const demoToken = demoLogin.json.token;

    const verifiedReview = await requestJson('/api/storefront/products/prod-1/reviews', {
      method: 'POST',
      token: demoToken,
      body: { rating: 5, comment: 'Wore this to a wedding reception and the silk embroidery is gorgeous.' },
    });
    expect(verifiedReview.status).toBe(201);
    expect(verifiedReview.json.review.verifiedPurchase).toBe(true);

    // Report review once succeeds, duplicate report by same user returns 409
    const report1 = await requestJson(
      `/api/storefront/products/prod-1/reviews/${nonBuyerReview.json.review.id}/report`,
      { method: 'POST', token: demoToken, body: { reason: 'Unhelpful comment' } }
    );
    expect(report1.status).toBe(201);

    const report2 = await requestJson(
      `/api/storefront/products/prod-1/reviews/${nonBuyerReview.json.review.id}/report`,
      { method: 'POST', token: demoToken, body: { reason: 'Duplicate report' } }
    );
    expect(report2.status).toBe(409);
  });

  test('Cart, Save-for-Later, and Recently Viewed state persists across requests', async () => {
    const sessionId = 'test_session_phase2_001';
    const saveRes = await requestJson('/api/storefront/cart-state', {
      method: 'PUT',
      headers: { 'x-pb-session': sessionId },
      body: {
        cart: [{ id: 'prod-1-M-Royal Indigo', productId: 'prod-1', selectedSize: 'M', selectedColor: 'Royal Indigo', quantity: 1 }],
        savedForLater: [{ id: 'prod-6-Standard-Onyx Black', productId: 'prod-6', selectedSize: 'Standard', selectedColor: 'Onyx Black', quantity: 1, savedAt: '2026-11-24T10:00:00Z' }],
        recentlyViewed: ['prod-1', 'prod-2', 'prod-6'],
      },
    });
    expect(saveRes.status).toBe(200);

    const getRes = await requestJson('/api/storefront/cart-state', {
      headers: { 'x-pb-session': sessionId },
    });
    expect(getRes.status).toBe(200);
    expect(getRes.json.cart.length).toBe(1);
    expect(getRes.json.savedForLater.length).toBe(1);
    expect(getRes.json.recentlyViewed).toEqual(['prod-1', 'prod-2', 'prod-6']);
  });
});
