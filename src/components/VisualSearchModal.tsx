import React, { useEffect, useRef, useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { api } from '../services/api';
import { captureOrSelectPhoto, validateUploadFile } from '../utils/nativeBridge';
import { Product } from '../types';
import { X, Upload, Sparkles, CheckCircle2, ArrowRight, Camera, ScanBarcode, QrCode, Search } from 'lucide-react';

export const VisualSearchModal: React.FC = () => {
  const { isVisualSearchOpen, setIsVisualSearchOpen, products, setSelectedProduct, formatPrice, notify } =
    useMarketplace();

  const [mode, setMode] = useState<'visual' | 'barcode'>('visual');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchedProducts, setMatchedProducts] = useState<Product[]>([]);
  const [detectedTags, setDetectedTags] = useState<string[]>([]);
  const [analysisMeta, setAnalysisMeta] = useState<{ source?: string; notice?: string; aiUsed?: boolean } | null>(null);

  // Barcode / QR state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<{
    found: boolean;
    code: string;
    product: any | null;
    deepLinkPath: string | null;
    relatedProducts: any[];
  } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  const stopCameraScanner = () => {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!isVisualSearchOpen || mode !== 'barcode') {
      stopCameraScanner();
    }
    return () => stopCameraScanner();
  }, [isVisualSearchOpen, mode]);

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
    const validation = validateUploadFile(file);
    if (!validation.valid) {
      notify(validation.error || 'Invalid image file.');
      return;
    }
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

  const handleLookupBarcode = async (rawCode: string) => {
    const clean = rawCode.trim();
    if (!clean) {
      notify('Enter or scan a barcode (EAN-13 / SKU / QR link).');
      return;
    }
    setBarcodeLoading(true);
    try {
      const res = await api.discovery.barcodeLookup(clean);
      setBarcodeResult({
        found: Boolean(res.found),
        code: res.code || clean,
        product: res.product || null,
        deepLinkPath: res.deepLinkPath || null,
        relatedProducts: Array.isArray(res.relatedProducts) ? res.relatedProducts : [],
      });
      if (res.found) {
        notify(`Matched product via barcode/QR: ${res.product?.title || clean}`);
      } else {
        notify('No exact barcode match found — showing similar products.');
      }
    } catch (err: any) {
      notify(err?.message || 'Barcode lookup failed.');
    } finally {
      setBarcodeLoading(false);
    }
  };

  const startLiveBarcodeCamera = async () => {
    setCameraError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live camera preview unavailable in this browser. Upload a barcode image or enter the code below.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);

      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
      if (BarcodeDetectorCtor) {
        const detector = new BarcodeDetectorCtor({
          formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'qr_code'],
        });
        scanTimerRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes?.length > 0 && codes[0].rawValue) {
              const value = String(codes[0].rawValue);
              stopCameraScanner();
              setBarcodeInput(value);
              handleLookupBarcode(value);
            }
          } catch {
            // continue scanning
          }
        }, 450);
      } else {
        setCameraError('Live camera active. Browser lacks native BarcodeDetector — enter code manually or snap a photo.');
      }
    } catch {
      setCameraError('Camera permission denied or unavailable. Enter barcode/QR code below or upload a photo.');
    }
  };

  const handleBarcodeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateUploadFile(file);
    if (!validation.valid) {
      notify(validation.error || 'Unsupported image format.');
      return;
    }
    const BarcodeDetectorCtor = (window as any).BarcodeDetector;
    if (BarcodeDetectorCtor && typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file);
        const detector = new BarcodeDetectorCtor({
          formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'qr_code'],
        });
        const detected = await detector.detect(bitmap);
        if (detected?.length > 0 && detected[0].rawValue) {
          const val = String(detected[0].rawValue);
          setBarcodeInput(val);
          await handleLookupBarcode(val);
          return;
        }
      } catch {
        // fall through notice
      }
    }
    notify('Could not auto-read barcode from image; please type the digits or QR text below.');
  };

  const handleReset = () => {
    setPreviewImage(null);
    setMatchedProducts([]);
    setDetectedTags([]);
    setAnalysisMeta(null);
    setIsAnalyzing(false);
    setBarcodeResult(null);
    stopCameraScanner();
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
        aria-label="Visual Search, Barcode and QR Scanner"
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => {
            setIsVisualSearchOpen(false);
            handleReset();
          }}
          aria-label="Close visual and barcode search"
          className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4 pr-10">
          <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            {mode === 'visual' ? <Sparkles className="w-4 h-4" /> : <ScanBarcode className="w-4 h-4" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
              {mode === 'visual' ? 'Visual Product Search' : 'Barcode & QR Product Scanner'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {mode === 'visual'
                ? 'Upload or snap any product photo to find matching Fashion & Electronics items'
                : 'Scan EAN-13 retail barcodes, SKU codes, or Prime Bazaar QR deep links'}
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-5" role="tablist" aria-label="Search scanner modes">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'visual'}
            onClick={() => setMode('visual')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'visual'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Photo Visual Search</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'barcode'}
            onClick={() => setMode('barcode')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'barcode'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Barcode &amp; QR Scan</span>
          </button>
        </div>

        {mode === 'barcode' ? (
          <div className="space-y-4">
            {/* Manual / Scanned Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLookupBarcode(barcodeInput);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <ScanBarcode className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  aria-label="Enter barcode, SKU, or QR URL"
                  placeholder="Enter EAN-13 (e.g. 8901030847123), SKU, or QR link..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-mono text-zinc-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={barcodeLoading}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{barcodeLoading ? 'Looking up...' : 'Lookup'}</span>
              </button>
            </form>

            {/* Quick Sample Barcode / QR Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-zinc-500 font-medium">Try code:</span>
              {[
                { label: 'EAN-13: 8901030847123', value: '8901030847123' },
                { label: 'Product ID: prod-1', value: 'prod-1' },
                { label: 'QR Deep Link', value: 'https://primebazaarfashion.in/product/prod-2' },
              ].map((sample) => (
                <button
                  key={sample.value}
                  type="button"
                  onClick={() => {
                    setBarcodeInput(sample.value);
                    handleLookupBarcode(sample.value);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-zinc-200 dark:border-zinc-700 font-mono text-zinc-700 dark:text-zinc-300"
                >
                  {sample.label}
                </button>
              ))}
            </div>

            {/* Camera Live Stream + Upload Photo Barcode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={cameraActive ? stopCameraScanner : startLiveBarcodeCamera}
                className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 hover:border-emerald-500 flex items-center justify-center gap-2 text-xs font-bold text-zinc-900 dark:text-white"
              >
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>{cameraActive ? 'Stop Live Scanner' : 'Open Camera Barcode Scanner'}</span>
              </button>

              <label className="p-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 hover:border-rose-500 flex items-center justify-center gap-2 text-xs font-bold text-zinc-900 dark:text-white cursor-pointer">
                <Upload className="w-4 h-4 text-rose-600" />
                <span>Scan Barcode from Photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleBarcodeImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {cameraActive && (
              <div className="rounded-2xl overflow-hidden border border-emerald-500/40 bg-black aspect-video relative">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-x-12 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              </div>
            )}

            {cameraError && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5">
                {cameraError}
              </p>
            )}

            {barcodeResult && (
              <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                {barcodeResult.product ? (
                  <div
                    onClick={() => {
                      const full =
                        products.find((p) => p.id === barcodeResult.product.id) || barcodeResult.product;
                      setSelectedProduct(full);
                      setIsVisualSearchOpen(false);
                    }}
                    className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all"
                  >
                    <img
                      src={barcodeResult.product.image || barcodeResult.product.images?.[0]}
                      alt={barcodeResult.product.title}
                      className="w-16 h-20 object-cover rounded-xl shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                        Exact Match · {barcodeResult.deepLinkPath || barcodeResult.code}
                      </span>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                        {barcodeResult.product.title}
                      </h3>
                      <span className="text-xs font-mono font-bold text-zinc-900 dark:text-white">
                        {formatPrice(barcodeResult.product.price)}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">
                    No direct SKU/EAN match for <strong className="font-mono">{barcodeResult.code}</strong>. Related catalog items:
                  </p>
                )}

                {barcodeResult.relatedProducts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {barcodeResult.relatedProducts.map((p: any) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          const full = products.find((item) => item.id === p.id);
                          if (full) setSelectedProduct(full);
                          setIsVisualSearchOpen(false);
                        }}
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-emerald-500"
                      >
                        <img
                          src={p.image || p.images?.[0]}
                          alt={p.title}
                          className="w-12 h-14 object-cover rounded-lg shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-white block truncate">
                            {p.title}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-emerald-600">
                            {formatPrice(p.price)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : !previewImage ? (
          <div className="mt-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="sm:col-span-2 border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-rose-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-800/20">
                <Upload className="w-9 h-9 text-rose-600 mb-2" />
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Upload outfit or product photo
                </span>
                <span className="text-xs text-zinc-500 mt-1">JPG, PNG, WebP up to 5MB</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileUpload} className="hidden" />
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
                    type="button"
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
          <div className="mt-4 space-y-5">
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
                <button type="button" onClick={handleReset} className="text-xs text-rose-600 hover:underline font-medium block">
                  Upload different photo
                </button>
              </div>
            </div>

            {isAnalyzing ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mb-3" />
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Matching pattern, silhouette &amp; color attributes...
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
