import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { api } from '../services/api';
import { captureOrSelectPhoto } from '../utils/nativeBridge';
import { Product } from '../types';
import { X, Upload, Sparkles, CheckCircle2, ArrowRight, Camera } from 'lucide-react';

export const VisualSearchModal: React.FC = () => {
  const { isVisualSearchOpen, setIsVisualSearchOpen, products, setSelectedProduct, formatPrice, notify } =
    useMarketplace();

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchedProducts, setMatchedProducts] = useState<Product[]>([]);
  const [detectedTags, setDetectedTags] = useState<string[]>([]);
  const [analysisMeta, setAnalysisMeta] = useState<{ source?: string; notice?: string; aiUsed?: boolean } | null>(null);

  if (!isVisualSearchOpen) return null;

  const sampleStyles = [
    {
      title: 'Embroidered Kurti',
      image: '/src/assets/images/collection_ethnic_wear_1793466539838.jpg',
      category: 'ethnic',
      tags: ['Silk Fabric', 'Zari Work', 'Royal Blue', 'Festive'],
    },
    {
      title: 'Streetwear Cargo',
      image: '/src/assets/images/collection_streetwear_1793466541088.jpg',
      category: 'streetwear',
      tags: ['Heavyweight Twill', 'Utility Pocket', 'Boxy Cut'],
    },
    {
      title: 'Chunky Sneakers',
      image: '/src/assets/images/collection_footwear_1793466541533.jpg',
      category: 'footwear',
      tags: ['Platform Wave Sole', 'Vegan Leather', 'Neutral White'],
    },
  ];

  const runAnalysis = async (params: {
    previewUrl: string;
    imageBase64?: string;
    mimeType?: string;
    categoryGuess?: string;
    customTags?: string[];
  }) => {
    setPreviewImage(params.previewUrl);
    setIsAnalyzing(true);
    setMatchedProducts([]);
    setAnalysisMeta(null);

    try {
      const res = await api.discovery.visualSearch({
        imageBase64: params.imageBase64,
        mimeType: params.mimeType,
        imageUrl: params.previewUrl,
        hintCategory: params.categoryGuess,
        hintKeywords: params.customTags,
      });

      const returnedIds = new Set((res?.matches || []).map((m: any) => m.id));
      const fullMatches =
        returnedIds.size > 0
          ? products.filter((p) => returnedIds.has(p.id))
          : params.categoryGuess
            ? products.filter((p) => p.category === params.categoryGuess)
            : products.slice(0, 4);

      setMatchedProducts(fullMatches.length > 0 ? fullMatches : products.slice(0, 4));
      setDetectedTags(res?.detectedTags || params.customTags || ['Apparel', 'Contemporary Cut']);
      setAnalysisMeta({
        source: res?.source,
        notice: res?.notice,
        aiUsed: Boolean(res?.aiUsed),
      });
    } catch {
      const fallback = params.categoryGuess
        ? products.filter((p) => p.category === params.categoryGuess)
        : products.slice(0, 3);
      setMatchedProducts(fallback);
      setDetectedTags(params.customTags || ['Catalog Visual Match']);
      setAnalysisMeta({
        source: 'CATALOG_MATCH_FALLBACK',
        notice: 'Matched locally using catalog attributes.',
        aiUsed: false,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      runAnalysis({
        previewUrl: dataUrl,
        imageBase64: dataUrl,
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = async () => {
    try {
      const photo = await captureOrSelectPhoto();
      if (!photo?.dataUrl) return;
      runAnalysis({
        previewUrl: photo.dataUrl,
        imageBase64: photo.dataUrl,
        mimeType: photo.mimeType,
      });
    } catch (err: any) {
      notify(err?.message || 'Camera access declined or unavailable. Please upload a photo instead.');
    }
  };

  const handleReset = () => {
    setPreviewImage(null);
    setMatchedProducts([]);
    setDetectedTags([]);
    setAnalysisMeta(null);
    setIsAnalyzing(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
      onClick={() => {
        setIsVisualSearchOpen(false);
        handleReset();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Visual Product Search"
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            setIsVisualSearchOpen(false);
            handleReset();
          }}
          aria-label="Close visual search"
          className="absolute top-4 right-4 p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
              Visual Product Search
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Upload or snap any product photo to find matching items across all 34 categories
            </p>
          </div>
        </div>

        {!previewImage ? (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="sm:col-span-2 border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-rose-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-800/20">
                <Upload className="w-9 h-9 text-rose-600 mb-2" />
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Upload outfit or product photo
                </span>
                <span className="text-xs text-zinc-500 mt-1">PNG, JPG, WebP up to 10MB</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
              <button
                type="button"
                onClick={handleCameraCapture}
                className="border-2 border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-zinc-50/60 dark:bg-zinc-800/30 transition-colors"
              >
                <Camera className="w-9 h-9 text-emerald-600 mb-2" />
                <span className="text-xs font-bold text-zinc-900 dark:text-white">Use Camera</span>
                <span className="text-[10px] text-zinc-500 mt-1">Native or webcam</span>
              </button>
            </div>

            <div>
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-3">
                Or try instant sample looks:
              </span>
              <div className="grid grid-cols-3 gap-3">
                {sampleStyles.map((s) => (
                  <button
                    key={s.title}
                    onClick={() =>
                      runAnalysis({
                        previewUrl: s.image,
                        categoryGuess: s.category,
                        customTags: s.tags,
                      })
                    }
                    className="group relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 text-left transition-all hover:ring-2 hover:ring-rose-500"
                  >
                    <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <img
                        src={s.image}
                        alt={s.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-2 bg-white dark:bg-zinc-900">
                      <span className="text-[11px] font-semibold text-zinc-900 dark:text-white block truncate">
                        {s.title}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 items-center">
              <img
                src={previewImage}
                alt="Visual search preview"
                referrerPolicy="no-referrer"
                className="w-24 h-28 object-cover rounded-xl shadow-xs"
              />
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {analysisMeta?.aiUsed ? 'Gemini Vision Feature Match' : 'Visual Catalog Match'}
                  </span>
                </div>
                {analysisMeta?.notice && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{analysisMeta.notice}</p>
                )}
                <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                  {detectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button onClick={handleReset} className="text-xs text-rose-600 hover:underline font-medium block">
                  Upload different photo
                </button>
              </div>
            </div>

            {isAnalyzing ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mb-3" />
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Matching pattern, silhouette & color attributes...
                </span>
              </div>
            ) : (
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-3">
                  Visually Similar Catalog Items ({matchedProducts.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {matchedProducts.map((p) => (
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
                          <span className="text-xs font-bold font-mono">{formatPrice(p.price)}</span>
                          <span className="text-[10px] text-emerald-600 font-bold font-mono">
                            {p.discountPercent}% off
                          </span>
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
