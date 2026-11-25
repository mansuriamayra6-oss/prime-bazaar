import express from 'express';
import crypto from 'crypto';
import { requireAuth, requireRole, requireSellerOwnership } from './security.ts';
import {
  requirePermission,
  roleDefinitions,
  adminStaffMembers,
  createAdminStaffMember,
  sanitizeAdminStaff,
  queryAuditLogs,
  recordAuditLog,
  AdminStaffRoleName,
} from './auditAndRbac.ts';
import { createSellerSettlementRequest, generateFinanceExport } from './financeLedger.ts';
import {
  sanitizeSellerForApi,
  acceptSellerTerms,
  transitionSellerOnboardingStatus,
  sellerNotifications,
  sellerStaffDirectory,
  transitionProductModerationStatus,
  cmsBanners,
  getActivePublishedBanners,
  upsertCmsBanner,
  manageCategoryCms,
  reorderCategoriesCms,
  manageBrandCms,
  moderateReviewOrQa,
  adCampaigns,
  createAdCampaign,
  moderateAdCampaign,
  getEligibleSponsoredAds,
  recordSponsoredAdEvent,
  suppliers,
  createSupplier,
  purchaseOrders,
  createPurchaseOrder,
  transitionPurchaseOrderStatus,
  goodsReceipts,
  receiveGoodsReceiptForPo,
  supplierInvoices,
  computeRealPlatformAnalytics,
} from './marketplaceOpsService.ts';
import { dbSellers, dbProducts, dbCategories, dbBrands, dbAuditLogs } from './v1Router.ts';

export interface Phase5RouterDeps {
  getOrdersMap: () => Map<string, any>;
}

