import React, { useState } from 'react';
import { Product } from '../types';
import { useMarketplace } from '../context/MarketplaceContext';
import { 
  Heart, 
  Star, 
  Sparkles, 
  ShoppingBag, 
  Eye, 
  SlidersHorizontal,
  Shirt
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { 
    toggleWishlist, 
    isWishlisted, 
    setSelectedProduct, 
    addToCart, 
    formatPrice,
    toggleCompare,
    isCompared,
    openTryOn,
    openSellerStore,
    notify 
  } = useMarketplace();

  const [imageError, setImageError] = useState(false);
  const wishlisted = isWishlisted(product.id);
  const compared = isCompared(product.id);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const availableSize = product.sizes.find(s => s.available);
    if (!availableSize) {
      notify('This product is currently out of stock.');
      return;
    }
    const color = product.colors[0]?.name || 'Standard';
    addToCart(product, availableSize.size, color, 1);
  };

  return (
    <div
      onClick={() => setSelectedProduct(product)}
      className="group relative flex flex-col bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-zinc-950/50 cursor-pointer"
    >
      {/* Product Image Container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {!imageError ? (
          <img
            src={product.images[0]}
            alt={product.title}
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
            <Sparkles className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs font-medium text-center">{product.title}</span>
          </div>
        )}

        {/* Single tag */}
        {product.isTrending && (
          <div className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-1 rounded-md">
            Trending
          </div>
        )}
        {!product.isTrending && product.isBestSeller && (
          <div className="absolute top-3 left-3 bg-amber-600/90 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-1 rounded-md">
            Best Seller
          </div>
        )}

        {/* Action icons top right: Wishlist & Compare */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              toggleWishlist(product.id, product.title);
            }}
            aria-label={wishlisted ? `Remove ${product.title} from Wishlist` : `Save ${product.title} to Wishlist`}
            className={`group/wish w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 shadow-md ${
              wishlisted
                ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 ring-2 ring-rose-500/20 scale-105 active:scale-95'
                : 'bg-white/95 dark:bg-zinc-900/95 text-zinc-600 dark:text-zinc-300 border border-zinc-200/90 dark:border-zinc-700/90 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-700 hover:scale-110 active:scale-90'
            }`}
            title={wishlisted ? 'Saved to Wishlist (Click to remove)' : 'Save to Wishlist'}
          >
            <Heart 
              className={`w-4 h-4 sm:w-[18px] sm:h-[18px] transition-all duration-200 ${
                wishlisted 
                  ? 'fill-rose-600 dark:fill-rose-400 text-rose-600 dark:text-rose-400 scale-110' 
                  : 'group-hover/wish:text-rose-600 group-hover/wish:scale-110'
              }`} 
            />
          </button>

          <button
            onClick={e => {
              e.stopPropagation();
              toggleCompare(product.id);
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-sm ${
              compared
                ? 'bg-indigo-600 text-white'
                : 'bg-white/80 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 hover:scale-110'
            }`}
            title={compared ? 'In comparison list' : 'Add to side-by-side compare'}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick actions hover overlay */}
        <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-zinc-950/80 via-zinc-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
          <button
            onClick={handleQuickAdd}
            className="flex-1 py-2 px-2 rounded-lg bg-white text-zinc-900 text-xs font-semibold flex items-center justify-center gap-1 hover:bg-zinc-100 transition-colors shadow-sm"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Bag</span>
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              openTryOn(product);
            }}
            className="py-2 px-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1 hover:bg-indigo-500 transition-colors"
            title="Virtual Try-On"
          >
            <Shirt className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Try On</span>
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              setSelectedProduct(product);
            }}
            className="p-2 rounded-lg bg-zinc-900/80 text-white text-xs font-medium hover:bg-zinc-900 transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-2">
        <div>
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-700 dark:text-zinc-300">
              {product.brand}
            </span>
            <div className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300 font-medium">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{product.rating}</span>
              <span className="text-zinc-400 text-[10px]">({product.reviewCount})</span>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
            {product.title}
          </h3>

          <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                openSellerStore(product.sellerId);
              }}
              className="text-[11px] text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 truncate max-w-[130px] transition-colors text-left"
              title={`Visit ${product.sellerName}'s storefront`}
            >
              by <span className="font-medium underline decoration-dotted">{product.sellerName}</span>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-zinc-400">Sizes:</span>
              {product.sizes.slice(0, 3).map(s => (
                <span
                  key={s.size}
                  className={s.available ? 'font-medium text-zinc-700 dark:text-zinc-300' : 'line-through text-zinc-300 dark:text-zinc-600'}
                >
                  {s.size}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Price & Discount Section with formatPrice */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-zinc-900 dark:text-white font-mono tabular-nums">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice > product.price && (
              <span className="text-xs text-zinc-400 line-through font-mono tabular-nums">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          {product.discountPercent > 0 && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              {product.discountPercent}% OFF
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
