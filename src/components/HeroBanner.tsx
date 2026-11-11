import React from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { Play, Sparkles, ShieldCheck, Truck, RotateCcw, ArrowRight } from 'lucide-react';

export const HeroBanner: React.FC = () => {
  const { setIsReelsOpen, setSelectedCategory } = useMarketplace();

  return (
    <div className="relative overflow-hidden bg-zinc-950 text-white rounded-xl sm:rounded-2xl mx-3 sm:mx-6 lg:mx-8 my-2 sm:my-3 shadow-md border border-zinc-800">
      {/* Background image with measured contrast scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src="/src/assets/images/hero_fashion_campaign_1793466539913.jpg"
          alt="Festive Fashion Campaign"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-45 scale-105 transition-transform duration-1000 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/60" />
      </div>

      <div className="relative z-10 px-4 py-3 sm:px-6 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Left side: Compact headline and subtitle */}
        <div className="max-w-xl">
          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-semibold text-rose-400 tracking-wider uppercase mb-1">
            <Sparkles className="w-3 h-3 text-rose-400 shrink-0" />
            <span>Festive & Streetwear 2026</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-300 font-normal normal-case">Direct from verified makers</span>
          </div>

          <h1 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight font-display text-white leading-tight">
            Curated Indian Fashion, Direct From Makers.
          </h1>

          <p className="mt-0.5 text-xs text-zinc-300 line-clamp-1">
            Artisanal silks, utility streetwear & sculpted kicks at factory prices.
          </p>

          {/* Quick micro proof badges inline */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-300">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>100% Quality Verified</span>
            </div>
            <div className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Cash on Delivery (COD)</span>
            </div>
            <div className="flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>7-Day Returns</span>
            </div>
          </div>
        </div>

        {/* Right side: Compact Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setSelectedCategory('all');
              const el = document.getElementById('catalog-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3.5 sm:px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-sm shadow-rose-600/25 active:scale-95 flex items-center gap-1.5"
          >
            <span>Explore Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsReelsOpen(true)}
            className="px-3 sm:px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 font-medium text-xs flex items-center gap-1.5 transition-all active:scale-95"
            title="Watch creator try-ons and live stream videos"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span className="hidden sm:inline">TrendStream</span>
            <span className="sm:hidden">Video</span>
          </button>
        </div>
      </div>
    </div>
  );
};
