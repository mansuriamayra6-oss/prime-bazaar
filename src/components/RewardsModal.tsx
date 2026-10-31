import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { X, Coins, Gift, Share2, Sparkles, Check, Copy } from 'lucide-react';

export const RewardsModal: React.FC = () => {
  const { isRewardsOpen, setIsRewardsOpen, coins, earnCoins, notify } = useMarketplace();
  const [copied, setCopied] = useState(false);

  if (!isRewardsOpen) return null;

  const referralCode = 'BAZAAR-AMAYRA77';

  const handleCopy = () => {
    navigator.clipboard?.writeText?.(referralCode);
    setCopied(true);
    notify('Referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const tasks = [
    {
      id: 'task-1',
      title: 'Share outfit with 3 friends on WhatsApp',
      reward: 50,
      claimed: false,
      action: () => earnCoins(50, 'WhatsApp outfit share')
    },
    {
      id: 'task-2',
      title: 'Watch & like 2 reels in TrendStream',
      reward: 30,
      claimed: false,
      action: () => earnCoins(30, 'TrendStream engagement')
    },
    {
      id: 'task-3',
      title: 'Verify delivery address & profile',
      reward: 40,
      claimed: false,
      action: () => earnCoins(40, 'Profile completion')
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setIsRewardsOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Balance */}
        <div className="text-center pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/20">
            <Coins className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white font-display">
            Bazaar Coins & Reseller Rewards
          </h2>
          <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
            <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">Your Balance:</span>
            <span className="text-lg font-extrabold font-mono text-amber-600 dark:text-amber-400">
              {coins} Coins
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">
            1 Coin = ₹1 instant discount. Redeem up to ₹100 on every bag checkout!
          </p>
        </div>

        {/* Referral Section (Meesho style) */}
        <div className="my-5 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-white">
              <Share2 className="w-4 h-4 text-rose-600" />
              <span>Your Personal Reseller / Referral Code</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">Earn 100 Coins / Invite</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200 text-center tracking-wider">
              {referralCode}
            </div>
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold flex items-center gap-1.5 hover:bg-zinc-800 transition-colors shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Daily Reward Missions */}
        <div>
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-3">
            Earn More Coins Today
          </span>
          <div className="space-y-2.5">
            {tasks.map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs"
              >
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-white">{t.title}</h4>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold font-mono">
                    +{t.reward} Bazaar Coins
                  </span>
                </div>
                <button
                  onClick={t.action}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Complete & Claim
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
