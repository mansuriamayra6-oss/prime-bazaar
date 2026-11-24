import crypto from 'crypto';
import {
  dbSellers,
  dbSellerWallets,
  dbSellerOrders,
  dbSellerReturns,
  dbProducts,
  dbCategories,
  dbBrands,
  dbAuditLogs,
  DBProduct,
  DBSellerProfile,
} from './v1Router.ts';
import { INITIAL_PRODUCTS } from '../data/mockData.ts';
import { maskBankAccountNumber, recordAuditLog } from './auditAndRbac.ts';
import { ACCOUNT_CODES, postBalancedLedgerGroup, roundMoney, financeLedgerEntries } from './financeLedger.ts';
import { upsertWarehouseStock, warehouseInventories, warehouses } from './warehouseAndShipping.ts';

// =============================================================================
// PHASE 5: SELLER LIFECYCLE, CMS, MODERATION, SPONSORED ADS, SUPPLIERS, PO/GRN
// =============================================================================

export type ExtendedSellerStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'RESUBMISSION_REQUIRED'
  | 'SUSPENDED'
  | 'DEACTIVATED';

export interface SellerOnboardingHistoryEntry {
  id: string;
  sellerId: string;
  fromStatus?: string | null;
  toStatus: ExtendedSellerStatus;
  reason?: string;
  actorId: string;
  createdAt: string;
}

