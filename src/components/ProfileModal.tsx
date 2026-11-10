import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { INITIAL_BUYER_CHATS, INITIAL_LIVE_SESSIONS } from '../data/mockData';
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
  ChevronRight,
  Heart,
  ShoppingBag,
  Trash2,
  ArrowRight,
  Tag,
  Share2,
  Users,
  MessageSquare,
  Radio,
  ExternalLink,
  Copy,
  Check,
  Truck,
  AlertCircle
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
    wishlist,
    products,
    toggleWishlist,
    addToCart,
    formatPrice,
    setSelectedProduct,
    profileActiveTab,
    setProfileActiveTab,
    language, 
    setLanguage, 
    currency, 
    setCurrency, 
    setIsOrdersOpen, 
    setIsRewardsOpen,
    setIsAuthOpen,
    availableCoupons,
    activeCoupon,
    applyCoupon,
    openSellerStore,
    chatWithSeller,
    setIsLiveShoppingOpen,
    earnCoins,
    notify
  } = useMarketplace();

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedReferral, setCopiedReferral] = useState(false);

  const activeTab = profileActiveTab;
  const setActiveTab = setProfileActiveTab;

  const wishlistedProducts = products.filter(p => wishlist.includes(p.id));

  if (!isProfileOpen) return null;

  const referralCode = user ? `PRIME-${user.name.split(' ')[0].toUpperCase()}-786` : 'PRIME-VIP-2026';
  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard?.writeText?.(code);
    setCopiedCode(code);
    applyCoupon(code);
    notify(`Coupon ${code} copied & applied to your cart!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCopyReferral = () => {
    navigator.clipboard?.writeText?.(referralLink);
    setCopiedReferral(true);
    earnCoins(100, 'Shared Referral Link');
    notify('Referral link copied! +100 Bazaar Coins credited 🪙');
    setTimeout(() => setCopiedReferral(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setIsProfileOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          title="Close Profile"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Guest View if not logged in */}
        {!user || !user.isLoggedIn ? (
          <div className="text-center py-10 space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
                Sign In to Prime Bazaar
              </h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1">
                Access your multi-vendor suborders, live tracking, delivery addresses, and Prime Coins wallet.
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
            {/* User Header Profile Card */}
            <div className="flex items-center gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
              <img
                src={user.avatar}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white font-display truncate">
                    {user.name}
                  </h2>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900 shrink-0">
                    <Crown className="w-3 h-3 text-amber-500" />
                    <span>{user.memberTier} VIP</span>
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">{user.phone} · {user.email}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                  <span>Member since {user.joinedDate}</span>
                  <span>·</span>
                  <span className="text-emerald-600 font-medium">OTP Authenticated</span>
                </div>
              </div>
            </div>

            {/* Quick Stat Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-4">
              <button
                onClick={() => setActiveTab('orders')}
                className={`p-3 rounded-2xl border text-center transition-colors ${
                  activeTab === 'orders' 
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-500/20' 
                    : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100'
                }`}
              >
                <Package className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">{orders.length} Orders</span>
                <span className="text-[10px] text-zinc-400">Track shipments</span>
              </button>

              <button
                onClick={() => setActiveTab('wishlist')}
                className={`p-3 rounded-2xl border text-center transition-colors ${
                  activeTab === 'wishlist' 
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 ring-1 ring-rose-500/20' 
                    : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100'
                }`}
              >
                <Heart className="w-5 h-5 text-rose-500 fill-rose-500 mx-auto mb-1" />
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">{wishlist.length} Wishlist</span>
                <span className="text-[10px] text-zinc-400">Saved styles</span>
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
                className={`p-3 rounded-2xl border text-center transition-colors ${
                  activeTab === 'addresses' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-500/20' 
                    : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100'
                }`}
              >
                <MapPin className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">{addresses.length} Addresses</span>
                <span className="text-[10px] text-zinc-400">Manage delivery</span>
              </button>
            </div>

            {/* Horizontal Scrollable Tabs */}
            <div className="flex gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-4 text-xs font-semibold overflow-x-auto no-scrollbar">
              {[
                { id: 'details', label: 'My Profile', icon: User },
                { id: 'orders', label: `My Orders (${orders.length})`, icon: Package },
                { id: 'wishlist', label: `Wishlist (${wishlist.length})`, icon: Heart },
                { id: 'addresses', label: 'My Addresses', icon: MapPin },
                { id: 'coupons', label: 'My Coupons', icon: Tag },
                { id: 'referrals', label: 'Refer & Earn', icon: Share2 },
                { id: 'chats', label: 'Seller Chats', icon: MessageSquare },
                { id: 'live', label: 'Live Shopping', icon: Radio },
                { id: 'preferences', label: 'Language & Currency', icon: Globe }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 ${
                      isActive 
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs font-bold' 
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Account Details */}
            {activeTab === 'details' && (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 flex justify-between items-center border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Registered Mobile</span>
                    <span className="font-semibold text-zinc-900 dark:text-white font-mono text-sm">{user.phone}</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md font-bold">
                    Verified OTP
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 flex justify-between items-center border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Email ID</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">{user.email}</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md font-bold">
                    Primary Contact
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 flex justify-between items-center border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">VIP Membership Tier</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">{user.memberTier} Level Benefits</span>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Free Express Shipping on all multi-vendor orders</p>
                  </div>
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                    Active
                  </span>
                </div>
              </div>
            )}

            {/* Tab 2: Orders & Suborder Drilldown */}
            {activeTab === 'orders' && (
              <div className="space-y-3">
                {orders.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <Package className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No orders placed yet</p>
                    <p className="text-[11px] text-zinc-400 mt-1">Explore our ethnic wear, footwear, and trending collections</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {orders.map(order => (
                      <div key={order.id} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-zinc-900 dark:text-white">{order.id}</span>
                            <span className="text-[10px] text-zinc-400 block">{order.createdAt}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-zinc-900 dark:text-white">{formatPrice(order.finalAmount)}</span>
                            <span className="text-[10px] text-emerald-600 block uppercase font-semibold">{order.status}</span>
                          </div>
                        </div>

                        {/* Items list */}
                        <div className="space-y-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-700/60">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-xs">
                              <img src={item.product?.images?.[0] || ''} alt={item.product?.title || 'Product'} className="w-10 h-12 object-cover rounded-lg shrink-0 border border-zinc-200 dark:border-zinc-700" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-zinc-900 dark:text-white truncate">{item.product?.title}</p>
                                <p className="text-[10px] text-zinc-400">Qty: {item.quantity} · Size: {item.selectedSize} · Color: {item.selectedColor}</p>
                              </div>
                              <span className="font-mono font-bold text-zinc-900 dark:text-white text-xs">{formatPrice((item.product?.price || 0) * item.quantity)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Multi-Vendor Suborder Split Preview */}
                        <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-[11px] flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                            <Truck className="w-3.5 h-3.5" />
                            <span>Fulfillment: <strong>BlueDart Express</strong></span>
                          </div>
                          <button
                            onClick={() => {
                              setIsProfileOpen(false);
                              setIsOrdersOpen(true);
                            }}
                            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                          >
                            <span>Live Tracking</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Wishlist */}
            {activeTab === 'wishlist' && (
              <div className="space-y-3">
                {wishlistedProducts.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mx-auto mb-3">
                      <Heart className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Your Wishlist is Empty</h4>
                    <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1 mb-4">
                      Tap the heart icon on any product card in the catalog to save your favorite styles to your profile.
                    </p>
                    <button
                      onClick={() => setIsProfileOpen(false)}
                      className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 transition-colors"
                    >
                      Explore Catalog
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-500 pb-1">
                      <span className="font-medium">{wishlistedProducts.length} items saved</span>
                      <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-current" />
                        <span>Active Wishlist</span>
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                      {wishlistedProducts.map(item => (
                        <div 
                          key={item.id} 
                          className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800/80 flex items-center gap-3.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer group"
                          onClick={() => {
                            setSelectedProduct(item);
                            setIsProfileOpen(false);
                          }}
                        >
                          <img 
                            src={item.images[0]} 
                            alt={item.title} 
                            className="w-16 h-20 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-zinc-700 group-hover:scale-105 transition-transform" 
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block truncate">
                              {item.brand}
                            </span>
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                              {item.title}
                            </h4>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-sm font-bold text-zinc-900 dark:text-white font-mono">
                                {formatPrice(item.price)}
                              </span>
                              {item.originalPrice > item.price && (
                                <span className="text-[11px] text-zinc-400 line-through font-mono">
                                  {formatPrice(item.originalPrice)}
                                </span>
                              )}
                              {item.discountPercent > 0 && (
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                                  {item.discountPercent}% OFF
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                const size = item.sizes[0]?.size || 'Free Size';
                                const color = item.colors[0]?.name || 'Standard';
                                addToCart(item, size, color, 1);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-all active:scale-95 shadow-xs"
                              title="Move to Shopping Bag"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Add to Bag</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleWishlist(item.id, item.title)}
                              className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Remove from Wishlist"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Addresses */}
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

            {/* Tab 5: My Coupons */}
            {activeTab === 'coupons' && (
              <div className="space-y-3">
                <p className="text-xs text-zinc-500">Apply promotional vouchers to save on your next checkout:</p>
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {availableCoupons.map(coupon => {
                    const isApplied = activeCoupon?.code === coupon.code;
                    return (
                      <div key={coupon.code} className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-rose-600 text-sm tracking-wide bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                              {coupon.code}
                            </span>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                              {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-1">{coupon.description}</p>
                          <span className="text-[10px] text-zinc-400 block">Min order: ₹{coupon.minOrderAmount}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyCoupon(coupon.code)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                            isApplied || copiedCode === coupon.code
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90'
                          }`}
                        >
                          {isApplied || copiedCode === coupon.code ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Applied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Apply</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 6: Refer & Earn */}
            {activeTab === 'referrals' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-transparent border border-amber-200 dark:border-amber-900/40 space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>Invite Friends, Earn 100 Bazaar Coins!</span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-[11px]">
                    Share your personal referral code. When your friend places their first multi-vendor order, you both get <strong>100 Bazaar Coins (₹100 value)</strong> credited automatically to your wallets.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-zinc-600 dark:text-zinc-400 font-semibold block">Your Unique Referral Code</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={referralCode}
                      className="flex-1 font-mono font-bold text-sm px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                    />
                    <button
                      onClick={handleCopyReferral}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      {copiedReferral ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedReferral ? 'Copied' : 'Share Link'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span className="font-semibold text-zinc-900 dark:text-white">Friends Onboarded</span>
                  </div>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white">3 Friends (₹300 Earned)</span>
                </div>
              </div>
            )}

            {/* Tab 7: Seller Chats */}
            {activeTab === 'chats' && (
              <div className="space-y-3">
                <p className="text-xs text-zinc-500">Your direct pre-purchase and support conversations with marketplace sellers:</p>
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {INITIAL_BUYER_CHATS.map(conv => (
                    <div 
                      key={conv.id} 
                      className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex items-center justify-between gap-3 cursor-pointer"
                      onClick={() => {
                        setIsProfileOpen(false);
                        chatWithSeller(conv.sellerId, conv.productContext);
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={conv.sellerAvatar} alt={conv.sellerName} className="w-10 h-10 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-zinc-700" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 dark:text-white text-xs truncate">{conv.sellerName}</span>
                            <span className="text-[10px] text-zinc-400">{conv.lastMessageTime}</span>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{conv.lastMessage}</p>
                          {conv.productContext && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate block">
                              Ref: {conv.productContext.title}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setIsProfileOpen(false);
                          chatWithSeller(conv.sellerId, conv.productContext);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 flex items-center gap-1 shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 8: Live Shopping */}
            {activeTab === 'live' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Interactive streams with live flash deals & chat</span>
                  <span className="flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block" />
                    <span>Live Now</span>
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {INITIAL_LIVE_SESSIONS.map(session => (
                    <div 
                      key={session.id}
                      className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex items-center justify-between gap-3 cursor-pointer"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsLiveShoppingOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700">
                          <img src={session.thumbnail} alt={session.title} className="w-full h-full object-cover" />
                          {session.status === 'live' && (
                            <span className="absolute bottom-0 inset-x-0 bg-rose-600 text-white text-[9px] font-bold text-center py-0.5">
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                            {session.sellerName}
                          </span>
                          <h4 className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                            {session.title}
                          </h4>
                          <span className="text-[10px] text-zinc-400 block mt-0.5">
                            {session.status === 'live' ? `${session.viewerCount} watching now` : `Starts ${session.scheduledTime}`}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setIsProfileOpen(false);
                          setIsLiveShoppingOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 flex items-center gap-1 shadow-xs"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Watch</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 9: Preferences */}
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
                          language === l.code ? 'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold' : 'border-zinc-200 dark:border-zinc-800'
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

            {/* Footer Sign Out */}
            <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
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
