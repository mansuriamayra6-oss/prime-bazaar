import React, { useState } from 'react';
import { Product } from '../types';
import { useMarketplace } from '../context/MarketplaceContext';
import {
  Heart,
  Star,
  Sparkles,
  ShoppingCart,
  SlidersHorizontal,
  Shirt,
  Zap,
  Truck,
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
  isSponsored?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, isSponsored = false }) => {
  const {
    toggleWishlist,
    isWishlisted,
    setSelectedProduct,
    addToCart,
    buyProductNow,
    formatPrice,
    toggleCompare,
    isCompared,
    openTryOn,
    openSellerStore,
    notify,
  } = useMarketplace();

  const [imageError, setImageError] = useState(false);
  const wishlisted = isWishlisted(product.id);
  const compared = isCompared(product.id);

  const availableSize = product.sizes.find(s => s.available);
  const totalStock = Number(product.inStock ?? 0);
  const isOutOfStock = !availableSize && totalStock <= 0;

  const badgeLabel = isSponsored
    ? 'Sponsored'
    : product.isBestSeller
    ? 'Best Seller'
    : product.isNew
    ? 'New'
    : product.discountPercent >= 45
    ? 'Deal'
    : product.isTrending
    ? 'Trending'
    : null;

  const badgeStyle = isSponsored
    ? 'bg-slate-800/90 text-slate-100'
    : product.isBestSeller
    ? 'bg-amber-600 text-white'
    : product.isNew
    ? 'bg-emerald-600 text-white'
    : product.discountPercent >= 45
    ? 'bg-orange-600 text-white'
    : 'bg-[#0F172A]/90 text-white';

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetSize = availableSize?.size || product.sizes[0]?.size || 'Free Size';
    if (isOutOfStock) {
      notify('This product is currently out of stock.');
      return;
    }
    const color = product.colors[0]?.name || 'Standard';
    addToCart(product, targetSize, color, 1);
  };

  const handleQuickBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetSize = availableSize?.size || product.sizes[0]?.size || 'Free Size';
    if (isOutOfStock) {
      notify('This product is currently out of stock.');
      return;
    }
    const color = product.colors[0]?.name || 'Standard';
    buyProductNow(product, targetSize, color, 'cashfree', 1);
  };

  const deliveryLabel =
    product.price >= 999
      ? 'Free delivery · 2–4 days'
      : product.codAvailable !== false
      ? 'COD · 3–5 days'
      : 'Standard delivery · 3–5 days';

  const stockLabel = isOutOfStock
    ? 'Out of stock'
    : totalStock > 0 && totalStock <= 5
    ? `Only ${totalStock} left`
    : 'In stock';

  return (
    <div
      onClick={() => setSelectedProduct(product)}
      className="group relative flex flex-col bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md cursor-pointer"
    >
      {/* Product Image */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-100 dark:bg-zinc-800">
        {!imageError && product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-zinc-800 text-slate-400">
            <Sparkles className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs font-medium text-center">{product.title}</span>
          </div>
        )}

        {/* Max 1 top-left badge */}
        {badgeLabel && (
          <span
            className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide shadow-xs ${badgeStyle}`}
          >
            {badgeLabel}
          </span>
        )}

        {/* Discount %, single crisp bottom-left marker */}
        {product.discountPercent > 0 && (
          <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-orange-600/95 text-white text-[10px] font-extrabold font-mono tabular-nums shadow-xs">
            -{product.discountPercent}%
          </span>
        )}

        {/* Top right action buttons: Wishlist & Compare */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              toggleWishlist(product.id, product.title);
            }}
            aria-label={wishlisted ? `Remove ${product.title} from Wishlist` : `Save ${product.title} to Wishlist`}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-all shadow-sm ${
              wishlisted
                ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-600 border border-rose-300 dark:border-rose-800'
                : 'bg-white/90 dark:bg-zinc-900/90 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:text-rose-600'
            }`}
            title={wishlisted ? 'Saved to Wishlist' : 'Save to Wishlist'}
          >
            <Heart className={`w-4 h-4 ${wishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              toggleCompare(product.id);
            }}
            aria-label={compared ? 'Remove from comparison' : 'Compare product'}
            className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all shadow-sm ${
              compared
                ? 'bg-indigo-600 text-white'
                : 'bg-white/90 dark:bg-zinc-900/90 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:text-indigo-600'
            }`}
            title={compared ? 'In comparison list' : 'Compare product'}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Desktop hover secondary triggers (Buy Now & Virtual Try-On) */}
        <div className="hidden sm:flex absolute inset-x-2.5 bottom-2.5 justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleQuickBuy}
            disabled={isOutOfStock}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white text-[11px] font-bold flex items-center gap-1 shadow-md"
            title="Buy Now"
          >
            <Zap className="w-3 h-3" />
            <span>Buy</span>
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              openTryOn(product);
            }}
            className="px-2 py-1.5 rounded-lg bg-[#0F172A]/90 hover:bg-[#0F172A] text-white text-[11px] font-semibold flex items-center gap-1 shadow-md"
            title="Virtual Try-On"
          >
            <Shirt className="w-3 h-3" />
            <span>Try On</span>
          </button>
        </div>
      </div>

      {/* Product Metadata & Actions */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div className="space-y-1">
          {/* Brand & Rating */}
          <div className="flex items-center justify-between gap-1 text-[11px]">
            <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 truncate">
              {product.brand}
            </span>
            <div className="flex items-center gap-0.5 text-slate-700 dark:text-zinc-200 font-semibold shrink-0 tabular-nums">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{product.rating}</span>
              <span className="text-slate-400 text-[10px]">({product.reviewCount})</span>
            </div>
          </div>

          {/* Product Name */}
          <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
            {product.title}
          </h3>

          {/* Seller link */}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              openSellerStore(product.sellerId);
            }}
            className="block text-[11px] text-slate-500 dark:text-zinc-400 hover:text-orange-600 truncate max-w-full text-left"
          >
            by <span className="font-medium underline decoration-dotted">{product.sellerName}</span>
          </button>
        </div>

        {/* Pricing + Delivery + Quick Add to Cart */}
        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
          <div className="flex items-baseline justify-between gap-1.5">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-[11px] text-slate-400 line-through font-mono tabular-nums truncate">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] font-semibold shrink-0 ${
                isOutOfStock
                  ? 'text-rose-600'
                  : totalStock <= 5
                  ? 'text-orange-600'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {stockLabel}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-zinc-400 truncate">
            <Truck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">{deliveryLabel}</span>
          </div>

          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={isOutOfStock}
            className="w-full py-2 min-h-[38px] rounded-lg bg-[#0F172A] hover:bg-orange-600 disabled:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
            <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