export interface SellerStaffRecord {
  id: string;
  sellerId: string;
  name: string;
  email: string;
  staffRole: 'MANAGER' | 'CATALOG_EDITOR' | 'FULFILLMENT_STAFF' | 'FINANCE_VIEWER';
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

export interface SellerNotificationRecord {
  id: string;
  sellerId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const sellerOnboardingHistory: SellerOnboardingHistoryEntry[] = [];
export const sellerTermsAcceptances = new Map<string, { acceptedAt: string; version: string }>();
export const sellerStaffDirectory = new Map<string, SellerStaffRecord[]>();
export const sellerNotifications: SellerNotificationRecord[] = [];

export function sanitizeSellerForApi(seller: DBSellerProfile, opts?: { includeFullBank?: boolean }) {
  const terms = sellerTermsAcceptances.get(seller.id);
  return {
    ...seller,
    bankAccount: seller.bankAccount
      ? {
          ...seller.bankAccount,
          accountNumber: opts?.includeFullBank
            ? seller.bankAccount.accountNumber
            : maskBankAccountNumber(seller.bankAccount.accountNumber),
        }
      : null,
    termsAcceptedAt: terms?.acceptedAt || (seller.approvalStatus === 'APPROVED' ? '2026-01-01T00:00:00Z' : null),
    termsVersion: terms?.version || (seller.approvalStatus === 'APPROVED' ? 'v2026.1' : null),
    onboardingHistory: sellerOnboardingHistory
      .filter((h) => h.sellerId === seller.id)
      .slice()
      .reverse(),
  };
}

export function pushSellerNotification(params: { sellerId: string; type: string; title: string; message: string }) {
  sellerNotifications.unshift({
    id: `snot_${crypto.randomBytes(4).toString('hex')}`,
    sellerId: params.sellerId,
    type: params.type,
    title: params.title,
    message: params.message,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
}

export function acceptSellerTerms(sellerId: string, version = 'v2026.2') {
  const seller = dbSellers.get(sellerId);
  if (!seller) throw new Error('Seller not found.');
  const now = new Date().toISOString();
  sellerTermsAcceptances.set(sellerId, { acceptedAt: now, version });
  return { sellerId, acceptedAt: now, version };
}

export function transitionSellerOnboardingStatus(params: {
  sellerId: string;
  toStatus: ExtendedSellerStatus;
  reason?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
}) {
  const seller = dbSellers.get(params.sellerId);
  if (!seller) throw new Error('Seller not found.');

  if (
    (params.toStatus === 'REJECTED' || params.toStatus === 'RESUBMISSION_REQUIRED' || params.toStatus === 'SUSPENDED') &&
    (!params.reason || params.reason.trim().length < 4)
  ) {
    throw new Error(`A clear reason is required when setting seller status to ${params.toStatus}.`);
  }

  const prevStatus = seller.approvalStatus;
  (seller as any).approvalStatus = params.toStatus;
  if (params.reason) {
    seller.rejectionReason = params.reason.trim();
  } else if (params.toStatus === 'APPROVED') {
    seller.rejectionReason = undefined;
  }

  if (params.toStatus === 'APPROVED') {
    for (const doc of seller.kycDocuments || []) {
      doc.verificationStatus = 'VERIFIED';
    }
  }

  sellerOnboardingHistory.push({
    id: `onb_${crypto.randomBytes(5).toString('hex')}`,
    sellerId: seller.id,
    fromStatus: prevStatus,
    toStatus: params.toStatus,
    reason: params.reason?.trim(),
    actorId: params.actorId,
    createdAt: new Date().toISOString(),
  });

  pushSellerNotification({
    sellerId: seller.id,
    type: 'ONBOARDING_STATUS',
    title: `Account status updated: ${params.toStatus}`,
    message: params.reason ? `${params.toStatus}: ${params.reason}` : `Your seller account is now ${params.toStatus}.`,
  });

  recordAuditLog({
    actorType: params.actorRole === 'SELLER' ? 'SELLER' : 'ADMIN',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: `SELLER_${params.toStatus}`,
    entityType: 'SELLER',
    entityId: seller.id,
    beforeState: { approvalStatus: prevStatus },
    afterState: { approvalStatus: params.toStatus },
    reason: params.reason,
    details: `Transitioned seller ${seller.businessName} from ${prevStatus} to ${params.toStatus}.`,
    legacyAuditSink: dbAuditLogs,
  });

  return sanitizeSellerForApi(seller);
}

// =============================================================================
// PRODUCT APPROVAL WORKFLOW (DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED/REJECTED/SUSPENDED)
// =============================================================================

export type ExtendedProductStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'ARCHIVED';

export function isSellerApprovedToPublish(sellerId: string): boolean {
  const seller = dbSellers.get(sellerId);
  return Boolean(seller && seller.approvalStatus === 'APPROVED');
}

export function transitionProductModerationStatus(params: {
  productId: string;
  toStatus: ExtendedProductStatus;
  reason?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
}) {
  const prod = dbProducts.get(params.productId);
  if (!prod) throw new Error('Product not found.');

  if ((params.toStatus === 'REJECTED' || params.toStatus === 'SUSPENDED') && (!params.reason || !params.reason.trim())) {
    throw new Error(`A moderation reason is required when marking a product ${params.toStatus}.`);
  }

  const prev = prod.status;
  (prod as any).status = params.toStatus;
  prod.rejectionReason = params.reason?.trim() || (params.toStatus === 'APPROVED' ? undefined : prod.rejectionReason);

  pushSellerNotification({
    sellerId: prod.sellerId,
    type: 'PRODUCT_MODERATION',
    title: `Product "${prod.name}" is now ${params.toStatus}`,
    message: params.reason ? `Reason: ${params.reason}` : `Product status changed to ${params.toStatus}.`,
  });

  recordAuditLog({
    actorType: params.actorRole === 'SELLER' ? 'SELLER' : 'ADMIN',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: `PRODUCT_${params.toStatus}`,
    entityType: 'PRODUCT',
    entityId: prod.id,
    beforeState: { status: prev },
    afterState: { status: params.toStatus },
    reason: params.reason,
    details: `Product "${prod.name}" transitioned from ${prev} to ${params.toStatus}.`,
    legacyAuditSink: dbAuditLogs,
  });

  return prod;
}

// =============================================================================
// CMS: CATEGORIES, BRANDS & PROMOTIONAL BANNERS (STRICT URL VALIDATION)
// =============================================================================

export type BannerWorkflowStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export interface CmsBannerRecord {
  id: string;
  title: string;
  eyebrow?: string;
  subcopy?: string;
  ctaLabel?: string;
  targetUrl: string;
  targetCategory?: string;
  desktopImageUrl: string;
  mobileImageUrl?: string;
  placement: 'HERO' | 'PROMO_STRIP' | 'MEGA_MENU' | 'DEAL_CAROUSEL';
  priority: number;
  status: BannerWorkflowStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export const cmsBanners = new Map<string, CmsBannerRecord>();

function seedInitialCmsBanners() {
  if (cmsBanners.size > 0) return;
  const now = new Date().toISOString();
  const initial: CmsBannerRecord[] = [
    {
      id: 'banner-hero-1',
      title: 'Festive Handloom & Royal Silks',
      eyebrow: 'NEW SEASON ARCHIVE',
      subcopy: 'Handwoven Banarasi kurtis, sculpted chanderi sarees & festive silhouettes.',
      ctaLabel: 'Explore Ethnic',
      targetUrl: '/category/ethnic',
      targetCategory: 'ethnic',
      desktopImageUrl: '/src/assets/images/collection_ethnic_wear_1793466539838.jpg',
      mobileImageUrl: '/src/assets/images/collection_ethnic_wear_1793466539838.jpg',
      placement: 'HERO',
      priority: 1,
      status: 'PUBLISHED',
      startsAt: null,
      endsAt: null,
      updatedBy: 'system',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'banner-hero-2',
      title: 'Metropolitan Streetwear Drops',
      eyebrow: 'AUTUMN / WINTER EDIT',
      subcopy: 'Heavyweight 420 GSM utility jackets, selvedge denim & structured cargos.',
      ctaLabel: 'Shop Streetwear',
      targetUrl: '/category/streetwear',
      targetCategory: 'streetwear',
      desktopImageUrl: '/src/assets/images/collection_streetwear_1793466541088.jpg',
      mobileImageUrl: '/src/assets/images/collection_streetwear_1793466541088.jpg',
      placement: 'HERO',
      priority: 2,
      status: 'PUBLISHED',
      startsAt: null,
      endsAt: null,
      updatedBy: 'system',
      createdAt: now,
      updatedAt: now,
    },
  ];
  for (const b of initial) cmsBanners.set(b.id, b);
}

seedInitialCmsBanners();

export function validateSafeAssetUrl(rawUrl: unknown, fieldName: string): string {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw new Error(`${fieldName} is required.`);
  }
  const clean = rawUrl.trim();
  if (/^(javascript|data|vbscript):/i.test(clean)) {
    throw new Error(`${fieldName} contains an unsafe URL scheme.`);
  }
  if (clean.startsWith('/')) {
    return clean;
  }
  try {
    const parsed = new URL(clean);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error(`${fieldName} must use https:// or a relative / path.`);
    }
    return parsed.toString();
  } catch {
    throw new Error(`${fieldName} must be a valid https:// URL or relative / path.`);
  }
}

export function getActivePublishedBanners(placement?: string) {
  const nowMs = Date.now();
  return Array.from(cmsBanners.values())
    .filter((b) => {
      if (b.status !== 'PUBLISHED' && b.status !== 'SCHEDULED') return false;
      if (b.status === 'SCHEDULED') {
        if (!b.startsAt || new Date(b.startsAt).getTime() > nowMs) return false;
      }
      if (b.endsAt && new Date(b.endsAt).getTime() < nowMs) return false;
      if (placement && b.placement !== placement) return false;
      return true;
    })
    .sort((a, b) => a.priority - b.priority);
}

export function upsertCmsBanner(params: {
  id?: string;
  title: string;
  eyebrow?: string;
  subcopy?: string;
  ctaLabel?: string;
  targetUrl: string;
  targetCategory?: string;
  desktopImageUrl: string;
  mobileImageUrl?: string;
  placement?: CmsBannerRecord['placement'];
  priority?: number;
  status?: BannerWorkflowStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  actorId: string;
  actorName: string;
}) {
  const safeTarget = validateSafeAssetUrl(params.targetUrl, 'targetUrl');
  const safeDesktop = validateSafeAssetUrl(params.desktopImageUrl, 'desktopImageUrl');
  const safeMobile = params.mobileImageUrl ? validateSafeAssetUrl(params.mobileImageUrl, 'mobileImageUrl') : safeDesktop;

  if (params.startsAt && params.endsAt && new Date(params.endsAt) <= new Date(params.startsAt)) {
    throw new Error('Banner end date must be after start date.');
  }

  const now = new Date().toISOString();
  const existing = params.id ? cmsBanners.get(params.id) : undefined;
  const record: CmsBannerRecord = {
    id: existing?.id || `bnr_${crypto.randomBytes(5).toString('hex')}`,
    title: params.title.trim(),
    eyebrow: params.eyebrow?.trim(),
    subcopy: params.subcopy?.trim(),
    ctaLabel: params.ctaLabel?.trim() || 'Shop Now',
    targetUrl: safeTarget,
    targetCategory: params.targetCategory?.trim(),
    desktopImageUrl: safeDesktop,
    mobileImageUrl: safeMobile,
    placement: params.placement || existing?.placement || 'HERO',
    priority: Number.isFinite(Number(params.priority)) ? Number(params.priority) : existing?.priority || 10,
    status: params.status || existing?.status || 'DRAFT',
    startsAt: params.startsAt ?? existing?.startsAt ?? null,
    endsAt: params.endsAt ?? existing?.endsAt ?? null,
    updatedBy: params.actorId,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  cmsBanners.set(record.id, record);

  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: 'ADMIN',
    action: existing ? 'CMS_BANNER_UPDATED' : 'CMS_BANNER_CREATED',
    entityType: 'BANNER',
    entityId: record.id,
    afterState: { title: record.title, status: record.status, placement: record.placement },
    details: `${existing ? 'Updated' : 'Created'} banner "${record.title}" (${record.status}).`,
    legacyAuditSink: dbAuditLogs,
  });

  return record;
}

export function manageCategoryCms(params: {
  action: 'CREATE' | 'UPDATE' | 'TOGGLE';
  id?: string;
  name?: string;
  slug?: string;
  parentId?: string;
  isActive?: boolean;
  isFashionPriority?: boolean;
  displayOrder?: number;
  actorId: string;
  actorName: string;
}) {
  if (params.action === 'CREATE') {
    if (!params.name?.trim()) throw new Error('Category name is required.');
    const slug = (params.slug || params.name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    if (dbCategories.some((c) => c.slug === slug)) {
      throw new Error(`Category slug "${slug}" already exists.`);
    }
    const created: any = {
      id: `cat-${slug}`,
      name: params.name.trim(),
      slug,
      parentId: params.parentId,
      isActive: params.isActive ?? true,
      isFashionPriority: params.isFashionPriority ?? false,
      displayOrder: params.displayOrder ?? dbCategories.length + 1,
    };
    dbCategories.push(created);
    recordAuditLog({
      actorType: 'ADMIN',
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: 'ADMIN',
      action: 'CATEGORY_CREATED',
      entityType: 'CATEGORY',
      entityId: created.id,
      afterState: created,
      details: `Created category ${created.name} (${created.slug}).`,
      legacyAuditSink: dbAuditLogs,
    });
    return created;
  }

  const target: any = dbCategories.find((c) => c.id === params.id || c.slug === params.id);
  if (!target) throw new Error('Category not found.');
  if (params.name) target.name = params.name.trim();
  if (typeof params.isActive === 'boolean') target.isActive = params.isActive;
  if (typeof params.isFashionPriority === 'boolean') target.isFashionPriority = params.isFashionPriority;
  if (typeof params.displayOrder === 'number') target.displayOrder = params.displayOrder;
  return target;
}

export function manageBrandCms(params: {
  action: 'CREATE' | 'UPDATE';
  id?: string;
  name?: string;
  slug?: string;
  verified?: boolean;
  isActive?: boolean;
  actorId: string;
  actorName: string;
}) {
  if (params.action === 'CREATE') {
    if (!params.name?.trim()) throw new Error('Brand name is required.');
    const slug = (params.slug || params.name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    if (dbBrands.some((b) => b.slug === slug)) {
      throw new Error(`Brand "${slug}" already exists.`);
    }
    const created: any = {
      id: `br-${crypto.randomBytes(4).toString('hex')}`,
      name: params.name.trim(),
      slug,
      verified: params.verified ?? true,
      isActive: params.isActive ?? true,
    };
    dbBrands.push(created);
    recordAuditLog({
      actorType: 'ADMIN',
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: 'ADMIN',
      action: 'BRAND_CREATED',
      entityType: 'BRAND',
      entityId: created.id,
      afterState: created,
      details: `Created brand ${created.name}.`,
      legacyAuditSink: dbAuditLogs,
    });
    return created;
  }

  const target: any = dbBrands.find((b) => b.id === params.id || b.slug === params.id);
  if (!target) throw new Error('Brand not found.');
  if (params.name) target.name = params.name.trim();
  if (typeof params.verified === 'boolean') target.verified = params.verified;
  if (typeof params.isActive === 'boolean') target.isActive = params.isActive;
  return target;
}

// =============================================================================
// REVIEW & Q&A MODERATION QUEUE
// =============================================================================

export type ContentModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN' | 'REMOVED';

export interface ModeratedContentState {
  targetType: 'REVIEW' | 'QUESTION' | 'ANSWER';
  targetId: string;
  productId: string;
  status: ContentModerationStatus;
  reason?: string;
  moderatedBy: string;
  moderatedAt: string;
}

export const contentModerationOverrides = new Map<string, ModeratedContentState>();

export function moderateReviewOrQa(params: {
  targetType: 'REVIEW' | 'QUESTION' | 'ANSWER';
  targetId: string;
  productId: string;
  status: ContentModerationStatus;
  reason?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
}) {
  if (params.actorRole === 'SELLER') {
    throw new Error('Forbidden: Sellers cannot modify, hide, or remove customer reviews or questions.');
  }
  const key = `${params.targetType}:${params.targetId}`;
  const state: ModeratedContentState = {
    targetType: params.targetType,
    targetId: params.targetId,
    productId: params.productId,
    status: params.status,
    reason: params.reason?.trim(),
    moderatedBy: params.actorId,
    moderatedAt: new Date().toISOString(),
  };
  contentModerationOverrides.set(key, state);

  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: `${params.targetType}_MODERATION_${params.status}`,
    entityType: params.targetType,
    entityId: params.targetId,
    afterState: state,
    reason: params.reason,
    details: `Moderated ${params.targetType} ${params.targetId} to ${params.status}.`,
    legacyAuditSink: dbAuditLogs,
  });

  return state;
}

// =============================================================================
// SPONSORED PRODUCT ADVERTISING ENGINE (SEPARATE FROM ORGANIC RANKING)
// =============================================================================

export type AdCampaignLifecycleStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface AdCampaignRecord {
  id: string;
  sellerId: string;
  sellerName: string;
  name: string;
  status: AdCampaignLifecycleStatus;
  placement: 'SEARCH' | 'CATEGORY' | 'HOMEPAGE';
  billingModel: 'CPC';
  bidAmount: number;
  totalBudget: number;
  dailyBudget: number;
  spentAmount: number;
  remainingBudget: number;
  dailySpentMap: Record<string, number>;
  productIds: string[];
  impressions: number;
  clicks: number;
  conversions: number;
  attributedRevenue: number;
  startsAt: string;
  endsAt: string;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const adCampaigns = new Map<string, AdCampaignRecord>();
export const adDedupKeys = new Set<string>();
export const adBillingTransactions: Array<{
  id: string;
  campaignId: string;
  sellerId: string;
  type: 'CLICK_CHARGE' | 'BUDGET_ALLOCATED';
  amount: number;
  balanceAfter: number;
  referenceId: string;
  createdAt: string;
}> = [];
const adLocks = new Map<string, Promise<void>>();

async function withAdLock<T>(campaignId: string, fn: () => T | Promise<T>): Promise<T> {
  const prev = adLocks.get(campaignId) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((r) => {
    release = r;
  });
  const chained = prev.then(() => current);
  adLocks.set(campaignId, chained);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (adLocks.get(campaignId) === chained) adLocks.delete(campaignId);
  }
}

export function checkProductAdEligibility(productId: string, sellerId: string): { eligible: boolean; reason?: string } {
  const dbProd = dbProducts.get(productId);
  const catalogProd = INITIAL_PRODUCTS.find((p) => p.id === productId);
  const seller = dbSellers.get(sellerId);

  if (!seller || seller.approvalStatus !== 'APPROVED') {
    return { eligible: false, reason: 'Seller account must be APPROVED to run sponsored ads.' };
  }

  if (dbProd) {
    if (dbProd.sellerId !== sellerId) return { eligible: false, reason: 'Product does not belong to this seller.' };
    if (dbProd.status !== 'APPROVED') return { eligible: false, reason: `Product ${dbProd.name} is ${dbProd.status}, not APPROVED.` };
    const totalStock = dbProd.variants.reduce((s, v) => s + v.stock, 0);
    if (totalStock <= 0) return { eligible: false, reason: `Product ${dbProd.name} is out of stock.` };
    return { eligible: true };
  }

  if (catalogProd) {
    if (catalogProd.sellerId !== sellerId) return { eligible: false, reason: 'Product does not belong to this seller.' };
    if (catalogProd.inStock <= 0) return { eligible: false, reason: `Product ${catalogProd.title} is out of stock.` };
    return { eligible: true };
  }

  return { eligible: false, reason: `Product ${productId} not found.` };
}

export function createAdCampaign(params: {
  sellerId: string;
  name: string;
  placement?: 'SEARCH' | 'CATEGORY' | 'HOMEPAGE';
  bidAmount: number;
  totalBudget: number;
  dailyBudget: number;
  productIds: string[];
  startsAt?: string;
  endsAt?: string;
  submitImmediately?: boolean;
}) {
  if (!params.name.trim()) throw new Error('Campaign name is required.');
  if (!Array.isArray(params.productIds) || params.productIds.length === 0) {
    throw new Error('At least one eligible product is required.');
  }
  const bid = roundMoney(params.bidAmount);
  const totalBudget = roundMoney(params.totalBudget);
  const dailyBudget = roundMoney(params.dailyBudget);
  if (bid < 1 || totalBudget < 100 || dailyBudget < bid || dailyBudget > totalBudget) {
    throw new Error('Invalid campaign budget or bid. Ensure bid >= ₹1, dailyBudget >= bid, and totalBudget >= ₹100.');
  }

  for (const pid of params.productIds) {
    const chk = checkProductAdEligibility(pid, params.sellerId);
    if (!chk.eligible) throw new Error(chk.reason || 'Product is not eligible for advertising.');
  }

  const seller = dbSellers.get(params.sellerId)!;
  const now = new Date();
  const startsAt = params.startsAt || now.toISOString();
  const endsAt = params.endsAt || new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const campaign: AdCampaignRecord = {
    id: `camp_${crypto.randomBytes(5).toString('hex')}`,
    sellerId: params.sellerId,
    sellerName: seller.businessName,
    name: params.name.trim(),
    status: params.submitImmediately === false ? 'DRAFT' : 'SUBMITTED',
    placement: params.placement || 'SEARCH',
    billingModel: 'CPC',
    bidAmount: bid,
    totalBudget,
    dailyBudget,
    spentAmount: 0,
    remainingBudget: totalBudget,
    dailySpentMap: {},
    productIds: Array.from(new Set(params.productIds)),
    impressions: 0,
    clicks: 0,
    conversions: 0,
    attributedRevenue: 0,
    startsAt,
    endsAt,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  adCampaigns.set(campaign.id, campaign);
  return campaign;
}

export function moderateAdCampaign(params: {
  campaignId: string;
  action: 'APPROVE' | 'REJECT' | 'PAUSE' | 'RESUME';
  reason?: string;
  actorId: string;
  actorName: string;
}) {
  const camp = adCampaigns.get(params.campaignId);
  if (!camp) throw new Error('Ad campaign not found.');

  if (params.action === 'REJECT' && (!params.reason || !params.reason.trim())) {
    throw new Error('Rejection reason is required.');
  }

  const prevStatus = camp.status;
  if (params.action === 'APPROVE') {
    const startsMs = new Date(camp.startsAt).getTime();
    camp.status = startsMs > Date.now() ? 'SCHEDULED' : 'ACTIVE';
    camp.approvedBy = params.actorId;
    camp.approvedAt = new Date().toISOString();
    camp.rejectionReason = undefined;
  } else if (params.action === 'REJECT') {
    camp.status = 'REJECTED';
    camp.rejectionReason = params.reason?.trim();
  } else if (params.action === 'PAUSE') {
    camp.status = 'PAUSED';
  } else if (params.action === 'RESUME') {
    if (camp.remainingBudget < camp.bidAmount) {
      throw new Error('Campaign has exhausted its budget.');
    }
    camp.status = 'ACTIVE';
  }
  camp.updatedAt = new Date().toISOString();

  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: 'ADMIN',
    action: `AD_CAMPAIGN_${params.action}`,
    entityType: 'AD_CAMPAIGN',
    entityId: camp.id,
    beforeState: { status: prevStatus },
    afterState: { status: camp.status },
    reason: params.reason,
    details: `Ad campaign "${camp.name}" updated to ${camp.status}.`,
    legacyAuditSink: dbAuditLogs,
  });

