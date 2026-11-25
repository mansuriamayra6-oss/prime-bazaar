import express from 'express';
import crypto from 'crypto';
import {
  extractBearerToken,
  getSession,
  requireAuth,
  requireRole,
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
  registeredAt: string;
}

export const dbMobileDeviceTokens: Map<string, MobileDeviceTokenRecord> = new Map();

export interface Phase6ExpansionRouterDeps {
  getOrdersMap: () => Map<string, any>;
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
  // PHASE 7A/7B: CAPACITOR MOBILE DEVICE REGISTRATION & PUSH PREFERENCES
  // =========================================================================

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
    const record: MobileDeviceTokenRecord = {
      id,
      userId,
      platform,
      pushToken,
      appVersion: String(req.body?.appVersion || '7.0.0'),
      deviceModel: req.body?.deviceModel ? String(req.body.deviceModel) : undefined,
      registeredAt: new Date().toISOString(),
    };
    dbMobileDeviceTokens.set(id, record);
    res.status(201).json({ success: true, device: record });
  });

  return router;
}
