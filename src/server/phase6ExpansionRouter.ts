import express from 'express';
import crypto from 'crypto';
import {
  extractBearerToken,
  getSession,
  hashPassword,
  requireAuth,
  requireRole,
  safeCompareStrings,
  verifyPassword,
} from './security.ts';
import {
  getLoyaltySummary,
  claimDailyCheckIn,
  playSpinWheel,
  playScratchCard,
  applyReferralCode,
  runCoinExpirySweep,
  setPersonalizationPreference,
  adminAdjustLoyaltyCoins,
  updateTierConfig,
  getIntlConfigSnapshot,
  calculateInternationalLandedQuote,
  validateInternationalAddress,
  adminUpsertCountryConfig,
  adminUpsertExchangeRate,
} from './loyaltyAndIntlService.ts';
import {
  getSmartSearchSuggestions,
  getProductRecommendations,
  performVisualSearch,
  lookupProductByBarcodeOrCode,
} from './smartDiscoveryService.ts';
import {
  ensurePhase6GSeeded,
  dbSubscriptionPlans,
  dbCustomerSubscriptions,
  dbB2BAccounts,
  dbQuoteRequests,
  dbDigitalAssets,
  createCustomerSubscription,
  updateCustomerSubscriptionStatus,
  processSubscriptionRenewal,
  registerB2BAccount,
  reviewB2BAccount,
  getBulkPricingForProduct,
  createRfqRequest,
  sellerQuoteRfq,
  registerDigitalAsset,
  getDigitalGrantsForUser,
  consumeDigitalDownload,
} from './b2bSubDigitalService.ts';

export interface MobileDeviceTokenRecord {
  id: string;
  userId?: string;
  platform: 'android' | 'ios' | 'web';
  pushToken: string;
  appVersion: string;
  deviceModel?: string;
  active?: boolean;
  registeredAt: string;
  updatedAt?: string;
}

export interface NotificationPreferenceRecord {
  userId: string;
  orderConfirmation: boolean;
  paymentConfirmation: boolean;
  shippingUpdates: boolean;
  returnRefundUpdates: boolean;
  sellerAlerts: boolean;
  promotionalOffers: boolean;
  updatedAt: string;
}

export interface UserNotificationItem {
  id: string;
  userId: string;
  category:
    | 'order_confirmation'
    | 'payment_confirmation'
    | 'shipping_update'
    | 'return_refund'
    | 'seller_alert'
    | 'promotion';
  title: string;
  body: string;
  deepLinkPath: string;
  deliveredDevices: number;
  createdAt: string;
  read: boolean;
}

