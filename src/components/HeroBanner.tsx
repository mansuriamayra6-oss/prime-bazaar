import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import {
  Play,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tag,
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
}

const CAMPAIGN_SLIDES: CampaignSlide[] = [
  {
    id: 'festive-silk',
    eyebrow: 'Festive & Ethnic Edit 2026',
    headline: 'Handloom Silks & Tailored Kurtis, Direct From Artisans.',
    subcopy: 'Crafted in Varanasi and Jaipur with GST-verified quality checks and complimentary doorstep returns.',
    ctaLabel: "Shop Women's Ethnic",
    targetCategory: 'womens-fashion',
    targetSubcategory: 'anarkali-kurti',
    image: '/src/assets/images/hero_fashion_campaign_1793466539913.jpg',
  },
  {
    id: 'streetwear-drop',
    eyebrow: 'Studio Utility Drop',
    headline: '420 GSM Heavyweight Streetwear & Boxy Cargo Layers.',
    subcopy: 'Cut-and-sew brushed twill jackets and acid-wash graphic tees priced for everyday rotation.',
    ctaLabel: "Explore Men's Streetwear",
    targetCategory: 'mens-fashion',
    targetSubcategory: 'cargo-jackets',
    image: '/src/assets/images/collection_streetwear_1793466541088.jpg',
  },
  {
    id: 'footwear-bags',
    eyebrow: 'Footwear & Vegan Leather Bags',
    headline: 'Sculpted Platform Sneakers & Structured Work Totes.',
    subcopy: 'Memory-cushion soles paired with coordinated vegan calfskin totes built for urban commutes.',
    ctaLabel: 'Shop Shoes & Bags',
    targetCategory: 'footwear',
    targetSubcategory: null,
    image: '/src/assets/images/collection_footwear_1793466541533.jpg',
  },
];

export const HeroBanner: React.FC = () => {
  const { navigateCategory, setIsReelsOpen, setIsRewardsOpen } = useMarketplace();
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  const slide = CAMPAIGN_SLIDES[activeSlideIdx];

  const handleCampaignClick = (cat: string, sub?: string | null) => {
    navigateCategory(cat, sub ?? null);
    const el = document.getElementById('catalog-section');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section aria-label="Featured fashion campaigns" className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-2 space-y-3">
      {/* Main Campaign Stage */}
      <div className="relative overflow-hidden rounded-2xl bg-zinc-950 text-white border border-zinc-800 shadow-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Copy Column */}
          <div className="lg:col-span-7 p-5 sm:p-8 lg:p-10 flex flex-col justify-between relative z-10 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-rose-400">
                {slide.eyebrow}
              </p>
              <h1 className="mt-2 text-2xl sm:text-3xl lg:text-[2.15rem] font-extrabold tracking-tight font-display leading-tight text-white">
                {slide.headline}
              </h1>
              <p className="mt-2.5 text-xs sm:text-sm text-zinc-300 max-w-xl leading-relaxed">
                {slide.subcopy}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleCampaignClick(slide.targetCategory, slide.targetSubcategory)}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap shrink-0 shadow-md shadow-rose-600/25"
                >
                  <span>{slide.ctaLabel}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsReelsOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                  <span>Watch TrendStream</span>
                </button>
              </div>
            </div>

            {/* Trust row + Slide switcher */}
            <div className="mt-6 pt-4 border-t border-zinc-800/90 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-300">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Verified Makers</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Free Shipping ₹999+</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>7-Day Easy Returns</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous campaign"
                  onClick={() =>
                    setActiveSlideIdx(prev => (prev - 1 + CAMPAIGN_SLIDES.length) % CAMPAIGN_SLIDES.length)
                  }
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {CAMPAIGN_SLIDES.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`View campaign: ${s.eyebrow}`}
                    onClick={() => setActiveSlideIdx(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === activeSlideIdx ? 'w-6 bg-rose-500' : 'w-2 bg-zinc-700 hover:bg-zinc-500'
                    }`}
                  />
                ))}
                <button
                  type="button"
                  aria-label="Next campaign"
                  onClick={() => setActiveSlideIdx(prev => (prev + 1) % CAMPAIGN_SLIDES.length)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Campaign Visual Column */}
          <div className="lg:col-span-5 relative min-h-[210px] sm:min-h-[260px] lg:min-h-[300px] overflow-hidden bg-zinc-900">
            <img
              src={slide.image}
              alt={slide.headline}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-zinc-950/70 via-transparent to-transparent" />
          </div>
        </div>
      </div>

      {/* Clickable Promotional Fashion Destination Tiles (3 compact cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => handleCampaignClick('womens-fashion', 'sarees')}
          className="group relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 flex items-center gap-3 text-left hover:border-rose-400 transition-all"
        >
          <img
            src="/src/assets/images/collection_ethnic_wear_1793466539838.jpg"
            alt="Festive Ethnic Fashion"
            className="w-14 h-14 rounded-lg object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
              50%–55% Off
            </span>
            <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white block truncate">
              Festive Kurti & Saree Edit
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 inline-flex items-center gap-1 mt-0.5 group-hover:text-rose-600">
              <span>Shop Ethnic</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleCampaignClick('bags', null)}
          className="group relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 flex items-center gap-3 text-left hover:border-emerald-400 transition-all"
        >
          <img
            src="/src/assets/images/collection_footwear_1793466541533.jpg"
            alt="Bags & Footwear"
            className="w-14 h-14 rounded-lg object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Curated Carry & Kicks
            </span>
            <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white block truncate">
              Vegan Totes & Sneakers
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 inline-flex items-center gap-1 mt-0.5 group-hover:text-emerald-600">
              <span>Explore Accessories</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setIsRewardsOpen(true)}
          className="group relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-amber-50 to-rose-50 dark:from-amber-950/30 dark:to-rose-950/30 p-3.5 flex items-center gap-3 text-left hover:border-amber-400 transition-all"
        >
          <div className="w-14 h-14 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Tag className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Special Offers</span>
            </span>
            <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white block truncate">
              Daily Deals & Bazaar Coins
            </span>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-300 inline-flex items-center gap-1 mt-0.5 group-hover:text-amber-700">
              <span>Unlock Coupons</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </button>
      </div>
    </section>
  );
};
