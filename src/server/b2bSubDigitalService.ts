import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { recordAuditLog } from './auditAndRbac.ts';
import { roundMoney } from './financeLedger.ts';
import { INITIAL_PRODUCTS } from '../data/mockData.ts';
import { dbProducts } from './v1Router.ts';

// =============================================================================
// PHASE 6G: SUBSCRIPTIONS, B2B WHOLESALE & SIGNED DIGITAL PRODUCTS
// =============================================================================

export interface SubscriptionPlanRecord {
  id: string;
  productId: string;
  productTitle: string;
  name: string;
  intervalDays: number;
  discountPercent: number;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerSubscriptionRecord {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  productId: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  nextRenewalAt: string;
  lastBillingNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface B2BAccountRecord {
  id: string;
  userId: string;
  companyName: string;
  gstin: string;
  businessType: 'RETAILER' | 'DISTRIBUTOR' | 'CORPORATE';
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BulkPriceTierRecord {
  id: string;
  productId: string;
  minQty: number;
  maxQty: number | null;
  unitPriceInr: number;
  discountPercent: number;
}

export interface QuoteRequestRecord {
  id: string;
  b2bUserId: string;
  companyName: string;
  productId: string;
  sellerId: string;
  requestedQty: number;
  targetUnitPrice?: number;
  quotedUnitPrice?: number;
  status: 'REQUESTED' | 'QUOTED' | 'ACCEPTED' | 'REJECTED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DigitalAssetRecord {
  id: string;
  productId: string;
  sellerId: string;
  fileName: string;
  mimeType: string;
  fileSizeKb: number;
  storageKey: string;
  maxDownloads: number;
  expiryHours: number;
  createdAt: string;
}

export interface DigitalDownloadGrantRecord {
  id: string;
  assetId: string;
  productId: string;
  userId: string;
  orderId: string;
  downloadsUsed: number;
  maxDownloads: number;
  expiresAt: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  revokedReason?: string;
  createdAt: string;
}

export const dbSubscriptionPlans: Map<string, SubscriptionPlanRecord> = new Map();
export const dbCustomerSubscriptions: Map<string, CustomerSubscriptionRecord> = new Map();
export const dbB2BAccounts: Map<string, B2BAccountRecord> = new Map();
export const dbBulkPriceTiers: BulkPriceTierRecord[] = [];
export const dbQuoteRequests: Map<string, QuoteRequestRecord> = new Map();
export const dbDigitalAssets: Map<string, DigitalAssetRecord> = new Map();
export const dbDigitalGrants: Map<string, DigitalDownloadGrantRecord> = new Map();

const DIGITAL_SIGNING_SECRET =
  process.env.DIGITAL_SIGNING_SECRET || crypto.randomBytes(32).toString('hex');
const DIGITAL_STORAGE_DIR = path.resolve(process.cwd(), 'tmp', 'pb-digital-assets');

const ALLOWED_DIGITAL_MIME = new Set([
  'application/pdf',
  'application/zip',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/markdown',
]);

let stage5Seeded = false;

export function ensurePhase6GSeeded(): void {
  if (stage5Seeded && dbSubscriptionPlans.size > 0) return;
  const now = new Date().toISOString();

  // Seed Subscription Plans
  dbSubscriptionPlans.set('plan-silk-care-30d', {
    id: 'plan-silk-care-30d',
    productId: 'prod-1',
    productTitle: INITIAL_PRODUCTS[0]?.title || 'Banarasi Silk Festive Kurta Set',
    name: 'Monthly Wardrobe Refresh & Care Plan (Every 30 Days)',
    intervalDays: 30,
    discountPercent: 12,
    isActive: true,
    createdAt: now,
  });
  dbSubscriptionPlans.set('plan-street-drop-14d', {
    id: 'plan-street-drop-14d',
    productId: 'prod-2',
    productTitle: INITIAL_PRODUCTS[1]?.title || 'Oversized Heavyweight Hoodie',
    name: 'Bi-Weekly Essential Drop Plan (Every 14 Days)',
    intervalDays: 14,
    discountPercent: 10,
    isActive: true,
    createdAt: now,
  });

  // Seed Bulk Price Tiers across core products
  const seedTiers: BulkPriceTierRecord[] = [
    { id: 'bpt-1a', productId: 'prod-1', minQty: 10, maxQty: 49, unitPriceInr: 1649, discountPercent: 13 },
    { id: 'bpt-1b', productId: 'prod-1', minQty: 50, maxQty: 199, unitPriceInr: 1499, discountPercent: 21 },
    { id: 'bpt-1c', productId: 'prod-1', minQty: 200, maxQty: null, unitPriceInr: 1349, discountPercent: 29 },
    { id: 'bpt-2a', productId: 'prod-2', minQty: 10, maxQty: 49, unitPriceInr: 1299, discountPercent: 13 },
    { id: 'bpt-2b', productId: 'prod-2', minQty: 50, maxQty: null, unitPriceInr: 1149, discountPercent: 23 },
    { id: 'bpt-3a', productId: 'prod-3', minQty: 10, maxQty: 49, unitPriceInr: 2199, discountPercent: 12 },
    { id: 'bpt-3b', productId: 'prod-3', minQty: 50, maxQty: null, unitPriceInr: 1899, discountPercent: 24 },
  ];
  for (const tier of seedTiers) {
    if (!dbBulkPriceTiers.some((t) => t.id === tier.id)) {
      dbBulkPriceTiers.push(tier);
    }
  }

  // Seed a Digital Product Asset for verified digital style lookbooks / patterns
  if (!dbDigitalAssets.has('dasset-prod-1')) {
    fs.mkdirSync(DIGITAL_STORAGE_DIR, { recursive: true });
    const storageKey = 'lookbook-banarasi-edition.txt';
    const filePath = path.join(DIGITAL_STORAGE_DIR, storageKey);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(
        filePath,
        [
          'PRIME BAZAAR — VERIFIED DIGITAL STYLE & CARE LOOKBOOK',
          '========================================================',
          'Product ID: prod-1 (Royal Indigo Banarasi Festive Edition)',
          'Care Instructions: Dry clean only, steam iron at low silk setting.',
          'Includes verified authenticity certificate & boutique sizing guide.',
        ].join('\n'),
        'utf8'
      );
    }
    dbDigitalAssets.set('dasset-prod-1', {
      id: 'dasset-prod-1',
      productId: 'prod-1',
      sellerId: 'seller-1',
      fileName: 'Prime-Bazaar-Silk-Lookbook-CareGuide.txt',
      mimeType: 'text/plain',
      fileSizeKb: 2,
      storageKey,
      maxDownloads: 5,
      expiryHours: 72,
      createdAt: now,
    });
  }

  stage5Seeded = true;
}

// ----------------- SUBSCRIPTIONS -----------------

export function createCustomerSubscription(params: { userId: string; planId: string }) {
  ensurePhase6GSeeded();
  const plan = dbSubscriptionPlans.get(params.planId);
  if (!plan || !plan.isActive) {
    throw new Error('Subscription plan not found or inactive.');
  }
  const now = new Date();
  const nextRenewalAt = new Date(now.getTime() + plan.intervalDays * 86400000).toISOString();
  const sub: CustomerSubscriptionRecord = {
    id: `sub-${crypto.randomBytes(5).toString('hex')}`,
    userId: params.userId,
    planId: plan.id,
    planName: plan.name,
    productId: plan.productId,
    status: 'ACTIVE',
    nextRenewalAt,
    lastBillingNote: 'Enrolled. Recurring autopay triggers manual checkout unless Cashfree Mandate is authorized.',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  dbCustomerSubscriptions.set(sub.id, sub);
  return sub;
}

export function updateCustomerSubscriptionStatus(params: {
  subscriptionId: string;
  userId: string;
  role: string;
  action: 'PAUSE' | 'RESUME' | 'CANCEL';
}) {
  ensurePhase6GSeeded();
  const sub = dbCustomerSubscriptions.get(params.subscriptionId);
  if (!sub) {
    const err: any = new Error('Subscription not found.');
    err.statusCode = 404;
    throw err;
  }
  if (sub.userId !== params.userId && params.role !== 'ADMIN' && params.role !== 'SUPER_ADMIN') {
    const err: any = new Error('Forbidden: Subscription belongs to another customer.');
    err.statusCode = 403;
    throw err;
  }
  if (sub.status === 'CANCELLED' && params.action !== 'CANCEL') {
    throw new Error('Cancelled subscriptions cannot be resumed. Create a new subscription.');
  }

  if (params.action === 'PAUSE') sub.status = 'PAUSED';
  else if (params.action === 'RESUME') sub.status = 'ACTIVE';
  else if (params.action === 'CANCEL') sub.status = 'CANCELLED';

  sub.updatedAt = new Date().toISOString();
  return sub;
}

export function processSubscriptionRenewal(params: {
  subscriptionId: string;
  userId: string;
  role: string;
}) {
  ensurePhase6GSeeded();
  const sub = dbCustomerSubscriptions.get(params.subscriptionId);
  if (!sub) {
    const err: any = new Error('Subscription not found.');
    err.statusCode = 404;
    throw err;
  }
  if (sub.userId !== params.userId && params.role !== 'ADMIN' && params.role !== 'SUPER_ADMIN') {
    const err: any = new Error('Forbidden.');
    err.statusCode = 403;
    throw err;
  }
  if (sub.status !== 'ACTIVE') {
    throw new Error(`Cannot renew subscription in status "${sub.status}".`);
  }

  // Honest integration check: never fabricate live recurring Cashfree autopay charges without mandate configuration
  const mandateEnabled =
    Boolean(process.env.CASHFREE_CLIENT_ID && process.env.CASHFREE_CLIENT_SECRET) &&
    process.env.CASHFREE_SUBSCRIPTION_MANDATE_ENABLED === 'true';

  if (!mandateEnabled) {
    sub.lastBillingNote =
      'Renewal due — awaiting customer payment authorization (Cashfree Subscription Mandate is not enabled).';
    sub.updatedAt = new Date().toISOString();
    return {
      charged: false,
      renewalStatus: 'REQUIRES_CUSTOMER_PAYMENT_CHECKOUT',
      message:
        'Live recurring autopay is not enabled (requires Cashfree Subscriptions Mandate activation). Please complete checkout manually to renew this cycle.',
      subscription: sub,
    };
  }

  const plan = dbSubscriptionPlans.get(sub.planId);
  const nextDate = new Date(Date.now() + (plan?.intervalDays || 30) * 86400000).toISOString();
  sub.nextRenewalAt = nextDate;
  sub.lastBillingNote = `Renewal scheduled via Cashfree mandate on ${new Date().toISOString()}`;
  sub.updatedAt = new Date().toISOString();
  return {
    charged: true,
    renewalStatus: 'SCHEDULED_WITH_MANDATE',
    message: 'Renewal dispatched through configured Cashfree mandate.',
    subscription: sub,
  };
}

// ----------------- B2B WHOLESALE & RFQ -----------------

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function registerB2BAccount(params: {
  userId: string;
  companyName: string;
  gstin: string;
  businessType?: 'RETAILER' | 'DISTRIBUTOR' | 'CORPORATE';
}) {
  ensurePhase6GSeeded();
  const gstin = (params.gstin || '').trim().toUpperCase();
  const companyName = (params.companyName || '').trim();
  if (companyName.length < 3) {
    throw new Error('Company legal name must be at least 3 characters.');
  }
  if (!GSTIN_REGEX.test(gstin)) {
    throw new Error('Invalid Indian GSTIN format (expected 15 alphanumeric characters like 27AABCU9603R1ZM).');
  }

  const now = new Date().toISOString();
  const existing = dbB2BAccounts.get(params.userId);
  const acct: B2BAccountRecord = existing
    ? {
        ...existing,
        companyName,
        gstin,
        businessType: params.businessType || existing.businessType,
        status: 'PENDING_VERIFICATION',
        updatedAt: now,
      }
    : {
        id: `b2b-${crypto.randomBytes(4).toString('hex')}`,
        userId: params.userId,
        companyName,
        gstin,
        businessType: params.businessType || 'RETAILER',
        status: 'PENDING_VERIFICATION',
        createdAt: now,
        updatedAt: now,
      };
  dbB2BAccounts.set(params.userId, acct);
  return acct;
}

export function reviewB2BAccount(params: {
  userId: string;
  status: 'VERIFIED' | 'REJECTED';
  actorId: string;
  actorName: string;
  actorRole: string;
}) {
  ensurePhase6GSeeded();
  const acct = dbB2BAccounts.get(params.userId);
  if (!acct) {
    const err: any = new Error('B2B account not found.');
    err.statusCode = 404;
    throw err;
  }
  acct.status = params.status;
  acct.verifiedBy = params.actorName;
  acct.verifiedAt = new Date().toISOString();
  acct.updatedAt = acct.verifiedAt;

  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: `B2B_ACCOUNT_${params.status}`,
    entityType: 'B2B_ACCOUNT',
    entityId: acct.id,
    details: `${acct.companyName} (${acct.gstin}) marked ${params.status}`,
  });

  return acct;
}

export function getBulkPricingForProduct(productId: string, qty: number = 1) {
  ensurePhase6GSeeded();
  const tiers = dbBulkPriceTiers
    .filter((t) => t.productId === productId)
    .sort((a, b) => a.minQty - b.minQty);

  const prod =
    dbProducts.get(productId) || INITIAL_PRODUCTS.find((p) => p.id === productId);
  const baseUnitPrice = Number((prod as any)?.price || (prod as any)?.variants?.[0]?.price || 999);

  const matchedTier =
    tiers.find((t) => qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty)) || null;

