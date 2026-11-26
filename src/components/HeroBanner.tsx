import React, { useMemo, useState, useEffect } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import {
  Play,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Zap,
  Clock,
  Sparkles,
  Shirt,
  Footprints,
  ShoppingBag,
  Tv,
  Home,
  ShoppingBasket,
  Palette,
  Gem,
  LayoutGrid,
  Plus,
} from 'lucide-react';

interface CampaignSlide {
  id: string;
  eyebrow: string;
  headline: string;
  subcopy: string;
  ctaLabel: string;
  targetCategory: string;
  targetSubcategory?: string | null;
  image: string;
  linkUrl?: string;
}

const CAMPAIGN_SLIDES: CampaignSlide[] = [
  {
    id: 'festive-silk',
    eyebrow: 'Prime Bazaar Fashion First · Festive Edit',
    headline: 'Handloom Silks, Artisans & Studio Streetwear — All In One Marketplace.',
    subcopy:
      'Discover GST-verified makers, multi-seller offers, and Cashfree-protected checkout across 34 categories.',
    ctaLabel: "Shop Women's Fashion",
    targetCategory: 'womens-fashion',
    targetSubcategory: 'anarkali-kurti',
    image: '/src/assets/images/hero_fashion_campaign_1793466539913.jpg',
  },
  {
    id: 'streetwear-drop',
    eyebrow: 'Studio Utility Drop · Up to 55% Off',
    headline: '420 GSM Heavyweight Outerwear & Urban Menswear.',
    subcopy:
      'Cut-and-sew cargo jackets, acid-wash oversized tees, and everyday staples with pan-India courier dispatch.',
    ctaLabel: "Shop Men's Fashion",
    targetCategory: 'mens-fashion',
    targetSubcategory: 'cargo-jackets',
    image: '/src/assets/images/collection_streetwear_1793466541088.jpg',
  },
  {
    id: 'footwear-bags',
    eyebrow: 'Daily Footwear & Vegan Leather Bags',
    headline: 'Platform Sneakers & Structured Work Totes.',
    subcopy:
      'Compare seller offers, delivery speed, and bulk pricing across verified studio labels.',
    ctaLabel: 'Explore Footwear & Bags',
    targetCategory: 'footwear',
    targetSubcategory: null,
    image: '/src/assets/images/collection_footwear_1793466541533.jpg',
  },
];

interface ShortcutTile {
  id: string;
  label: string;
  category: string;
  sub?: string | null;
  image?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accentClass: string;
}

const CATEGORY_SHORTCUTS: ShortcutTile[] = [
  {
    id: 'womens-fashion',
    label: "Women's Fashion",
    category: 'womens-fashion',
    image: '/src/assets/images/collection_ethnic_wear_1793466539838.jpg',
    accentClass: 'ring-rose-200 dark:ring-rose-900/50',
  },
  {
    id: 'mens-fashion',
    label: "Men's Fashion",
    category: 'mens-fashion',
    image: '/src/assets/images/collection_streetwear_1793466541088.jpg',
    accentClass: 'ring-slate-200 dark:ring-zinc-700',
  },
  {
    id: 'footwear',
    label: 'Footwear',
    category: 'footwear',
    image: '/src/assets/images/collection_footwear_1793466541533.jpg',
    accentClass: 'ring-orange-200 dark:ring-orange-900/50',
  },
  {
    id: 'bags',
    label: 'Bags & Totes',
    category: 'bags',
    icon: ShoppingBag,
    accentClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 ring-amber-200 dark:ring-amber-900/40',
  },
  {
    id: 'jewellery',
    label: 'Jewellery',
    category: 'jewellery',
    icon: Gem,
    accentClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 ring-rose-200 dark:ring-rose-900/40',
  },
  {
    id: 'beauty',
    label: 'Beauty',
    category: 'beauty',
    icon: Palette,
    accentClass: 'bg-pink-50 dark:bg-pink-950/40 text-pink-600 ring-pink-200 dark:ring-pink-900/40',
  },
  {
    id: 'electronics',
    label: 'Electronics',
    category: 'electronics',
    icon: Tv,
    accentClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 ring-sky-200 dark:ring-sky-900/40',
  },
  {
    id: 'home-kitchen',
    label: 'Home & Kitchen',
    category: 'home-kitchen',
    icon: Home,
    accentClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 ring-emerald-200 dark:ring-emerald-900/40',
  },
  {
    id: 'grocery',
    label: 'Grocery',
    category: 'grocery',
    icon: ShoppingBasket,
    accentClass: 'bg-lime-50 dark:bg-lime-950/40 text-lime-700 ring-lime-200 dark:ring-lime-900/40',
  },
  {
    id: 'kids-fashion',
    label: 'Kids Wear',
    category: 'kids-fashion',
    icon: Shirt,
    accentClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 ring-indigo-200 dark:ring-indigo-900/40',
  },
];

function isSafeLinkUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatCountdownParts(secondsLeft: number) {
  const hrs = Math.floor(secondsLeft / 3600);
  const mins = Math.floor((secondsLeft % 3600) / 60);
  const secs = secondsLeft % 60;
  return {
    hh: String(hrs).padStart(2, '0'),
    mm: String(mins).padStart(2, '0'),
    ss: String(secs).padStart(2, '0'),
  };
}

export const HeroBanner: React.FC = () => {
  const {
    products,
    navigateCategory,
    setDiscoveryTab,
    setIsReelsOpen,
    setIsMobileCategoriesOpen,
    setSelectedProduct,
    addToCart,
    formatPrice,
    cmsBanners,
    categories,
  } = useMarketplace();

  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Live Flash Deal countdown anchored to a clean 6-hour rolling window
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const cycle = 6 * 3600;
    const elapsed = Math.floor(Date.now() / 1000) % cycle;
    return Math.max(60, cycle - elapsed);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(prev => (prev > 1 ? prev - 1 : 6 * 3600));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const slides: CampaignSlide[] = useMemo(() => {
    const heroCms = (cmsBanners || []).filter(
      b => b.status === 'PUBLISHED' && (b.placement === 'HERO' || !b.placement)
    );
    if (heroCms.length === 0) return CAMPAIGN_SLIDES;

    return heroCms.map((b, i) => ({
      id: b.id || `cms-hero-${i}`,
      eyebrow: b.eyebrow || 'Featured Marketplace Campaign',
      headline: b.title,
      subcopy: b.subtitle || 'Verified GST merchants and pan-India courier fulfillment.',
      ctaLabel: b.ctaLabel || 'Shop Collection',
      targetCategory: b.targetCategory || 'all',
      targetSubcategory: b.targetSubcategory ?? null,
      image: b.imageUrl || CAMPAIGN_SLIDES[i % CAMPAIGN_SLIDES.length].image,
      linkUrl: isSafeLinkUrl(b.linkUrl) ? b.linkUrl : undefined,
    }));
  }, [cmsBanners]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlideIdx(prev => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  const flashDealProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0))
      .slice(0, 6);
  }, [products]);

  const safeIdx = activeSlideIdx < slides.length ? activeSlideIdx : 0;
  const slide = slides[safeIdx] || CAMPAIGN_SLIDES[0];
  const countdown = formatCountdownParts(secondsLeft);

  const handleCampaignClick = (cat: string, sub?: string | null, linkUrl?: string) => {
    if (linkUrl && isSafeLinkUrl(linkUrl) && linkUrl.startsWith('http')) {
      window.location.assign(linkUrl);
      return;
    }
    setDiscoveryTab('all');
    navigateCategory(cat, sub ?? null);
    const el = document.getElementById('catalog-section');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      aria-label="Promotional marketplace showcase and flash deals"
      className="max-w-[1440px] mx-auto px-3 sm:px-6 pt-3 sm:pt-4 pb-2 space-y-4"
    >
      {/* 1. Hero Promotional Slider */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative overflow-hidden rounded-2xl bg-[#0F172A] text-white border border-slate-800 shadow-lg"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-5 sm:p-8 lg:p-10 flex flex-col justify-between relative z-10 bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#1E293B]">
            <div>
              <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-orange-400">
                {slide.eyebrow}
              </span>
              <h1 className="mt-2 text-2xl sm:text-3xl lg:text-[2.2rem] font-extrabold tracking-tight font-display leading-[1.15] text-white max-w-2xl">
                {slide.headline}
              </h1>
              <p className="mt-2.5 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                {slide.subcopy}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => handleCampaignClick(slide.targetCategory, slide.targetSubcategory, slide.linkUrl)}
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap shadow-md shadow-orange-600/25"
                >
                  <span>{slide.ctaLabel}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDiscoveryTab('deals');
                    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs sm:text-sm whitespace-nowrap transition-colors"
                >
                  Today&apos;s Deals
                </button>
                <button
                  type="button"
                  onClick={() => setIsReelsOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                  <span>Reels</span>
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>GST Verified Sellers</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Free Delivery ₹999+</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>7-Day Easy Returns</span>
                </span>
              </div>

              {slides.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Previous slide"
                    onClick={() => setActiveSlideIdx(prev => (prev - 1 + slides.length) % slides.length)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {slides.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-label={`Slide ${idx + 1}: ${s.eyebrow}`}
                      onClick={() => setActiveSlideIdx(idx)}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === safeIdx ? 'w-6 bg-orange-500' : 'w-2 bg-slate-700 hover:bg-slate-500'
                      }`}
                    />
                  ))}
                  <button
                    type="button"
                    aria-label="Next slide"
                    onClick={() => setActiveSlideIdx(prev => (prev + 1) % slides.length)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[210px] sm:min-h-[250px] lg:min-h-[290px] overflow-hidden bg-slate-900">
            <img
              src={slide.image}
              alt={slide.headline}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#0F172A]/75 via-transparent to-transparent" />
          </div>
        </div>
      </div>

      {/* 2. Temu-Inspired Flash Deals Strip with Live Countdown Timer */}
      {flashDealProducts.length > 0 && (
        <div className="rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-gradient-to-r from-orange-50 via-white to-rose-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900 p-3.5 sm:p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-extrabold text-sm sm:text-base font-display">
                <Zap className="w-4 h-4 fill-orange-500 text-orange-500 shrink-0" />
                <span>Lightning Flash Deals</span>
              </div>
              <div
                aria-label="Flash deal countdown timer"
                className="flex items-center gap-1 text-[11px] font-mono font-bold tabular-nums"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500 mr-0.5" />
                <span className="px-1.5 py-0.5 rounded bg-[#0F172A] text-white">{countdown.hh}</span>
                <span className="text-slate-500">:</span>
                <span className="px-1.5 py-0.5 rounded bg-[#0F172A] text-white">{countdown.mm}</span>
                <span className="text-slate-500">:</span>
                <span className="px-1.5 py-0.5 rounded bg-orange-600 text-white">{countdown.ss}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setDiscoveryTab('flash');
                document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 whitespace-nowrap"
            >
              <span>View All Flash Deals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {flashDealProducts.map(item => {
              const firstAvailSize = item.sizes.find(s => s.available)?.size || item.sizes[0]?.size || 'Free Size';
              const firstColor = item.colors[0]?.name || 'Standard';
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedProduct(item)}
                  className="group bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 p-2 flex flex-col justify-between cursor-pointer hover:border-orange-400 transition-all"
                >
                  <div>
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-800 mb-2">
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {item.discountPercent > 0 && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-orange-600 text-white text-[10px] font-extrabold font-mono tabular-nums">
                          -{item.discountPercent}%
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-900 dark:text-zinc-100 line-clamp-1">
                      {item.title}
                    </p>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <span className="block text-xs font-extrabold text-orange-600 dark:text-orange-400 font-mono tabular-nums">
                        {formatPrice(item.price)}
                      </span>
                      {item.originalPrice > item.price && (
                        <span className="block text-[10px] text-slate-400 line-through font-mono tabular-nums">
                          {formatPrice(item.originalPrice)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Quick add ${item.title} to cart`}
                      onClick={e => {
                        e.stopPropagation();
                        addToCart(item, firstAvailSize, firstColor, 1);
                      }}
                      className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-orange-600 dark:bg-zinc-800 dark:hover:bg-orange-600 text-white flex items-center justify-center shrink-0 transition-colors"
                      title="Quick Add"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Popular Category Shortcut Tiles */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-display flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>Shop by Popular Category</span>
          </h2>
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsMobileCategoriesOpen(true);
              } else {
                handleCampaignClick('all', null);
              }
            }}
            className="text-[11px] font-bold text-orange-600 hover:underline flex items-center gap-1"
          >
            <span>All {categories.length} Categories</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-start gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-1">
          {CATEGORY_SHORTCUTS.map(tile => {
            const Icon = tile.icon || LayoutGrid;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => handleCampaignClick(tile.category, tile.sub)}
                className="group flex flex-col items-center gap-1.5 w-16 sm:w-20 shrink-0 text-center"
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden ring-2 ${tile.accentClass} flex items-center justify-center transition-transform group-hover:scale-105 group-hover:ring-orange-500`}
                >
                  {tile.image ? (
                    <img
                      src={tile.image}
                      alt={tile.label}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 group-hover:text-orange-600 leading-tight line-clamp-2">
                  {tile.label}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setIsMobileCategoriesOpen(true)}
            className="lg:hidden group flex flex-col items-center gap-1.5 w-16 shrink-0 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 ring-2 ring-slate-200 dark:ring-zinc-700 flex items-center justify-center">
              <Footprints className="w-5 h-5 hidden" />
              <LayoutGrid className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 leading-tight">
              All {categories.length}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
