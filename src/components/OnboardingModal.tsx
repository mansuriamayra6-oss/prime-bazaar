import React, { useState } from 'react';
import { useMarketplace, SupportedLanguage, SupportedCurrency } from '../context/MarketplaceContext';
import { Sparkles, Globe, DollarSign, Compass, Check, ArrowRight, ShieldCheck } from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const { 
    isOnboardingOpen, 
    setIsOnboardingOpen, 
    language, 
    setLanguage, 
    currency, 
    setCurrency, 
    setSelectedCategory,
    notify 
  } = useMarketplace();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPref, setSelectedPref] = useState('all');

  if (!isOnboardingOpen) return null;

  const languages: { code: SupportedLanguage; label: string; native: string }[] = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'mr', label: 'Marathi', native: 'मराठी' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' }
  ];

  const currencies: { code: SupportedCurrency; symbol: string; label: string }[] = [
    { code: 'INR', symbol: '₹', label: 'Indian Rupee (INR)' },
    { code: 'USD', symbol: '$', label: 'US Dollar (USD)' },
    { code: 'EUR', symbol: '€', label: 'Euro (EUR)' }
  ];

  const categories = [
    { id: 'ethnic', label: 'Ethnic & Festive Silks', desc: 'Handwoven kurtis, sarees & bridal wear' },
    { id: 'streetwear', label: 'Oversized Streetwear', desc: 'Heavyweight cargo, drops & boxy tees' },
    { id: 'western', label: 'Tailored Western', desc: 'Chic trousers, dresses & work blazers' },
    { id: 'footwear', label: 'Sneakers & Footwear', desc: 'Platform wave runners & vegan leather' }
  ];

  const handleFinish = () => {
    setSelectedCategory(selectedPref);
    setIsOnboardingOpen(false);
    notify('Shopping preferences saved! Enjoy personalized curation.');
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="px-3 py-1.5 rounded-2xl bg-white border border-zinc-200/90 shadow-xs flex items-center">
              <img
                src="/assets/aistudio/Prime_Bazaar_Shopping_Logo_0c82d149.png"
                alt="Prime Bazaar"
                className="h-10 sm:h-11 w-auto object-contain"
              />
            </div>
            <span className="font-bold text-sm text-zinc-900 dark:text-white font-display">
              Welcome
            </span>
          </div>
          <span className="text-xs font-mono font-semibold text-zinc-400">Step {step} of 3</span>
        </div>

        {/* Step 1: Language & Currency */}
        {step === 1 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
                Select Your Regional Language
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Personalize translations, localized numbers, and notification alerts.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {languages.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    language === l.code
                      ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 ring-1 ring-rose-600'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                  }`}
                >
                  <span className="text-sm font-bold block">{l.native}</span>
                  <span className="text-[11px] text-zinc-400">{l.label}</span>
                </button>
              ))}
            </div>

            <div>
              <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                Preferred Currency
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {currencies.map(c => (
                  <button
                    key={c.code}
                    onClick={() => setCurrency(c.code)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      currency === c.code
                        ? 'border-zinc-900 dark:border-white bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <span className="text-base font-bold font-mono block">{c.symbol}</span>
                    <span className="text-[10px] font-mono">{c.code}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-rose-600 text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-rose-500 transition-colors shadow-md"
            >
              <span>Continue to Preferences</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Shopping Department Preferences */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
                What are you shopping for?
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                We will curate your home feed with matching collections and creator reels.
              </p>
            </div>

            <div className="space-y-2.5">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedPref(cat.id)}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    selectedPref === cat.id
                      ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/30 ring-1 ring-rose-600'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white block">{cat.label}</span>
                    <span className="text-[11px] text-zinc-500">{cat.desc}</span>
                  </div>
                  {selectedPref === cat.id && (
                    <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-rose-500 transition-colors shadow-md"
              >
                <span>Continue to Permissions</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Fast Permissions & Launch */}
        {step === 3 && (
          <div className="space-y-5 text-center animate-fadeIn py-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center">
              <ShieldCheck className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
                You’re All Set for Prime Bazaar!
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                Enjoy 100% genuine artisan goods, live tracking with doorstep COD, and 20% off with coupon <strong>MEESHO20</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs text-left space-y-2">
              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Express courier serviceability confirmed</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>340 Welcome Bazaar Coins ready in your wallet</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>TrendStream video shopping feeds enabled</span>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/25 active:scale-95 transition-all"
            >
              Start Shopping Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