export interface BiometricCredentialRecord {
  id: string;
  credentialId: string;
  userId: string;
  authenticatorType: 'webauthn' | 'capacitor-biometric' | 'device-passkey';
  deviceName: string;
  publicKeySpkiBase64?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export const dbMobileDeviceTokens: Map<string, MobileDeviceTokenRecord> = new Map();
export const dbNotificationPreferences: Map<string, NotificationPreferenceRecord> = new Map();
export const dbUserNotifications: Map<string, UserNotificationItem[]> = new Map();
export const dbBiometricCredentials: Map<string, BiometricCredentialRecord[]> = new Map();
export const dbBiometricPinHashes: Map<string, string> = new Map();
const dbBiometricChallenges: Map<
  string,
  { challenge: string; userId: string; expiresAt: number }
> = new Map();
const dbBiometricFailures: Map<string, { count: number; lockedUntil: number }> = new Map();

export interface Phase6ExpansionRouterDeps {
  getOrdersMap: () => Map<string, any>;
  findUserByIdentifier?: (identifier: string) => any | undefined;
  createSessionForUser?: (user: any) => { token: string; user: any };
  verifyUserPassword?: (user: any, password: string) => boolean;
}

function resolveOptionalUserId(req: express.Request): string | undefined {
  const token = extractBearerToken(req);
  if (token) {
    const sess = getSession(token);
    if (sess) return sess.userId;
  }
  return undefined;
}

export function createPhase6ExpansionRouter(deps: Phase6ExpansionRouterDeps) {
  const router = express.Router();

  // =========================================================================
  // PHASE 6D: LOYALTY, REWARDS, CHECK-IN, SPIN, SCRATCH, REFERRALS & EXPIRY
  // =========================================================================

  router.get('/loyalty/me', requireAuth, (req, res) => {
    const summary = getLoyaltySummary(req.auth!.userId, req.auth!.name);
    res.json({ success: true, ...summary });
  });

  router.post('/loyalty/check-in', requireAuth, (req, res) => {
    const result = claimDailyCheckIn(req.auth!.userId);
    res.json({ success: true, ...result });
  });

  router.post('/loyalty/spin', requireAuth, (req, res) => {
    try {
      const result = playSpinWheel(req.auth!.userId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/loyalty/scratch', requireAuth, (req, res) => {
    const result = playScratchCard(req.auth!.userId);
    res.json({ success: true, ...result });
  });

  router.post('/loyalty/referral/apply', requireAuth, (req, res) => {
    try {
      const result = applyReferralCode(req.auth!.userId, String(req.body?.referralCode || ''));
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.put('/loyalty/personalization', requireAuth, (req, res) => {
    const enabled = Boolean(req.body?.personalizationOn);
    const updated = setPersonalizationPreference(req.auth!.userId, enabled);
    res.json({ success: true, ...updated });
  });

  router.post(
    '/admin/loyalty/expiry-sweep',
    requireAuth,
    requireRole('ADMIN', 'SUPER_ADMIN'),
    (req, res) => {
      const customNow = req.body?.simulateFutureDays
        ? Date.now() + Number(req.body.simulateFutureDays) * 86400000
        : Date.now();
      const result = runCoinExpirySweep(customNow);
      res.json({ success: true, ...result });
    }
  );

  router.post(
    '/admin/loyalty/adjust',
    requireAuth,
    requireRole('ADMIN', 'SUPER_ADMIN'),
    (req, res) => {
      try {
        const result = adminAdjustLoyaltyCoins({
          targetUserId: String(req.body?.userId || ''),
          coinsDelta: Number(req.body?.coinsDelta),
          reason: String(req.body?.reason || 'Admin loyalty adjustment'),
          actorId: req.auth!.userId,
          actorName: req.auth!.name || 'Admin',
          actorRole: req.auth!.role,
        });
        res.json({ success: true, ...result });
      } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
      }
    }
  );

  router.put(
    '/admin/loyalty/tiers/:tierName',
    requireAuth,
    requireRole('ADMIN', 'SUPER_ADMIN'),
    (req, res) => {
      try {
        const tierName = req.params.tierName.toUpperCase() as 'SILVER' | 'GOLD' | 'PLATINUM';
        const tier = updateTierConfig({
          tierName,
          minLifetimePts:
            req.body?.minLifetimePts !== undefined ? Number(req.body.minLifetimePts) : undefined,
          earnMultiplier:
            req.body?.earnMultiplier !== undefined ? Number(req.body.earnMultiplier) : undefined,
          perks: req.body?.perks,
          actorId: req.auth!.userId,
          actorName: req.auth!.name || 'Admin',
          actorRole: req.auth!.role,
        });
        res.json({ success: true, tier });
      } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
      }
    }
  );

  // =========================================================================
  // PHASE 6E: TYPO-TOLERANT SMART SEARCH, RECOMMENDATIONS & GEMINI VISUAL SEARCH
  // =========================================================================

  router.get('/discovery/search-suggest', (req, res) => {
    const q = String(req.query.q || '');
    const result = getSmartSearchSuggestions(q);
    res.json({ success: true, ...result });
  });

  router.get('/discovery/recommendations', (req, res) => {
    const userId = resolveOptionalUserId(req) || (req.query.userId ? String(req.query.userId) : undefined);
    const productId = req.query.productId ? String(req.query.productId) : undefined;
    const cartProductIds = req.query.cartIds
      ? String(req.query.cartIds)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const orders = Array.from(deps.getOrdersMap().values());
    const result = getProductRecommendations({
      userId,
      productId,
      cartProductIds,
      orders,
    });
    res.json({ success: true, ...result });
  });

  router.post('/ai/visual-search', async (req, res) => {
    try {
      const result = await performVisualSearch({
        imageBase64: typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64 : undefined,
        mimeType: typeof req.body?.mimeType === 'string' ? req.body.mimeType : undefined,
        imageUrl: typeof req.body?.imageUrl === 'string' ? req.body.imageUrl : undefined,
        hintCategory: typeof req.body?.hintCategory === 'string' ? req.body.hintCategory : undefined,
        hintKeywords: Array.isArray(req.body?.hintKeywords) ? req.body.hintKeywords : undefined,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Visual search failed.' });
    }
  });

  router.get('/discovery/barcode/:code', (req, res) => {
    const code = decodeURIComponent(String(req.params.code || '')).trim();
    if (!code) {
      return res.status(400).json({ success: false, error: 'Barcode or QR payload is required.' });
    }
    const result = lookupProductByBarcodeOrCode(code);
    return res.json({ success: true, ...result });
  });

  // =========================================================================
  // PHASE 6F: INTERNATIONAL CONFIG, FX RATES, LANDED QUOTE & ADDRESS VALIDATION
  // =========================================================================

  router.get('/intl/config', (_req, res) => {
    const snapshot = getIntlConfigSnapshot();
    res.json({ success: true, ...snapshot });
  });

  router.post('/intl/validate-address', (req, res) => {
    const validation = validateInternationalAddress({
      countryCode: String(req.body?.countryCode || 'IN'),
      postalCode: req.body?.postalCode ? String(req.body.postalCode) : undefined,
      phone: req.body?.phone ? String(req.body.phone) : undefined,
    });
    if (!validation.valid) {
      return res.status(400).json({ success: false, ...validation });
    }
    res.json({ success: true, ...validation });
  });

  router.post('/intl/quote', (req, res) => {
    try {
      const quote = calculateInternationalLandedQuote({
        countryCode: req.body?.countryCode,
        targetCurrency: req.body?.targetCurrency,
        subtotalInr: Number(req.body?.subtotalInr ?? 0),
        paymentMethod: req.body?.paymentMethod,
      });
      res.json({ success: true, quote });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.put(
    '/admin/intl/countries/:countryCode',
    requireAuth,
    requireRole('ADMIN', 'SUPER_ADMIN'),
    (req, res) => {
      try {
        const country = adminUpsertCountryConfig({
          countryCode: req.params.countryCode,
          countryName: req.body?.countryName,
          currencyCode: req.body?.currencyCode,
          isActive: req.body?.isActive,
          shippingFeeInr: req.body?.shippingFeeInr !== undefined ? Number(req.body.shippingFeeInr) : undefined,
          freeShippingThresholdInr:
            req.body?.freeShippingThresholdInr !== undefined
              ? Number(req.body.freeShippingThresholdInr)
              : undefined,
          customsDutyPercent:
            req.body?.customsDutyPercent !== undefined ? Number(req.body.customsDutyPercent) : undefined,
          taxPercent: req.body?.taxPercent !== undefined ? Number(req.body.taxPercent) : undefined,
          codAllowed: req.body?.codAllowed,
          actorId: req.auth!.userId,
          actorName: req.auth!.name || 'Admin',
          actorRole: req.auth!.role,
        });
        res.json({ success: true, country });
      } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
      }
    }
  );

  router.put(
    '/admin/intl/fx/:currencyCode',
    requireAuth,
    requireRole('ADMIN', 'SUPER_ADMIN'),
    (req, res) => {
      try {
        const rate = adminUpsertExchangeRate({
          currencyCode: req.params.currencyCode,
          rateFromInr: Number(req.body?.rateFromInr),
          symbol: req.body?.symbol,
          sourceLabel: req.body?.sourceLabel,
          actorId: req.auth!.userId,
          actorName: req.auth!.name || 'Admin',
          actorRole: req.auth!.role,
        });
        res.json({ success: true, rate });
      } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
      }
    }
  );

  // =========================================================================
  // PHASE 6G: SUBSCRIPTIONS, B2B WHOLESALE & SIGNED DIGITAL DOWNLOADS
  // =========================================================================

  router.get('/subscriptions/plans', (req, res) => {
    ensurePhase6GSeeded();
    const productId = req.query.productId ? String(req.query.productId) : null;
    let plans = Array.from(dbSubscriptionPlans.values()).filter((p) => p.isActive);
    if (productId) plans = plans.filter((p) => p.productId === productId);
    res.json({ success: true, plans });
  });

  router.get('/subscriptions/me', requireAuth, (req, res) => {
    ensurePhase6GSeeded();
    const subscriptions = Array.from(dbCustomerSubscriptions.values()).filter(
      (s) => s.userId === req.auth!.userId
    );
    res.json({ success: true, subscriptions });
  });

  router.post('/subscriptions', requireAuth, (req, res) => {
    try {
      const subscription = createCustomerSubscription({
        userId: req.auth!.userId,
        planId: String(req.body?.planId || ''),
      });
      res.status(201).json({ success: true, subscription });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/subscriptions/:subId/action', requireAuth, (req, res) => {
    try {
      const action = String(req.body?.action || '').toUpperCase() as 'PAUSE' | 'RESUME' | 'CANCEL';
      if (!['PAUSE', 'RESUME', 'CANCEL'].includes(action)) {
        return res.status(400).json({ success: false, error: 'Invalid subscription action.' });
      }
      const subscription = updateCustomerSubscriptionStatus({
        subscriptionId: req.params.subId,
        userId: req.auth!.userId,
        role: req.auth!.role,
        action,
      });
      res.json({ success: true, subscription });
    } catch (err: any) {
      res.status(err?.statusCode || 400).json({ success: false, error: err.message });
    }
  });

  router.post('/subscriptions/:subId/renew', requireAuth, (req, res) => {
    try {
      const result = processSubscriptionRenewal({
        subscriptionId: req.params.subId,
        userId: req.auth!.userId,
        role: req.auth!.role,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(err?.statusCode || 400).json({ success: false, error: err.message });
    }
  });

  // --- B2B Wholesale ---

  router.get('/b2b/account', requireAuth, (req, res) => {
    ensurePhase6GSeeded();
    const account = dbB2BAccounts.get(req.auth!.userId) || null;
    res.json({ success: true, account });
  });

  router.post('/b2b/register', requireAuth, (req, res) => {
    try {
      const account = registerB2BAccount({
        userId: req.auth!.userId,
        companyName: String(req.body?.companyName || ''),
        gstin: String(req.body?.gstin || ''),
        businessType: req.body?.businessType,
      });
      res.status(201).json({ success: true, account });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/admin/b2b/accounts', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), (_req, res) => {
    ensurePhase6GSeeded();
    res.json({ success: true, accounts: Array.from(dbB2BAccounts.values()) });
  });

  router.post(
    '/admin/b2b/accounts/:userId/review',
    requireAuth,
    requireRole('ADMIN', 'SUPER_ADMIN'),
    (req, res) => {
      try {
        const status = String(req.body?.status || '').toUpperCase() === 'REJECTED' ? 'REJECTED' : 'VERIFIED';
        const account = reviewB2BAccount({
          userId: req.params.userId,
          status,
          actorId: req.auth!.userId,
          actorName: req.auth!.name || 'Admin',
          actorRole: req.auth!.role,
        });
        res.json({ success: true, account });
      } catch (err: any) {
        res.status(err?.statusCode || 400).json({ success: false, error: err.message });
      }
    }
  );

  router.get('/b2b/bulk-pricing/:productId', (req, res) => {
    const qty = Math.max(1, Math.floor(Number(req.query.qty || 1)));
    const pricing = getBulkPricingForProduct(req.params.productId, qty);
    res.json({ success: true, ...pricing });
  });

  router.get('/b2b/rfqs', requireAuth, (req, res) => {
    ensurePhase6GSeeded();
    let list = Array.from(dbQuoteRequests.values());
    if (req.auth!.role === 'CUSTOMER') {
      list = list.filter((r) => r.b2bUserId === req.auth!.userId);
    } else if (req.auth!.role === 'SELLER' && req.auth!.sellerId) {
      list = list.filter((r) => r.sellerId === req.auth!.sellerId);
    }
    res.json({ success: true, rfqs: list });
  });

  router.post('/b2b/rfqs', requireAuth, (req, res) => {
    try {
      const rfq = createRfqRequest({
        b2bUserId: req.auth!.userId,
        productId: String(req.body?.productId || ''),
        requestedQty: Number(req.body?.requestedQty || 0),
        targetUnitPrice: req.body?.targetUnitPrice !== undefined ? Number(req.body.targetUnitPrice) : undefined,
        notes: req.body?.notes,
      });
      res.status(201).json({ success: true, rfq });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post(
    '/b2b/rfqs/:rfqId/quote',
    requireAuth,
    requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'),
    (req, res) => {
      try {
        const rfq = sellerQuoteRfq({
          rfqId: req.params.rfqId,
          sellerId: req.auth!.sellerId || 'seller-1',
          actorRole: req.auth!.role,
          quotedUnitPrice: Number(req.body?.quotedUnitPrice || 0),
          status: req.body?.status === 'REJECTED' ? 'REJECTED' : 'QUOTED',
          notes: req.body?.notes,
        });
        res.json({ success: true, rfq });
      } catch (err: any) {
        res.status(err?.statusCode || 400).json({ success: false, error: err.message });
      }
    }
  );

  // --- Digital Assets & Signed Downloads ---

  router.get('/digital-assets/product/:productId', (req, res) => {
    ensurePhase6GSeeded();
    const asset = Array.from(dbDigitalAssets.values()).find((a) => a.productId === req.params.productId) || null;
    res.json({ success: true, hasDigitalAsset: Boolean(asset), asset });
  });

  router.post(
    '/seller/digital-assets',
    requireAuth,
    requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'),
    (req, res) => {
      try {
        const asset = registerDigitalAsset({
          productId: String(req.body?.productId || ''),
          sellerId: req.auth!.sellerId || 'seller-1',
          fileName: String(req.body?.fileName || 'guide.txt'),
          mimeType: String(req.body?.mimeType || 'text/plain'),
          contentTextOrBase64: String(req.body?.content || ''),
          maxDownloads: req.body?.maxDownloads !== undefined ? Number(req.body.maxDownloads) : undefined,
          expiryHours: req.body?.expiryHours !== undefined ? Number(req.body.expiryHours) : undefined,
        });
        res.status(201).json({ success: true, asset });
      } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
      }
    }
  );

  router.get('/digital-downloads/me', requireAuth, (req, res) => {
    const grants = getDigitalGrantsForUser(req.auth!.userId);
    res.json({ success: true, grants });
  });

  router.get('/digital-downloads/:grantId', (req, res) => {
    try {
      const token = String(req.query.token || '');
      const callerUserId = resolveOptionalUserId(req);
      const result = consumeDigitalDownload({
        grantId: req.params.grantId,
        token,
        userId: callerUserId,
      });
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('X-Downloads-Remaining', String(result.downloadsRemaining));
      res.send(result.content);
    } catch (err: any) {
      res.status(err?.statusCode || 403).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // PHASE 7A/7B: CAPACITOR MOBILE DEVICE REGISTRATION, PUSH PREFERENCES & BIOMETRIC AUTH
  // =========================================================================

  const defaultNotifPrefs = (userId: string): NotificationPreferenceRecord => ({
    userId,
    orderConfirmation: true,
    paymentConfirmation: true,
    shippingUpdates: true,
    returnRefundUpdates: true,
    sellerAlerts: true,
    promotionalOffers: true,
    updatedAt: new Date().toISOString(),
  });

  router.post('/mobile/devices', (req, res) => {
    const pushToken = String(req.body?.pushToken || '').trim();
    const rawPlatform = String(req.body?.platform || 'web').toLowerCase();
    const platform: 'android' | 'ios' | 'web' =
      rawPlatform === 'android' || rawPlatform === 'ios' ? rawPlatform : 'web';

    if (!pushToken || pushToken.length < 6) {
      return res.status(400).json({ success: false, error: 'Valid pushToken is required.' });
    }

    const userId = resolveOptionalUserId(req);
    const id = `dev_${crypto.createHash('sha256').update(pushToken).digest('hex').slice(0, 12)}`;
    const now = new Date().toISOString();
    const existing = dbMobileDeviceTokens.get(id);
    const record: MobileDeviceTokenRecord = {
      id,
      userId: userId || existing?.userId,
      platform,
      pushToken,
      appVersion: String(req.body?.appVersion || '7.0.0'),
      deviceModel: req.body?.deviceModel ? String(req.body.deviceModel) : existing?.deviceModel,
      active: true,
      registeredAt: existing?.registeredAt || now,
      updatedAt: now,
    };
    dbMobileDeviceTokens.set(id, record);
    res.status(201).json({ success: true, device: record });
  });

  router.post('/mobile/devices/unregister', (req, res) => {
    const pushToken = String(req.body?.pushToken || '').trim();
    const deviceId = String(req.body?.deviceId || '').trim();
    const callerUserId = resolveOptionalUserId(req);

    const targetId =
      deviceId ||
      (pushToken
        ? `dev_${crypto.createHash('sha256').update(pushToken).digest('hex').slice(0, 12)}`
        : '');

    if (!targetId) {
      return res.status(400).json({ success: false, error: 'deviceId or pushToken is required.' });
    }

    const existing = dbMobileDeviceTokens.get(targetId);
    if (!existing) {
      return res.json({ success: true, unregistered: false });
    }
    if (existing.userId && callerUserId && existing.userId !== callerUserId) {
      return res.status(403).json({ success: false, error: 'Cannot unregister another user device.' });
    }
    dbMobileDeviceTokens.delete(targetId);
    return res.json({ success: true, unregistered: true, deviceId: targetId });
  });

  router.get('/notifications/preferences', requireAuth, (req, res) => {
    const prefs =
      dbNotificationPreferences.get(req.auth!.userId) || defaultNotifPrefs(req.auth!.userId);
    res.json({ success: true, preferences: prefs });
  });

  router.put('/notifications/preferences', requireAuth, (req, res) => {
    const prev =
      dbNotificationPreferences.get(req.auth!.userId) || defaultNotifPrefs(req.auth!.userId);
    const b = req.body || {};
    const updated: NotificationPreferenceRecord = {
      userId: req.auth!.userId,
      orderConfirmation:
        typeof b.orderConfirmation === 'boolean' ? b.orderConfirmation : prev.orderConfirmation,
      paymentConfirmation:
        typeof b.paymentConfirmation === 'boolean'
          ? b.paymentConfirmation
          : prev.paymentConfirmation,
      shippingUpdates:
        typeof b.shippingUpdates === 'boolean' ? b.shippingUpdates : prev.shippingUpdates,
      returnRefundUpdates:
        typeof b.returnRefundUpdates === 'boolean'
          ? b.returnRefundUpdates
          : prev.returnRefundUpdates,
      sellerAlerts: typeof b.sellerAlerts === 'boolean' ? b.sellerAlerts : prev.sellerAlerts,
      promotionalOffers:
        typeof b.promotionalOffers === 'boolean' ? b.promotionalOffers : prev.promotionalOffers,
      updatedAt: new Date().toISOString(),
    };
    dbNotificationPreferences.set(req.auth!.userId, updated);
    res.json({ success: true, preferences: updated });
  });

  router.get('/notifications/me', requireAuth, (req, res) => {
    const items = dbUserNotifications.get(req.auth!.userId) || [];
    const devices = Array.from(dbMobileDeviceTokens.values()).filter(
      (d) => d.userId === req.auth!.userId && d.active !== false
    );
    res.json({
      success: true,
      notifications: items.slice(0, 25),
      registeredDevicesCount: devices.length,
    });
  });

  router.post('/notifications/dispatch', requireAuth, (req, res) => {
    const category = (String(req.body?.category || 'order_confirmation') as UserNotificationItem['category']);
    const title = String(req.body?.title || 'Prime Bazaar Order Update').slice(0, 120);
    const body = String(req.body?.body || 'Your order status has been updated.').slice(0, 240);
    const deepLinkPath = String(req.body?.deepLinkPath || '/orders');

    const prefs =
      dbNotificationPreferences.get(req.auth!.userId) || defaultNotifPrefs(req.auth!.userId);
    const allowedMap: Record<UserNotificationItem['category'], boolean> = {
      order_confirmation: prefs.orderConfirmation,
      payment_confirmation: prefs.paymentConfirmation,
      shipping_update: prefs.shippingUpdates,
      return_refund: prefs.returnRefundUpdates,
      seller_alert: prefs.sellerAlerts,
      promotion: prefs.promotionalOffers,
    };

    if (!allowedMap[category]) {
      return res.json({
        success: true,
        delivered: false,
        suppressedByPreference: true,
        category,
      });
    }

    const activeDevices = Array.from(dbMobileDeviceTokens.values()).filter(
      (d) => d.userId === req.auth!.userId && d.active !== false
    );

    const item: UserNotificationItem = {
      id: `notif_${crypto.randomBytes(6).toString('hex')}`,
      userId: req.auth!.userId,
      category,
      title,
      body,
      deepLinkPath,
      deliveredDevices: activeDevices.length,
      createdAt: new Date().toISOString(),
      read: false,
    };
    const prev = dbUserNotifications.get(req.auth!.userId) || [];
    dbUserNotifications.set(req.auth!.userId, [item, ...prev].slice(0, 50));

    return res.status(201).json({
      success: true,
      delivered: true,
      suppressedByPreference: false,
      notification: item,
    });
  });

  // --- Biometric Authentication (WebAuthn + Capacitor Biometric + Scrypt PIN Fallback) ---

  router.get('/auth/biometric/status', requireAuth, (req, res) => {
    const userId = req.auth!.userId;
    const creds = dbBiometricCredentials.get(userId) || [];
    const failInfo = dbBiometricFailures.get(userId);
    const lockedUntil = failInfo && failInfo.lockedUntil > Date.now() ? failInfo.lockedUntil : null;

    res.json({
      success: true,
      enabled: creds.length > 0,
      credentialCount: creds.length,
      hasPinFallback: dbBiometricPinHashes.has(userId),
      lockedUntil,
      credentials: creds.map((c) => ({
        id: c.id,
        credentialId: c.credentialId,
        authenticatorType: c.authenticatorType,
        deviceName: c.deviceName,
        createdAt: c.createdAt,
        lastUsedAt: c.lastUsedAt,
      })),
    });
  });

  router.post('/auth/biometric/register', requireAuth, (req, res) => {
    const userId = req.auth!.userId;
    const credentialId = String(req.body?.credentialId || '').trim();
    const deviceName = String(req.body?.deviceName || 'Trusted Device').trim().slice(0, 80);
    const rawType = String(req.body?.authenticatorType || 'webauthn');
    const authenticatorType: BiometricCredentialRecord['authenticatorType'] =
      rawType === 'capacitor-biometric' || rawType === 'device-passkey' ? rawType : 'webauthn';
    const publicKeySpkiBase64 =
      typeof req.body?.publicKeySpkiBase64 === 'string' && req.body.publicKeySpkiBase64.trim()
        ? req.body.publicKeySpkiBase64.trim()
        : undefined;
    const fallbackPin = typeof req.body?.fallbackPin === 'string' ? req.body.fallbackPin.trim() : '';

    if (credentialId.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Valid biometric credentialId (min 8 chars) is required.',
      });
    }

    if (fallbackPin && !/^\d{4,6}$/.test(fallbackPin)) {
      return res.status(400).json({
        success: false,
        error: 'Fallback PIN must be 4 to 6 numeric digits.',
      });
    }

    const existing = dbBiometricCredentials.get(userId) || [];
    const record: BiometricCredentialRecord = {
      id: `bio_${crypto.randomBytes(6).toString('hex')}`,
      credentialId,
      userId,
      authenticatorType,
      deviceName,
      publicKeySpkiBase64,
      createdAt: new Date().toISOString(),
    };
    const filtered = existing.filter((c) => c.credentialId !== credentialId);
    dbBiometricCredentials.set(userId, [record, ...filtered].slice(0, 5));

    if (fallbackPin) {
      dbBiometricPinHashes.set(userId, hashPassword(fallbackPin));
    }

    dbBiometricFailures.delete(userId);

    res.status(201).json({
      success: true,
      enabled: true,
      hasPinFallback: dbBiometricPinHashes.has(userId),
      credential: {
        id: record.id,
        credentialId: record.credentialId,
        authenticatorType: record.authenticatorType,
        deviceName: record.deviceName,
        createdAt: record.createdAt,
      },
    });
  });

  router.delete('/auth/biometric', requireAuth, (req, res) => {
    const userId = req.auth!.userId;
    dbBiometricCredentials.delete(userId);
    dbBiometricPinHashes.delete(userId);
    dbBiometricFailures.delete(userId);
    for (const [cid, entry] of dbBiometricChallenges.entries()) {
      if (entry.userId === userId) dbBiometricChallenges.delete(cid);
    }
    res.json({ success: true, enabled: false });
  });

  router.post('/auth/biometric/challenge', (req, res) => {
    const callerUserId = resolveOptionalUserId(req);
    const identifier = String(req.body?.identifier || '').trim();
    const user =
      (identifier ? deps.findUserByIdentifier?.(identifier) : undefined) ||
      (callerUserId ? deps.findUserByIdentifier?.(callerUserId) : undefined);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Account not found for biometric login. Please sign in with OTP or Password first.',
      });
    }

    const failInfo = dbBiometricFailures.get(user.id);
    if (failInfo && failInfo.lockedUntil > Date.now()) {
      return res.status(423).json({
        success: false,
        error: 'Biometric authentication temporarily locked due to repeated failed attempts. Use OTP login.',
        lockedUntil: failInfo.lockedUntil,
      });
    }

    const creds = dbBiometricCredentials.get(user.id) || [];
    const hasPinFallback = dbBiometricPinHashes.has(user.id);
    if (creds.length === 0 && !hasPinFallback) {
      return res.status(400).json({
        success: false,
        error: 'Biometric login is not enabled on this account yet. Enable it inside Profile -> Security.',
      });
    }

    const challenge = crypto.randomBytes(32).toString('base64url');
    const challengeId = `chl_${crypto.randomBytes(8).toString('hex')}`;
    dbBiometricChallenges.set(challengeId, {
      challenge,
      userId: user.id,
      expiresAt: Date.now() + 2 * 60 * 1000,
    });

    return res.json({
      success: true,
      challengeId,
      challenge,
      biometricEnrolled: creds.length > 0,
      hasPinFallback,
      allowCredentialIds: creds.map((c) => c.credentialId),
    });
  });

  router.post('/auth/biometric/verify', (req, res) => {
    const callerUserId = resolveOptionalUserId(req);
    const identifier = String(req.body?.identifier || '').trim();
    const user =
      (identifier ? deps.findUserByIdentifier?.(identifier) : undefined) ||
      (callerUserId ? deps.findUserByIdentifier?.(callerUserId) : undefined);

    if (!user || !deps.createSessionForUser) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    const failState = dbBiometricFailures.get(user.id) || { count: 0, lockedUntil: 0 };
    if (failState.lockedUntil > Date.now()) {
      return res.status(423).json({
        success: false,
        error: 'Too many failed verification attempts. Locked for 15 minutes; please use OTP login.',
        lockedUntil: failState.lockedUntil,
      });
    }

    const recordFailure = (msg: string) => {
      const nextCount = failState.count + 1;
      const lockedUntil = nextCount >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
      dbBiometricFailures.set(user.id, { count: nextCount, lockedUntil });
      if (lockedUntil > 0) {
        return res.status(423).json({
          success: false,
          error: 'Maximum failed attempts reached. Biometric/PIN locked for 15 minutes; use OTP fallback.',
          lockedUntil,
        });
      }
      return res.status(401).json({
        success: false,
        error: msg,
        remainingAttempts: Math.max(0, 5 - nextCount),
      });
    };

    const fallbackMode = String(req.body?.fallbackMode || 'biometric');

    // Mode 1: Fallback 4-6 digit Security PIN (scrypt verified)
    if (fallbackMode === 'pin' || typeof req.body?.pin === 'string') {
      const pin = String(req.body?.pin || '').trim();
      const storedPinHash = dbBiometricPinHashes.get(user.id);
      if (!storedPinHash || !verifyPassword(pin, storedPinHash)) {
        return recordFailure('Incorrect security PIN.');
      }
      dbBiometricFailures.delete(user.id);
      const issued = deps.createSessionForUser(user);
      return res.json({ success: true, authMethod: 'pin_fallback', ...issued });
    }

    // Mode 2: Password fallback
    if (fallbackMode === 'password' || typeof req.body?.password === 'string') {
      const pwd = String(req.body?.password || '');
      if (!deps.verifyUserPassword || !deps.verifyUserPassword(user, pwd)) {
        return recordFailure('Invalid fallback password.');
      }
      dbBiometricFailures.delete(user.id);
      const issued = deps.createSessionForUser(user);
      return res.json({ success: true, authMethod: 'password_fallback', ...issued });
    }

    // Mode 3: Biometric / WebAuthn Assertion
    const challengeId = String(req.body?.challengeId || '').trim();
    const credentialId = String(req.body?.credentialId || '').trim();
    const challengeEntry = dbBiometricChallenges.get(challengeId);
    if (!challengeEntry || challengeEntry.userId !== user.id || challengeEntry.expiresAt < Date.now()) {
      return recordFailure('Biometric challenge is missing or expired.');
    }
    dbBiometricChallenges.delete(challengeId); // single-use challenge

    const creds = dbBiometricCredentials.get(user.id) || [];
    const matchedCred = creds.find((c) => safeCompareStrings(c.credentialId, credentialId));
    if (!matchedCred) {
      return recordFailure('Unrecognized biometric credential for this account.');
    }

    // If credential has registered WebAuthn SPKI public key and client provided signature, verify cryptographically
    if (matchedCred.publicKeySpkiBase64 && req.body?.signature && req.body?.authenticatorData && req.body?.clientDataJSON) {
      try {
        const clientDataBuf = Buffer.from(String(req.body.clientDataJSON), 'base64url');
        const clientDataObj = JSON.parse(clientDataBuf.toString('utf8'));
        if (!safeCompareStrings(String(clientDataObj.challenge || ''), challengeEntry.challenge)) {
          return recordFailure('Biometric challenge mismatch.');
        }
        const authDataBuf = Buffer.from(String(req.body.authenticatorData), 'base64url');
        const sigBuf = Buffer.from(String(req.body.signature), 'base64url');
        const clientHash = crypto.createHash('sha256').update(clientDataBuf).digest();
        const signedPayload = Buffer.concat([authDataBuf, clientHash]);
        const keyObj = crypto.createPublicKey({
          key: Buffer.from(matchedCred.publicKeySpkiBase64, 'base64'),
          format: 'der',
          type: 'spki',
        });
        const sigOk = crypto.verify('sha256', signedPayload, keyObj, sigBuf);
        if (!sigOk) {
          return recordFailure('Biometric cryptographic signature verification failed.');
        }
      } catch {
        return recordFailure('Malformed WebAuthn biometric assertion.');
      }
    }

    matchedCred.lastUsedAt = new Date().toISOString();
    dbBiometricFailures.delete(user.id);
    const issued = deps.createSessionForUser(user);
    return res.json({ success: true, authMethod: matchedCred.authenticatorType, ...issued });
  });

  return router;
}