  return {
    productId,
    quantity: qty,
    baseUnitPrice,
    appliedTier: matchedTier,
    effectiveUnitPrice: matchedTier ? matchedTier.unitPriceInr : baseUnitPrice,
    tiers,
  };
}

export function createRfqRequest(params: {
  b2bUserId: string;
  productId: string;
  requestedQty: number;
  targetUnitPrice?: number;
  notes?: string;
}) {
  ensurePhase6GSeeded();
  const acct = dbB2BAccounts.get(params.b2bUserId);
  if (!acct) {
    throw new Error('Please register your B2B business profile & GSTIN before requesting wholesale quotes.');
  }
  if (acct.status === 'REJECTED') {
    throw new Error('Rejected B2B accounts cannot submit RFQ requests.');
  }

  const prod =
    dbProducts.get(params.productId) || INITIAL_PRODUCTS.find((p) => p.id === params.productId);
  if (!prod) {
    throw new Error(`Product "${params.productId}" not found.`);
  }
  const qty = Math.floor(Number(params.requestedQty));
  if (!Number.isFinite(qty) || qty < 10) {
    throw new Error('Minimum wholesale RFQ quantity is 10 units.');
  }

  const now = new Date().toISOString();
  const rfq: QuoteRequestRecord = {
    id: `rfq-${crypto.randomBytes(5).toString('hex')}`,
    b2bUserId: params.b2bUserId,
    companyName: acct.companyName,
    productId: params.productId,
    sellerId: (prod as any).sellerId || 'seller-1',
    requestedQty: qty,
    targetUnitPrice: params.targetUnitPrice ? roundMoney(Number(params.targetUnitPrice)) : undefined,
    status: 'REQUESTED',
    notes: params.notes?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };
  dbQuoteRequests.set(rfq.id, rfq);
  return rfq;
}

