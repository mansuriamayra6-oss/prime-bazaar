import React from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { X, Star, ShoppingBag, Trash2, CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react';

export const CompareModal: React.FC = () => {
  const { 
    isCompareOpen, 
    setIsCompareOpen, 
    compareList, 
    toggleCompare, 
    clearCompare, 
    products, 
    addToCart,
    formatPrice,
    setSelectedProduct 
  } = useMarketplace();

  if (!isCompareOpen) return null;

  const comparedProducts = products.filter(p => compareList.includes(p.id));

  const handleAdd = (prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    const availableSize = prod.sizes.find(s => s.available)?.size || prod.sizes[0]?.size || 'Standard';
    const color = prod.colors[0]?.name || 'Standard';
    addToCart(prod, availableSize, color, 1);
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
              Side-by-Side Product Comparison
            </h2>
            <p className="text-xs text-zinc-500">
              Comparing {comparedProducts.length} selected items across specifications, ratings & value
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearCompare}
              className="text-xs text-zinc-500 hover:text-rose-600 font-semibold px-2 py-1"
            >
              Clear All
            </button>
            <button
              onClick={() => setIsCompareOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {comparedProducts.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <div className={`grid gap-4 min-w-[600px]`} style={{ gridTemplateColumns: `repeat(${comparedProducts.length}, minmax(0, 1fr))` }}>
              {comparedProducts.map(prod => (
                <div
                  key={prod.id}
                  className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between text-xs space-y-4"
                >
                  {/* Top image & remove */}
                  <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                    <img
                      src={prod.images[0]}
                      alt={prod.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => toggleCompare(prod.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      title="Remove from comparison"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400">{prod.brand}</span>
                    <h4 
                      onClick={() => {
                        setSelectedProduct(prod);
                        setIsCompareOpen(false);
                      }}
                      className="font-semibold text-zinc-900 dark:text-white line-clamp-2 hover:text-rose-600 cursor-pointer"
                    >
                      {prod.title}
                    </h4>

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-base font-bold font-mono text-zinc-900 dark:text-white">
                        {formatPrice(prod.price)}
                      </span>
                      {prod.originalPrice > prod.price && (
                        <span className="text-[11px] text-zinc-400 line-through font-mono">
                          {formatPrice(prod.originalPrice)}
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-emerald-600">{prod.discountPercent}% OFF</span>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mt-2 text-zinc-700 dark:text-zinc-300 font-medium">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{prod.rating}</span>
                      <span className="text-zinc-400">({prod.reviewCount})</span>
                    </div>
                  </div>

                  {/* Feature Attributes Matrix */}
                  <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-700/60 text-[11px]">
                    <div>
                      <span className="text-zinc-400 block text-[10px] uppercase">Fabric / Material</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{prod.fabric || 'Pure Cotton'}</span>
                    </div>

                    <div>
                      <span className="text-zinc-400 block text-[10px] uppercase">Silhouette / Fit</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{prod.fit || 'Standard Fit'}</span>
                    </div>

                    <div>
                      <span className="text-zinc-400 block text-[10px] uppercase">COD Eligibility</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {prod.codAvailable ? 'Yes · Cash on Delivery' : 'Prepaid Only'}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-400 block text-[10px] uppercase">Return Window</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{prod.returnPeriodDays} Days Free Return</span>
                    </div>

                    <div>
                      <span className="text-zinc-400 block text-[10px] uppercase">Merchant Seller</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{prod.sellerName}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAdd(prod.id)}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Add to Bag</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-zinc-500 text-xs">
            No products in comparison queue. Click the compare icon on product detail views to evaluate up to 4 items side-by-side.
          </div>
        )}
      </div>
    </div>
  );
};
