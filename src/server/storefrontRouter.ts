import express from 'express';
import crypto from 'crypto';
import { requireAuth, requireRole, extractBearerToken, getSession } from './security.ts';
import { contentModerationOverrides } from './marketplaceOpsService.ts';

export interface StoredReviewMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
}

export interface StoredReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  date: string;
  createdAt: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  helpfulVoters: string[];
  media: StoredReviewMedia[];
  reportCount: number;
  reportedBy: string[];
}

export interface StoredAnswer {
  id: string;
  userId: string;
  userName: string;
  responderRole: 'seller' | 'verified_buyer' | 'admin' | 'shopper';
  answer: string;
  createdAt: string;
  helpfulCount: number;
}

export interface StoredQuestion {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  question: string;
  createdAt: string;
  answers: StoredAnswer[];
}

interface MediaAsset {
  id: string;
  mimeType: string;
  type: 'image' | 'video';
  buffer: Buffer;
  uploadedBy: string;
  createdAt: string;
}

export interface StorefrontOrderLookupEntry {
  userId?: string;
  customerEmail?: string;
  customerPhone?: string;
  status?: string;
  items?: Array<{ productId?: string; product?: { id?: string } }>;
}

export interface StorefrontDependencies {
  hasUserPurchasedProduct: (params: { userId: string; email?: string; productId: string }) => boolean;
  onReportLogged?: (entry: { userId: string; productId: string; reviewId: string; reason: string }) => void;
}

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_VIDEO_MIME = new Set(['video/mp4', 'video/webm']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 12 * 1024 * 1024;
const MAX_STORED_MEDIA_ITEMS = 250;

const mediaAssets = new Map<string, MediaAsset>();
const productQuestions = new Map<string, StoredQuestion[]>();
const productReviews = new Map<string, StoredReview[]>();
const cartStateStore = new Map<string, { cart: any[]; savedForLater: any[]; recentlyViewed: string[]; updatedAt: string }>();

// Seed authentic fashion-launch Q&As for existing catalog items
function seedInitialQA() {
  if (productQuestions.size > 0) return;

  productQuestions.set('prod-1', [
    {
      id: 'qa-prod1-1',
      productId: 'prod-1',
      userId: 'usr_seed_1',
      userName: 'Neha Kapoor',
      question: 'Does the organza dupatta come pre-edged with zari border, and is the kurti lining attached?',
      createdAt: '2026-10-20T11:15:00.000Z',
      answers: [
        {
          id: 'ans-prod1-1',
          userId: 'seller-1',
          userName: 'Varanasi Weavers Co.',
          responderRole: 'seller',
          answer: 'Yes, the kurti includes soft breathable santoon lining throughout the bodice and the 2.25m organza dupatta is finished with golden zari scalloped edging.',
          createdAt: '2026-10-20T14:30:00.000Z',
          helpfulCount: 16,
        },
      ],
    },
    {
      id: 'qa-prod1-2',
      productId: 'prod-1',
      userId: 'usr_seed_2',
      userName: 'Ritu Verma',
      question: 'Should I size up if I am between M and L for festive wear?',
      createdAt: '2026-10-25T09:00:00.000Z',
      answers: [
        {
          id: 'ans-prod1-2',
          userId: 'usr_demo123',
          userName: 'Priya Sharma',
          responderRole: 'verified_buyer',
          answer: 'Fits true to size with 1 inch inner margin inside the kurti. If you prefer a looser fit around the bust, go one size up.',
          createdAt: '2026-10-26T10:20:00.000Z',
          helpfulCount: 9,
        },
      ],
    },
  ]);

  productQuestions.set('prod-2', [
    {
      id: 'qa-prod2-1',
      productId: 'prod-2',
      userId: 'usr_seed_3',
      userName: 'Kabir Malhotra',
      question: 'Is the 420 GSM cotton twill suitable for mild winter layering over hoodies?',
      createdAt: '2026-10-27T16:10:00.000Z',
      answers: [
        {
          id: 'ans-prod2-1',
          userId: 'seller-2',
          userName: 'Metropolis Apparel Hub',
          responderRole: 'seller',
          answer: 'Yes! The dropped shoulder boxy cut has extra chest room specifically designed to layer comfortably over heavyweight hoodies.',
          createdAt: '2026-10-27T18:05:00.000Z',
          helpfulCount: 12,
        },
      ],
    },
  ]);

  productQuestions.set('prod-3', [
    {
      id: 'qa-prod3-1',
      productId: 'prod-3',
      userId: 'usr_seed_4',
      userName: 'Aditi Rao',
      question: 'Is the platform sole heavy for all-day walking or travel?',
      createdAt: '2026-10-21T12:00:00.000Z',
      answers: [
        {
          id: 'ans-prod3-1',
          userId: 'seller-3',
          userName: 'AeroStep Footwear',
          responderRole: 'seller',
          answer: 'Each shoe weighs under 360 grams thanks to our featherlight wave EVA midsole and Memory Ortholite insole.',
          createdAt: '2026-10-21T15:10:00.000Z',
          helpfulCount: 11,
        },
      ],
    },
  ]);
}

seedInitialQA();

export function sanitizePlainText(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function verifyMediaMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (!buffer || buffer.length < 12) return false;
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mimeType === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  if (mimeType === 'video/mp4') {
    return buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  }
  if (mimeType === 'video/webm') {
    return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
  }
  return false;
}

export function createStorefrontRouter(deps: StorefrontDependencies) {
  const router = express.Router();

  // 1. Upload validated photo/video review media (strict MIME + magic bytes + size check)
  router.post(
    '/uploads/review-media',
    express.json({ limit: '18mb' }),
    requireAuth,
    (req, res) => {
      const { mimeType, dataBase64, caption } = req.body || {};
      const cleanMime = typeof mimeType === 'string' ? mimeType.trim().toLowerCase() : '';
      const isImage = ALLOWED_IMAGE_MIME.has(cleanMime);
      const isVideo = ALLOWED_VIDEO_MIME.has(cleanMime);

      if (!isImage && !isVideo) {
        return res.status(400).json({
          success: false,
          error: 'Unsupported media format. Only JPG, PNG, WebP images and MP4 or WebM videos are allowed.',
        });
      }

      if (typeof dataBase64 !== 'string' || !dataBase64.trim()) {
        return res.status(400).json({ success: false, error: 'Media payload is required.' });
      }

      // Strip optional data URI prefix safely after validating base64 payload
      const rawBase64 = dataBase64.includes(',') ? dataBase64.split(',').pop() || '' : dataBase64;
      if (!/^[A-Za-z0-9+/=\s]+$/.test(rawBase64)) {
        return res.status(400).json({ success: false, error: 'Invalid base64 media encoding.' });
      }

      const buffer = Buffer.from(rawBase64.replace(/\s+/g, ''), 'base64');
      const maxAllowed = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
      if (buffer.length === 0 || buffer.length > maxAllowed) {
        return res.status(400).json({
          success: false,
          error: isImage
            ? 'Image file must be under 5 MB.'
            : 'Video file must be under 12 MB.',
        });
      }

      if (!verifyMediaMagicBytes(buffer, cleanMime)) {
        return res.status(400).json({
          success: false,
          error: 'File content does not match declared image/video format.',
        });
      }

      if (mediaAssets.size >= MAX_STORED_MEDIA_ITEMS) {
        const oldestKey = mediaAssets.keys().next().value;
        if (oldestKey) mediaAssets.delete(oldestKey);
      }

      const mediaId = `med_${crypto.randomBytes(8).toString('hex')}`;
      const mediaType: 'image' | 'video' = isImage ? 'image' : 'video';
      mediaAssets.set(mediaId, {
        id: mediaId,
        mimeType: cleanMime,
        type: mediaType,
        buffer,
        uploadedBy: req.auth!.userId,
        createdAt: new Date().toISOString(),
      });

      return res.status(201).json({
        success: true,
        media: {
          id: mediaId,
          type: mediaType,
          url: `/api/storefront/media/${mediaId}`,
          caption: sanitizePlainText(caption, 120) || undefined,
        },
      });
    }
  );

  // 1b. Seller Product Image Upload (strict JPG/PNG/WebP MIME + magic bytes + 5MB check)
  router.post(
    '/uploads/product-image',
    express.json({ limit: '8mb' }),
    requireAuth,
    requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'),
    (req, res) => {
      const { mimeType, dataBase64, caption } = req.body || {};
      const cleanMime = typeof mimeType === 'string' ? mimeType.trim().toLowerCase() : '';

      if (!ALLOWED_IMAGE_MIME.has(cleanMime)) {
        return res.status(400).json({
          success: false,
          error: 'Unsupported image format. Only JPG, PNG, or WebP product photos are allowed.',
        });
      }

      if (typeof dataBase64 !== 'string' || !dataBase64.trim()) {
        return res.status(400).json({ success: false, error: 'Image payload is required.' });
      }

      const rawBase64 = dataBase64.includes(',') ? dataBase64.split(',').pop() || '' : dataBase64;
      if (!/^[A-Za-z0-9+/=\s]+$/.test(rawBase64)) {
        return res.status(400).json({ success: false, error: 'Invalid base64 image encoding.' });
      }

      const buffer = Buffer.from(rawBase64.replace(/\s+/g, ''), 'base64');
      if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
        return res.status(400).json({
          success: false,
          error: 'Product image file must be under 5 MB.',
        });
      }

      if (!verifyMediaMagicBytes(buffer, cleanMime)) {
        return res.status(400).json({
          success: false,
          error: 'File content does not match declared image format.',
        });
      }

      if (mediaAssets.size >= MAX_STORED_MEDIA_ITEMS) {
        const oldestKey = mediaAssets.keys().next().value;
        if (oldestKey) mediaAssets.delete(oldestKey);
      }

      const mediaId = `med_${crypto.randomBytes(8).toString('hex')}`;
      mediaAssets.set(mediaId, {
        id: mediaId,
        mimeType: cleanMime,
        type: 'image',
        buffer,
        uploadedBy: req.auth!.userId,
        createdAt: new Date().toISOString(),
      });

      return res.status(201).json({
        success: true,
        media: {
          id: mediaId,
          type: 'image',
          url: `/api/storefront/media/${mediaId}`,
          caption: sanitizePlainText(caption, 120) || undefined,
        },
      });
    }
  );

  // Serve validated review & product media strictly with nosniff
  router.get('/media/:mediaId', (req, res) => {
    const mediaId = String(req.params.mediaId || '').trim();
    if (!/^med_[a-f0-9]{16}$/.test(mediaId)) {
      return res.status(400).json({ success: false, error: 'Invalid media ID.' });
    }
    const asset = mediaAssets.get(mediaId);
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Media asset not found.' });
    }
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(asset.buffer);
  });

  // 2. Product Q&A Endpoints
  router.get('/products/:productId/qa', (req, res) => {
    const productId = sanitizePlainText(req.params.productId, 80);
    const includeModerated = req.query.includeModerated === 'true';
    const rawItems = productQuestions.get(productId) || [];
    const hiddenStatuses = new Set(['HIDDEN', 'REMOVED', 'REJECTED']);
    const items = rawItems
      .filter((q) => {
        if (includeModerated) return true;
        const ov = contentModerationOverrides.get(`QUESTION:${q.id}`);
        return !ov || !hiddenStatuses.has(ov.status);
      })
      .map((q) => ({
        ...q,
        moderationStatus: contentModerationOverrides.get(`QUESTION:${q.id}`)?.status || 'APPROVED',
        answers: q.answers.filter((a) => {
          if (includeModerated) return true;
          const ov = contentModerationOverrides.get(`ANSWER:${a.id}`);
          return !ov || !hiddenStatuses.has(ov.status);
        }),
      }));
    return res.json({
      success: true,
      productId,
      questions: items,
      total: items.length,
    });
  });

  router.post('/products/:productId/qa', requireAuth, (req, res) => {
    const productId = sanitizePlainText(req.params.productId, 80);
    const cleanQuestion = sanitizePlainText(req.body?.question, 500);

    if (!productId || cleanQuestion.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a clear question (at least 8 characters).',
      });
    }

    const newQuestion: StoredQuestion = {
      id: `qa_${crypto.randomBytes(5).toString('hex')}`,
      productId,
      userId: req.auth!.userId,
      userName: sanitizePlainText(req.auth!.name || 'Prime Bazaar Shopper', 80) || 'Prime Bazaar Shopper',
      question: cleanQuestion,
      createdAt: new Date().toISOString(),
      answers: [],
    };

    const existing = productQuestions.get(productId) || [];
    productQuestions.set(productId, [newQuestion, ...existing]);

    return res.status(201).json({
      success: true,
      question: newQuestion,
    });
  });

  router.post('/products/:productId/qa/:questionId/answers', requireAuth, (req, res) => {
    const productId = sanitizePlainText(req.params.productId, 80);
    const questionId = sanitizePlainText(req.params.questionId, 80);
    const cleanAnswer = sanitizePlainText(req.body?.answer, 600);

    if (cleanAnswer.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Answer must be at least 4 characters.',
      });
    }

    const list = productQuestions.get(productId) || [];
    const question = list.find(q => q.id === questionId);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found.' });
    }

    const verifiedBuyer = deps.hasUserPurchasedProduct({
      userId: req.auth!.userId,
      email: req.auth!.email,
      productId,
    });

    const role: StoredAnswer['responderRole'] =
      req.auth!.role === 'ADMIN' || req.auth!.role === 'SUPER_ADMIN'
        ? 'admin'
        : req.auth!.role === 'SELLER'
        ? 'seller'
        : verifiedBuyer
        ? 'verified_buyer'
        : 'shopper';

    const answer: StoredAnswer = {
      id: `ans_${crypto.randomBytes(5).toString('hex')}`,
      userId: req.auth!.userId,
      userName: sanitizePlainText(req.auth!.name || 'Shopper', 80) || 'Shopper',
      responderRole: role,
      answer: cleanAnswer,
      createdAt: new Date().toISOString(),
      helpfulCount: 0,
    };

    question.answers.push(answer);
    return res.status(201).json({
      success: true,
      answer,
      question,
    });
  });

  // 3. Product Reviews Endpoints (with sorting, media filtering, verified-purchase check & reporting)
  router.get('/products/:productId/reviews', (req, res) => {
    const productId = sanitizePlainText(req.params.productId, 80);
    const sort = String(req.query.sort || 'helpful');
    const mediaOnly = req.query.mediaOnly === 'true';
    const verifiedOnly = req.query.verifiedOnly === 'true';
    const minRating = Number(req.query.minRating) || 0;

    let reviews = [...(productReviews.get(productId) || [])];
    const includeModerated = req.query.includeModerated === 'true';
    const hiddenStatuses = new Set(['HIDDEN', 'REMOVED', 'REJECTED']);
    if (!includeModerated) {
      reviews = reviews.filter((r) => {
        const ov = contentModerationOverrides.get(`REVIEW:${r.id}`);
        return !ov || !hiddenStatuses.has(ov.status);
      });
    }
    if (mediaOnly) {
      reviews = reviews.filter(r => r.media && r.media.length > 0);
    }
    if (verifiedOnly) {
      reviews = reviews.filter(r => r.verifiedPurchase);
    }
    if (minRating > 0) {
      reviews = reviews.filter(r => r.rating >= minRating);
    }

    reviews.sort((a, b) => {
      if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === 'highest') return b.rating - a.rating || b.helpfulCount - a.helpfulCount;
      if (sort === 'lowest') return a.rating - b.rating || b.helpfulCount - a.helpfulCount;
      return b.helpfulCount - a.helpfulCount;
    });

    return res.json({
      success: true,
      productId,
      reviews: reviews.map(({ helpfulVoters: _hv, reportedBy: _rb, ...publicReview }) => ({
        ...publicReview,
        moderationStatus: contentModerationOverrides.get(`REVIEW:${publicReview.id}`)?.status || 'APPROVED',
      })),
    });
  });

  router.get('/moderation/queue', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), (_req, res) => {
    const reviewsList: any[] = [];
    for (const [productId, list] of productReviews.entries()) {
      for (const r of list) {
        const ov = contentModerationOverrides.get(`REVIEW:${r.id}`);
        reviewsList.push({
          targetType: 'REVIEW',
          id: r.id,
          productId,
          userId: r.userId,
          userName: r.userName,
          rating: r.rating,
          comment: r.comment,
          verifiedPurchase: r.verifiedPurchase,
          reportCount: r.reportCount,
          moderationStatus: ov?.status || 'APPROVED',
          moderationReason: ov?.reason || null,
          createdAt: r.createdAt,
        });
      }
    }

    const questionsList: any[] = [];
    for (const [productId, list] of productQuestions.entries()) {
      for (const q of list) {
        const ov = contentModerationOverrides.get(`QUESTION:${q.id}`);
        questionsList.push({
          targetType: 'QUESTION',
          id: q.id,
          productId,
          userId: q.userId,
          userName: q.userName,
          question: q.question,
          answersCount: q.answers.length,
          moderationStatus: ov?.status || 'APPROVED',
          moderationReason: ov?.reason || null,
          createdAt: q.createdAt,
        });
      }
    }

    res.json({
      success: true,
      reviews: reviewsList.sort((a, b) => b.reportCount - a.reportCount),
      questions: questionsList,
    });
  });

  router.post('/products/:productId/reviews', requireAuth, (req, res) => {
    const productId = sanitizePlainText(req.params.productId, 80);
    const ratingNum = Math.round(Number(req.body?.rating));
    const cleanComment = sanitizePlainText(req.body?.comment, 1000);
    const mediaIds = Array.isArray(req.body?.mediaIds) ? req.body.mediaIds.slice(0, 4) : [];

    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        error: 'Please select a star rating between 1 and 5.',
      });
    }

    if (cleanComment.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Please share at least 5 characters in your review.',
      });
    }

    // Validate referenced media IDs belong to verified server-side uploads (never allow arbitrary URLs)
    const attachedMedia: StoredReviewMedia[] = [];
    for (const rawId of mediaIds) {
      const idStr = typeof rawId === 'string' ? rawId.trim() : '';
      const asset = mediaAssets.get(idStr);
      if (asset && asset.uploadedBy === req.auth!.userId) {
        attachedMedia.push({
          id: asset.id,
          type: asset.type,
          url: `/api/storefront/media/${asset.id}`,
        });
      }
    }

    // Derive verifiedPurchase strictly from actual order history on the server
    const verifiedPurchase = deps.hasUserPurchasedProduct({
      userId: req.auth!.userId,
      email: req.auth!.email,
      productId,
    });

    const newReview: StoredReview = {
      id: `rev_${crypto.randomBytes(5).toString('hex')}`,
      productId,
      userId: req.auth!.userId,
      userName: sanitizePlainText(req.auth!.name || 'Prime Bazaar Shopper', 80) || 'Prime Bazaar Shopper',
      rating: ratingNum,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      createdAt: new Date().toISOString(),
      comment: cleanComment,
      verifiedPurchase,
      helpfulCount: 0,
      helpfulVoters: [],
      media: attachedMedia,
      reportCount: 0,
      reportedBy: [],
    };

    const list = productReviews.get(productId) || [];
    productReviews.set(productId, [newReview, ...list]);

    const { helpfulVoters: _hv, reportedBy: _rb, ...publicReview } = newReview;
    return res.status(201).json({
      success: true,
      review: publicReview,
    });
  });

  router.post('/products/:productId/reviews/:reviewId/helpful', requireAuth, (req, res) => {
    const productId = sanitizePlainText(req.params.productId, 80);
    const reviewId = sanitizePlainText(req.params.reviewId, 80);
    const list = productReviews.get(productId) || [];
    const target = list.find(r => r.id === reviewId);
    if (!target) {
      return res.json({
        success: true,
        reviewId,
        helpfulCountIncremented: true,
      });
    }
    if (!target.helpfulVoters.includes(req.auth!.userId)) {
      target.helpfulVoters.push(req.auth!.userId);
      target.helpfulCount += 1;
    }
    return res.json({
      success: true,
      reviewId,
      helpfulCount: target.helpfulCount,
    });
  });

  router.post('/products/:productId/reviews/:reviewId/report', requireAuth, (req, res) => {
    const productId = sanitizePlainText(req.params.productId, 80);
    const reviewId = sanitizePlainText(req.params.reviewId, 80);
    const reason = sanitizePlainText(req.body?.reason, 240) || 'Inappropriate or misleading review content';

    const list = productReviews.get(productId) || [];
    const target = list.find(r => r.id === reviewId);

    if (target) {
      if (target.reportedBy.includes(req.auth!.userId)) {
        return res.status(409).json({
          success: false,
          error: 'You have already reported this review.',
        });
      }
      target.reportedBy.push(req.auth!.userId);
      target.reportCount += 1;
    }

    deps.onReportLogged?.({
      userId: req.auth!.userId,
      productId,
      reviewId,
      reason,
    });

    return res.status(201).json({
      success: true,
      message: 'Review reported for moderation review.',
      reviewId,
      reportCount: target ? target.reportCount : 1,
    });
  });

  // 4. Persistent Cart, Save-for-Later & Recently Viewed Sync
  function resolveSessionBucket(req: express.Request): string | null {
    const token = extractBearerToken(req);
    if (token) {
      const sess = getSession(token);
      if (sess?.userId) {
        return `usr:${sess.userId}`;
      }
    }
    if (req.auth?.userId) return `usr:${req.auth.userId}`;
    const rawSess = req.headers['x-pb-session'];
    const cleanSess = typeof rawSess === 'string' ? rawSess.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) : '';
    return cleanSess.length >= 8 ? `sess:${cleanSess}` : null;
  }

  router.get('/cart-state', (req, res) => {
    const bucket = resolveSessionBucket(req);
    if (!bucket) {
      return res.json({ success: true, cart: [], savedForLater: [], recentlyViewed: [] });
    }
    const existing = cartStateStore.get(bucket) || {
      cart: [],
      savedForLater: [],
      recentlyViewed: [],
      updatedAt: new Date().toISOString(),
    };
    return res.json({ success: true, ...existing });
  });

  router.put('/cart-state', (req, res) => {
    const bucket = resolveSessionBucket(req);
    if (!bucket) {
      return res.status(400).json({ success: false, error: 'Session identifier or auth token required.' });
    }
    const { cart, savedForLater, recentlyViewed } = req.body || {};
    const nextState = {
      cart: Array.isArray(cart) ? cart.slice(0, 50) : [],
      savedForLater: Array.isArray(savedForLater) ? savedForLater.slice(0, 50) : [],
      recentlyViewed: Array.isArray(recentlyViewed)
        ? recentlyViewed.filter((id: unknown) => typeof id === 'string').slice(0, 20)
        : [],
      updatedAt: new Date().toISOString(),
    };
    cartStateStore.set(bucket, nextState);
    return res.json({ success: true, ...nextState });
  });

  return router;
}