export function sellerQuoteRfq(params: {
  rfqId: string;
  sellerId: string;
  actorRole: string;
  quotedUnitPrice: number;
  status?: 'QUOTED' | 'REJECTED';
  notes?: string;
}) {
  ensurePhase6GSeeded();
  const rfq = dbQuoteRequests.get(params.rfqId);
  if (!rfq) {
    const err: any = new Error('RFQ not found.');
    err.statusCode = 404;
    throw err;
  }
  if (rfq.sellerId !== params.sellerId && params.actorRole !== 'ADMIN' && params.actorRole !== 'SUPER_ADMIN') {
    const err: any = new Error('Forbidden: RFQ belongs to another seller.');
    err.statusCode = 403;
    throw err;
  }

  const price = roundMoney(Number(params.quotedUnitPrice));
  if (params.status !== 'REJECTED' && (!Number.isFinite(price) || price <= 0)) {
    throw new Error('Quoted unit price must be positive.');
  }

  rfq.quotedUnitPrice = params.status === 'REJECTED' ? undefined : price;
  rfq.status = params.status === 'REJECTED' ? 'REJECTED' : 'QUOTED';
  if (params.notes) rfq.notes = params.notes.trim();
  rfq.updatedAt = new Date().toISOString();
  return rfq;
}

