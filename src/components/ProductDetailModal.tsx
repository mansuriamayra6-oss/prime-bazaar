import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { 
  X, 
  Star, 
  Heart, 
  ShoppingBag, 
  Share2, 
  Truck, 
  ShieldCheck, 
  RotateCcw, 
  Check, 
  Sparkles,
  MapPin,
  Store,
  Shirt,
  SlidersHorizontal,
  MessageSquare,
  ExternalLink,
  Bell,
  Play,
  RotateCw,
  Flag,
  Plus,
  Layers
} from 'lucide-react';

export const ProductDetailModal: React.FC = () => {
  const { 
    selectedProduct, 
    setSelectedProduct, 
    addToCart, 
    toggleWishlist, 
    isWishlisted, 
    earnCoins,
    formatPrice,
    openTryOn,
    toggleCompare,
    isCompared,
    openSellerStore,
    chatWithSeller,
    notify 
  } = useMarketplace();

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [pincode, setPincode] = useState('');
  const [pincodeChecked, setPincodeChecked] = useState(false);
  const [shared, setShared] = useState(false);
  const [viewMode, setViewMode] = useState<'image' | 'video' | '360'>('image');
  const [rotation360, setRotation360] = useState(0);
  const [priceDropAlert, setPriceDropAlert] = useState(false);

  if (!selectedProduct) return null;

  const product = selectedProduct;
  const wishlisted = isWishlisted(product.id);
  const compared = isCompared(product.id);

  const currentColor = selectedColor || product.colors[0]?.name || '';
  const currentSizeObj = product.sizes.find(s => s.size === selectedSize) || product.sizes.find(s => s.available);
  const currentSize = selectedSize || currentSizeObj?.size || '';

  const handleAddToCart = () => {
    if (!currentSize) {
      notify('Please choose a size first.');
      return;
    }
    addToCart(product, currentSize, currentColor, 1);
  };

  const handleShareProduct = () => {
    earnCoins(50, `Shared ${product.title.slice(0, 20)}`);
    setShared(true);
    navigator.clipboard?.writeText?.(window.location.href);
    notify('Product referral link copied! +50 Bazaar Coins credited 🪙');
    setTimeout(() => setShared(false), 3000);
  };

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (pincode.length === 6) {
      setPincodeChecked(true);
      notify('Express delivery available at your location!');
    } else {
      notify('Please enter a valid 6-digit Indian PIN code.');
    }
  };

  const handleTogglePriceDrop = () => {
    setPriceDropAlert(!priceDropAlert);
    if (!priceDropAlert) {
      notify('🔔 Subscribed! We will alert you the moment price drops on this item.');
    } else {
      notify('Price drop alert cancelled.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      <div 
        className="relative w-full max-w-5xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => setSelectedProduct(null)}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-sm"
          title="Close product detail"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[85vh] overflow-y-auto">
          {/* Left Column: Image Gallery, 360 View, & Video (6 cols) */}
          <div className="lg:col-span-6 p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col gap-4">
            {/* View Mode Switcher Pills */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('image')}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === 'image'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                <span>Gallery</span>
              </button>
              <button
                onClick={() => setViewMode('360')}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === '360'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>360° View</span>
              </button>
              {product.videoUrl && (
                <button
                  onClick={() => setViewMode('video')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                    viewMode === 'video'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Video Demo</span>
                </button>
              )}
            </div>

            {/* Main Stage Viewport */}
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800">
              {viewMode === 'image' && (
                <img
                  src={product.images[activeImageIdx] || product.images[0]}
                  alt={product.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center transition-transform hover:scale-105 duration-300"
                />
              )}

              {viewMode === '360' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-zinc-900 text-white relative">
                  <div 
                    className="w-48 h-64 rounded-xl overflow-hidden border-2 border-indigo-400 shadow-2xl transition-transform duration-150"
                    style={{ transform: `rotateY(${rotation360}deg)` }}
                  >
                    <img
                      src={product.images[activeImageIdx] || product.images[0]}
                      alt="360 view"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute bottom-4 inset-x-6 flex flex-col items-center gap-2 bg-black/60 backdrop-blur-md p-3 rounded-2xl">
                    <span className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1">
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Drag Slider for 360° Inspection</span>
                    </span>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={rotation360}
                      onChange={e => setRotation360(parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {viewMode === 'video' && product.videoUrl && (
                <video
                  src={product.videoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}

              {product.isTrending && viewMode === 'image' && (
                <div className="absolute top-4 left-4 bg-zinc-950/80 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">
                  Trending Pick
                </div>
              )}

              {/* Virtual Try-On floating badge */}
              <button
                onClick={() => openTryOn(product)}
                className="absolute bottom-4 right-4 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
              >
                <Shirt className="w-4 h-4" />
                <span>Virtual Try-On</span>
              </button>
            </div>

            {/* Thumbnail carousel */}
            {product.images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveImageIdx(idx);
                      setViewMode('image');
                    }}
                    className={`relative w-20 h-24 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      activeImageIdx === idx && viewMode === 'image'
                        ? 'border-rose-600 ring-2 ring-rose-600/20'
                        : 'border-zinc-200 dark:border-zinc-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="thumbnail" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Seller attribution with direct storefront link & chat */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div 
                className="flex items-center gap-2.5 cursor-pointer group/seller"
                onClick={() => {
                  setSelectedProduct(null);
                  openSellerStore(product.sellerId);
                }}
                title="View seller public storefront"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-zinc-900 dark:text-white group-hover/seller:text-emerald-600 transition-colors">
                      {product.sellerName}
                    </span>
                    <ExternalLink className="w-3 h-3 text-zinc-400 group-hover/seller:text-emerald-600" />
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                    <span className="text-emerald-600 font-medium">GST Verified</span>
                    <span>·</span>
                    <span className="text-amber-500 font-semibold">{product.sellerRating}★</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(null);
                    openSellerStore(product.sellerId);
                  }}
                  className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-medium text-[11px] transition-colors"
                >
                  Visit Store
                </button>
                <button
                  type="button"
                  onClick={() => chatWithSeller(product.sellerId, product)}
                  className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center justify-center gap-1 shadow-xs transition-colors"
                  title="Chat directly with vendor"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Contiguous Purchase Module (6 cols) */}
          <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                <span className="font-bold tracking-wider uppercase text-rose-600 dark:text-rose-400">
                  {product.brand}
                </span>
                <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md text-zinc-900 dark:text-zinc-100 font-medium">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{product.rating}</span>
                  <span className="text-zinc-400">({product.reviewCount} reviews)</span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white font-display leading-snug">
                {product.title}
              </h1>

              {/* Price Row with formatPrice */}
              <div className="mt-3 flex items-baseline gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white font-mono tabular-nums">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice > product.price && (
                  <span className="text-sm text-zinc-400 line-through font-mono tabular-nums">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
                {product.discountPercent > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold font-mono">
                    {product.discountPercent}% OFF
                  </span>
                )}
                <span className="text-xs text-zinc-400">All taxes included</span>
              </div>

              {/* Color selection */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="text-zinc-800 dark:text-zinc-200">Color: {currentColor}</span>
                </div>
                <div className="flex items-center gap-3">
                  {product.colors.map(c => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(c.name)}
                      className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        currentColor === c.name
                          ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white ring-1 ring-zinc-900 dark:ring-white'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Size selection */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="text-zinc-800 dark:text-zinc-200">Select Size</span>
                  {currentSizeObj && (
                    <span className={`text-[11px] font-medium ${currentSizeObj.stockCount <= 3 ? 'text-rose-600 font-bold' : 'text-zinc-500'}`}>
                      {currentSizeObj.stockCount <= 3 ? `Only ${currentSizeObj.stockCount} left in stock!` : 'In Stock'}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(s => (
                    <button
                      key={s.size}
                      disabled={!s.available}
                      onClick={() => setSelectedSize(s.size)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                        !s.available
                          ? 'opacity-40 cursor-not-allowed line-through bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                          : currentSize === s.size
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {s.size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery check */}
              <div className="mt-6 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-white mb-2">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  <span>Check Delivery Date & Services</span>
                </div>
                <form onSubmit={handleCheckPincode} className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit Pincode (e.g. 400050)"
                    value={pincode}
                    onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    Check
                  </button>
                </form>
                {pincodeChecked && (
                  <div className="mt-3 text-xs space-y-1.5 text-zinc-600 dark:text-zinc-300">
                    <p className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Check className="w-3.5 h-3.5" />
                      <span>Delivery by <strong>Tomorrow, 5:00 PM</strong></span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Free Express Shipping on this item</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Specs */}
              <div className="mt-6 space-y-3">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Product Details & Fabric
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {product.description}
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                  {product.fabric && (
                    <div className="p-2.5 rounded-lg bg-zinc-100/60 dark:bg-zinc-800/40">
                      <span className="text-zinc-400 block text-[10px] uppercase">Fabric / Material</span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{product.fabric}</span>
                    </div>
                  )}
                  {product.fit && (
                    <div className="p-2.5 rounded-lg bg-zinc-100/60 dark:bg-zinc-800/40">
                      <span className="text-zinc-400 block text-[10px] uppercase">Silhouette & Fit</span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{product.fit}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 transition-all active:scale-[0.98]"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add To Bag</span>
                </button>
                <button
                  onClick={() => openTryOn(product)}
                  className="p-3.5 rounded-xl border border-indigo-300 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                  title="Virtual Try-On"
                >
                  <Shirt className="w-5 h-5" />
                </button>
                <button
                  onClick={() => toggleCompare(product.id)}
                  className={`p-3.5 rounded-xl border transition-colors ${
                    compared
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                  title={compared ? 'In comparison' : 'Compare with other items'}
                >
                  <SlidersHorizontal className="w-5 h-5" />
                </button>
                <button
                  onClick={() => toggleWishlist(product.id, product.title)}
                  className={`p-3.5 rounded-xl border transition-all ${
                    wishlisted
                      ? 'bg-rose-50 border-rose-300 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900 ring-2 ring-rose-500/20'
                      : 'border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                  title={wishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}
                >
                  <Heart className={`w-5 h-5 ${wishlisted ? 'fill-rose-600' : ''}`} />
                </button>
              </div>

              {/* Price Drop Alert & Report Row */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleTogglePriceDrop}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                    priceDropAlert
                      ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{priceDropAlert ? 'Price Drop Alert Active' : 'Notify Price Drop'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => notify('Product flagged for catalog safety review. Ticket #SEC-982 opened.')}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-rose-500 transition-colors"
                >
                  <Flag className="w-3 h-3" />
                  <span>Report listing</span>
                </button>
              </div>

              {/* Share */}
              <button
                onClick={handleShareProduct}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors"
              >
                <Share2 className="w-4 h-4 text-amber-600" />
                <span>{shared ? 'Link Copied! +50 Coins Earned' : 'Share With Friends & Earn 50 Bazaar Coins'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Frequently Bought Together Bundle Card (Section E) */}
        <div className="p-5 sm:p-6 bg-amber-50/50 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
              Frequently Bought Together (Save 15% Extra Combo)
            </h4>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-16 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0">
                <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-zinc-400 text-lg">+</span>
              <div className="w-14 h-16 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0 bg-white dark:bg-zinc-800 flex items-center justify-center p-1">
                <Sparkles className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                  {product.title} + Curated Artisan Accessory Bundle
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-bold text-rose-600 font-mono text-sm">
                    {formatPrice(Math.round(product.price * 1.35))}
                  </span>
                  <span className="text-[11px] text-zinc-400 line-through font-mono">
                    {formatPrice(Math.round(product.originalPrice * 1.5))}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                    BUNDLE DEAL
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                handleAddToCart();
                notify('Frequently Bought Together bundle added with 15% combo discount!');
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Bundle To Bag</span>
            </button>
          </div>
        </div>

        {/* Customer Reviews Section */}
        {product.reviews && product.reviews.length > 0 && (
          <div className="p-6 sm:p-8 bg-zinc-50 dark:bg-zinc-950/30 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display mb-4">
              Verified Customer Reviews & Ratings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {product.reviews.map(rev => (
                <div key={rev.id} className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-zinc-900 dark:text-white">{rev.userName}</span>
                    <span className="text-zinc-400">{rev.date}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-zinc-200 text-zinc-200 dark:fill-zinc-700 dark:text-zinc-700'
                        }`}
                      />
                    ))}
                    {rev.verifiedPurchase && (
                      <span className="ml-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
