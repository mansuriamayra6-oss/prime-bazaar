import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import http from 'http';
import crypto from 'crypto';

process.env.PRIMEBAZAAR_TEST_MODE = '1';
process.env.CASHFREE_WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET || 'cf_test_webhook_secret_phase5';
process.env.ADMIN_ACCESS_PASS = process.env.ADMIN_ACCESS_PASS || 'AdminPhase5TestPass!9';

const { app, orders } = await import('../server');
const { createSession } = await import('../src/server/security');
const { warehouseInventories, ensureWarehousesSeeded } = await import('../src/server/warehouseAndShipping');

let server: http.Server;
let baseUrl = '';
let superAdminToken = '';
let seller1Token = '';
let customerToken = '';

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
  ensureWarehousesSeeded();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  // Super Admin login
  const adminRes = await requestJson('/api/auth/admin/login', {
    method: 'POST',
    body: {
      email: 'super@primebazaar.in',
      password: process.env.ADMIN_ACCESS_PASS,
    },
  });
  expect(adminRes.status).toBe(200);
  superAdminToken = adminRes.json.token;

  // Seller 1 authenticated session for Varanasi Weavers Co. (seller-1)
  seller1Token = createSession({
    userId: 'usr_seller_1',
    role: 'SELLER',
    sellerId: 'seller-1',
    email: 'tripathi.devendra@weaverscraft.in',
    name: 'Varanasi Weavers Co.',
  }).token;

  // Customer registration
  const custRes = await requestJson('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Neha Kapoor',
      email: `neha.phase5.${Date.now()}@primebazaar.in`,
      phone: '+91 98101 55443',
      password: 'Phase5Customer!99',
    },
  });
  expect(custRes.status).toBe(201);
  customerToken = custRes.json.token;
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('Phase 5: Seller Onboarding Lifecycle, KYC Masking, Terms, Staff & Product Moderation', () => {
  let newSellerId = '';
  let newSellerToken = '';

  test('Seller registers -> accepts terms -> admin rejects -> seller resubmits -> admin approves -> suspends', async () => {
    const reg = await requestJson('/api/sellers/register', {
      method: 'POST',
      body: {
        name: 'Kabir Verma',
        businessName: 'Jaipur Looms Studio',
        email: `kabir.${Date.now()}@jaipurlooms.in`,
        phone: '+91 98290 12345',
        password: 'SellerPass!2026',
        gstNumber: '08AABCJ1234K1Z1',
        panNumber: 'AABCJ1234K',
        bankAccount: {
          accountHolderName: 'Jaipur Looms Studio',
          accountNumber: '918273645501',
          ifscCode: 'HDFC0001234',
          bankName: 'HDFC Bank',
        },
        pickupAddress: {
          street: 'MI Road',
          city: 'Jaipur',
          state: 'Rajasthan',
          pinCode: '302001',
        },
      },
    });
    expect(reg.status).toBe(201);
    newSellerId = reg.json.seller.id;
    newSellerToken = reg.json.token;

    // Verify seller password login on /api/v1/auth/seller/login
    const sellerLoginRes = await requestJson('/api/v1/auth/seller/login', {
      method: 'POST',
      body: { emailOrPhone: reg.json.seller.email, password: 'SellerPass!2026' },
    });
    expect(sellerLoginRes.status).toBe(200);

    // Accept seller terms
    const terms = await requestJson('/api/v1/seller/onboarding/terms', {
      method: 'POST',
      token: newSellerToken,
      body: { version: 'v2026.2' },
    });
    expect(terms.status).toBe(200);
    expect(terms.json.version).toBe('v2026.2');

    // Admin rejection without reason must fail (400)
    const badReject = await requestJson(`/api/v1/admin/sellers/${newSellerId}/review`, {
      method: 'POST',
      token: superAdminToken,
      body: { toStatus: 'REJECTED', reason: '' },
    });
    expect(badReject.status).toBe(400);

    // Admin requires resubmission -> seller receives notification & masked bank account
    const resubReq = await requestJson(`/api/v1/admin/sellers/${newSellerId}/review`, {
      method: 'POST',
      token: superAdminToken,
      body: { toStatus: 'RESUBMISSION_REQUIRED', reason: 'GST certificate scan unreadable' },
    });
    expect(resubReq.status).toBe(200);
    expect(resubReq.json.seller.approvalStatus).toBe('RESUBMISSION_REQUIRED');
    expect(resubReq.json.seller.bankAccount.accountNumber).toBe('•••• 5501');

    // Seller checks notification and marks it read
    const notifRes = await requestJson('/api/v1/seller/notifications', { token: newSellerToken });
    expect(notifRes.status).toBe(200);
    expect(notifRes.json.notifications.length).toBeGreaterThan(0);
    await requestJson(`/api/v1/seller/notifications/${notifRes.json.notifications[0].id}/read`, {
      method: 'POST',
      token: newSellerToken,
    });

    // Seller resubmits KYC
    const resubmit = await requestJson('/api/v1/seller/onboarding/resubmit', {
      method: 'POST',
      token: newSellerToken,
      body: { notes: 'Uploaded high-DPI GST registration certificate' },
    });
    expect(resubmit.status).toBe(200);
    expect(resubmit.json.seller.approvalStatus).toBe('SUBMITTED');

    // Admin approves -> later suspends
    const approve = await requestJson(`/api/v1/admin/sellers/${newSellerId}/review`, {
      method: 'POST',
      token: superAdminToken,
      body: { toStatus: 'APPROVED' },
    });
    expect(approve.status).toBe(200);
    expect(approve.json.seller.approvalStatus).toBe('APPROVED');

    const suspend = await requestJson(`/api/v1/admin/sellers/${newSellerId}/review`, {
      method: 'POST',
      token: superAdminToken,
      body: { toStatus: 'SUSPENDED', reason: 'Quality audit pending inspection' },
    });
    expect(suspend.status).toBe(200);
    expect(suspend.json.seller.approvalStatus).toBe('SUSPENDED');

    // Seller staff invitation
    const staffRes = await requestJson('/api/v1/seller/staff', {
      method: 'POST',
      token: seller1Token,
      body: {
        name: 'Aarti Operations',
        email: 'aarti@weaverscraft.in',
        staffRole: 'FULFILLMENT_STAFF',
      },
    });
    expect(staffRes.status).toBe(201);
    expect(staffRes.json.staffMember.staffRole).toBe('FULFILLMENT_STAFF');
  });

  test('Product approval workflow blocks sellers from self-approving and enforces moderation reason on rejection', async () => {
    // Create product via v1 catalog endpoint as seller-1
    const createProd = await requestJson('/api/v1/seller/products', {
      method: 'POST',
      token: seller1Token,
      body: {
        name: 'Handwoven Chanderi Kurta',
        brandName: 'Anouk Heritage',
        categoryId: 'cat-ethnic',
        taxGstPercent: 12,
        variants: [{ sku: `CHK-${Date.now().toString().slice(-4)}`, size: 'M', color: 'Ivory', price: 2499, stock: 12 }],
      },
    });
    expect(createProd.status).toBe(201);
    const prodId = createProd.json.product.id;

    // Submit for approval
    const submitRes = await requestJson(`/api/v1/seller/products/${prodId}/submit`, {
      method: 'POST',
      token: seller1Token,
      body: { notes: 'Ready for catalog QA' },
    });
    expect(submitRes.status).toBe(200);
    expect(submitRes.json.product.status).toBe('SUBMITTED');

    // Seller CANNOT self-approve (403)
    const selfApprove = await requestJson(`/api/v1/admin/products/${prodId}/moderate`, {
      method: 'POST',
      token: seller1Token,
      body: { toStatus: 'APPROVED' },
    });
    expect(selfApprove.status).toBe(403);

    // Reject without reason fails (400)
    const badReject = await requestJson(`/api/v1/admin/products/${prodId}/moderate`, {
      method: 'POST',
      token: superAdminToken,
      body: { toStatus: 'REJECTED' },
    });
    expect(badReject.status).toBe(400);

    // Admin approves product
    const approveProd = await requestJson(`/api/v1/admin/products/${prodId}/moderate`, {
      method: 'POST',
      token: superAdminToken,
      body: { toStatus: 'APPROVED' },
    });
    expect(approveProd.status).toBe(200);
    expect(approveProd.json.product.status).toBe('APPROVED');
  });
});

