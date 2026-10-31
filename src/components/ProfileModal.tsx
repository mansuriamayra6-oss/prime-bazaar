import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { 
  X, 
  User, 
  Package, 
  MapPin, 
  Coins, 
  Globe, 
  LogOut, 
  Crown, 
  RotateCcw,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export const ProfileModal: React.FC = () => {
  const { 
    isProfileOpen, 
    setIsProfileOpen, 
    user, 
    logoutUser, 
    orders, 
    coins, 
    addresses, 
    language, 
    setLanguage, 
    currency, 
    setCurrency, 
    setIsOrdersOpen, 
    setIsRewardsOpen,
    setIsAuthOpen 
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<'details' | 'addresses' | 'preferences'>('details');

  if (!isProfileOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setIsProfileOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Guest View if not logged in */}
        {!user || !user.isLoggedIn ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
                Sign In to Prime Bazaar
              </h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1">
                Access your orders, live tracking, delivery addresses, and Prime Coins wallet.
              </p>
            </div>
            <button
              onClick={() => {
                setIsProfileOpen(false);
                setIsAuthOpen(true);
              }}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg transition-all active:scale-95"
            >
              Sign In / Create Account
            </button>
          </div>
        ) : (
          <>
            {/* User Top Card */}
            <div className="flex items-center gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
              <img
                src={user.avatar}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
                    {user.name}
                  </h2>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                    <Crown className="w-3 h-3 text-amber-500" />
                    <span>{user.memberTier} VIP</span>
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{user.phone} · {user.email}</p>
                <span className="text-[10px] text-zinc-400">Member since {user.joinedDate}</span>
              </div>
            </div>

        {/* Quick Nav Chips */}
        <div className="grid grid-cols-3 gap-2 my-5">
          <button
            onClick={() => {
              setIsProfileOpen(false);
              setIsOrdersOpen(true);
            }}
            className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-center hover:bg-zinc-100 transition-colors"
          >
            <Package className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
            <span className="text-xs font-bold text-zinc-900 dark:text-white block">{orders.length} Orders</span>
            <span className="text-[10px] text-zinc-400">Track shipments</span>
          </button>

          <button
            onClick={() => {
              setIsProfileOpen(false);
              setIsRewardsOpen(true);
            }}
            className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-center hover:bg-zinc-100 transition-colors"
          >
            <Coins className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <span className="text-xs font-bold text-zinc-900 dark:text-white block">{coins} Coins</span>
            <span className="text-[10px] text-zinc-400">₹{coins} Value</span>
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-center hover:bg-zinc-100 transition-colors"
          >
            <MapPin className="w-5 h-5 text-rose-500 mx-auto mb-1" />
            <span className="text-xs font-bold text-zinc-900 dark:text-white block">{addresses.length} Addresses</span>
            <span className="text-[10px] text-zinc-400">Manage delivery</span>
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'details' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-500'
            }`}
          >
            Account Details
          </button>
          <button
            onClick={() => setActiveTab('addresses')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'addresses' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-500'
            }`}
          >
            Saved Addresses
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'preferences' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-500'
            }`}
          >
            Language & Region
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 flex justify-between items-center">
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">Registered Mobile</span>
                <span className="font-semibold text-zinc-900 dark:text-white font-mono">{user.phone}</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-bold">Verified OTP</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 flex justify-between items-center">
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">Email ID</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{user.email}</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-bold">Primary</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 flex justify-between items-center">
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase">VIP Club Membership</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{user.memberTier} Level Benefits</span>
              </div>
              <span className="text-[10px] text-amber-600 font-bold">Free Express Delivery</span>
            </div>
          </div>
        )}

        {activeTab === 'addresses' && (
          <div className="space-y-3 text-xs">
            {addresses.map(a => (
              <div key={a.id} className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-zinc-900 dark:text-white">{a.fullName}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-zinc-200 dark:bg-zinc-700">
                    {a.type}
                  </span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-300">
                  {a.street}, {a.city}, {a.state} - {a.pinCode}
                </p>
                <span className="text-zinc-400 text-[11px] block mt-1">Phone: {a.phone}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-2">Display Language</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'hi', label: 'हिन्दी (Hindi)' },
                  { code: 'mr', label: 'मराठी (Marathi)' },
                  { code: 'ta', label: 'தமிழ் (Tamil)' }
                ].map(l => (
                  <button
                    key={l.code}
                    onClick={() => setLanguage(l.code as any)}
                    className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                      language === l.code ? 'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-2">Currency Display</label>
              <div className="grid grid-cols-3 gap-2">
                {['INR', 'USD', 'EUR'].map(c => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c as any)}
                    className={`p-2 rounded-xl border text-center font-bold font-mono transition-all ${
                      currency === c ? 'border-zinc-900 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

            {/* Logout or switch */}
            <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsAuthOpen(true);
                }}
                className="text-xs font-semibold text-emerald-600 hover:underline"
              >
                Switch Account
              </button>
              <button
                onClick={() => {
                  logoutUser();
                  setIsProfileOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-rose-600 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