  return camp;
}

export function getEligibleSponsoredAds(params: { placement?: string; category?: string; searchQuery?: string; limit?: number }) {
  const nowMs = Date.now();
  const todayKey = new Date().toISOString().slice(0, 10);
  const results: Array<{
    campaignId: string;
    productId: string;
    sellerId: string;
    sellerName: string;
    placement: string;
    bidAmount: number;
    isSponsored: true;
    disclosureLabel: 'Sponsored';
  }> = [];

  for (const camp of adCampaigns.values()) {
    if (camp.status !== 'ACTIVE' && camp.status !== 'SCHEDULED') continue;
    if (new Date(camp.startsAt).getTime() > nowMs) continue;
    if (new Date(camp.endsAt).getTime() < nowMs) {
      camp.status = 'COMPLETED';
      continue;
    }
    if (params.placement && camp.placement !== params.placement) continue;
    if (camp.remainingBudget < camp.bidAmount) {
      camp.status = 'COMPLETED';
      continue;
    }
    const spentToday = camp.dailySpentMap[todayKey] || 0;
    if (spentToday + camp.bidAmount > camp.dailyBudget) continue;

    for (const pid of camp.productIds) {
      const elig = checkProductAdEligibility(pid, camp.sellerId);
      if (!elig.eligible) continue;

      const catalogProd = INITIAL_PRODUCTS.find((p) => p.id === pid);
      const dbProd = dbProducts.get(pid);
      const title = (dbProd?.name || catalogProd?.title || '').toLowerCase();
      const cat = (catalogProd?.category || dbProd?.categoryId.replace(/^cat-/, '') || '').toLowerCase();

      if (params.category && params.category !== 'all' && cat !== params.category.toLowerCase()) continue;
      if (params.searchQuery && params.searchQuery.trim()) {
        const q = params.searchQuery.trim().toLowerCase();
        if (!title.includes(q) && !cat.includes(q)) continue;
      }

      results.push({
        campaignId: camp.id,
        productId: pid,
        sellerId: camp.sellerId,
        sellerName: camp.sellerName,
        placement: camp.placement,
        bidAmount: camp.bidAmount,
        isSponsored: true,
        disclosureLabel: 'Sponsored',
      });
    }
  }

  return results
    .sort((a, b) => b.bidAmount - a.bidAmount)
    .slice(0, params.limit || 4);
}

export async function recordSponsoredAdEvent(params: {
  campaignId: string;
  productId: string;
  eventType: 'IMPRESSION' | 'CLICK' | 'CONVERSION';
  sessionKey: string;
  userId?: string;
  orderId?: string;
  attributedRevenue?: number;
}) {
  const camp = adCampaigns.get(params.campaignId);
  if (!camp) throw new Error('Campaign not found.');

  return withAdLock(camp.id, async () => {
    const todayKey = new Date().toISOString().slice(0, 10);

    if (params.eventType === 'IMPRESSION') {
      camp.impressions += 1;
      return { recorded: true, chargedAmount: 0, duplicate: false, campaign: camp };
    }

    if (params.eventType === 'CONVERSION') {
      camp.conversions += 1;
      camp.attributedRevenue = roundMoney(camp.attributedRevenue + (Number(params.attributedRevenue) || 0));
      return { recorded: true, chargedAmount: 0, duplicate: false, campaign: camp };
    }

    // CLICK event with CPC dedup (15-min rolling bucket per sessionKey + campaign + product)
    const bucket15m = Math.floor(Date.now() / (15 * 60 * 1000));
    const dedupKey = `CLICK:${camp.id}:${params.productId}:${params.sessionKey}:${bucket15m}`;
    if (adDedupKeys.has(dedupKey)) {
      return { recorded: false, chargedAmount: 0, duplicate: true, campaign: camp };
    }

    const spentToday = camp.dailySpentMap[todayKey] || 0;
    if (camp.status !== 'ACTIVE' || camp.remainingBudget < camp.bidAmount || spentToday + camp.bidAmount > camp.dailyBudget) {
      if (camp.remainingBudget < camp.bidAmount) camp.status = 'COMPLETED';
      return { recorded: false, chargedAmount: 0, duplicate: false, budgetExhausted: true, campaign: camp };
    }

    adDedupKeys.add(dedupKey);
    const charge = camp.bidAmount;
    camp.clicks += 1;
    camp.spentAmount = roundMoney(camp.spentAmount + charge);
    camp.remainingBudget = roundMoney(camp.remainingBudget - charge);
    camp.dailySpentMap[todayKey] = roundMoney(spentToday + charge);
    if (camp.remainingBudget < camp.bidAmount) {
      camp.status = 'COMPLETED';
    }
    camp.updatedAt = new Date().toISOString();

    const txnId = `adtx_${crypto.randomBytes(5).toString('hex')}`;
    adBillingTransactions.push({
      id: txnId,
      campaignId: camp.id,
      sellerId: camp.sellerId,
      type: 'CLICK_CHARGE',
      amount: charge,
      balanceAfter: camp.remainingBudget,
      referenceId: dedupKey,
      createdAt: camp.updatedAt,
    });

    postBalancedLedgerGroup({
      referenceNumber: `AD_CPC:${txnId}`,
      description: `Sponsored CPC click charge for campaign ${camp.name}`,
      createdBy: params.userId || params.sessionKey,
      sellerId: camp.sellerId,
      lines: [
        { accountCode: ACCOUNT_CODES.SELLER_PAYABLE, entryType: 'DEBIT', amount: charge },
        { accountCode: ACCOUNT_CODES.AD_REVENUE, entryType: 'CREDIT', amount: charge },
      ],
    });

    return { recorded: true, chargedAmount: charge, duplicate: false, campaign: camp };
  });
}

// =============================================================================
// SUPPLIERS, PURCHASE ORDERS & GOODS RECEIPT NOTES (GRN)
// =============================================================================

export interface SupplierRecord {
  id: string;
  code: string;
  name: string;
  businessName: string;
  contactName: string;
  email?: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string;
  pan?: string;
  paymentTerms: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface PurchaseOrderItemRecord {
  id: string;
  variantId: string;
  sku: string;
  productId: string;
  productTitle: string;
  orderedQty: number;
  receivedQty: number;
  rejectedQty: number;
  unitCost: number;
  taxRate: number;
  lineTotal: number;
}

export type PurchaseOrderLifecycle =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'SENT_TO_SUPPLIER'
  | 'PARTIALLY_RECEIVED'
  | 'FULLY_RECEIVED'
  | 'CANCELLED';

export interface PurchaseOrderRecord {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  status: PurchaseOrderLifecycle;
  subtotal: number;
  taxAmount: number;
  additionalCharges: number;
  totalCost: number;
  expectedDeliveryDate?: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  items: PurchaseOrderItemRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface GoodsReceiptRecord {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  poNumber: string;
  warehouseId: string;
  receivedBy: string;
  supplierInvoiceRef?: string;
  notes?: string;
  items: Array<{
    poItemId: string;
    variantId: string;
    acceptedQty: number;
    damagedQty: number;
    discrepancyNote?: string;
  }>;
  receivedAt: string;
}

export interface SupplierInvoiceRecord {
  id: string;
  supplierId: string;
  purchaseOrderId: string;
  invoiceNumber: string;
  amount: number;
  paidAmount: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
  dueDate?: string;
  createdAt: string;
}

export const suppliers = new Map<string, SupplierRecord>();
export const purchaseOrders = new Map<string, PurchaseOrderRecord>();
export const goodsReceipts = new Map<string, GoodsReceiptRecord>();
export const supplierInvoices = new Map<string, SupplierInvoiceRecord>();
const grnLocks = new Map<string, Promise<void>>();

function seedDefaultSuppliers() {
  if (suppliers.size > 0) return;
  const now = new Date().toISOString();
  suppliers.set('sup-1', {
    id: 'sup-1',
    code: 'SUP-VARANASI-LOOM',
    name: 'Banaras Handloom Artisans Guild',
    businessName: 'Banaras Handloom Artisans Guild Pvt Ltd',
    contactName: 'Maheshwar Pandey',
    email: 'procurement@banarashandloom.in',
    phone: '+91 98390 11220',
    address: 'Plot 88, Handloom Cluster, Madanpura',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    pincode: '221001',
    gstin: '09AABCB4412M1Z9',
    pan: 'AABCB4412M',
    paymentTerms: 'Net 30',
    status: 'ACTIVE',
    createdAt: now,
  });
}

seedDefaultSuppliers();

export function createSupplier(params: Omit<SupplierRecord, 'id' | 'status' | 'createdAt'> & { actorId: string; actorName: string }) {
  if (!params.businessName?.trim() || !params.phone?.trim()) {
    throw new Error('Supplier business name and phone number are required.');
  }
  const code = (params.code || `SUP-${crypto.randomBytes(3).toString('hex')}`).trim().toUpperCase();
  for (const s of suppliers.values()) {
    if (s.code === code) throw new Error(`Supplier code ${code} already exists.`);
  }
  const sup: SupplierRecord = {
    id: `sup_${crypto.randomBytes(5).toString('hex')}`,
    code,
    name: params.name?.trim() || params.businessName.trim(),
    businessName: params.businessName.trim(),
    contactName: params.contactName?.trim() || params.name?.trim() || 'Procurement Contact',
    email: params.email?.trim(),
    phone: params.phone.trim(),
    address: params.address?.trim() || `${params.city}, ${params.state}`,
    city: params.city?.trim() || 'Mumbai',
    state: params.state?.trim() || 'Maharashtra',
    pincode: params.pincode?.trim() || '400001',
    gstin: params.gstin?.trim(),
    pan: params.pan?.trim(),
    paymentTerms: params.paymentTerms?.trim() || 'Net 30',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };
  suppliers.set(sup.id, sup);

  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: 'ADMIN',
    action: 'SUPPLIER_CREATED',
    entityType: 'SUPPLIER',
    entityId: sup.id,
    afterState: { code: sup.code, businessName: sup.businessName },
    details: `Registered supplier ${sup.businessName} (${sup.code}).`,
    legacyAuditSink: dbAuditLogs,
  });