describe('Phase 5: CMS Banners, Content Moderation & Sponsored Ads CPC Metering', () => {
  test('CMS validates safe URLs and publishes banners; review/Q&A moderation hides flagged items', async () => {
    // Unsafe javascript: URI blocked with 400
    const badBanner = await requestJson('/api/v1/admin/cms/banners', {
      method: 'POST',
      token: superAdminToken,
      body: {
        title: 'Malicious Banner',
        targetUrl: 'javascript:alert(1)',
        desktopImageUrl: '/src/assets/images/collection_ethnic_wear_1793466539838.jpg',
        status: 'PUBLISHED',
      },
    });
    expect(badBanner.status).toBe(400);

    // Valid banner published & returned by public CMS endpoint
    const goodBanner = await requestJson('/api/v1/admin/cms/banners', {
      method: 'POST',
      token: superAdminToken,
      body: {
        title: 'Monsoon Linen Showcase',
        eyebrow: 'LIMITED EDIT',
        ctaLabel: 'Shop Linen',
        targetUrl: '/category/womens-fashion',
        desktopImageUrl: '/src/assets/images/collection_ethnic_wear_1793466539838.jpg',
        placement: 'HERO',
        status: 'PUBLISHED',
      },
    });
    expect(goodBanner.status).toBe(201);

    const publicBanners = await requestJson('/api/cms/banners?placement=HERO');
    expect(publicBanners.status).toBe(200);
    expect(publicBanners.json.banners.some((b: any) => b.title === 'Monsoon Linen Showcase')).toBe(true);

    // Create a question on prod-1 then moderate it HIDDEN -> disappears from public Q&A
    const askRes = await requestJson('/api/storefront/products/prod-1/qa', {
      method: 'POST',
      token: customerToken,
      body: { question: 'Does this include a matching dupatta?' },
    });
    expect(askRes.status).toBe(201);
    const qId = askRes.json.question.id;

    // Seller cannot moderate reviews/Q&A (403)
    const sellerMod = await requestJson('/api/v1/admin/moderation/content', {
      method: 'POST',
      token: seller1Token,
      body: { targetType: 'QUESTION', targetId: qId, productId: 'prod-1', status: 'HIDDEN', reason: 'Hide' },
    });
    expect(sellerMod.status).toBe(403);

    // Admin hides question
    const adminMod = await requestJson('/api/v1/admin/moderation/content', {
      method: 'POST',
      token: superAdminToken,
      body: { targetType: 'QUESTION', targetId: qId, productId: 'prod-1', status: 'HIDDEN', reason: 'Duplicate inquiry' },
    });
    expect(adminMod.status).toBe(200);

    const publicQa = await requestJson('/api/storefront/products/prod-1/qa');
    expect(publicQa.status).toBe(200);
    expect(publicQa.json.questions.some((q: any) => q.id === qId)).toBe(false);
  });

  test('Sponsored ad campaign enforces eligibility, explicit Sponsored disclosure, 15-min click dedup, and budget exhaustion pause', async () => {
    // Rejects product belonging to another seller
    const wrongOwnerAd = await requestJson('/api/v1/seller/ads/campaigns', {
      method: 'POST',
      token: seller1Token,
      body: {
        name: 'Wrong Owner Campaign',
        placement: 'SEARCH',
        bidAmount: 25,
        dailyBudget: 50,
        totalBudget: 100,
        productIds: ['prod-2'], // belongs to seller-2
      },
    });
    expect(wrongOwnerAd.status).toBe(400);

    // Create funded campaign with totalBudget ₹100, bid ₹50 (2 clicks exhaust budget -> auto-COMPLETES)
    const createAd = await requestJson('/api/v1/seller/ads/campaigns', {
      method: 'POST',
      token: seller1Token,
      body: {
        name: 'Banarasi Diwali Boost',
        placement: 'SEARCH',
        bidAmount: 50,
        dailyBudget: 100,
        totalBudget: 100,
        productIds: ['prod-1'],
      },
    });
    expect(createAd.status).toBe(201);
    const campId = createAd.json.campaign.id;

    // Not returned before Admin approval
    const beforeApprove = await requestJson('/api/ads/sponsored?placement=SEARCH');
    expect(beforeApprove.json.sponsored.some((a: any) => a.campaignId === campId)).toBe(false);

    // Admin approves
    const modAd = await requestJson(`/api/v1/admin/ads/campaigns/${campId}/moderate`, {
      method: 'POST',
      token: superAdminToken,
      body: { action: 'APPROVE' },
    });
    expect(modAd.status).toBe(200);
    expect(modAd.json.campaign.status).toBe('ACTIVE');

    // Public ads include Sponsored disclosure label
    const activeAds = await requestJson('/api/ads/sponsored?placement=SEARCH');
    const found = activeAds.json.sponsored.find((a: any) => a.campaignId === campId);
    expect(found).toBeDefined();
    expect(found.isSponsored).toBe(true);
    expect(found.disclosureLabel).toBe('Sponsored');

    // Click #1 from session A charges ₹50
    const click1 = await requestJson('/api/ads/events', {
      method: 'POST',
      body: { campaignId: campId, productId: 'prod-1', eventType: 'CLICK', sessionKey: 'sess_A' },
    });
    expect(click1.status).toBe(201);
    expect(click1.json.chargedAmount).toBe(50);

    // Duplicate click from same session A within 15 mins charges ₹0
    const clickDup = await requestJson('/api/ads/events', {
      method: 'POST',
      body: { campaignId: campId, productId: 'prod-1', eventType: 'CLICK', sessionKey: 'sess_A' },
    });
    expect(clickDup.json.duplicate).toBe(true);
    expect(clickDup.json.chargedAmount).toBe(0);

    // Click #2 from session B exhausts ₹100 budget -> auto-marks COMPLETED
    const click2 = await requestJson('/api/ads/events', {
      method: 'POST',
      body: { campaignId: campId, productId: 'prod-1', eventType: 'CLICK', sessionKey: 'sess_B' },
    });
    expect(click2.json.chargedAmount).toBe(50);
    expect(click2.json.campaign.status).toBe('COMPLETED');
    expect(click2.json.campaign.remainingBudget).toBe(0);

    // Exhausted campaign no longer appears in sponsored results
    const afterExhaust = await requestJson('/api/ads/sponsored?placement=SEARCH');
    expect(afterExhaust.json.sponsored.some((a: any) => a.campaignId === campId)).toBe(false);
  });
});

