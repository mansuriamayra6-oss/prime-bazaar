import React from 'react';
import { ShoppingBag, Store, ShieldCheck, Play, Award, X, ExternalLink } from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';

interface AndroidRecentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidRecentsModal: React.FC<AndroidRecentsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    activePortal,
    setActivePortal,
    setIsReelsOpen,
    setIsRewardsOpen,
    setIsCartOpen,
  } = useMarketplace();

  if (!isOpen) return null;

  const appCards = [
    {
      id: 'customer',
      title: 'Prime Bazaar Shopping',
      subtitle: 'Trending ethnic wear, discounts, cart & flash sales',
      icon: ShoppingBag,
      color: 'from-emerald-600 to-teal-800',
      action: () => {
        setActivePortal('customer');
        onClose();
      },
      active: activePortal === 'customer',
    },
    {
      id: 'seller',
      title: 'Prime Bazaar Seller Studio',
      subtitle: 'Merchant inventory, GST dispatch & wholesale payouts',
      icon: Store,
      color: 'from-amber-600 to-orange-800',
      action: () => {
        setActivePortal('seller');
        onClose();
      },
      active: activePortal === 'seller',
    },
    {
      id: 'admin',
      title: 'Prime Bazaar Super Admin',
      subtitle: 'Platform analytics, commission split & audit logs',
      icon: ShieldCheck,
      color: 'from-indigo-600 to-purple-800',
      action: () => {
        setActivePortal('admin');
        onClose();
      },
      active: activePortal === 'admin',
    },
    {
      id: 'reels',
      title: 'TrendStream Live Reels',
      subtitle: 'Interactive video commerce & stylist try-ons',
      icon: Play,
      color: 'from-rose-600 to-pink-800',
      action: () => {
        setIsReelsOpen(true);
        onClose();
      },
      active: false,
    },
    {
      id: 'rewards',
      title: 'Prime Coins & Loyalty',
      subtitle: 'Spin & Win wheel, daily check-in & scratch cards',
      icon: Award,
      color: 'from-yellow-500 to-amber-700',
      action: () => {
        setIsRewardsOpen(true);
        onClose();
      },
      active: false,
    },
  ];

  return (
    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-between p-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between text-white pt-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Android 14 Recents / Multitasking
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* App Switcher Carousel */}
      <div className="flex-1 flex items-center justify-center overflow-x-auto py-6 gap-4 no-scrollbar">
        {appCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={card.action}
              className={`w-64 h-80 rounded-3xl bg-zinc-900 border ${
                card.active ? 'border-emerald-500 ring-2 ring-emerald-500/50' : 'border-zinc-800'
              } flex flex-col overflow-hidden shrink-0 shadow-2xl cursor-pointer hover:scale-[1.03] transition-all group`}
            >
              {/* Card Title Bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/90 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-zinc-200 truncate max-w-[130px]">
                    {card.title}
                  </span>
                </div>
                {card.active && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400">
                    Running
                  </span>
                )}
              </div>

              {/* Card Preview Window */}
              <div
                className={`flex-1 bg-gradient-to-br ${card.color} p-5 flex flex-col justify-between text-white relative`}
              >
                <div className="space-y-1 z-10">
                  <div className="text-[10px] uppercase font-bold text-white/80">
                    Prime Bazaar OS
                  </div>
                  <div className="text-sm font-extrabold line-clamp-2">{card.title}</div>
                  <p className="text-[11px] text-white/70 line-clamp-3 leading-relaxed">
                    {card.subtitle}
                  </p>
                </div>

                <div className="z-10 flex items-center justify-between pt-4 border-t border-white/20">
                  <span className="text-[10px] font-semibold text-white/90">
                    Tap to resume
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Clear All Bar */}
      <div className="flex justify-center pb-2">
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold tracking-wide shadow-lg active:scale-95 transition-all"
        >
          Clear All / Return to App
        </button>
      </div>
    </div>
  );
};