export function createPhase5Router(deps: Phase5RouterDeps) {
  const router = express.Router();

  // =========================================================================
  // 1. PUBLIC CMS & SPONSORED ADS STOREFRONT ENDPOINTS
  // =========================================================================

  router.get('/cms/banners', (req, res) => {
    const placement = req.query.placement as string | undefined;
    res.json({ success: true, banners: getActivePublishedBanners(placement) });
  });

  router.get('/cms/categories', (_req, res) => {
    const active = dbCategories
      .filter((c: any) => c.isActive !== false)
      .slice()
      .sort((a: any, b: any) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
    res.json({
      success: true,
      categories: active,
      totalCount: active.length,
    });
  });

  router.get('/cms/brands', (_req, res) => {
    res.json({
      success: true,
      brands: dbBrands.filter((b: any) => b.isActive !== false),
    });
  });

  router.get('/ads/sponsored', (req, res) => {
    const ads = getEligibleSponsoredAds({
      placement: req.query.placement as string | undefined,
      category: req.query.category as string | undefined,
      searchQuery: req.query.q as string | undefined,
      limit: Number(req.query.limit) || 4,
    });
    res.json({ success: true, sponsored: ads });
  });

  router.post('/ads/events', async (req, res) => {
    try {
      const { campaignId, productId, eventType, sessionKey, orderId, attributedRevenue } = req.body || {};
      if (!campaignId || !productId || !eventType) {
        return res.status(400).json({ success: false, error: 'campaignId, productId, and eventType are required.' });
      }
      const cleanSession =
        (typeof sessionKey === 'string' && sessionKey.trim()) ||
        (typeof req.headers['x-pb-session'] === 'string' && req.headers['x-pb-session'].trim()) ||
        req.auth?.userId ||
        req.ip ||
        'anon';
      const result = await recordSponsoredAdEvent({
        campaignId: String(campaignId),
        productId: String(productId),
        eventType: String(eventType).toUpperCase() as any,
        sessionKey: String(cleanSession),
        userId: req.auth?.userId,
        orderId,
        attributedRevenue,
      });
      res.status(201).json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // 2. SELLER ONBOARDING, STAFF, SETTLEMENTS, MODERATION & CAMPAIGNS
  // =========================================================================

  router.post('/seller/onboarding/terms', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => {
    try {
      const sellerId = req.auth!.sellerId || req.body?.sellerId;
      if (!sellerId) return res.status(400).json({ success: false, error: 'sellerId is required.' });
      const result = acceptSellerTerms(sellerId, req.body?.version || 'v2026.2');
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/seller/onboarding/resubmit', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => {
    try {
      const sellerId = req.auth!.sellerId || req.body?.sellerId;
      const seller = dbSellers.get(sellerId);
      if (!seller) return res.status(404).json({ success: false, error: 'Seller not found.' });
      if (req.body?.gstNumber) seller.gstNumber = String(req.body.gstNumber).trim();
      if (req.body?.panNumber) seller.panNumber = String(req.body.panNumber).trim().toUpperCase();
      if (req.body?.pickupAddress) seller.pickupAddress = req.body.pickupAddress;
      if (req.body?.bankAccount) seller.bankAccount = req.body.bankAccount;

      const updated = transitionSellerOnboardingStatus({
        sellerId: seller.id,
        toStatus: 'SUBMITTED',
        reason: req.body?.notes || 'Resubmitted KYC dossier for admin review',
        actorId: req.auth!.userId,
        actorName: seller.businessName,
        actorRole: req.auth!.role,
      });
      res.json({ success: true, seller: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/seller/notifications', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => {
    const sellerId = req.auth!.role === 'SELLER' ? req.auth!.sellerId : (req.query.sellerId as string | undefined) || 'seller-1';
    const list = sellerNotifications.filter((n) => n.sellerId === sellerId);
    res.json({ success: true, notifications: list });
  });

  router.post('/seller/notifications/:id/read', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => {
    const target = sellerNotifications.find((n) => n.id === req.params.id);
    if (!target) return res.status(404).json({ success: false, error: 'Notification not found.' });
    if (req.auth!.role === 'SELLER' && target.sellerId !== req.auth!.sellerId) {
      return res.status(403).json({ success: false, error: 'Forbidden.' });
    }
    target.isRead = true;
    res.json({ success: true, notification: target });
  });

  router.get('/seller/staff', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => {
    const sellerId = req.auth!.role === 'SELLER' ? req.auth!.sellerId! : (req.query.sellerId as string) || 'seller-1';
    res.json({ success: true, staff: sellerStaffDirectory.get(sellerId) || [] });
  });

  router.post('/seller/staff', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => {
    const sellerId = req.auth!.role === 'SELLER' ? req.auth!.sellerId! : (req.body?.sellerId as string) || 'seller-1';
    const { name, email, staffRole = 'MANAGER', permissions = [] } = req.body || {};
    if (!name || !email) return res.status(400).json({ success: false, error: 'Staff name and email are required.' });
    const list = sellerStaffDirectory.get(sellerId) || [];
    const member = {
      id: `sstf_${crypto.randomBytes(4).toString('hex')}`,
      sellerId,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      staffRole,
      permissions: Array.isArray(permissions) ? permissions : [],
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    list.push(member);
    sellerStaffDirectory.set(sellerId, list);
    res.status(201).json({ success: true, staffMember: member });
  });

  router.post('/seller/settlements/request', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => {
    try {
      const sellerId = req.auth!.role === 'SELLER' ? req.auth!.sellerId! : (req.body?.sellerId as string);
      const { amount, idempotencyKey } = req.body || {};
      const result = createSellerSettlementRequest({
        sellerId,
        amount: Number(amount),
        idempotencyKey,
        actorId: req.auth!.userId,
      });
      res.status(result.duplicate ? 200 : 201).json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post(
    '/seller/products/:id/submit',
    requireAuth,
    requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'),
    requireSellerOwnership((req) => dbProducts.get(req.params.id)?.sellerId),
    (req, res) => {
      try {
        const prod = transitionProductModerationStatus({
          productId: req.params.id,
          toStatus: 'SUBMITTED',
          reason: req.body?.notes || 'Submitted for catalog approval',
          actorId: req.auth!.userId,
          actorName: req.auth!.name || 'Seller',
          actorRole: req.auth!.role,
        });
        res.json({ success: true, product: prod });
      } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
      }
    }
  );

  router.get('/seller/ads/campaigns', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => {
    const sellerId = req.auth!.role === 'SELLER' ? req.auth!.sellerId : (req.query.sellerId as string | undefined);
    const list = Array.from(adCampaigns.values()).filter((c) => (sellerId ? c.sellerId === sellerId : true));
    res.json({ success: true, campaigns: list });
  });

  router.post('/seller/ads/campaigns', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => {
    try {
      const sellerId = req.auth!.role === 'SELLER' ? req.auth!.sellerId! : (req.body?.sellerId as string);
      const camp = createAdCampaign({
        ...req.body,
        sellerId,
      });
      res.status(201).json({ success: true, campaign: camp });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/seller/ads/campaigns/:id/pause', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => {
    try {
      const camp = adCampaigns.get(req.params.id);
      if (!camp) return res.status(404).json({ success: false, error: 'Campaign not found.' });
      if (req.auth!.role === 'SELLER' && camp.sellerId !== req.auth!.sellerId) {
        return res.status(403).json({ success: false, error: 'Forbidden.' });
      }
      camp.status = 'PAUSED';
      camp.updatedAt = new Date().toISOString();
      res.json({ success: true, campaign: camp });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // 3. ADMIN SELLER LIFECYCLE, PRODUCT/REVIEW MODERATION & CMS
  // =========================================================================

  router.post('/admin/sellers/:id/review', requireAuth, requirePermission('sellers.review'), (req, res) => {
    try {
      const { toStatus, reason } = req.body || {};
      if (!toStatus) return res.status(400).json({ success: false, error: 'toStatus is required.' });
      const seller = transitionSellerOnboardingStatus({
        sellerId: req.params.id,
        toStatus,
        reason,
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Admin Moderator',
        actorRole: req.auth!.role,
      });
      res.json({ success: true, seller });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/admin/products/:id/moderate', requireAuth, requirePermission('products.moderate'), (req, res) => {
    try {
      const { toStatus, reason } = req.body || {};
      if (!toStatus) return res.status(400).json({ success: false, error: 'toStatus is required.' });
      const product = transitionProductModerationStatus({
        productId: req.params.id,
        toStatus,
        reason,
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Catalog Moderator',
        actorRole: req.auth!.role,
      });
      res.json({ success: true, product });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/admin/products/all', requireAuth, requirePermission('products.moderate'), (_req, res) => {
    res.json({ success: true, products: Array.from(dbProducts.values()) });
  });

  router.get('/admin/cms/banners', requireAuth, requirePermission('cms.manage'), (_req, res) => {
    res.json({ success: true, banners: Array.from(cmsBanners.values()).sort((a, b) => a.priority - b.priority) });
  });

  router.post('/admin/cms/banners', requireAuth, requirePermission('cms.manage'), (req, res) => {
    try {
      const banner = upsertCmsBanner({
        ...req.body,
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Catalog Moderator',
      });
      res.status(201).json({ success: true, banner });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.put('/admin/cms/banners/:id', requireAuth, requirePermission('cms.manage'), (req, res) => {
    try {
      const banner = upsertCmsBanner({
        ...req.body,
        id: req.params.id,
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Catalog Moderator',
      });
      res.json({ success: true, banner });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/admin/cms/categories', requireAuth, requirePermission('cms.manage'), (_req, res) => {
    const sorted = dbCategories
      .slice()
      .sort((a: any, b: any) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
    res.json({
      success: true,
      categories: sorted,
      totalCount: sorted.length,
    });
  });

  router.post('/admin/cms/categories', requireAuth, requirePermission('cms.manage'), (req, res) => {
    try {
      const category = manageCategoryCms({
        action: 'CREATE',
        ...req.body,
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Admin',
      });
      res.status(201).json({ success: true, category });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.put('/admin/cms/categories/reorder', requireAuth, requirePermission('cms.manage'), (req, res) => {
    try {
      const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds.map(String) : [];
      if (orderedIds.length === 0) {
        return res.status(400).json({ success: false, error: 'orderedIds array is required.' });
      }
      const categories = reorderCategoriesCms({
        orderedIds,
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Admin',
      });
      res.json({ success: true, categories });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.put('/admin/cms/categories/:id', requireAuth, requirePermission('cms.manage'), (req, res) => {
    try {
      const category = manageCategoryCms({
        action: 'UPDATE',
        id: req.params.id,
        ...req.body,
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Admin',
      });
      res.json({ success: true, category });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/admin/cms/brands', requireAuth, requirePermission('cms.manage'), (req, res) => {
    try {
      const brand = manageBrandCms({
        action: 'CREATE',
        ...req.body,
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Admin',
      });
      res.status(201).json({ success: true, brand });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.put('/admin/cms/brands/:id', requireAuth, requirePermission('cms.manage'), (req, res) => {
    try {
      const brand = manageBrandCms({
        action: 'UPDATE',
        id: req.params.id,
        ...req.body,
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Admin',
      });
      res.json({ success: true, brand });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/admin/moderation/content', requireAuth, requirePermission('reviews.moderate'), (req, res) => {
    try {
      const { targetType, targetId, productId, status, reason } = req.body || {};
      if (!targetType || !targetId || !productId || !status) {
        return res.status(400).json({ success: false, error: 'targetType, targetId, productId, and status are required.' });
      }
      const mod = moderateReviewOrQa({
        targetType,
        targetId,
        productId,
        status,
        reason,
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Moderator',
        actorRole: req.auth!.role,
      });
      res.json({ success: true, moderation: mod });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // 4. ADMIN ADS, SUPPLIERS, PURCHASE ORDERS & GOODS RECEIPT (GRN)
  // =========================================================================

  router.get('/admin/ads/campaigns', requireAuth, requirePermission('ads.moderate'), (_req, res) => {
    res.json({ success: true, campaigns: Array.from(adCampaigns.values()) });
  });

  router.post('/admin/ads/campaigns/:id/moderate', requireAuth, requirePermission('ads.moderate'), (req, res) => {
    try {
      const { action, reason } = req.body || {};
      const campaign = moderateAdCampaign({
        campaignId: req.params.id,
        action: String(action || 'APPROVE').toUpperCase() as any,
        reason,
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Ad Moderator',
      });
      res.json({ success: true, campaign });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/admin/suppliers', requireAuth, requirePermission('suppliers.manage'), (_req, res) => {
    res.json({ success: true, suppliers: Array.from(suppliers.values()) });
  });

  router.post('/admin/suppliers', requireAuth, requirePermission('suppliers.manage'), (req, res) => {
    try {
      const supplier = createSupplier({
        ...req.body,
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Operations Admin',
      });
      res.status(201).json({ success: true, supplier });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/admin/purchase-orders', requireAuth, requirePermission('purchase_orders.manage'), (_req, res) => {
    res.json({ success: true, purchaseOrders: Array.from(purchaseOrders.values()) });
  });

  router.post('/admin/purchase-orders', requireAuth, requirePermission('purchase_orders.manage'), (req, res) => {
    try {
      const po = createPurchaseOrder({
        ...req.body,
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Operations Admin',
      });
      res.status(201).json({ success: true, purchaseOrder: po });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/admin/purchase-orders/:id/status', requireAuth, requirePermission('purchase_orders.manage'), (req, res) => {
    try {
      const po = transitionPurchaseOrderStatus({
        poId: req.params.id,
        toStatus: req.body?.toStatus,
        reason: req.body?.reason,
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Operations Admin',
      });
      res.json({ success: true, purchaseOrder: po });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/admin/goods-receipts', requireAuth, requirePermission('grn.receive'), (_req, res) => {
    res.json({ success: true, goodsReceipts: Array.from(goodsReceipts.values()) });
  });

  router.post('/admin/purchase-orders/:id/grn', requireAuth, requirePermission('grn.receive'), async (req, res) => {
    try {
      const result = await receiveGoodsReceiptForPo({
        poId: req.params.id,
        supplierInvoiceRef: req.body?.supplierInvoiceRef,
        notes: req.body?.notes,
        items: req.body?.items || [],
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Warehouse Operations',
      });
      res.status(201).json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/admin/supplier-invoices', requireAuth, requirePermission('finance.read'), (_req, res) => {
    res.json({ success: true, invoices: Array.from(supplierInvoices.values()) });
  });

  // =========================================================================
  // 5. ADMIN STAFF PERMISSIONS, FILTERED AUDIT LOGS & REAL ANALYTICS
  // =========================================================================

  router.get('/admin/staff/roles', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), (_req, res) => {
    res.json({ success: true, roles: Array.from(roleDefinitions.values()) });
  });

  router.put('/admin/staff/roles/:roleName', requireAuth, requireRole('SUPER_ADMIN'), (req, res) => {
    const roleName = req.params.roleName as AdminStaffRoleName;
    const def = roleDefinitions.get(roleName);
    if (!def) return res.status(404).json({ success: false, error: 'Role definition not found.' });
    if (Array.isArray(req.body?.permissions)) {
      def.permissions = req.body.permissions.map(String);
      def.updatedAt = new Date().toISOString();
    }
    res.json({ success: true, role: def });
  });

  router.get('/admin/staff', requireAuth, requireRole('SUPER_ADMIN'), (_req, res) => {
    res.json({
      success: true,
      staff: Array.from(adminStaffMembers.values()).map(sanitizeAdminStaff),
    });
  });

  router.post('/admin/staff', requireAuth, requireRole('SUPER_ADMIN'), (req, res) => {
    try {
      const member = createAdminStaffMember(req.body || {});
      recordAuditLog({
        actorType: 'ADMIN',
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Super Admin',
        actorRole: 'SUPER_ADMIN',
        action: 'ADMIN_STAFF_CREATED',
        entityType: 'ADMIN_STAFF',
        entityId: member.id,
        afterState: { email: member.email, roleName: member.roleName },
        details: `Created admin staff user ${member.name} (${member.roleName}).`,
        legacyAuditSink: dbAuditLogs,
      });
      res.status(201).json({ success: true, staffMember: sanitizeAdminStaff(member) });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.patch('/admin/staff/:id/status', requireAuth, requireRole('SUPER_ADMIN'), (req, res) => {
    const member = adminStaffMembers.get(req.params.id);
    if (!member) return res.status(404).json({ success: false, error: 'Staff member not found.' });
    member.isActive = Boolean(req.body?.isActive);
    member.updatedAt = new Date().toISOString();
    res.json({ success: true, staffMember: sanitizeAdminStaff(member) });
  });

  router.get('/admin/audit-logs/search', requireAuth, requirePermission('audit.read'), (req, res) => {
    const result = queryAuditLogs({
      entityType: req.query.entityType as string | undefined,
      entityId: req.query.entityId as string | undefined,
      action: req.query.action as string | undefined,
      actorRole: req.query.actorRole as string | undefined,
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
      search: req.query.search as string | undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
    });
    res.json({ success: true, ...result });
  });

  router.get('/admin/analytics', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), (req, res) => {
    const analytics = computeRealPlatformAnalytics({
      ordersList: Array.from(deps.getOrdersMap().values()),
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
      sellerId: req.query.sellerId as string | undefined,
    });
    res.json({ success: true, analytics });
  });

  router.get('/admin/analytics/export', requireAuth, requirePermission('finance.export'), async (req, res) => {
    try {
      const format = String(req.query.format || 'csv').toLowerCase() === 'xlsx' ? 'xlsx' : 'csv';
      const analytics = computeRealPlatformAnalytics({
        ordersList: Array.from(deps.getOrdersMap().values()),
        fromDate: req.query.fromDate as string | undefined,
        toDate: req.query.toDate as string | undefined,
        sellerId: req.query.sellerId as string | undefined,
      });

      const exported = await generateFinanceExport({
        format,
        reportType: 'platform_analytics',
        headers: ['Metric', 'Value'],
        rows: [
          ['Gross Merchandise Value (INR)', analytics.grossMerchandiseValue],
          ['Total Orders', analytics.totalOrders],
          ['Total Seller Suborders', analytics.totalSuborders],
          ['Commission Revenue (INR)', analytics.commissionRevenue],
          ['GST on Commission (INR)', analytics.gstOnCommission],
          ['Disbursed to Sellers (INR)', analytics.disbursedToVendors],
          ['Active Sellers', analytics.activeSellers],
          ['Pending KYC Sellers', analytics.pendingKYCSellers],
          ['Active Listings', analytics.activeListings],
          ['Low Stock Variants', analytics.lowStockCount],
          ['Sponsored Ad Spend (INR)', analytics.totalAdSpend],
          ['Sponsored Attributed Revenue (INR)', analytics.totalAdRevenue],
          ['Ledger Double-Entry Balanced', analytics.ledgerBalanced ? 'YES' : 'NO'],
        ],
        filters: { fromDate: req.query.fromDate, toDate: req.query.toDate, sellerId: req.query.sellerId },
        requestedBy: req.auth!.userId,
        actorName: req.auth!.name || 'Admin Analyst',
      });

      res.setHeader('Content-Type', exported.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
      res.send(exported.buffer);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  return router;
}