describe('Phase 5: Suppliers, POs, Verified GRNs, Granular Staff RBAC, Audit Logs & Real Analytics', () => {
  test('Granular AdminStaff RBAC restricts FINANCE_ADMIN / CATALOG_MODERATOR / OPERATIONS_ADMIN strictly by permission', async () => {
    const finPass = 'FinanceStaff!2026';
    const catPass = 'CatalogStaff!2026';
    const opsPass = 'OpsStaff!2026';

    await requestJson('/api/v1/admin/staff', {
      method: 'POST',
      token: superAdminToken,
      body: { name: 'Ritu Finance', email: 'ritu.fin@primebazaar.in', password: finPass, roleName: 'FINANCE_ADMIN' },
    });
    await requestJson('/api/v1/admin/staff', {
      method: 'POST',
      token: superAdminToken,
      body: { name: 'Aarav Catalog', email: 'aarav.cat@primebazaar.in', password: catPass, roleName: 'CATALOG_MODERATOR' },
    });
    await requestJson('/api/v1/admin/staff', {
      method: 'POST',
      token: superAdminToken,
      body: { name: 'Vikram Ops', email: 'vikram.ops@primebazaar.in', password: opsPass, roleName: 'OPERATIONS_ADMIN' },
    });

    const finLogin = await requestJson('/api/auth/admin/login', {
      method: 'POST',
      body: { email: 'ritu.fin@primebazaar.in', password: finPass },
    });
    const catLogin = await requestJson('/api/auth/admin/login', {
      method: 'POST',
      body: { email: 'aarav.cat@primebazaar.in', password: catPass },
    });
    const opsLogin = await requestJson('/api/auth/admin/login', {
      method: 'POST',
      body: { email: 'vikram.ops@primebazaar.in', password: opsPass },
    });

    const finToken = finLogin.json.token;
    const catToken = catLogin.json.token;
    const opsToken = opsLogin.json.token;

    // FINANCE_ADMIN can read ledger, CANNOT manage CMS or Suppliers
    expect((await requestJson('/api/v1/admin/ledger', { token: finToken })).status).toBe(200);
    expect((await requestJson('/api/v1/admin/cms/banners', { token: finToken })).status).toBe(403);
    expect((await requestJson('/api/v1/admin/suppliers', { token: finToken })).status).toBe(403);

    // CATALOG_MODERATOR can manage CMS, CANNOT read ledger or approve POs
    expect((await requestJson('/api/v1/admin/cms/banners', { token: catToken })).status).toBe(200);
    expect((await requestJson('/api/v1/admin/ledger', { token: catToken })).status).toBe(403);
    expect((await requestJson('/api/v1/admin/purchase-orders', { token: catToken })).status).toBe(403);

    // OPERATIONS_ADMIN manages Suppliers, POs, GRN; CANNOT issue Gift Cards
    expect((await requestJson('/api/v1/admin/suppliers', { token: opsToken })).status).toBe(200);
    expect((await requestJson('/api/v1/admin/gift-cards', { token: opsToken })).status).toBe(403);

    // PO creation & approval NEVER alters warehouse stock; stock changes ONLY on verified GRN
    const supRes = await requestJson('/api/v1/admin/suppliers', {
      method: 'POST',
      token: opsToken,
      body: {
        code: `SUP-TEST-${Date.now().toString().slice(-4)}`,
        name: 'Surat Textile Guild',
        businessName: 'Surat Textile Guild Pvt Ltd',
        contactName: 'Ramesh Shah',
        phone: '+91 98250 11220',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395003',
      },
    });
    expect(supRes.status).toBe(201);

    const stockBeforePo = warehouseInventories.get('wh-mum-central:prod-1')?.availableQty || 0;
    const poRes = await requestJson('/api/v1/admin/purchase-orders', {
      method: 'POST',
      token: opsToken,
      body: {
        supplierId: supRes.json.supplier.id,
        warehouseId: 'wh-mum-central',
        items: [
          { variantId: 'prod-1', productId: 'prod-1', productTitle: 'Anarkali Kurti', orderedQty: 20, unitCost: 900, taxRate: 12 },
        ],
      },
    });
    expect(poRes.status).toBe(201);
    const poId = poRes.json.purchaseOrder.id;
    const poItemId = poRes.json.purchaseOrder.items[0].id;

    // Approve PO -> warehouse stock STILL unchanged
    const appPo = await requestJson(`/api/v1/admin/purchase-orders/${poId}/status`, {
      method: 'POST',
      token: opsToken,
      body: { toStatus: 'APPROVED' },
    });
    expect(appPo.status).toBe(200);
    expect(warehouseInventories.get('wh-mum-central:prod-1')?.availableQty || 0).toBe(stockBeforePo);

    // Partial GRN: receive 12 accepted + 2 damaged
    const grn1 = await requestJson(`/api/v1/admin/purchase-orders/${poId}/grn`, {
      method: 'POST',
      token: opsToken,
      body: {
        supplierInvoiceRef: 'SINV-2026-881',
        items: [{ poItemId, acceptedQty: 12, damagedQty: 2 }],
      },
    });
    expect(grn1.status).toBe(201);
    expect(grn1.json.po.status).toBe('PARTIALLY_RECEIVED');
    expect(warehouseInventories.get('wh-mum-central:prod-1')?.availableQty).toBe(stockBeforePo + 12);
    expect(warehouseInventories.get('wh-mum-central:prod-1')?.damagedQty).toBe(2);

    // Over-receipt (> remaining 6) blocked with 400
    const overGrn = await requestJson(`/api/v1/admin/purchase-orders/${poId}/grn`, {
      method: 'POST',
      token: opsToken,
      body: { items: [{ poItemId, acceptedQty: 10, damagedQty: 0 }] },
    });
    expect(overGrn.status).toBe(400);

    // Remaining 6 accepted -> FULLY_RECEIVED
    const grn2 = await requestJson(`/api/v1/admin/purchase-orders/${poId}/grn`, {
      method: 'POST',
      token: opsToken,
      body: { items: [{ poItemId, acceptedQty: 6, damagedQty: 0 }] },
    });
    expect(grn2.status).toBe(201);
    expect(grn2.json.po.status).toBe('FULLY_RECEIVED');
    expect(warehouseInventories.get('wh-mum-central:prod-1')?.availableQty).toBe(stockBeforePo + 18);

    // Real Analytics match real order count without hardcoded fake +7960000 / +9330 offsets
    const analyticsRes = await requestJson('/api/v1/admin/analytics', { token: superAdminToken });
    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.json.analytics.totalOrders).toBe(orders.size);
    expect(analyticsRes.json.analytics.ledgerBalanced).toBe(true);

    // Filtered Audit Logs search finds GRN_RECORDED
    const auditSearch = await requestJson('/api/v1/admin/audit-logs/search?action=GRN_RECORDED', {
      token: superAdminToken,
    });
    expect(auditSearch.status).toBe(200);
    expect(auditSearch.json.auditLogs.length).toBeGreaterThan(1);
  });
});
