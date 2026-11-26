import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { getStorefrontDepartments } from '../data/storefrontScope';
import {
  X,
  Building2,
  HelpCircle,
  Mail,
  Briefcase,
  Download,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Package,
  Layers,
  Globe,
  Send,
  ArrowRight,
} from 'lucide-react';

export const MarketplaceInfoModal: React.FC = () => {
  const {
    infoModalPage,
    setInfoModalPage,
    categories,
    sellers,
    products,
    sendSupportMessage,
    setIsSupportOpen,
    setIsOrdersOpen,
    setProfileActiveTab,
    setIsProfileOpen,
    openMerchantAuth,
    setSelectedProduct,
    notify,
  } = useMarketplace();

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('Order & Delivery Inquiry');
  const [contactBody, setContactBody] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!infoModalPage) return null;

  const close = () => {
    setInfoModalPage(null);
    setSubmitted(false);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactBody.trim()) return;
    sendSupportMessage(`[${contactSubject}] ${contactName ? `${contactName}: ` : ''}${contactBody.trim()}`);
    setSubmitted(true);
    setContactBody('');
    notify('Message sent to Prime Bazaar Customer Support.');
  };

  const meta = {
    about: {
      title: 'About Prime Bazaar',
      subtitle: 'ONE MARKETPLACE. ALL YOUR SHOPPING.',
      icon: Building2,
    },
    help: {
      title: 'Help Center & Buyer Protection',
      subtitle: 'Fast answers on shipping, returns, payments, and warranties',
      icon: HelpCircle,
    },
    contact: {
      title: 'Contact Prime Bazaar Support',
      subtitle: 'Reach our support team 24/7 or open live chat',
      icon: Mail,
    },
    b2b: {
      title: 'Wholesale & B2B Procurement',
      subtitle: 'GST invoicing, bulk tiered pricing, and custom seller quotes',
      icon: Briefcase,
    },
    digital: {
      title: 'Digital Products & Instant Downloads',
      subtitle: 'Authenticated digital lookbooks, pattern kits & license delivery',
      icon: Download,
    },
  }[infoModalPage];

  const Icon = meta.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={meta.title}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={close}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[88vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-orange-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold font-display truncate">{meta.title}</h2>
              <p className="text-xs text-slate-300 truncate">{meta.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close modal"
            className="p-2 rounded-lg text-slate-300 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation switcher */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'about', label: 'About Us' },
            { id: 'help', label: 'Help Center' },
            { id: 'contact', label: 'Contact Us' },
            { id: 'b2b', label: 'Wholesale / B2B' },
            { id: 'digital', label: 'Digital Products' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setInfoModalPage(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                infoModalPage === tab.id
                  ? 'bg-[#0F172A] text-white dark:bg-orange-600'
                  : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed">
          {infoModalPage === 'about' && (
            <>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 space-y-2">
                <p className="font-bold text-sm text-slate-900 dark:text-white font-display">
                  Built for Modern Multi-Vendor Shopping
                </p>
                <p className="text-slate-600 dark:text-zinc-300">
                  Prime Bazaar unites independent artisans, heritage textile weavers, verified studio brands, and everyday electronics makers inside one seamless marketplace—with Fashion as our flagship launch focus.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                  <p className="text-lg font-extrabold text-orange-600 font-mono tabular-nums">
                    {getStorefrontDepartments(categories).length}
                  </p>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">Curated Departments</p>
                  <p className="text-slate-500 mt-1">Fashion-first across apparel, shoes, bags, jewellery, beauty &amp; everyday tech.</p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                  <p className="text-lg font-extrabold text-emerald-600 font-mono tabular-nums">
                    {sellers.length}+
                  </p>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">Verified Sellers</p>
                  <p className="text-slate-500 mt-1">Compare offers, delivery speed, and ratings directly per product.</p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                  <p className="text-lg font-extrabold text-indigo-600 font-mono tabular-nums">6</p>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">Currencies &amp; Regions</p>
                  <p className="text-slate-500 mt-1">Live regional pricing, GST/VAT estimation, and localized checkout.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    openMerchantAuth('signup');
                  }}
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold"
                >
                  Become a Seller on Prime Bazaar
                </button>
              </div>
            </>
          )}

          {infoModalPage === 'help' && (
            <div className="space-y-3">
              {[
                {
                  q: 'How does multi-seller split delivery work?',
                  a: 'You pay once in a single checkout. Prime Bazaar automatically splits fulfillment by seller so each vendor dispatches with its own tracking timeline and GST invoice.',
                },
                {
                  q: 'What payment methods are accepted?',
                  a: 'Cashfree Online (UPI, Cards, NetBanking), Bazaar Coins, Store Credit, Gift Cards, and Cash on Delivery (COD) on eligible orders.',
                },
                {
                  q: 'How do returns and refunds work?',
                  a: 'Most items include a 7-day easy return guarantee. Visit Orders & Returns to track status or initiate a partial or full replacement/refund.',
                },
                {
                  q: 'How do I compare sellers on a product?',
                  a: 'Open any product page to view Available Seller Offers, delivery estimates, and merchant ratings before choosing who fulfills your item.',
                },
              ].map(item => (
                <div
                  key={item.q}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/50 space-y-1"
                >
                  <p className="font-bold text-slate-900 dark:text-white">{item.q}</p>
                  <p className="text-slate-600 dark:text-zinc-300">{item.a}</p>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    setIsOrdersOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#0F172A] text-white font-bold flex items-center gap-1.5"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Open Order Tracking &amp; Returns</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    setIsSupportOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 font-semibold"
                >
                  Open Live Support Chat
                </button>
              </div>
            </div>
          )}

          {infoModalPage === 'contact' && (
            <div className="space-y-4">
              {submitted ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-900 dark:text-emerald-200">
                      Inquiry Received
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-300 mt-0.5">
                      Your message is active in Prime Bazaar Support Chat. You can continue the conversation live anytime.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        setIsSupportOpen(true);
                      }}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold"
                    >
                      View Support Conversation
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Your Name</label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={e => setContactName(e.target.value)}
                        placeholder="Aarav Sharma"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Email or Phone</label>
                      <input
                        type="text"
                        value={contactEmail}
                        onChange={e => setContactEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Topic</label>
                    <select
                      value={contactSubject}
                      onChange={e => setContactSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    >
                      <option>Order &amp; Delivery Inquiry</option>
                      <option>Returns &amp; Refunds</option>
                      <option>Wholesale / B2B Quotation</option>
                      <option>Seller Onboarding</option>
                      <option>Payment &amp; Billing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Message</label>
                    <textarea
                      required
                      rows={3}
                      value={contactBody}
                      onChange={e => setContactBody(e.target.value)}
                      placeholder="Describe how our team can help..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message</span>
                  </button>
                </form>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Buyer Protection 24/7
                </span>
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-orange-500" /> Express Courier Support
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-sky-500" /> support@primebazaar.in
                </span>
              </div>
            </div>
          )}

          {infoModalPage === 'b2b' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 space-y-1.5">
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  Prime Bazaar Wholesale &amp; GST B2B Desk
                </p>
                <p className="text-slate-600 dark:text-zinc-300">
                  Register your GSTIN in Account Preferences, unlock bulk tiered discounts on eligible catalogue items, and request formal RFQs (Request for Quotation) directly from verified makers.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    setProfileActiveTab('preferences');
                    setIsProfileOpen(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#0F172A] text-white font-bold flex items-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5 text-orange-400" />
                  <span>Manage B2B Account &amp; RFQs</span>
                </button>
                {products[0] && (
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      setSelectedProduct(products[0]);
                    }}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 font-semibold flex items-center gap-1"
                  >
                    <span>Inspect Bulk Pricing on Product</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {infoModalPage === 'digital' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 space-y-1.5">
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  Signed Digital Assets &amp; Style Lookbooks
                </p>
                <p className="text-slate-600 dark:text-zinc-300">
                  Purchase downloadable textile patterns, digital gift guides, and studio assets with token-verified downloads, download count limits, and expiry protection.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  close();
                  setProfileActiveTab('orders');
                  setIsProfileOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>View My Digital Downloads &amp; Orders</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
