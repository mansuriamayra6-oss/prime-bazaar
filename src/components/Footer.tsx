import React from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { ShieldCheck, Truck, RotateCcw, Heart, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  const { setActivePortal, setIsReelsOpen, setIsOrdersOpen, setIsRewardsOpen } = useMarketplace();

  return (
    <footer className="mt-20 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand & Promise */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="inline-block px-2.5 py-1.5 rounded-xl bg-white border border-zinc-200/90 shadow-xs">
              <img
                src="/assets/aistudio/Prime_Bazaar_Shopping_Logo_0c82d149.png"
                alt="Prime Bazaar - Shop Smarter. Live Better."
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-zinc-500 leading-relaxed text-[11px]">
              India’s high-velocity social fashion marketplace. Bridging authentic artisan weavers and contemporary streetwear labels directly to conscious shoppers.
            </p>
          </div>

          {/* Col 2: Customer Care */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
              Customer Experience
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <button onClick={() => setIsOrdersOpen(true)} className="hover:text-rose-600">
                  Track Delivery
                </button>
              </li>
              <li>
                <button onClick={() => setIsOrdersOpen(true)} className="hover:text-rose-600">
                  Returns & Replacements
                </button>
              </li>
              <li>
                <button onClick={() => setIsRewardsOpen(true)} className="hover:text-rose-600">
                  Bazaar Coins Wallet
                </button>
              </li>
              <li>
                <span className="text-zinc-400">100% Buyer Protection</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Discovery & Portals */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
              Marketplace Portals
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <button onClick={() => setActivePortal('customer')} className="hover:text-rose-600">
                  Consumer Shopping App
                </button>
              </li>
              <li>
                <button onClick={() => setIsReelsOpen(true)} className="hover:text-rose-600">
                  TrendStream Video Reels
                </button>
              </li>
              <li>
                <button onClick={() => setActivePortal('seller')} className="hover:text-rose-600">
                  Merchant Seller Studio
                </button>
              </li>
              <li>
                <button onClick={() => setActivePortal('admin')} className="hover:text-rose-600">
                  Super Admin Console
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust Guarantees */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
              Security & Trust
            </h4>
            <div className="space-y-2 text-[11px] text-zinc-500">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-zinc-400" />
                <span>Pan-India Courier Network</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                <span>256-Bit Encrypted Payments</span>
              </div>
              <div className="flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                <span>7-Day Hassle-Free Returns</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-400">
          <p>© 2026 Prime Bazaar Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer">Privacy Policy</span>
            <span>·</span>
            <span className="hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer">Terms of Service</span>
            <span>·</span>
            <span className="hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer">GST Compliance</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