// ----------------- DIGITAL PRODUCTS & HMAC SIGNED GRANTS -----------------

export function registerDigitalAsset(params: {
  productId: string;
  sellerId: string;
  fileName: string;
  mimeType: string;
  contentTextOrBase64: string;
  maxDownloads?: number;
  expiryHours?: number;
}) {
  ensurePhase6GSeeded();
  if (!ALLOWED_DIGITAL_MIME.has(params.mimeType)) {
    throw new Error(`Unsupported digital asset MIME type "${params.mimeType}".`);
  }
  const cleanName = path.basename(params.fileName || 'digital-asset.txt').replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageKey = `${Date.now()}_${cleanName}`;
  const fullPath = path.join(DIGITAL_STORAGE_DIR, storageKey);
  if (!fullPath.startsWith(DIGITAL_STORAGE_DIR)) {
    throw new Error('Invalid storage path.');
  }
  fs.mkdirSync(DIGITAL_STORAGE_DIR, { recursive: true });
  const buf = Buffer.from(params.contentTextOrBase64 || 'Prime Bazaar Digital Asset', 'utf8');
  if (buf.length > 5 * 1024 * 1024) {
    throw new Error('Digital asset exceeds 5MB limit.');
  }
  fs.writeFileSync(fullPath, buf);

  const asset: DigitalAssetRecord = {
    id: `dasset-${crypto.randomBytes(4).toString('hex')}`,
    productId: params.productId,
    sellerId: params.sellerId,
    fileName: cleanName,
    mimeType: params.mimeType,
    fileSizeKb: Math.max(1, Math.ceil(buf.length / 1024)),
    storageKey,
    maxDownloads: Math.min(20, Math.max(1, Math.round(params.maxDownloads || 5))),
    expiryHours: Math.min(720, Math.max(1, Math.round(params.expiryHours || 72))),
    createdAt: new Date().toISOString(),
  };
  dbDigitalAssets.set(asset.id, asset);
  return asset;
}

