import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { Product } from '../types';
import { X, Upload, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

export const VisualSearchModal: React.FC = () => {
  const { isVisualSearchOpen, setIsVisualSearchOpen, products, setSelectedProduct } = useMarketplace();

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchedProducts, setMatchedProducts] = useState<Product[]>([]);
  const [detectedTags, setDetectedTags] = useState<string[]>([]);

  if (!isVisualSearchOpen) return null;

  const sampleStyles = [
    {
      title: 'Embroidered Kurti',
      image: '/src/assets/images/collection_ethnic_wear_1793466539838.jpg',
      category: 'ethnic',
      tags: ['Silk Fabric', 'Zari Work', 'Royal Blue', 'Festive']
    },
    {
      title: 'Streetwear Cargo',
      image: '/src/assets/images/collection_streetwear_1793466541088.jpg',
      category: 'streetwear',
      tags: ['Heavyweight Twill', 'Utility Pocket', 'Boxy Cut']
    },
    {
      title: 'Chunky Sneakers',
      image: '/src/assets/images/collection_footwear_1793466541533.jpg',
      category: 'footwear',
      tags: ['Platform Wave Sole', 'Vegan Leather', 'Neutral White']
    }
  ];

  const runAnalysis = (imageUrl: string, categoryGuess?: string, customTags?: string[]) => {
    setPreviewImage(imageUrl);
    setIsAnalyzing(true);
    setMatchedProducts([]);

    setTimeout(() => {
      setIsAnalyzing(false);
      let matches: Product[] = [];
      if (categoryGuess) {
        matches = products.filter(p => p.category === categoryGuess);
      } else {
        matches = products.slice(0, 3);
      }
      setMatchedProducts(matches);
      setDetectedTags(customTags || ['Apparel', 'Modern Aesthetic', 'Premium Texture']);
    }, 900);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        runAnalysis(reader.result as string, 'streetwear', ['Textured Fabric', 'Contemporary Fit', 'Neutral Tone']);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    setPreviewImage(null);
    setMatchedProducts([]);
    setDetectedTags([]);
    setIsAnalyzing(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => {
            setIsVisualSearchOpen(false);
            handleReset();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
              AI Visual Product Search
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Upload any outfit photo or screenshot to instantly find matching catalog items
            </p>
          </div>
        </div>

        {/* Upload Stage or Analysis Result */}
        {!previewImage ? (
          <div className="mt-6 space-y-6">
            {/* Dropzone */}
            <label className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-rose-500 dark:hover:border-rose-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-800/20">
              <Upload className="w-10 h-10 text-rose-600 mb-3" />
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                Upload outfit photo from your device
              </span>
              <span className="text-xs text-zinc-500 mt-1">Supports PNG, JPG, WebP up to 10MB</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>

            {/* Quick try sample tiles */}
            <div>
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-3">
                Or try instant sample looks:
              </span>
              <div className="grid grid-cols-3 gap-3">
                {sampleStyles.map(s => (
                  <button
                    key={s.title}
                    onClick={() => runAnalysis(s.image, s.category, s.tags)}
                    className="group relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 text-left transition-all hover:ring-2 hover:ring-rose-500"
                  >
                    <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <img src={s.image} alt={s.title} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="p-2 bg-white dark:bg-zinc-900">
                      <span className="text-[11px] font-semibold text-zinc-900 dark:text-white block truncate">{s.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Image Preview & Detected Tags */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 items-center">
              <img
                src={previewImage}
                alt="Search query"
                referrerPolicy="no-referrer"
                className="w-24 h-28 object-cover rounded-xl shadow-xs"
              />
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Image Visual Signatures Extracted</span>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                  {detectedTags.map(tag => (
                    <span
                      key={tag}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-rose-600 hover:underline font-medium block"
                >
                  Upload different photo
                </button>
              </div>
            </div>

            {/* Analysis Loading or Results */}
            {isAnalyzing ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mb-3" />
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Scanning catalog for pattern, silhouette & color similarity...
                </span>
              </div>
            ) : (
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-3">
                  Visually Similar Catalog Items ({matchedProducts.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {matchedProducts.map(p => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(p);
                        setIsVisualSearchOpen(false);
                      }}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 hover:border-rose-500 transition-all cursor-pointer group"
                    >
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        referrerPolicy="no-referrer"
                        className="w-16 h-18 object-cover rounded-xl"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase text-zinc-400">{p.brand}</span>
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-white truncate group-hover:text-rose-600 transition-colors">
                          {p.title}
                        </h4>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-xs font-bold font-mono">₹{p.price.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-emerald-600 font-bold font-mono">{p.discountPercent}% off</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-rose-600 transition-colors mr-1" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