  return sup;
}

export function createPurchaseOrder(params: {
  supplierId: string;
  warehouseId: string;
  items: Array<{ variantId: string; sku?: string; productId: string; productTitle: string; orderedQty: number; unitCost: number; taxRate?: number }>;
  additionalCharges?: number;
  expectedDeliveryDate?: string;
  notes?: string;
  submitImmediately?: boolean;
  actorId: string;
  actorName: string;
}): PurchaseOrderRecord {
  const sup = suppliers.get(params.supplierId);
  if (!sup || sup.status !== 'ACTIVE') throw new Error('Supplier not found or inactive.');
  const wh = warehouses.get(params.warehouseId);
  if (!wh || !wh.isActive) throw new Error('Destination warehouse not found or inactive.');
  if (!Array.isArray(params.items) || params.items.length === 0) {
    throw new Error('Purchase order requires at least one line item.');
  }

  let subtotal = 0;
  let taxAmount = 0;
  const formattedItems: PurchaseOrderItemRecord[] = params.items.map((it) => {
    const qty = Math.floor(Number(it.orderedQty));
    const unitCost = roundMoney(it.unitCost);
    const taxRate = Number(it.taxRate ?? 12);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitCost) || unitCost <= 0) {
      throw new Error('Ordered quantity and unit cost must be positive.');
    }
    const base = roundMoney(qty * unitCost);
    const tax = roundMoney((base * taxRate) / 100);
    subtotal = roundMoney(subtotal + base);
    taxAmount = roundMoney(taxAmount + tax);
    return {
      id: `poi_${crypto.randomBytes(4).toString('hex')}`,
      variantId: it.variantId,
      sku: it.sku || it.variantId.toUpperCase(),
      productId: it.productId,
      productTitle: it.productTitle,
      orderedQty: qty,
      receivedQty: 0,
      rejectedQty: 0,
      unitCost,
      taxRate,
      lineTotal: roundMoney(base + tax),
    };
  });

  const additionalCharges = Math.max(0, roundMoney(params.additionalCharges || 0));
  const totalCost = roundMoney(subtotal + taxAmount + additionalCharges);
  const now = new Date().toISOString();
  const poNumber = `PO-${new Date().getFullYear()}-${String(purchaseOrders.size + 1001)}`;

  // Creating/Approving a PO NEVER alters warehouse stock; stock changes ONLY on verified GRN receipt.
  const po: PurchaseOrderRecord = {
    id: `po_${crypto.randomBytes(5).toString('hex')}`,
    poNumber,
    supplierId: sup.id,
    supplierName: sup.businessName,
    warehouseId: wh.id,
    warehouseName: wh.name,
    status: params.submitImmediately === false ? 'DRAFT' : 'SUBMITTED',
    subtotal,
    taxAmount,
    additionalCharges,
    totalCost,
    expectedDeliveryDate: params.expectedDeliveryDate,
    createdBy: params.actorId,
    notes: params.notes,
    items: formattedItems,
    createdAt: now,
    updatedAt: now,
  };
  purchaseOrders.set(po.id, po);

  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: 'ADMIN',
    action: 'PURCHASE_ORDER_CREATED',
    entityType: 'PURCHASE_ORDER',
    entityId: po.id,
    afterState: { poNumber: po.poNumber, totalCost: po.totalCost, status: po.status },
    details: `Created PO ${po.poNumber} for ${sup.businessName} (${wh.code}) totaling ₹${totalCost}.`,
    legacyAuditSink: dbAuditLogs,
  });

  return po;
}

