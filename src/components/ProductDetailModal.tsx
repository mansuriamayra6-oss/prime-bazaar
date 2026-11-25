import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { Breadcrumbs } from './Breadcrumbs';
import { buildBreadcrumbs, resolveProductPrimaryDepartment } from '../data/categories';
import { api } from '../services/api';
import { ProductQuestion, Review, ReviewMedia, SellerOffer } from '../types';
import {
  X,
  Star,
  Heart,
  ShoppingBag,
  Share2,
  Truck,
  ShieldCheck,
  Check,
  MapPin,
  Store,
  Shirt,
  SlidersHorizontal,
  MessageSquare,
  ExternalLink,
  Bell,
  Play,
  RotateCw,
  Flag,
  Plus,
  Layers,
  CreditCard,
  QrCode,
  Building2,
  Banknote,
  Zap,
  Lock,
  ZoomIn,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Ruler,
  ThumbsUp,
  ImagePlus,
  Video,
  Send,
  HelpCircle,
  Clock,
} from 'lucide-react';

type SizeGuideType = 'apparel' | 'footwear' | 'accessories';

function resolveSizeGuideType(category: string, title: string): SizeGuideType {
  const lower = `${category} ${title}`.toLowerCase();
  if (lower.includes('footwear') || lower.includes('sneaker') || lower.includes('shoe')) {
    return 'footwear';
  }
  if (
    lower.includes('bag') ||
    lower.includes('tote') ||
    lower.includes('kundan') ||
    lower.includes('jewel') ||
    lower.includes('watch') ||
    lower.includes('earbud') ||
    lower.includes('serum') ||
    lower.includes('dabba') ||
    lower.includes('yoga')
  ) {
    return 'accessories';
  }
  return 'apparel';
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

export const ProductDetailModal: React.FC = () => {
  const {
    selectedProduct,
    setSelectedProduct,
    products,
    recentlyViewedProducts,
    addToCart,
    buyProductNow,
    toggleWishlist,
    isWishlisted,
    earnCoins,
    formatPrice,
    openTryOn,
    toggleCompare,
    isCompared,
    openSellerStore,
    chatWithSeller,
    hasPriceAlert,
    togglePriceAlert,
    navigateCategory,
    selectedCategory,
    user,
    setIsAuthOpen,
    notify,
  } = useMarketplace();

  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedPayMode, setSelectedPayMode] = useState<'cashfree' | 'upi' | 'card' | 'netbanking' | 'cod'>('cashfree');
  const [pincode, setPincode] = useState('');
  const [pincodeChecked, setPincodeChecked] = useState(false);
  const [shared, setShared] = useState(false);
  const [viewMode, setViewMode] = useState<'image' | 'video' | '360'>('image');
  const [rotation360, setRotation360] = useState(0);

  // Interactive Zoom & Lightbox states
  const [isHoverZoomed, setIsHoverZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [lightboxMedia, setLightboxMedia] = useState<{ images: string[]; index: number } | null>(null);

  // Size Chart modal state
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);

  // Frequently Bought Together selection
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([]);

  // Q&A state
  const [questions, setQuestions] = useState<ProductQuestion[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaSearch, setQaSearch] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [qaSubmitting, setQaSubmitting] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Reviews state
  const [serverReviews, setServerReviews] = useState<Review[]>([]);
  const [reviewSort, setReviewSort] = useState<'helpful' | 'newest' | 'highest' | 'lowest'>('helpful');
  const [reviewMediaOnly, setReviewMediaOnly] = useState(false);
  const [reviewVerifiedOnly, setReviewVerifiedOnly] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [uploadedMedia, setUploadedMedia] = useState<ReviewMedia[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [localHelpfulBoosts, setLocalHelpfulBoosts] = useState<Record<string, number>>({});

  // Multi-Seller Offers & Buy Box state
  const [sellerOffers, setSellerOffers] = useState<SellerOffer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [showAllOffers, setShowAllOffers] = useState(false);

  // Reset modal internal state whenever selectedProduct changes
  useEffect(() => {
    if (!selectedProduct) return;
    setActiveImageIdx(0);
    setSelectedColor(selectedProduct.colors[0]?.name || '');
    setSelectedSize(selectedProduct.sizes.find(s => s.available)?.size || '');
    setPincodeChecked(false);
    setViewMode('image');
    setRotation360(0);
    setIsHoverZoomed(false);
    setLightboxMedia(null);
    setIsSizeChartOpen(false);
    setShowReviewForm(false);
    setNewQuestionText('');
    setQaSearch('');
    setUploadedMedia([]);
    setReportingReviewId(null);
    setReportReason('');
    setSelectedOfferId(null);
    setShowAllOffers(false);
    scrollBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    // Pick up to 2 complementary items for bundle
    const complementary = products
      .filter(p => p.id !== selectedProduct.id && p.inStock > 0)
      .sort((a, b) => {
        const aSameCat = a.category === selectedProduct.category ? 0 : 1;
        const bSameCat = b.category === selectedProduct.category ? 0 : 1;
        return aSameCat - bSameCat || b.rating - a.rating;
      })
      .slice(0, 2)
      .map(p => p.id);
    setSelectedBundleIds(complementary.slice(0, 1));
  }, [selectedProduct?.id]);

  // Fetch backend Q&A + Reviews + Seller Offers for active product
  useEffect(() => {
    if (!selectedProduct) return;
    let cancelled = false;
    setQaLoading(true);

    Promise.all([
      api.storefront.getProductQA(selectedProduct.id).catch(() => null),
      api.storefront
        .getProductReviews(selectedProduct.id, {
          sort: reviewSort,
          mediaOnly: reviewMediaOnly,
          verifiedOnly: reviewVerifiedOnly,
        })
        .catch(() => null),
      api.offers.getForProduct(selectedProduct.id).catch(() => null),
    ]).then(([qaRes, revRes, offersRes]) => {
      if (cancelled) return;
      if (qaRes?.questions) {
        setQuestions(qaRes.questions);
      } else {
        setQuestions([]);
      }
      if (revRes?.reviews) {
        setServerReviews(revRes.reviews);
      } else {
        setServerReviews([]);
      }
      if (offersRes?.offers && Array.isArray(offersRes.offers)) {
        setSellerOffers(offersRes.offers);
        setSelectedOfferId(prev => prev || offersRes.defaultOffer?.id || offersRes.offers[0]?.id || null);
      } else {
        setSellerOffers([]);
      }
      setQaLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedProduct?.id, reviewSort, reviewMediaOnly, reviewVerifiedOnly]);

  // Keyboard navigation for lightbox and escape
  useEffect(() => {
    if (!lightboxMedia) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxMedia(null);
      } else if (e.key === 'ArrowRight') {
        setLightboxMedia(prev =>
          prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null
        );
      } else if (e.key === 'ArrowLeft') {
        setLightboxMedia(prev =>
          prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : null
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxMedia]);

  const breadcrumbNodes = useMemo(
    () =>
      selectedProduct
        ? buildBreadcrumbs({ selectedCategory, product: selectedProduct })
        : [],
    [selectedProduct, selectedCategory]
  );

  // Complementary Bundle items
  const bundleCandidates = useMemo(() => {
    if (!selectedProduct) return [];
    const primaryDept = resolveProductPrimaryDepartment(selectedProduct);
    return products
      .filter(p => p.id !== selectedProduct.id && p.inStock > 0)
      .sort((a, b) => {
        const aDept = resolveProductPrimaryDepartment(a).group === primaryDept.group ? 1 : 0;
        const bDept = resolveProductPrimaryDepartment(b).group === primaryDept.group ? 1 : 0;
        return bDept - aDept || b.rating - a.rating;
      })
      .slice(0, 2);
  }, [products, selectedProduct]);

  // Related / Similar products
  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return [];
    const currentDept = resolveProductPrimaryDepartment(selectedProduct);
    return products
      .filter(p => p.id !== selectedProduct.id)
      .sort((a, b) => {
        const aMatch =
          a.category === selectedProduct.category
            ? 2
            : resolveProductPrimaryDepartment(a).id === currentDept.id
            ? 1
            : 0;
        const bMatch =
          b.category === selectedProduct.category
            ? 2
            : resolveProductPrimaryDepartment(b).id === currentDept.id
            ? 1
            : 0;
        return bMatch - aMatch || b.rating - a.rating;
      })
      .slice(0, 4);
  }, [products, selectedProduct]);

  const combinedReviews = useMemo(() => {
    if (!selectedProduct) return [];
    const baseReviews = selectedProduct.reviews || [];
    const seen = new Set(serverReviews.map(r => r.id));
    let merged: Review[] = [...serverReviews, ...baseReviews.filter(r => !seen.has(r.id))];

    if (reviewMediaOnly) {
      merged = merged.filter(r => r.media && r.media.length > 0);
    }
    if (reviewVerifiedOnly) {
      merged = merged.filter(r => r.verifiedPurchase);
    }

    return merged
      .map(r => ({
        ...r,
        helpfulCount: r.helpfulCount + (localHelpfulBoosts[r.id] || 0),
      }))
      .sort((a, b) => {
        if (reviewSort === 'highest') return b.rating - a.rating;
        if (reviewSort === 'lowest') return a.rating - b.rating;
        if (reviewSort === 'newest') return 0; // Server already prepends newest first
        return b.helpfulCount - a.helpfulCount;
      });
  }, [selectedProduct, serverReviews, reviewMediaOnly, reviewVerifiedOnly, reviewSort, localHelpfulBoosts]);

  if (!selectedProduct) return null;

  const product = selectedProduct;
  const activeOffer =
    sellerOffers.find(o => o.id === selectedOfferId) ||
    sellerOffers.find(o => o.isDefault) ||
    sellerOffers[0] ||
    null;
  const displayPrice = activeOffer ? activeOffer.price : product.price;
  const displayMrp = activeOffer ? activeOffer.mrp : product.originalPrice;
  const displaySellerId = activeOffer ? activeOffer.sellerId : product.sellerId;
  const displaySellerName = activeOffer ? activeOffer.sellerName : product.sellerName;
  const displaySellerRating = activeOffer ? activeOffer.sellerRating : product.sellerRating;

  const wishlisted = isWishlisted(product.id);
  const compared = isCompared(product.id);
  const priceDropAlert = hasPriceAlert(product.id);
  const isCodAvailable = activeOffer ? activeOffer.codAvailable !== false : product.codAvailable !== false;
  const effectivePayMode = !isCodAvailable && selectedPayMode === 'cod' ? 'cashfree' : selectedPayMode;

  const currentColor = selectedColor || product.colors[0]?.name || '';
  const currentSizeObj =
    product.sizes.find(s => s.size === selectedSize) || product.sizes.find(s => s.available);
  const currentSize = selectedSize || currentSizeObj?.size || '';
  const sizeGuideType = resolveSizeGuideType(product.category, product.title);

  const selectedBundleProducts = bundleCandidates.filter(p => selectedBundleIds.includes(p.id));
  const bundleBaseTotal =
    displayPrice + selectedBundleProducts.reduce((sum, p) => sum + p.price, 0);
  const bundleDiscountedTotal =
    selectedBundleProducts.length > 0 ? Math.round(bundleBaseTotal * 0.9) : displayPrice;
  const bundleSavings = bundleBaseTotal - bundleDiscountedTotal;

  const filteredQuestions = questions.filter(q => {
    const qLower = qaSearch.trim().toLowerCase();
    if (!qLower) return true;
    return (
      q.question.toLowerCase().includes(qLower) ||
      q.answers.some(a => a.answer.toLowerCase().includes(qLower))
    );
  });

  const handleAddToCart = () => {
    if (!currentSize) {
      notify('Please choose an available size first.');
      return;
    }
    addToCart(product, currentSize, currentColor, 1, activeOffer || undefined);
  };

  const handleBuyNow = (overrideMode?: 'cashfree' | 'upi' | 'card' | 'netbanking' | 'cod') => {
    if (!currentSize) {
      notify('Please choose an available size first.');
      return;
    }
    buyProductNow(product, currentSize, currentColor, overrideMode || effectivePayMode, 1, activeOffer || undefined);
  };

  const handleAddBundleToCart = () => {
    if (!currentSize) {
      notify('Please choose a size for the main product first.');
      return;
    }
    addToCart(product, currentSize, currentColor, 1, activeOffer || undefined);
    selectedBundleProducts.forEach(item => {
      const availSize = item.sizes.find(s => s.available)?.size || 'Standard';
      const defaultColor = item.colors[0]?.name || 'Standard';
      addToCart(item, availSize, defaultColor, 1);
    });
    notify(`Added ${1 + selectedBundleProducts.length} bundle items to your bag!`);
  };

  const handleShareProduct = () => {
    earnCoins(50, `Shared ${product.title.slice(0, 20)}`);
    setShared(true);
    navigator.clipboard?.writeText?.(window.location.href);
    notify('Product referral link copied! +50 Bazaar Coins credited');
    setTimeout(() => setShared(false), 3000);
  };

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (pincode.length === 6) {
      setPincodeChecked(true);
      notify('Express delivery available at your location!');
    } else {
      notify('Please enter a valid 6-digit Indian PIN code.');
    }
  };

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHoverZoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomOrigin({ x, y });
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.isLoggedIn) {
      notify('Please sign in to post a product question.');
      setIsAuthOpen(true);
      return;
    }
    const trimmed = newQuestionText.trim();
    if (trimmed.length < 8) {
      notify('Please enter at least 8 characters for your question.');
      return;
    }
    setQaSubmitting(true);
    try {
      const res = await api.storefront.askQuestion(product.id, trimmed);
      if (res?.question) {
        setQuestions(prev => [res.question, ...prev]);
        setNewQuestionText('');
        notify('Your question has been posted!');
      }
    } catch (err: any) {
      notify(err?.message || 'Unable to post question right now.');
    } finally {
      setQaSubmitting(false);
    }
  };

  const handlePostAnswer = async (questionId: string) => {
    if (!user?.isLoggedIn) {
      notify('Please sign in to reply.');
      setIsAuthOpen(true);
      return;
    }
    const trimmed = replyText.trim();
    if (trimmed.length < 4) {
      notify('Answer must be at least 4 characters.');
      return;
    }
    try {
      const res = await api.storefront.answerQuestion(product.id, questionId, trimmed);
      if (res?.question) {
        setQuestions(prev => prev.map(q => (q.id === questionId ? res.question : q)));
        setReplyingToId(null);
        setReplyText('');
        notify('Answer published!');
      }
    } catch (err: any) {
      notify(err?.message || 'Unable to submit answer.');
    }
  };

  const handleUploadMediaFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!user?.isLoggedIn) {
      notify('Please sign in before uploading review photos or videos.');
      setIsAuthOpen(true);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      notify('Unsupported file format. Please upload JPG, PNG, WebP, MP4, or WebM.');
      return;
    }

    const maxBytes = file.type.startsWith('video/') ? 12 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      notify(file.type.startsWith('video/') ? 'Video must be under 12 MB.' : 'Image must be under 5 MB.');
      return;
    }

    setMediaUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await api.storefront.uploadReviewMedia({
        mimeType: file.type,
        dataBase64: base64,
        caption: file.name.slice(0, 60),
      });
      if (res?.media) {
        setUploadedMedia(prev => [...prev, res.media].slice(0, 4));
        notify('Media uploaded & attached to your review!');
      }
    } catch (err: any) {
      notify(err?.message || 'Media upload failed verification.');
    } finally {
      setMediaUploading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.isLoggedIn) {
      notify('Please sign in to write a customer review.');
      setIsAuthOpen(true);
      return;
    }
    if (newReviewComment.trim().length < 5) {
      notify('Please share at least 5 characters in your review.');
      return;
    }
    setReviewSubmitting(true);
    try {
      const res = await api.storefront.submitReview(product.id, {
        rating: newReviewRating,
        comment: newReviewComment.trim(),
        mediaIds: uploadedMedia.map(m => m.id!).filter(Boolean),
      });
      if (res?.review) {
        setServerReviews(prev => [res.review, ...prev]);
        setNewReviewComment('');
        setUploadedMedia([]);
        setShowReviewForm(false);
        notify('Thank you! Your review is now live.');
      }
    } catch (err: any) {
      notify(err?.message || 'Unable to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleVoteHelpful = async (reviewId: string) => {
    if (!user?.isLoggedIn) {
      notify('Sign in to mark reviews helpful.');
      setIsAuthOpen(true);
      return;
    }
    try {
      const res = await api.storefront.voteReviewHelpful(product.id, reviewId);
      if (typeof res?.helpfulCount === 'number') {
        setServerReviews(prev =>
          prev.map(r => (r.id === reviewId ? { ...r, helpfulCount: res.helpfulCount } : r))
        );
      } else {
        setLocalHelpfulBoosts(prev => ({ ...prev, [reviewId]: (prev[reviewId] ? 1 : 1) }));
      }
      notify('Marked review as helpful.');
    } catch (err: any) {
      notify(err?.message || 'Could not record helpful vote.');
    }
  };

  const handleReportReview = async (reviewId: string) => {
    if (!user?.isLoggedIn) {
      notify('Please sign in to report a review.');
      setIsAuthOpen(true);
      return;
    }
    try {
      await api.storefront.reportReview(
        product.id,
        reviewId,
        reportReason.trim() || 'Inappropriate or misleading content'
      );
      setReportingReviewId(null);
      setReportReason('');
      notify('Review reported to our moderation team.');
    } catch (err: any) {
      notify(err?.message || 'Unable to submit report.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn"
      onClick={() => setSelectedProduct(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.title}
        className="relative w-full max-w-6xl max-h-[94vh] bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky Top Header with Breadcrumbs & Close Button */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="min-w-0 flex-1">
            <Breadcrumbs
              items={breadcrumbNodes}
              onNavigate={(catId, subId) => {
                setSelectedProduct(null);
                navigateCategory(catId, subId ?? null);
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setSelectedProduct(null)}
            className="shrink-0 w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            title="Close product detail"
            aria-label="Close product detail"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div ref={scrollBodyRef} className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left Column: Interactive Zoom Gallery, Lightbox, 360 View & Video */}
            <div className="lg:col-span-6 p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col gap-4 lg:sticky lg:top-0 lg:self-start">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('image')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'image'
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Gallery
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('360')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      viewMode === '360'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>360°</span>
                  </button>
                  {product.videoUrl && (
                    <button
                      type="button"
                      onClick={() => setViewMode('video')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        viewMode === 'video'
                          ? 'bg-rose-600 text-white'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Video</span>
                    </button>
                  )}
                </div>

                {viewMode === 'image' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsHoverZoomed(prev => !prev)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
                        isHoverZoomed
                          ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900'
                          : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>{isHoverZoomed ? 'Zoom On' : 'Zoom'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxMedia({ images: product.images, index: activeImageIdx })
                      }
                      aria-label="Open full-screen gallery"
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Fullscreen</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Main Stage Viewport */}
              <div
                onMouseMove={handleImageMouseMove}
                onMouseEnter={() => {
                  if (viewMode === 'image') setIsHoverZoomed(true);
                }}
                onMouseLeave={() => setIsHoverZoomed(false)}
                className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 group"
              >
                {viewMode === 'image' && (
                  <>
                    <img
                      src={product.images[activeImageIdx] || product.images[0]}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      onClick={() => setLightboxMedia({ images: product.images, index: activeImageIdx })}
                      style={{
                        transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                      }}
                      className={`w-full h-full object-cover object-center transition-transform duration-200 cursor-zoom-in ${
                        isHoverZoomed ? 'scale-[1.75]' : 'scale-100'
                      }`}
                    />
                    {product.images.length > 1 && (
                      <>
                        <button
                          type="button"
                          aria-label="Previous image"
                          onClick={e => {
                            e.stopPropagation();
                            setActiveImageIdx(
                              prev => (prev - 1 + product.images.length) % product.images.length
                            );
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Next image"
                          onClick={e => {
                            e.stopPropagation();
                            setActiveImageIdx(prev => (prev + 1) % product.images.length);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </>
                )}

                {viewMode === '360' && (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-zinc-900 text-white relative">
                    <div
                      className="w-48 h-64 rounded-xl overflow-hidden border-2 border-indigo-400 shadow-2xl transition-transform duration-150"
                      style={{ transform: `rotateY(${rotation360}deg)` }}
                    >
                      <img
                        src={product.images[activeImageIdx] || product.images[0]}
                        alt="360 view"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute bottom-4 inset-x-6 flex flex-col items-center gap-2 bg-black/60 backdrop-blur-md p-3 rounded-2xl">
                      <span className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1">
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Drag Slider for 360° Inspection</span>
                      </span>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={rotation360}
                        onChange={e => setRotation360(parseInt(e.target.value, 10))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {viewMode === 'video' && product.videoUrl && (
                  <video
                    src={product.videoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                )}

                {product.isTrending && viewMode === 'image' && (
                  <div className="absolute top-4 left-4 bg-zinc-950/80 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-lg">
                    Trending Pick
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => openTryOn(product)}
                  className="absolute bottom-4 right-4 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                >
                  <Shirt className="w-4 h-4" />
                  <span>Virtual Try-On</span>
                </button>
              </div>

              {/* Thumbnail Strip */}
              {product.images.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveImageIdx(idx);
                        setViewMode('image');
                      }}
                      className={`relative w-18 h-22 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                        activeImageIdx === idx && viewMode === 'image'
                          ? 'border-rose-600 ring-2 ring-rose-600/20'
                          : 'border-zinc-200 dark:border-zinc-700 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Preview ${idx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Seller attribution */}
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div
                    className="flex items-center gap-2.5 cursor-pointer group/seller"
                    onClick={() => {
                      setSelectedProduct(null);
                      openSellerStore(displaySellerId);
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-zinc-900 dark:text-white group-hover/seller:text-emerald-600 transition-colors">
                          Sold by {displaySellerName}
                        </span>
                        {activeOffer?.isDefault && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                            Recommended
                          </span>
                        )}
                        <ExternalLink className="w-3 h-3 text-zinc-400 group-hover/seller:text-emerald-600" />
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                        <span className="text-emerald-600 font-medium">GST Verified</span>
                        <span>·</span>
                        <span className="text-amber-500 font-semibold">{displaySellerRating}★</span>
                        {activeOffer && (
                          <>
                            <span>·</span>
                            <span>Est. {activeOffer.deliveryDays} days · {activeOffer.stock} in stock</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        openSellerStore(displaySellerId);
                      }}
                      className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-medium text-[11px]"
                    >
                      Visit Store
                    </button>
                    <button
                      type="button"
                      onClick={() => chatWithSeller(displaySellerId, product)}
                      className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center justify-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>

                {sellerOffers.length > 1 && (
                  <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowAllOffers(prev => !prev)}
                      className="w-full flex items-center justify-between text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <span>Compare {sellerOffers.length} Seller Offers (from ₹{Math.min(...sellerOffers.map(o => o.price)).toLocaleString('en-IN')})</span>
                      <span>{showAllOffers ? 'Hide Offers' : 'Choose Seller'}</span>
                    </button>

                    {showAllOffers && (
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {sellerOffers.map(offer => {
                          const isSelected = activeOffer?.id === offer.id;
                          return (
                            <button
                              key={offer.id}
                              type="button"
                              onClick={() => setSelectedOfferId(offer.id)}
                              className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-zinc-900 dark:text-white truncate">
                                    {offer.sellerName}
                                  </span>
                                  {offer.isDefault && (
                                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                      · Best Value
                                    </span>
                                  )}
                                  <span className="text-[10px] uppercase font-mono text-zinc-500">
                                    · {offer.condition.replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="text-[10px] text-zinc-500 mt-0.5 tabular-nums">
                                  {offer.sellerRating}★ · Delivers in {offer.deliveryDays}d · {offer.shippingFee === 0 ? 'Free Shipping' : `+₹${offer.shippingFee} shipping`} · {offer.stock} left
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-mono font-bold text-zinc-900 dark:text-white tabular-nums">
                                  {formatPrice(offer.price)}
                                </div>
                                <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                                  {isSelected ? 'Selected' : 'Select'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Contiguous Purchase Module */}
            <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                  <span className="font-bold tracking-wider uppercase text-rose-600 dark:text-rose-400">
                    {product.brand}
                  </span>
                  <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md text-zinc-900 dark:text-zinc-100 font-medium tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{product.rating}</span>
                    <span className="text-zinc-400">({product.reviewCount + serverReviews.length} reviews)</span>
                  </div>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white font-display leading-snug">
                  {product.title}
                </h1>

                {/* Price Row */}
                <div className="mt-3 flex flex-wrap items-baseline gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white font-mono tabular-nums">
                    {formatPrice(displayPrice)}
                  </span>
                  {displayMrp > displayPrice && (
                    <span className="text-sm text-zinc-400 line-through font-mono tabular-nums">
                      {formatPrice(displayMrp)}
                    </span>
                  )}
                  {displayMrp > displayPrice && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold font-mono">
                      {Math.round(((displayMrp - displayPrice) / displayMrp) * 100)}% OFF
                    </span>
                  )}
                  <span className="text-xs text-zinc-400">Inclusive of all taxes</span>
                </div>

                {/* Color selection */}
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs font-semibold mb-2">
                    <span className="text-zinc-800 dark:text-zinc-200">Color: {currentColor}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {product.colors.map(c => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setSelectedColor(c.name)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          currentColor === c.name
                            ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white ring-1 ring-zinc-900 dark:ring-white'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size selection + Interactive Size Chart */}
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs font-semibold mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-800 dark:text-zinc-200">Select Size</span>
                      <button
                        type="button"
                        onClick={() => setIsSizeChartOpen(true)}
                        className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                      >
                        <Ruler className="w-3.5 h-3.5" />
                        <span>Size Chart</span>
                      </button>
                    </div>
                    {currentSizeObj && (
                      <span
                        className={`text-[11px] font-medium tabular-nums ${
                          currentSizeObj.stockCount <= 3 ? 'text-rose-600 font-bold' : 'text-zinc-500'
                        }`}
                      >
                        {currentSizeObj.stockCount <= 3
                          ? `Only ${currentSizeObj.stockCount} left!`
                          : `${currentSizeObj.stockCount} in stock`}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map(s => (
                      <button
                        key={s.size}
                        type="button"
                        disabled={!s.available}
                        onClick={() => setSelectedSize(s.size)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                          !s.available
                            ? 'opacity-40 cursor-not-allowed line-through bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                            : currentSize === s.size
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {s.size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delivery check */}
                <div className="mt-6 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-white mb-2">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    <span>Delivery Date & Return Coverage</span>
                  </div>
                  <form onSubmit={handleCheckPincode} className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit Pincode (e.g. 400050)"
                      value={pincode}
                      onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      Check
                    </button>
                  </form>
                  {pincodeChecked && (
                    <div className="mt-3 text-xs space-y-1.5 text-zinc-600 dark:text-zinc-300">
                      <p className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          Express Delivery by <strong>Tomorrow, 5:00 PM</strong>
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 text-zinc-400" />
                        <span>
                          {product.price > 999 ? 'Free shipping included' : '₹49 standard shipping (Free ₹999+)'} ·{' '}
                          {product.returnPeriodDays}-day returns
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Specs */}
                <div className="mt-6 space-y-3">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                    Product Details & Fabric
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {product.description}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                    {product.fabric && (
                      <div className="p-2.5 rounded-lg bg-zinc-100/60 dark:bg-zinc-800/40">
                        <span className="text-zinc-400 block text-[10px] uppercase">Fabric / Material</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{product.fabric}</span>
                      </div>
                    )}
                    {product.fit && (
                      <div className="p-2.5 rounded-lg bg-zinc-100/60 dark:bg-zinc-800/40">
                        <span className="text-zinc-400 block text-[10px] uppercase">Silhouette & Fit</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{product.fit}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Gateway & COD Options */}
              <div className="mt-6 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Payment & Delivery Options</span>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                    100% Secure
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPayMode(effectivePayMode === 'cod' ? 'cashfree' : effectivePayMode)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      effectivePayMode !== 'cod'
                        ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 ring-1 ring-emerald-600'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                      CF
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                        Online Payment Gateway
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">
                        Cashfree · UPI · Cards · NetBanking
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={!isCodAvailable}
                    onClick={() => setSelectedPayMode('cod')}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      !isCodAvailable
                        ? 'opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900'
                        : effectivePayMode === 'cod'
                        ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 ring-1 ring-emerald-600'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                        Cash on Delivery (COD)
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">
                        {isCodAvailable ? 'Pay Cash or UPI at Doorstep' : 'Prepaid Only'}
                      </span>
                    </div>
                  </button>
                </div>

                {effectivePayMode !== 'cod' && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {[
                      { id: 'cashfree' as const, label: 'Cashfree Checkout', icon: ShieldCheck },
                      { id: 'upi' as const, label: 'UPI / QR', icon: QrCode },
                      { id: 'card' as const, label: 'Card', icon: CreditCard },
                      { id: 'netbanking' as const, label: 'NetBanking', icon: Building2 },
                    ].map(opt => {
                      const Icon = opt.icon;
                      const active = effectivePayMode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedPayMode(opt.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-all ${
                            active
                              ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white'
                              : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Primary CTAs */}
              <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleBuyNow()}
                    className="py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.98]"
                  >
                    {effectivePayMode === 'cod' ? <Banknote className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    <span>
                      {effectivePayMode === 'cod'
                        ? 'Buy Now (COD)'
                        : effectivePayMode === 'upi'
                        ? 'Pay Now via UPI'
                        : effectivePayMode === 'card'
                        ? 'Pay Now via Card'
                        : effectivePayMode === 'netbanking'
                        ? 'Pay Now via NetBanking'
                        : 'Pay via Cashfree'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="py-3.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all active:scale-[0.98]"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add To Bag</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openTryOn(product)}
                    className="p-3 rounded-xl border border-indigo-300 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                    title="Virtual Try-On"
                  >
                    <Shirt className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCompare(product.id)}
                    className={`p-3 rounded-xl border transition-colors ${
                      compared
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                    title={compared ? 'In comparison' : 'Compare'}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWishlist(product.id, product.title)}
                    className={`p-3 rounded-xl border transition-all ${
                      wishlisted
                        ? 'bg-rose-50 border-rose-300 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900'
                        : 'border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                    title={wishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}
                  >
                    <Heart className={`w-4 h-4 ${wishlisted ? 'fill-rose-600' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePriceAlert(product)}
                    className={`flex-1 py-3 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      priceDropAlert
                        ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>{priceDropAlert ? 'Price Alert Active' : 'Notify Price Drop'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleShareProduct}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors"
                >
                  <Share2 className="w-4 h-4 text-amber-600" />
                  <span>{shared ? 'Link Copied! +50 Coins Earned' : 'Share With Friends & Earn 50 Coins'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Frequently Bought Together — Real Product Bundle Builder */}
          {bundleCandidates.length > 0 && (
            <div className="p-5 sm:p-6 bg-amber-50/50 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                    Frequently Bought Together (Save 10% Bundle)
                  </h4>
                </div>
                {bundleSavings > 0 && (
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    Bundle saves {formatPrice(bundleSavings)}
                  </span>
                )}
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Current Item */}
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-12 h-14 rounded-lg object-cover shrink-0"
                    />
                    <div className="max-w-[140px]">
                      <p className="text-[11px] font-semibold text-zinc-900 dark:text-white truncate">
                        {product.title}
                      </p>
                      <span className="text-xs font-bold font-mono text-zinc-800 dark:text-zinc-200 tabular-nums">
                        {formatPrice(product.price)}
                      </span>
                    </div>
                  </div>

                  {bundleCandidates.map(cand => {
                    const checked = selectedBundleIds.includes(cand.id);
                    return (
                      <React.Fragment key={cand.id}>
                        <span className="font-bold text-zinc-400">+</span>
                        <label
                          className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                            checked
                              ? 'bg-white dark:bg-zinc-900 border-amber-400 ring-1 ring-amber-400/40'
                              : 'bg-zinc-100/70 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 opacity-70'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedBundleIds(prev =>
                                prev.includes(cand.id)
                                  ? prev.filter(id => id !== cand.id)
                                  : [...prev, cand.id]
                              )
                            }
                            className="accent-rose-600 w-4 h-4 rounded shrink-0"
                          />
                          <img
                            src={cand.images[0]}
                            alt={cand.title}
                            className="w-12 h-14 rounded-lg object-cover shrink-0"
                          />
                          <div className="max-w-[145px]">
                            <p className="text-[11px] font-semibold text-zinc-900 dark:text-white truncate">
                              {cand.title}
                            </p>
                            <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                              {formatPrice(cand.price)}
                            </span>
                          </div>
                        </label>
                      </React.Fragment>
                    );
                  })}
                </div>

                <div className="flex sm:flex-row md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
                  <div className="text-left md:text-right">
                    <span className="text-[11px] text-zinc-500 block">
                      Total for {1 + selectedBundleProducts.length} item(s)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-extrabold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                        {formatPrice(bundleDiscountedTotal)}
                      </span>
                      {bundleSavings > 0 && (
                        <span className="text-xs text-zinc-400 line-through font-mono tabular-nums">
                          {formatPrice(bundleBaseTotal)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBundleToCart}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Selected ({1 + selectedBundleProducts.length})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Customer Questions & Answers Section (API-backed) */}
          <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-rose-600" />
                  <span>Customer Questions & Answers ({questions.length})</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Ask about sizing, fabric care, or delivery directly from verified sellers & buyers.
                </p>
              </div>
              <input
                type="text"
                placeholder="Search Q&A..."
                value={qaSearch}
                onChange={e => setQaSearch(e.target.value)}
                className="w-full sm:w-56 px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Ask a Question Form */}
            <form onSubmit={handleAskQuestion} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                maxLength={500}
                placeholder={
                  user?.isLoggedIn
                    ? 'Have a question about fit, material, or shipping? Ask here...'
                    : 'Sign in to ask a product question...'
                }
                value={newQuestionText}
                onChange={e => setNewQuestionText(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                disabled={qaSubmitting}
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{qaSubmitting ? 'Posting...' : 'Ask Question'}</span>
              </button>
            </form>

            {qaLoading ? (
              <p className="text-xs text-zinc-400 py-2">Loading questions...</p>
            ) : filteredQuestions.length > 0 ? (
              <div className="space-y-3">
                {filteredQuestions.map(q => (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 space-y-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-zinc-900 dark:text-white">
                        Q: {q.question}
                      </p>
                      <button
                        type="button"
                        onClick={() => setReplyingToId(replyingToId === q.id ? null : q.id)}
                        className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline shrink-0"
                      >
                        {replyingToId === q.id ? 'Cancel' : 'Answer'}
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-500">Asked by {q.userName}</p>

                    {q.answers.length > 0 ? (
                      <div className="pl-3 border-l-2 border-emerald-500/40 space-y-2">
                        {q.answers.map(ans => (
                          <div key={ans.id}>
                            <p className="text-zinc-700 dark:text-zinc-200 leading-relaxed">
                              <strong className="text-zinc-900 dark:text-white">A:</strong> {ans.answer}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-500">
                              <span>{ans.userName}</span>
                              {ans.responderRole === 'seller' && (
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  Seller Official
                                </span>
                              )}
                              {ans.responderRole === 'verified_buyer' && (
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                  Verified Buyer
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-400 italic">
                        Awaiting seller or buyer reply — click Answer to help!
                      </p>
                    )}

                    {replyingToId === q.id && (
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Write a helpful answer..."
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handlePostAnswer(q.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0"
                        >
                          Submit
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 py-2">
                No questions posted for this product yet. Be the first to ask!
              </p>
            )}
          </div>

          {/* Customer Photo & Video Reviews Section */}
          <div className="p-6 sm:p-8 bg-zinc-50 dark:bg-zinc-950/30 border-t border-zinc-200 dark:border-zinc-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                  Customer Reviews, Photos & Videos ({combinedReviews.length})
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Verified Purchase badges are awarded strictly from confirmed order history.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!user?.isLoggedIn) {
                    notify('Please sign in to write a review.');
                    setIsAuthOpen(true);
                    return;
                  }
                  setShowReviewForm(prev => !prev);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
              >
                {showReviewForm ? 'Close Review Form' : 'Write a Review'}
              </button>
            </div>

            {/* Review Composer with Photo/Video Upload */}
            {showReviewForm && (
              <form
                onSubmit={handleSubmitReview}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 animate-fadeIn"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">Your Rating</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`Rate ${star} stars`}
                        onClick={() => setNewReviewRating(star)}
                        className="p-1"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= newReviewRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-zinc-300 dark:text-zinc-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={3}
                  maxLength={1000}
                  placeholder="Share fabric feel, sizing fit, color accuracy, or delivery feedback..."
                  value={newReviewComment}
                  onChange={e => setNewReviewComment(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-rose-400">
                      <ImagePlus className="w-3.5 h-3.5 text-rose-600" />
                      <span>{mediaUploading ? 'Uploading...' : 'Add Photo / Video'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                        disabled={mediaUploading || uploadedMedia.length >= 4}
                        onChange={handleUploadMediaFile}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-zinc-400">
                      JPG/PNG/WebP (&le;5MB) or MP4/WebM (&le;12MB)
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={reviewSubmitting || mediaUploading}
                    className="px-5 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {reviewSubmitting ? 'Publishing...' : 'Publish Review'}
                  </button>
                </div>

                {uploadedMedia.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {uploadedMedia.map(m => (
                      <div
                        key={m.id || m.url}
                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100"
                      >
                        {m.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white">
                            <Video className="w-5 h-5" />
                          </div>
                        ) : (
                          <img src={m.url} alt="Uploaded preview" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          aria-label="Remove attachment"
                          onClick={() =>
                            setUploadedMedia(prev => prev.filter(item => item.url !== m.url))
                          }
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/75 text-white flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            )}

            {/* Review Filters & Sort Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setReviewMediaOnly(prev => !prev)}
                  className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                    reviewMediaOnly
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  With Photos & Videos
                </button>
                <button
                  type="button"
                  onClick={() => setReviewVerifiedOnly(prev => !prev)}
                  className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                    reviewVerifiedOnly
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  Verified Buyers Only
                </button>
              </div>

              <select
                aria-label="Sort reviews"
                value={reviewSort}
                onChange={e => setReviewSort(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-800 dark:text-zinc-200"
              >
                <option value="helpful">Most Helpful</option>
                <option value="newest">Newest First</option>
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
              </select>
            </div>

            {/* Review Cards */}
            {combinedReviews.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {combinedReviews.map(rev => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-zinc-900 dark:text-white">{rev.userName}</span>
                      <span className="text-zinc-400">{rev.date}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-zinc-200 text-zinc-200 dark:fill-zinc-700 dark:text-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                      {rev.verifiedPurchase && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          Verified Purchase
                        </span>
                      )}
                    </div>

                    <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">{rev.comment}</p>

                    {rev.media && rev.media.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {rev.media.map((m, idx) =>
                          m.type === 'video' ? (
                            <video
                              key={m.id || idx}
                              src={m.url}
                              controls
                              className="w-28 h-20 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700"
                            />
                          ) : (
                            <button
                              key={m.id || idx}
                              type="button"
                              onClick={() =>
                                setLightboxMedia({
                                  images: rev
                                    .media!.filter(item => item.type === 'image')
                                    .map(item => item.url),
                                  index: 0,
                                })
                              }
                              className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 hover:opacity-90"
                            >
                              <img src={m.url} alt="Customer review" className="w-full h-full object-cover" />
                            </button>
                          )
                        )}
                      </div>
                    )}

                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleVoteHelpful(rev.id)}
                        className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-medium"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Helpful ({rev.helpfulCount})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setReportingReviewId(reportingReviewId === rev.id ? null : rev.id)
                        }
                        className="inline-flex items-center gap-1 text-zinc-400 hover:text-rose-500"
                      >
                        <Flag className="w-3 h-3" />
                        <span>Report</span>
                      </button>
                    </div>

                    {reportingReviewId === rev.id && (
                      <div className="pt-2 flex gap-2">
                        <input
                          type="text"
                          value={reportReason}
                          onChange={e => setReportReason(e.target.value)}
                          placeholder="Reason (spam, inaccurate photo, etc.)"
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-[11px]"
                        />
                        <button
                          type="button"
                          onClick={() => handleReportReview(rev.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold text-[11px]"
                        >
                          Submit
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 py-3">
                No reviews match the selected filters. Clear filters to read all customer reviews.
              </p>
            )}
          </div>

          {/* Related & Similar Products Discovery */}
          {relatedProducts.length > 0 && (
            <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                  Related & Similar Styles
                </h3>
                <span className="text-xs text-zinc-500">Tap to inspect</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {relatedProducts.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedProduct(item)}
                    className="text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 overflow-hidden hover:border-rose-400 transition-all group"
                  >
                    <div className="aspect-[4/5] bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="text-[11px] font-semibold text-zinc-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                          {formatPrice(item.price)}
                        </span>
                        <span className="text-[10px] text-amber-500 font-semibold">
                          {item.rating}★
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recently Viewed Inside PDP */}
          {recentlyViewedProducts.filter(p => p.id !== product.id).length > 0 && (
            <div className="px-6 sm:px-8 pb-6 bg-white dark:bg-zinc-900 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                <span>Recently Viewed</span>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {recentlyViewedProducts
                  .filter(p => p.id !== product.id)
                  .slice(0, 6)
                  .map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedProduct(item)}
                      className="w-32 shrink-0 text-left rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:border-rose-400 transition-colors"
                    >
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="w-full h-28 object-cover"
                      />
                      <div className="p-2">
                        <p className="text-[11px] font-semibold text-zinc-900 dark:text-white truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] font-bold font-mono text-rose-600 tabular-nums">
                          {formatPrice(item.price)}
                        </p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/95">
          <div className="flex items-baseline gap-2">
            <span className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white font-mono tabular-nums">
              {formatPrice(product.price)}
            </span>
            <span className="text-xs text-zinc-400 line-through font-mono hidden sm:inline tabular-nums">
              {formatPrice(product.originalPrice)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleBuyNow()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap shrink-0"
            >
              {effectivePayMode === 'cod' ? <Banknote className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
              <span>{effectivePayMode === 'cod' ? 'Order COD' : 'Buy Now'}</span>
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Add to Bag</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="hidden sm:flex px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 font-bold text-xs items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category-Aware Interactive Size Chart Sub-Modal */}
      {isSizeChartOpen && (
        <div
          className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsSizeChartOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Product Size Chart"
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-rose-600" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                  {sizeGuideType === 'footwear'
                    ? 'Footwear Size Guide (UK / US / EU / CM)'
                    : sizeGuideType === 'accessories'
                    ? 'Dimensions & Fit Specifications'
                    : 'Apparel Size Guide (Inches & CM)'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsSizeChartOpen(false)}
                aria-label="Close size chart"
                className="p-1 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {sizeGuideType === 'apparel' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                      <th className="py-2 pr-3 font-semibold">Size</th>
                      <th className="py-2 pr-3 font-semibold">Chest (in)</th>
                      <th className="py-2 pr-3 font-semibold">Waist (in)</th>
                      <th className="py-2 font-semibold">Length (in)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono tabular-nums">
                    {[
                      ['XS / 28', '34', '28', '42'],
                      ['S / 30', '36', '30', '43'],
                      ['M / 32', '38', '32', '44'],
                      ['L / 34', '40', '34', '45'],
                      ['XL', '42', '36', '46'],
                      ['XXL', '44', '38', '47'],
                    ].map(row => (
                      <tr key={row[0]}>
                        <td className="py-2 pr-3 font-bold text-zinc-900 dark:text-white">{row[0]}</td>
                        <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-300">{row[1]}"</td>
                        <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-300">{row[2]}"</td>
                        <td className="py-2 text-zinc-600 dark:text-zinc-300">{row[3]}"</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {sizeGuideType === 'footwear' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                      <th className="py-2 pr-3 font-semibold">UK / India</th>
                      <th className="py-2 pr-3 font-semibold">US</th>
                      <th className="py-2 pr-3 font-semibold">EU</th>
                      <th className="py-2 font-semibold">Foot Length (cm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono tabular-nums">
                    {[
                      ['UK 6', '7', '39', '24.6 cm'],
                      ['UK 7', '8', '40.5', '25.4 cm'],
                      ['UK 8', '9', '42', '26.2 cm'],
                      ['UK 9', '10', '43', '27.0 cm'],
                      ['UK 10', '11', '44.5', '27.8 cm'],
                    ].map(row => (
                      <tr key={row[0]}>
                        <td className="py-2 pr-3 font-bold text-zinc-900 dark:text-white">{row[0]}</td>
                        <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-300">{row[1]}</td>
                        <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-300">{row[2]}</td>
                        <td className="py-2 text-zinc-600 dark:text-zinc-300">{row[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {sizeGuideType === 'accessories' && (
              <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
                <p>
                  <strong className="text-zinc-900 dark:text-white">Standard Variant:</strong>{' '}
                  {currentSize || 'Standard Fit'}
                </p>
                {product.dimensions && (
                  <p>
                    <strong className="text-zinc-900 dark:text-white">Dimensions:</strong>{' '}
                    {product.dimensions.lengthCm} × {product.dimensions.widthCm} × {product.dimensions.heightCm} cm
                  </p>
                )}
                {product.weightGrams && (
                  <p>
                    <strong className="text-zinc-900 dark:text-white">Weight:</strong> {product.weightGrams} g
                  </p>
                )}
                <p className="text-[11px] text-zinc-500">
                  Tip: If ordering adjustable Kundan chokers or structured totes, check compartment dimensions listed in Product Details.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal for Gallery & Review Photos */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-70 bg-black/92 flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxMedia(null)}
        >
          <div className="w-full max-w-4xl flex items-center justify-between text-white mb-3">
            <span className="text-xs font-mono tabular-nums">
              {lightboxMedia.index + 1} / {lightboxMedia.images.length}
            </span>
            <button
              type="button"
              onClick={() => setLightboxMedia(null)}
              aria-label="Close fullscreen gallery"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="relative w-full max-w-4xl h-[75vh] flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={lightboxMedia.images[lightboxMedia.index]}
              alt="Enlarged product view"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-full object-contain rounded-xl"
            />
            {lightboxMedia.images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous gallery photo"
                  onClick={() =>
                    setLightboxMedia(prev =>
                      prev
                        ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length }
                        : null
                    )
                  }
                  className="absolute left-2 sm:left-4 p-3 rounded-full bg-white/15 hover:bg-white/25 text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next gallery photo"
                  onClick={() =>
                    setLightboxMedia(prev =>
                      prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null
                    )
                  }
                  className="absolute right-2 sm:right-4 p-3 rounded-full bg-white/15 hover:bg-white/25 text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