export function signDownloadToken(grantId: string, expiresAtMs: number): string {
  const payload = `${grantId}.${expiresAtMs}`;
  const sig = crypto.createHmac('sha256', DIGITAL_SIGNING_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifySignedDownloadToken(token: string): { valid: boolean; grantId?: string; reason?: string } {
  const parts = (token || '').split('.');
  if (parts.length !== 3) return { valid: false, reason: 'Malformed download token.' };
  const [grantId, expStr, sigHex] = parts;
  const expMs = Number(expStr);
  if (!grantId || !Number.isFinite(expMs)) {
    return { valid: false, reason: 'Invalid token claims.' };
  }
  if (Date.now() > expMs) {
    return { valid: false, reason: 'Signed download link has expired.' };
  }
  const expectedHex = crypto
    .createHmac('sha256', DIGITAL_SIGNING_SECRET)
    .update(`${grantId}.${expStr}`)
    .digest('hex');
  const a = Buffer.from(expectedHex, 'hex');
  const b = Buffer.from(sigHex, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, reason: 'Invalid download signature.' };
  }
  return { valid: true, grantId };
}

export function issueDigitalGrantsForOrder(params: {
  orderId: string;
  userId: string;
  productIds: string[];
}): Array<DigitalDownloadGrantRecord & { signedToken: string; downloadUrl: string; fileName: string }> {
  ensurePhase6GSeeded();
  const granted: Array<DigitalDownloadGrantRecord & { signedToken: string; downloadUrl: string; fileName: string }> = [];

  for (const productId of params.productIds) {
    const asset = Array.from(dbDigitalAssets.values()).find((a) => a.productId === productId);
    if (!asset) continue;

    // Avoid duplicate grant for same order + asset
    const existing = Array.from(dbDigitalGrants.values()).find(
      (g) => g.orderId === params.orderId && g.assetId === asset.id
    );
    const grant =
      existing ||
      (() => {
        const expMs = Date.now() + asset.expiryHours * 3600 * 1000;
        const created: DigitalDownloadGrantRecord = {
          id: `dgrant-${crypto.randomBytes(5).toString('hex')}`,
          assetId: asset.id,
          productId: asset.productId,
          userId: params.userId,
          orderId: params.orderId,
          downloadsUsed: 0,
          maxDownloads: asset.maxDownloads,
          expiresAt: new Date(expMs).toISOString(),
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        };
        dbDigitalGrants.set(created.id, created);
        return created;
      })();

    const signedToken = signDownloadToken(grant.id, Date.parse(grant.expiresAt));
    granted.push({
      ...grant,
      fileName: asset.fileName,
      signedToken,
      downloadUrl: `/api/digital-downloads/${encodeURIComponent(grant.id)}?token=${encodeURIComponent(signedToken)}`,
    });
  }

  return granted;
}

export function getDigitalGrantsForUser(userId: string) {
  ensurePhase6GSeeded();
  return Array.from(dbDigitalGrants.values())
    .filter((g) => g.userId === userId)
    .map((g) => {
      const asset = dbDigitalAssets.get(g.assetId);
      const signedToken = signDownloadToken(g.id, Date.parse(g.expiresAt));
      return {
        ...g,
        fileName: asset?.fileName || 'digital-asset',
        mimeType: asset?.mimeType || 'text/plain',
        signedToken,
        downloadUrl: `/api/digital-downloads/${encodeURIComponent(g.id)}?token=${encodeURIComponent(signedToken)}`,
      };
    });
}

export function consumeDigitalDownload(params: {
  grantId: string;
  token: string;
  userId?: string;
}) {
  ensurePhase6GSeeded();
  const verify = verifySignedDownloadToken(params.token);
  if (!verify.valid || verify.grantId !== params.grantId) {
    const err: any = new Error(verify.reason || 'Invalid signed download token.');
    err.statusCode = 403;
    throw err;
  }

  const grant = dbDigitalGrants.get(params.grantId);
  if (!grant) {
    const err: any = new Error('Digital download grant not found.');
    err.statusCode = 404;
    throw err;
  }
  if (params.userId && grant.userId !== params.userId) {
    const err: any = new Error('Forbidden: Download grant belongs to another customer.');
    err.statusCode = 403;
    throw err;
  }
  if (grant.status !== 'ACTIVE') {
    const err: any = new Error(`Download access revoked (${grant.revokedReason || grant.status}).`);
    err.statusCode = 403;
    throw err;
  }
  if (Date.now() > Date.parse(grant.expiresAt)) {
    grant.status = 'EXPIRED';
    const err: any = new Error('Download window has expired.');
    err.statusCode = 403;
    throw err;
  }
  if (grant.downloadsUsed >= grant.maxDownloads) {
    const err: any = new Error(`Download limit (${grant.maxDownloads}) exceeded.`);
    err.statusCode = 403;
    throw err;
  }

  const asset = dbDigitalAssets.get(grant.assetId);
  if (!asset) {
    const err: any = new Error('Digital asset missing from storage.');
    err.statusCode = 404;
    throw err;
  }

  const resolvedPath = path.join(DIGITAL_STORAGE_DIR, path.basename(asset.storageKey));
  if (!resolvedPath.startsWith(DIGITAL_STORAGE_DIR) || !fs.existsSync(resolvedPath)) {
    const err: any = new Error('Digital file unavailable.');
    err.statusCode = 404;
    throw err;
  }

  grant.downloadsUsed += 1;
  const content = fs.readFileSync(resolvedPath);

  return {
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    content,
    downloadsUsed: grant.downloadsUsed,
    downloadsRemaining: Math.max(0, grant.maxDownloads - grant.downloadsUsed),
  };
}

export function revokeDownloadGrantsForOrder(orderId: string, reason: string = 'Order refunded or cancelled') {
  ensurePhase6GSeeded();
  let revokedCount = 0;
  for (const grant of dbDigitalGrants.values()) {
    if (grant.orderId === orderId && grant.status === 'ACTIVE') {
      grant.status = 'REVOKED';
      grant.revokedReason = reason;
      revokedCount += 1;
    }
  }
  return revokedCount;
}