export function transitionPurchaseOrderStatus(params: {
  poId: string;
  toStatus: 'SUBMITTED' | 'APPROVED' | 'SENT_TO_SUPPLIER' | 'CANCELLED';
  actorId: string;
  actorName: string;
  reason?: string;
}) {
  const po = purchaseOrders.get(params.poId);
  if (!po) throw new Error('Purchase order not found.');
  if (po.status === 'FULLY_RECEIVED') throw new Error('Completed purchase order cannot be modified.');

  const prev = po.status;
  po.status = params.toStatus;
  if (params.toStatus === 'APPROVED') {
    po.approvedBy = params.actorId;
    po.approvedAt = new Date().toISOString();
  }
  po.updatedAt = new Date().toISOString();

  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: 'ADMIN',
    action: `PO_${params.toStatus}`,
    entityType: 'PURCHASE_ORDER',
    entityId: po.id,
    beforeState: { status: prev },
    afterState: { status: po.status },
    reason: params.reason,
    details: `PO ${po.poNumber} transitioned from ${prev} to ${po.status}.`,
    legacyAuditSink: dbAuditLogs,
  });

  return po;
}

export async function receiveGoodsReceiptForPo(params: {
  poId: string;
  supplierInvoiceRef?: string;
  notes?: string;
  items: Array<{ poItemId: string; acceptedQty: number; damagedQty?: number; discrepancyNote?: string }>;
  actorId: string;
  actorName: string;
}): Promise<{ grn: GoodsReceiptRecord; po: PurchaseOrderRecord; supplierInvoice?: SupplierInvoiceRecord }> {
  const prevLock = grnLocks.get(params.poId) || Promise.resolve();
  let release!: () => void;
  const currentLock = new Promise<void>((r) => {
    release = r;
  });
  grnLocks.set(params.poId, prevLock.then(() => currentLock));
  await prevLock;

  try {
    const po = purchaseOrders.get(params.poId);
    if (!po) throw new Error('Purchase order not found.');
    if (po.status !== 'APPROVED' && po.status !== 'SENT_TO_SUPPLIER' && po.status !== 'PARTIALLY_RECEIVED') {
      throw new Error(`Goods receipt allowed only for APPROVED/SENT/PARTIALLY_RECEIVED POs (current: ${po.status}).`);
    }
    if (!Array.isArray(params.items) || params.items.length === 0) {
      throw new Error('GRN must contain at least one received line item.');
    }

    const receiptLines: GoodsReceiptRecord['items'] = [];
    for (const line of params.items) {
      const poItem = po.items.find((i) => i.id === line.poItemId);
      if (!poItem) throw new Error(`PO line item ${line.poItemId} not found.`);

      const accepted = Math.max(0, Math.floor(Number(line.acceptedQty || 0)));
      const damaged = Math.max(0, Math.floor(Number(line.damagedQty || 0)));
      const remainingQty = poItem.orderedQty - (poItem.receivedQty + poItem.rejectedQty);

      if (accepted + damaged <= 0) {
        throw new Error(`Received quantity for ${poItem.sku} must be greater than zero.`);
      }
      if (accepted + damaged > remainingQty) {
        throw new Error(
          `Over-receipt blocked for ${poItem.sku}: attempting ${accepted + damaged}, remaining ordered ${remainingQty}.`
        );
      }

      poItem.receivedQty += accepted;
      poItem.rejectedQty += damaged;

      if (accepted > 0 || damaged > 0) {
        await upsertWarehouseStock({
          warehouseId: po.warehouseId,
          variantId: poItem.variantId,
          sku: poItem.sku,
          productId: poItem.productId,
          productTitle: poItem.productTitle,
          quantityDelta: accepted,
          damagedDelta: damaged,
          movementType: 'PO_RECEIVED',
          referenceId: po.poNumber,
          notes: `GRN received for ${po.poNumber}: accepted=${accepted}, damaged=${damaged}`,
        });
      }

      receiptLines.push({
        poItemId: poItem.id,
        variantId: poItem.variantId,
        acceptedQty: accepted,
        damagedQty: damaged,
        discrepancyNote: line.discrepancyNote,
      });
    }

    const allFulfilled = po.items.every((i) => i.receivedQty + i.rejectedQty >= i.orderedQty);
    po.status = allFulfilled ? 'FULLY_RECEIVED' : 'PARTIALLY_RECEIVED';
    po.updatedAt = new Date().toISOString();

    const grnNumber = `GRN-${new Date().getFullYear()}-${String(goodsReceipts.size + 1001)}`;
    const grn: GoodsReceiptRecord = {
      id: `grn_${crypto.randomBytes(5).toString('hex')}`,
      grnNumber,
      purchaseOrderId: po.id,
      poNumber: po.poNumber,
      warehouseId: po.warehouseId,
      receivedBy: params.actorId,
      supplierInvoiceRef: params.supplierInvoiceRef?.trim(),
      notes: params.notes,
      items: receiptLines,
      receivedAt: new Date().toISOString(),
    };
    goodsReceipts.set(grn.id, grn);

    let supInv: SupplierInvoiceRecord | undefined;
    if (params.supplierInvoiceRef?.trim()) {
      supInv = {
        id: `sinv_${crypto.randomBytes(5).toString('hex')}`,
        supplierId: po.supplierId,
        purchaseOrderId: po.id,
        invoiceNumber: params.supplierInvoiceRef.trim(),
        amount: po.totalCost,
        paidAmount: 0,
        status: 'UNPAID',
        createdAt: new Date().toISOString(),
      };
      supplierInvoices.set(supInv.id, supInv);
    }

    recordAuditLog({
      actorType: 'ADMIN',
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: 'ADMIN',
      action: 'GRN_RECORDED',
      entityType: 'GOODS_RECEIPT',
      entityId: grn.id,
      afterState: { grnNumber, poNumber: po.poNumber, poStatus: po.status, itemsCount: receiptLines.length },
      details: `Recorded ${grnNumber} against PO ${po.poNumber} (${po.status}).`,
      legacyAuditSink: dbAuditLogs,
    });

    return { grn, po, supplierInvoice: supInv };
  } finally {
    release();
    grnLocks.delete(params.poId);
  }
}

