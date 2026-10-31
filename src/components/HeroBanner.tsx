import React from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { Play, Sparkles, ShieldCheck, Truck, RotateCcw } from 'lucide-react';

export const HeroBanner: React.FC = () => {
  const { setIsReelsOpen, setSelectedCategory } = useMarketplace();

  return (
    <div className="relative overflow-hidden bg-zinc-950 text-white rounded-3xl mx-4 sm:mx-6 lg:mx-8 my-4 shadow-xl border border-zinc-800">
      {/* Background image with measured contrast scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src="/src/assets/images/hero_fashion_campaign_1793466539913.jpg"
          alt="Festive Fashion Campaign"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-65 scale-105 transition-transform duration-1000 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/75 to-transparent" />
      </div>

      <div className="relative z-10 max-w-2xl px-6 py-12 sm:px-10 sm:py-16 lg:py-20 flex flex-col justify-center">
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 tracking-wider uppercase mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Autumn Festive & Streetwear Season 2026</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-display text-white text-balance leading-[1.15]">
          Curated Indian Fashion, Direct From Makers.
        </h1>

        <p className="mt-4 text-sm sm:text-base text-zinc-300 font-normal leading-relaxed max-w-xl">
          Discover hand-embroidered artisanal silks, heavyweight utility streetwear, and sculpted sneakers at honest factory prices. Watch creator try-ons and shop in one tap.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setSelectedCategory('all');
              const el = document.getElementById('catalog-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-all shadow-lg shadow-rose-600/25 active:scale-[0.98]"
          >
            Explore Catalog
          </button>
          <button
            onClick={() => setIsReelsOpen(true)}
            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 font-medium text-sm flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Watch TrendStream (Video Shop)</span>
          </button>
        </div>

        {/* 3 Claim-to-Proof Adjacency Markers */}
        <div className="mt-10 pt-6 border-t border-white/15 grid grid-cols-3 gap-4 text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">100% Verified Quality</span>
          </div>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-medium">Cash on Delivery (COD)</span>
          </div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">7-Day Free Returns</span>
          </div>
        </div>
      </div>
    </div>
  );
};
