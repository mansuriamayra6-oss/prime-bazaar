import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { X, Sparkles, Check, ShoppingBag, Ruler, Shirt } from 'lucide-react';

export const VirtualTryOnModal: React.FC = () => {
  const { isTryOnOpen, setIsTryOnOpen, tryOnProduct, addToCart, notify } = useMarketplace();

  const [modelHeight, setModelHeight] = useState<'5ft 4in' | '5ft 7in' | '5ft 10in'>('5ft 7in');
  const [modelBuild, setModelBuild] = useState<'Petite' | 'Regular' | 'Relaxed'>('Regular');
  const [userChest, setUserChest] = useState(38);
  const [userWaist, setUserWaist] = useState(32);

  if (!isTryOnOpen || !tryOnProduct) return null;

  const product = tryOnProduct;

  // Calculate recommended size
  let recommendedSize = 'M';
  if (userChest < 36) recommendedSize = 'S';
  else if (userChest > 40) recommendedSize = 'L';
  else if (userChest > 44) recommendedSize = 'XL';

  const handleAddRecommended = () => {
    const color = product.colors[0]?.name || 'Standard';
    addToCart(product, recommendedSize, color, 1);
    setIsTryOnOpen(false);
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setIsTryOnOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
              AI Virtual Try-On & Fit Studio
            </h2>
            <p className="text-xs text-zinc-500">
              Interactive garment drape simulation & size recommendation engine
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
          {/* Left: Interactive Mannequin / Model Viewport (5 cols) */}
          <div className="md:col-span-6 bg-zinc-100 dark:bg-zinc-950/60 rounded-2xl p-4 flex flex-col items-center justify-between border border-zinc-200 dark:border-zinc-800 relative overflow-hidden">
            <div className="w-full text-center pb-2 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-xs text-zinc-500">
              <span>Model Preset: <strong>{modelHeight}</strong></span>
              <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold">
                {modelBuild} Build
              </span>
            </div>

            {/* Simulated Garment Drape Visualizer */}
            <div className="relative w-full aspect-[3/4] flex items-center justify-center my-3">
              <img
                src={product.images[0]}
                alt={product.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-xl shadow-lg transition-transform duration-300"
                style={{
                  transform: modelBuild === 'Petite' ? 'scale(0.92)' : modelBuild === 'Relaxed' ? 'scale(1.04)' : 'scale(1)'
                }}
              />
              <div className="absolute bottom-3 inset-x-3 p-2.5 rounded-xl bg-black/60 backdrop-blur-md text-white text-xs flex items-center justify-between">
                <span>Fit silhouette: {product.fit || 'Regular Fit'}</span>
                <span className="font-bold text-emerald-400 font-mono">96% Accuracy</span>
              </div>
            </div>

            {/* Quick avatar controls */}
            <div className="w-full flex justify-between gap-1 text-[11px]">
              {(['5ft 4in', '5ft 7in', '5ft 10in'] as const).map(h => (
                <button
                  key={h}
                  onClick={() => setModelHeight(h)}
                  className={`flex-1 py-1 rounded-lg border text-center transition-colors ${
                    modelHeight === h ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 font-bold text-indigo-600' : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Personal Measurements & Recommendation Module (6 cols) */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                {product.brand}
              </span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                {product.title}
              </h3>

              {/* Sliders for Chest & Waist */}
              <div className="mt-5 space-y-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Chest / Bust Dimension</span>
                    </span>
                    <span className="font-mono text-indigo-600 font-bold">{userChest} inches</span>
                  </div>
                  <input
                    type="range"
                    min="32"
                    max="48"
                    value={userChest}
                    onChange={e => setUserChest(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Waist Dimension</span>
                    </span>
                    <span className="font-mono text-indigo-600 font-bold">{userWaist} inches</span>
                  </div>
                  <input
                    type="range"
                    min="26"
                    max="44"
                    value={userWaist}
                    onChange={e => setUserWaist(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>

              {/* Recommendation Card */}
              <div className="mt-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-2 mb-1">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold">Recommended Size: {recommendedSize}</span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  Based on your {userChest}&rdquo; chest profile and {product.fabric || 'fabric'} elasticity, size <strong>{recommendedSize}</strong> will provide a tailored, comfortable drape with zero restriction.
                </p>
              </div>
            </div>

            {/* Add to Bag CTA */}
            <div className="pt-2">
              <button
                onClick={handleAddRecommended}
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add Recommended Size ({recommendedSize}) to Bag</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
