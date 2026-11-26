import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Mail,
  CheckCircle2,
  ArrowUp,
} from 'lucide-react';

export const Footer: React.FC = () => {
  const {
    setActivePortal,
    setDiscoveryTab,
    navigateCategory,
    setIsOrdersOpen,
    setIsRewardsOpen,
    setIsCompareOpen,
    openWishlist,
    openMerchantAuth,
    setInfoModalPage,
    setProfileActiveTab,
    setIsProfileOpen,
    notify,
  } = useMarketplace();

  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const jumpToCatalogTab = (tab: 'deals' | 'bestsellers' | 'new') => {
    setActivePortal('customer');
    navigateCategory('all', null);
    setDiscoveryTab(tab);
    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      notify('Please enter a valid email address.');
      return;
    }
    try {
      localStorage.setItem('pb_newsletter_email', trimmed);
    } catch {
      // ignore
    }
    setSubscribed(true);
    setEmail('');
    notify('Subscribed to Prime Bazaar Flash Deals & New Arrivals!');
  };

  return (
    <footer className="mt-14 bg-[#0F172A] text-slate-300 text-xs">
      {/* Back to Top Bar */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="w-full py-2.5 bg-[#1E293B] hover:bg-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-1.5 border-b border-slate-700/80 transition-colors"
      >
        <ArrowUp className="w-3.5 h-3.5 text-orange-400" />
        <span>Back to top</span>
      </button>

      {/* Newsletter Banner */}
      <div className="border-b border-slate-800 bg-slate-900/70">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white font-display">
              Get Flash Deal Alerts &amp; Early Collection Drops
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Weekly curated offers across Fashion, Electronics, Home &amp; 34 marketplace departments.
            </p>
          </div>

          {subscribed ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>You&apos;re subscribed to Prime Bazaar updates.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex w-full md:w-auto max-w-md gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  aria-label="Newsletter email address"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-white text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold whitespace-nowrap shrink-0 transition-colors"
              >
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Main Footer Grid */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-11 w-11 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0">
                <img
                  src="/assets/aistudio/IMG_20261124_134619_98e88ce3.png"
                  alt="Prime Bazaar"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-extrabold text-white font-display">Prime Bazaar</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                  One Marketplace. All Your Shopping.
                </p>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              International multi-seller marketplace anchored in Fashion with all 34 categories live, Cashfree-protected checkout, split order tracking, and B2B procurement.
            </p>
          </div>

          {/* Col 2: Discover & Customer Service */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Shop &amp; Customer Care
            </h4>
            <ul className="space-y-2 text-[11px] text-slate-400">
              <li>
                <button type="button" onClick={() => jumpToCatalogTab('deals')} className="hover:text-orange-400">
                  Today&apos;s Deals
                </button>
              </li>
              <li>
                <button type="button" onClick={() => jumpToCatalogTab('bestsellers')} className="hover:text-orange-400">
                  Best Sellers
                </button>
              </li>
              <li>
                <button type="button" onClick={() => jumpToCatalogTab('new')} className="hover:text-orange-400">
                  New Arrivals
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setIsOrdersOpen(true)} className="hover:text-orange-400">
                  Orders &amp; Delivery Tracking
                </button>
              </li>
              <li>
                <button type="button" onClick={() => openWishlist()} className="hover:text-orange-400">
                  Saved Wishlist
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setIsCompareOpen(true)} className="hover:text-orange-400">
                  Compare Products
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setIsRewardsOpen(true)} className="hover:text-orange-400">
                  Bazaar Coins &amp; Rewards
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Marketplace Programs */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Marketplace &amp; Partners
            </h4>
            <ul className="space-y-2 text-[11px] text-slate-400">
              <li>
                <button type="button" onClick={() => openMerchantAuth('signup')} className="text-emerald-400 hover:underline font-semibold">
                  Sell on Prime Bazaar (Partner)
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActivePortal('seller')} className="hover:text-orange-400">
                  Seller Central Dashboard
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActivePortal('admin')} className="hover:text-orange-400">
                  Admin Control Console
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setInfoModalPage('b2b')} className="hover:text-orange-400">
                  Wholesale &amp; B2B Quotes
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setInfoModalPage('digital')} className="hover:text-orange-400">
                  Digital Products &amp; Downloads
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setProfileActiveTab('preferences');
                    setIsProfileOpen(true);
                  }}
                  className="hover:text-orange-400"
                >
                  Subscriptions &amp; Preferences
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Support, About & Trust */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Company &amp; Support
            </h4>
            <ul className="space-y-2 text-[11px] text-slate-400">
              <li>
                <button type="button" onClick={() => setInfoModalPage('about')} className="hover:text-orange-400">
                  About Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setInfoModalPage('help')} className="hover:text-orange-400">
                  Help Center &amp; FAQs
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setInfoModalPage('contact')} className="hover:text-orange-400">
                  Contact Us
                </button>
              </li>
            </ul>
            <div className="pt-2 space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>Split-Order Seller Tracking</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>256-Bit Encrypted Cashfree Pay</span>
              </div>
              <div className="flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>7-Day Hassle-Free Returns</span>
              </div>
            </div>
          </div>
        </div>

        {/* Accepted Payments + Bottom Legal Bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-slate-500 font-semibold">Accepted Payments:</span>
            {['Cashfree', 'UPI', 'Visa / Mastercard', 'NetBanking', 'Gift Cards', 'Store Credit', 'COD'].map(
              method => (
                <span
                  key={method}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-semibold"
                >
                  {method}
                </span>
              )
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <span>© 2026 Prime Bazaar Technologies Inc.</span>
            <span>·</span>
            <button type="button" onClick={() => setInfoModalPage('help')} className="hover:text-white">
              Buyer Protection &amp; Policies
            </button>
            <span>·</span>
            <button type="button" onClick={() => setInfoModalPage('about')} className="hover:text-white">
              GST &amp; Compliance
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
