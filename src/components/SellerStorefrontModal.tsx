import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { 
  X, 
  Store, 
  ShieldCheck, 
  Star, 
  MapPin, 
  MessageCircle, 
  Share2, 
  ShoppingBag, 
  Heart, 
  Check, 
  Clock, 
  Truck, 
  RotateCcw,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Product } from '../types';

export const SellerStorefrontModal: React.FC = () => {
  const { 
    isSellerStoreOpen, 
    closeSellerStore, 
    activeSellerStoreId, 
    sellers, 
    products, 
    addToCart, 
    toggleWishlist, 
    isWishlisted, 
    setSelectedProduct,
    chatWithSeller,
    notify,
    formatPrice
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<'products' | 'about' | 'policies'>('products');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFollowing, setIsFollowing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isSellerStoreOpen || !activeSellerStoreId) return null;

  const seller = sellers.find(s => s.id === activeSellerStoreId) || sellers[0];
  const sellerProducts = products.filter(p => p.sellerId === seller.id || p.sellerName === seller.businessName);

  const categories = ['all', ...Array.from(new Set(sellerProducts.map(p => p.category)))];

  const filteredProducts = selectedCategory === 'all'
    ? sellerProducts
    : sellerProducts.filter(p => p.category === selectedCategory);

  const handleShare = () => {
    const storeUrl = `https://primebazaar.co.in/store/${seller.storeName ? seller.storeName.toLowerCase().replace(/\s+/g, '-') : seller.id}`;
    navigator.clipboard?.writeText?.(storeUrl);
    setCopiedLink(true);
    notify(`Storefront link copied! (${storeUrl})`);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleFollow = () => {
    setIsFollowing(prev => !prev);
    notify(!isFollowing ? `You are now following ${seller.businessName}!` : `Unfollowed ${seller.businessName}`);
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      <div 
        className="relative w-full max-w-5xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeSellerStore}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all shadow-md"
          title="Close Storefront"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Storefront Hero Banner */}
        <div className="relative h-44 sm:h-56 bg-gradient-to-r from-emerald-950 via-zinc-900 to-indigo-950 overflow-hidden shrink-0">
          <img
            src={seller.bannerImage || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=80'}
            alt={seller.businessName}
            className="w-full h-full object-cover opacity-45 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-transparent to-black/30" />
          
          {/* Public Storefront URL Pill */}
          <div className="absolute top-4 left-4 z-10 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 text-emerald-300 border border-emerald-500/30 backdrop-blur-md text-[11px] font-mono font-medium">
            <Store className="w-3.5 h-3.5" />
            <span>primebazaar.co.in/store/{seller.storeName ? seller.storeName.toLowerCase().replace(/\s+/g, '-') : seller.id}</span>
          </div>
        </div>

        {/* Store Profile Header Strip */}
        <div className="px-5 sm:px-8 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 -mt-12 sm:-mt-14 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-zinc-900 border-4 border-white dark:border-zinc-900 shadow-xl overflow-hidden shrink-0 flex items-center justify-center text-white">
              {seller.storeLogo ? (
                <img src={seller.storeLogo} alt={seller.businessName} className="w-full h-full object-cover" />
              ) : (
                <Store className="w-10 h-10 text-emerald-400" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold font-display text-zinc-900 dark:text-white">
                  {seller.businessName}
                </h2>
                {seller.verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-300 dark:border-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    GST Verified
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1 font-semibold text-zinc-800 dark:text-zinc-200">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {seller.rating || 4.9} (1,420+ ratings)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  {seller.location}
                </span>
                <span>•</span>
                <span>GST: <code className="font-mono">{seller.gstNumber}</code></span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => chatWithSeller(seller.id)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Chat with Seller</span>
            </button>

            <button
              onClick={handleFollow}
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md ${
                isFollowing 
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isFollowing ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{isFollowing ? 'Following' : '+ Follow Store'}</span>
            </button>

            <button
              onClick={handleShare}
              className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-all"
              title="Share Storefront"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Store Trust Badges Strip */}
        <div className="px-5 sm:px-8 py-2.5 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-3 text-center text-xs text-zinc-600 dark:text-zinc-400 shrink-0">
          <div className="flex items-center justify-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-indigo-500" />
            <span>Fast Express Dispatch (99.4%)</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 border-x border-zinc-200 dark:border-zinc-700">
            <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
            <span>7-Day Hassle-Free Returns</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Avg Response: &lt; 15 mins</span>
          </div>
        </div>

        {/* Storefront Tabs */}
        <div className="px-5 sm:px-8 pt-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-2">
            {[
              { id: 'products', label: `Store Catalog (${filteredProducts.length})` },
              { id: 'about', label: 'About & Factory' },
              { id: 'policies', label: 'Returns & GST Details' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
                  activeTab === tab.id
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'products' && (
            <div className="flex items-center gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold capitalize whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold'
                      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab 1: Store Products Grid */}
        {activeTab === 'products' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-8">
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Store className="w-12 h-12 text-zinc-400 mx-auto" />
                <h4 className="font-bold text-zinc-800 dark:text-zinc-200">No products found in this category</h4>
                <p className="text-xs text-zinc-500">Try selecting 'All' or check back soon for fresh drops.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredProducts.map(p => (
                  <div
                    key={p.id}
                    className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col hover:shadow-lg transition-all"
                  >
                    <div 
                      className="relative aspect-3/4 overflow-hidden bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
                      onClick={() => setSelectedProduct(p)}
                    >
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          toggleWishlist(p.id, p.title);
                        }}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm hover:scale-110 transition-transform"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isWishlisted(p.id) ? 'fill-rose-500 text-rose-500' : 'text-zinc-600'}`} />
                      </button>
                      {p.discountPercent > 0 && (
                        <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                          {p.discountPercent}% OFF
                        </span>
                      )}
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{p.brand}</span>
                        <h4 
                          onClick={() => setSelectedProduct(p)}
                          className="text-xs font-semibold text-zinc-900 dark:text-white line-clamp-1 hover:text-emerald-600 cursor-pointer"
                        >
                          {p.title}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        <div>
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">{formatPrice(p.price)}</span>
                          <span className="text-[10px] text-zinc-400 line-through ml-1.5">{formatPrice(p.originalPrice)}</span>
                        </div>
                        <button
                          onClick={() => addToCart(p, p.sizes[0]?.size || 'M', p.colors[0]?.name || 'Standard')}
                          className="p-1.5 rounded-xl bg-zinc-900 hover:bg-emerald-600 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-emerald-500 dark:hover:text-white transition-colors"
                          title="Add to Bag"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: About & Factory */}
        {activeTab === 'about' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5 text-xs text-zinc-700 dark:text-zinc-300">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                About {seller.businessName}
              </h3>
              <p className="leading-relaxed">
                Operating out of {seller.location}, {seller.businessName} is an authorized multi-vendor merchant on Prime Bazaar specializing in authentic textiles, apparel, and direct-to-consumer craft. All items undergo 3-stage manual quality verification prior to dispatch.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="font-bold text-zinc-900 dark:text-white">Registered Business Entity</span>
                <div className="space-y-1 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                  <div>• Legal Name: {seller.businessName}</div>
                  <div>• Trade Name: {seller.storeName || seller.businessName}</div>
                  <div>• Structure: {seller.businessType || 'Proprietorship'}</div>
                  <div>• Onboarded Since: {seller.joinedDate}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="font-bold text-zinc-900 dark:text-white">Pickup & Warehouse Address</span>
                <div className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <div>{seller.pickupAddress?.street || 'Central Textile Logistics Zone'}</div>
                  <div>{seller.pickupAddress?.city || 'Varanasi'}, {seller.pickupAddress?.state || 'Uttar Pradesh'} - {seller.pickupAddress?.pinCode || '221001'}</div>
                  <div>Carrier Integration: BlueDart Express & Delhivery Surface Air</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Policies & GST */}
        {activeTab === 'policies' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5 text-xs text-zinc-700 dark:text-zinc-300">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-emerald-600" />
                  7-Day Return Policy
                </span>
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  Buyers may initiate returns or replacements within 7 calendar days of delivery. Reverse pickup is scheduled with courier partners at zero additional cost.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  GST Compliance
                </span>
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  GSTIN <code className="font-mono text-zinc-800 dark:text-zinc-200 font-bold">{seller.gstNumber}</code> is registered under Indian GST law. Automated B2C/B2B tax invoices generated with CGST/SGST breakdowns.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Processing Window
                </span>
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  Orders confirmed before 2:00 PM IST are packed and handed over to logistics partners on the same day. Tamper-evident packaging seals applied.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
