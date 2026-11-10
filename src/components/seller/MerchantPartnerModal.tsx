import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { SellerRegistrationModal } from './SellerRegistrationModal';
import { 
  X, 
  Store, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Phone, 
  Mail, 
  KeyRound, 
  Sparkles, 
  Coins, 
  Truck, 
  BadgePercent, 
  Lock, 
  ChevronRight,
  TrendingUp,
  Radio,
  FileCheck2
} from 'lucide-react';

export const MerchantPartnerModal: React.FC = () => {
  const { 
    isMerchantAuthOpen, 
    setIsMerchantAuthOpen, 
    merchantAuthMode, 
    setMerchantAuthMode,
    sellers,
    currentSellerId,
    setCurrentSellerId,
    setActivePortal,
    notify 
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(merchantAuthMode);
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>('otp');
  const [isRegisterWizardOpen, setIsRegisterWizardOpen] = useState(false);

  // Sync tab with external open trigger
  React.useEffect(() => {
    setActiveTab(merchantAuthMode);
  }, [merchantAuthMode]);

  if (!isMerchantAuthOpen) return null;

  const handleSelectDemoMerchant = (sellerId: string) => {
    const seller = sellers.find(s => s.id === sellerId);
    if (!seller) return;
    setCurrentSellerId(sellerId);
    setActivePortal('seller');
    setIsMerchantAuthOpen(false);
    notify(`Logged in as verified merchant: ${seller.businessName} (${seller.storeName || seller.businessName})`);
  };

  const handleSendMerchantOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOrEmail.trim()) {
      notify('Please enter your registered Merchant Mobile Number or Email.');
      return;
    }
    setOtpSent(true);
    setOtpCode('789012'); // Standard demo Brevo OTP bypass
    notify(`Brevo Verification OTP sent to ${phoneOrEmail}! Code: 789012`);
  };

  const handleMerchantLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginMethod === 'otp' && otpCode !== '789012' && otpCode.length < 4) {
      notify('Please enter the 6-digit verification code.');
      return;
    }
    
    // Pick the first active seller or match
    const matchedSeller = sellers.find(s => 
      s.phone?.includes(phoneOrEmail) || s.email?.toLowerCase() === phoneOrEmail.toLowerCase()
    ) || sellers[0];

    setCurrentSellerId(matchedSeller.id);
    setActivePortal('seller');
    setIsMerchantAuthOpen(false);
    notify(`Welcome to Prime Bazaar Merchant Studio, ${matchedSeller.businessName}!`);
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
        onClick={() => setIsMerchantAuthOpen(false)}
      >
        <div 
          className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[92vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-900 via-zinc-900 to-zinc-950 p-6 text-white relative">
            <button
              onClick={() => setIsMerchantAuthOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-inner">
                <Store className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold font-display text-white">
                    Prime Bazaar Merchant Partner
                  </h2>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500 text-zinc-950 px-2 py-0.5 rounded-full">
                    Seller Studio
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-1">
                  Autonomous seller portal for multi-vendor catalog, order fulfillment, and weekly escrow settlements.
                </p>
              </div>
            </div>

            {/* Tab switchers: Login vs Sign Up */}
            <div className="flex items-center gap-2 mt-5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-700/60 max-w-md">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'login'
                    ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Merchant Login</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('signup')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'signup'
                    ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>New Partner Sign Up</span>
              </button>
            </div>
          </div>

          {/* Tab Content: LOGIN */}
          {activeTab === 'login' && (
            <div className="p-6 space-y-6">
              {/* Quick 1-Click Demo Merchant Logins */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Instant 1-Click Login as Verified Merchant:</span>
                  </span>
                  <span className="text-[11px] text-zinc-400">Pre-seeded accounts</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {sellers.map(s => {
                    const isSelected = currentSellerId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectDemoMerchant(s.id)}
                        className={`p-3 rounded-2xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">{s.id}</span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.2 rounded">
                              {s.rating}★
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white mt-1 line-clamp-1">
                            {s.businessName}
                          </h4>
                          <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{s.location}</p>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between text-[10px]">
                          <span className="font-mono text-zinc-400 truncate max-w-[90px]">{s.gstNumber}</span>
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                            <span>Open</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-200 dark:border-zinc-800" />
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Or Log In with Registered Credentials
                </span>
                <div className="flex-1 h-px bg-zinc-200 dark:border-zinc-800" />
              </div>

              {/* Form */}
              <form onSubmit={handleMerchantLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Registered Mobile Number or Email ID
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. +91 98450 12849 or merchant@primebazaar.co.in"
                      value={phoneOrEmail}
                      onChange={e => setPhoneOrEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLoginMethod('otp')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        loginMethod === 'otp'
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      Login via Brevo OTP
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginMethod('password')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        loginMethod === 'password'
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      Login via Password
                    </button>
                  </div>
                </div>

                {loginMethod === 'otp' ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value)}
                        className="flex-1 font-mono tracking-widest text-center text-sm font-bold py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleSendMerchantOtp}
                        className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl transition-colors shrink-0"
                      >
                        {otpSent ? 'Resend OTP' : 'Send OTP'}
                      </button>
                    </div>
                    {otpSent && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>OTP dispatched via Brevo SMS/Email gateway (Bypass: 789012)</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Merchant Account Password
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.99]"
                >
                  <span>Sign In to Merchant Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Bottom switch to signup */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-zinc-900 dark:text-white">Are you a new merchant?</span>
                  <p className="text-[11px] text-zinc-500">Register your brand in 5 minutes with GSTIN and bank details.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs shrink-0 hover:opacity-90 transition-opacity"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}

          {/* Tab Content: SIGN UP */}
          {activeTab === 'signup' && (
            <div className="p-6 space-y-5">
              {/* Value Proposition Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                  <BadgePercent className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1.5" />
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">0% Listing Fees</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Pay only a flat 12% commission upon successful product delivery.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40">
                  <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-1.5" />
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">BlueDart Express</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Automated pickup manifests, thermal AWB labels & live GPS tracking.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                  <Coins className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-1.5" />
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Weekly T+7 Escrow</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Direct NEFT/IMPS bank transfers every Wednesday for delivered orders.</p>
                </div>
              </div>

              {/* Multi-Vendor Social Commerce Features */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                  Included Free with Prime Bazaar Merchant Partner:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Public Storefront (`primebazaar.co.in/store/...`)</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <Radio className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Live Video Shopping Streaming</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Multi-Seller Order Splitting</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Direct Buyer-to-Seller Protected Chat</span>
                  </div>
                </div>
              </div>

              {/* Checklist needed */}
              <div className="p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white">
                  <FileCheck2 className="w-4 h-4 text-indigo-500" />
                  <span>Onboarding Documents Required:</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  1. PAN Card &middot; 2. GSTIN Certificate (or Artisan declaration) &middot; 3. Bank Account & IFSC &middot; 4. Warehouse / Pickup Address
                </p>
              </div>

              {/* Call to action */}
              <button
                type="button"
                onClick={() => setIsRegisterWizardOpen(true)}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.99]"
              >
                <Store className="w-4 h-4" />
                <span>Start 5-Step Merchant Registration & KYC</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="text-xs font-semibold text-emerald-600 hover:underline"
                >
                  Already have a merchant account? Log In here
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5-Step Registration Wizard */}
      {isRegisterWizardOpen && (
        <SellerRegistrationModal
          onClose={() => setIsRegisterWizardOpen(false)}
          onSuccess={(newSellerId) => {
            setIsRegisterWizardOpen(false);
            setIsMerchantAuthOpen(false);
            setCurrentSellerId(newSellerId);
            setActivePortal('seller');
            notify('Merchant account created successfully! Welcome to your Seller Studio.');
          }}
        />
      )}
    </>
  );
};
