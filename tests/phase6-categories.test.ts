import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import http from 'http';

process.env.PRIMEBAZAAR_TEST_MODE = '1';
process.env.CASHFREE_WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET || 'cf_test_webhook_secret_phase6';
process.env.ADMIN_ACCESS_PASS = process.env.ADMIN_ACCESS_PASS || 'AdminPhase6TestPass!9';

const { app } = await import('../server');
const { MASTER_34_CATEGORIES } = await import('../src/data/categoriesMaster');
const FASHION_LAUNCH_SLUGS = MASTER_34_CATEGORIES.filter((c) => c.group === 'fashion').map((c) => c.slug);
const EXPANSION_SECTOR_SLUGS = MASTER_34_CATEGORIES.filter((c) => c.group === 'more').map((c) => c.slug);

let server: http.Server;
let baseUrl = '';
let superAdminToken = '';
let customerToken = '';

async function requestJson(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
  } = {}
) {
  const headers: Record<string, string> = {};
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
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
  return { status: res.status, json, text };
}

beforeAll(async () => {
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

  const custRes = await requestJson('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Phase 6 Buyer',
      email: `buyer.phase6.cat.${Date.now()}@primebazaar.in`,
      phone: '+91 98101 66001',
      password: 'Phase6Buyer!99',
    },
  });
  expect(custRes.status).toBe(201);
  customerToken = custRes.json.token;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Phase 6A: Dynamic 34 Categories, Nested Taxonomies & Admin CMS', () => {
  test('MASTER_34_CATEGORIES has exact 34 unique top-level categories (11 Fashion + 23 Expansion)', () => {
    expect(MASTER_34_CATEGORIES.length).toBe(34);
    expect(FASHION_LAUNCH_SLUGS.length).toBe(11);
    expect(EXPANSION_SECTOR_SLUGS.length).toBe(23);
    const slugs = new Set(MASTER_34_CATEGORIES.map((c) => c.slug));
    expect(slugs.size).toBe(34);
    for (const c of MASTER_34_CATEGORIES) {
      expect(c.subcategories.length).toBeGreaterThanOrEqual(2);
      expect(c.attributes.length).toBeGreaterThanOrEqual(1);
      expect(c.seoTitle.length).toBeGreaterThan(5);
      expect(c.seoDescription.length).toBeGreaterThan(10);
    }
  });

  test('Public GET /api/cms/categories serves all 34 active categories ordered with SEO, attributes, and nested children', async () => {
    const res = await requestJson('/api/cms/categories');
    expect(res.status).toBe(200);
    expect(res.json.success).toBe(true);
    expect(res.json.totalCount).toBeGreaterThanOrEqual(34);

    const slugs = new Set(res.json.categories.map((c: any) => c.slug));
    for (const slug of [...FASHION_LAUNCH_SLUGS, ...EXPANSION_SECTOR_SLUGS]) {
      expect(slugs.has(slug)).toBe(true);
    }

    const electronics = res.json.categories.find((c: any) => c.slug === 'electronics');
    expect(electronics).toBeDefined();
    expect(electronics.sector).toBe('Consumer Electronics');
    expect(Array.isArray(electronics.attributes)).toBe(true);
    expect(Array.isArray(electronics.subcategories)).toBe(true);
    expect(electronics.subcategories.some((s: any) => Array.isArray(s.children) && s.children.length > 0)).toBe(true);
  });

  test('RBAC blocks customer from admin CMS endpoints and allows Admin to create, update, disable, and reorder categories', async () => {
    const forbidden = await requestJson('/api/v1/admin/cms/categories', {
      token: customerToken,
    });
    expect(forbidden.status).toBe(403);

    const listAll = await requestJson('/api/v1/admin/cms/categories', {
      token: superAdminToken,
    });
    expect(listAll.status).toBe(200);
    expect(listAll.json.categories.length).toBeGreaterThanOrEqual(34);

    const createRes = await requestJson('/api/v1/admin/cms/categories', {
      method: 'POST',
      token: superAdminToken,
      body: {
        slug: 'collectibles-art',
        name: 'Fine Art & Collectibles',
        sector: 'Lifestyle & Living',
        tagline: 'Curated Studio Prints & Antiques',
        seoTitle: 'Fine Art & Collectibles | Prime Bazaar',
        seoDescription: 'Discover gallery prints, sculptures, and heirloom collectibles.',
        commissionPct: 14,
      },
    });
    expect(createRes.status).toBe(201);
    const createdId = createRes.json.category.id;

    // Disable the custom category via PUT
    const disableRes = await requestJson(`/api/v1/admin/cms/categories/${createdId}`, {
      method: 'PUT',
      token: superAdminToken,
      body: {
        isActive: false,
        seoTitle: 'Updated Collectible SEO Title',
      },
    });
    expect(disableRes.status).toBe(200);
    expect(disableRes.json.category.isActive).toBe(false);

    // Public storefront omits disabled category, admin retains it
    const pubAfter = await requestJson('/api/cms/categories');
    expect(pubAfter.json.categories.some((c: any) => c.id === createdId)).toBe(false);
    const adminAfter = await requestJson('/api/v1/admin/cms/categories', {
      token: superAdminToken,
    });
    expect(adminAfter.json.categories.some((c: any) => c.id === createdId)).toBe(true);

    // Reorder first two categories and restore order
    const firstTwo = pubAfter.json.categories.slice(0, 2);
    const reorderRes = await requestJson('/api/v1/admin/cms/categories/reorder', {
      method: 'PUT',
      token: superAdminToken,
      body: { orderedIds: [firstTwo[1].id, firstTwo[0].id] },
    });
    expect(reorderRes.status).toBe(200);
    expect(reorderRes.json.categories[0].id).toBe(firstTwo[1].id);

    // Restore original order
    await requestJson('/api/v1/admin/cms/categories/reorder', {
      method: 'PUT',
      token: superAdminToken,
      body: { orderedIds: [firstTwo[0].id, firstTwo[1].id] },
    });
  });
});