// =============================================================================
// REAL DATABASE / LEDGER-BACKED ANALYTICS (ZERO HARDCODED FAKE OFFSETS)
// =============================================================================

export function computeRealPlatformAnalytics(params: {
  ordersList: Array<any>;
  fromDate?: string;
  toDate?: string;
  sellerId?: string;
}) {
  const fromMs = params.fromDate ? new Date(params.fromDate).getTime() : null;
  const toMs = params.toDate ? new Date(params.toDate).getTime() : null;

  const suborders = Array.from(dbSellerOrders.values()).filter((so) => {
    if (params.sellerId && so.sellerId !== params.sellerId) return false;
    const t = new Date(so.createdAt).getTime();
    if (fromMs && Number.isFinite(fromMs) && t < fromMs) return false;
    if (toMs && Number.isFinite(toMs) && t > toMs) return false;
    return true;
  });

  const nonCancelledSuborders = suborders.filter((so) => so.fulfillmentStatus !== 'CANCELLED');
  const gmv = roundMoney(nonCancelledSuborders.reduce((s, so) => s + Number(so.subtotal || 0), 0));
  const commissionRevenue = roundMoney(nonCancelledSuborders.reduce((s, so) => s + Number(so.commissionAmount || 0), 0));
  const gstOnCommission = roundMoney(nonCancelledSuborders.reduce((s, so) => s + Number(so.gstOnCommission || 0), 0));

  const returnsList = Array.from(dbSellerReturns.values()).filter((r) =>
    params.sellerId ? r.sellerId === params.sellerId : true
  );
  const returnCount = returnsList.length;
  const orderCount = suborders.length;
  const returnRatePercent = orderCount > 0 ? roundMoney((returnCount / orderCount) * 100) : 0;

  const deliveredCount = suborders.filter((so) => so.fulfillmentStatus === 'DELIVERED').length;
  const fulfillmentRatePercent =
    orderCount > 0 ? roundMoney((deliveredCount / orderCount) * 100) : 0;

  // Compute daily/monthly revenue breakdown directly from real orders + suborders
  const monthlyBucket = new Map<string, { month: string; sales: number; orders: number }>();
  for (const so of nonCancelledSuborders) {
    const dt = new Date(so.createdAt);
    const label = dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const curr = monthlyBucket.get(label) || { month: label, sales: 0, orders: 0 };
    curr.sales = roundMoney(curr.sales + Number(so.subtotal || 0));
    curr.orders += 1;
    monthlyBucket.set(label, curr);
  }

  // Ad spend & attributed ad revenue
  const campaigns = Array.from(adCampaigns.values()).filter((c) =>
    params.sellerId ? c.sellerId === params.sellerId : true
  );
  const totalAdSpend = roundMoney(campaigns.reduce((s, c) => s + c.spentAmount, 0));
  const totalAdRevenue = roundMoney(campaigns.reduce((s, c) => s + c.attributedRevenue, 0));

  const activeSellers = Array.from(dbSellers.values()).filter((s) => s.approvalStatus === 'APPROVED').length;
  const pendingKYCSellers = Array.from(dbSellers.values()).filter((s) =>
    ['PENDING_APPROVAL', 'SUBMITTED', 'UNDER_REVIEW', 'RESUBMISSION_REQUIRED'].includes(s.approvalStatus)
  ).length;
  const pendingProducts = Array.from(dbProducts.values()).filter((p) =>
    ['PENDING_APPROVAL', 'SUBMITTED', 'UNDER_REVIEW'].includes(p.status)
  ).length;
  const lowStockCount = Array.from(warehouseInventories.values()).filter(
    (inv) => inv.availableQty <= inv.lowStockThreshold
  ).length;

  const totalLedgerDebits = roundMoney(
    financeLedgerEntries.filter((e) => e.entryType === 'DEBIT').reduce((s, e) => s + e.amount, 0)
  );
  const totalLedgerCredits = roundMoney(
    financeLedgerEntries.filter((e) => e.entryType === 'CREDIT').reduce((s, e) => s + e.amount, 0)
  );

  const sellersList = Array.from(dbSellers.values());
  const disbursedToVendors = roundMoney(
    Array.from(dbSellerWallets.values())
      .filter((w) => (params.sellerId ? w.sellerId === params.sellerId : true))
      .reduce((s, w) => s + Number(w.totalWithdrawn || 0), 0)
  );

  return {
    grossMerchandiseValue: gmv,
    totalOrders: params.sellerId ? orderCount : params.ordersList.length,
    totalSuborders: orderCount,
    averageOrderValue: orderCount > 0 ? roundMoney(gmv / Math.max(1, nonCancelledSuborders.length)) : 0,
    commissionRevenue,
    gstOnCommission,
    platformTakeRate: gmv > 0 ? `${roundMoney((commissionRevenue / gmv) * 100)}%` : '0%',
    disbursedToVendors,
    activeSellers,
    totalSellers: sellersList.length,
    pendingKYCSellers,
    activeListings: Array.from(dbProducts.values()).filter((p) => p.status === 'APPROVED').length,
    pendingProducts,
    lowStockCount,
    returnCount,
    returnRate: `${returnRatePercent}%`,
    fulfillmentRate: `${fulfillmentRatePercent}%`,
    totalAdSpend,
    totalAdRevenue,
    ledgerBalanced: Math.abs(totalLedgerDebits - totalLedgerCredits) <= 0.01,
    monthlyTrend: Array.from(monthlyBucket.values()),
  };
}
