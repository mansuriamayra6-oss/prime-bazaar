import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { ProductCard } from './ProductCard';
import { Breadcrumbs } from './Breadcrumbs';
import { matchesProductSearch } from '../utils/productSearch';
import { api } from '../services/api';
import { Product, SponsoredAdHighlight } from '../types';
import {
  buildBreadcrumbs,
  findDepartmentById,
  matchesCategoryAndSubcategory,
} from '../data/categories';
import {
  SlidersHorizontal,
  ArrowUpDown,
  X,
  RotateCcw,
  Heart,
  Sparkles,
  Clock,
  AlertTriangle,
  RefreshCw,
  Store,
  Layers,
  Star,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Tv,
  Home,
  ShoppingBasket,
  Shirt,
} from 'lucide-react';

const PAGE_SIZE = 12;

export const ProductCatalog: React.FC = () => {
  const {
    products,
    sellers,
    user,
    selectedCategory,
    selectedSubcategory,
    navigateCategory,
    discoveryTab,
    setDiscoveryTab,
    searchQuery,
    setSearchQuery,
    wishlist,
    recentlyViewedProducts,
    setSelectedProduct,
    openSellerStore,
    formatPrice,
    isCatalogLoading,
    catalogError,
    retryCatalogSync,
    categories,
  } = useMarketplace();

  // Filter states
  const [sortBy, setSortBy] = useState<'trending' | 'price-low' | 'price-high' | 'rating' | 'discount'>(
    'trending'
  );
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [minRating, setMinRating] = useState<number>(0);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [codOnly, setCodOnly] = useState<boolean>(false);
  const [showWishlistOnly, setShowWishlistOnly] = useState<boolean>(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);
  const [selectedAttribute, setSelectedAttribute] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Personalized recommendations from backend API (co-occurrence / privacy-aware)
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [recommendationsOptOut, setRecommendationsOptOut] = useState<boolean>(false);

  useEffect(() => {
    setSelectedAttribute(null);
    setCurrentPage(1);
  }, [selectedCategory, selectedSubcategory, discoveryTab, searchQuery]);

  useEffect(() => {
    let cancelled = false;
    api.discovery
      .recommendations({ userId: user?.id })
      .then(res => {
        if (cancelled) return;
        if (res?.personalizationOn === false) {
          setRecommendationsOptOut(true);
          setRecommendedProducts([]);
          return;
        }
        setRecommendationsOptOut(false);
        const rawList: any[] = res?.personalized || res?.recommendations || [];
        if (Array.isArray(rawList) && rawList.length > 0) {
          const idSet = new Set(rawList.map(r => r.id || r.productId).filter(Boolean));
          const resolved = products.filter(p => idSet.has(p.id));
          setRecommendedProducts(resolved.length > 0 ? resolved.slice(0, 6) : []);
        }
      })
      .catch(() => {
        // Offline / graceful fallback
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, products.length]);

  const fallbackRecommended = useMemo(() => {
    if (recommendationsOptOut) return [];
    if (recommendedProducts.length > 0) return recommendedProducts;
    return [...products]
      .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
      .slice(0, 6);
  }, [recommendedProducts, recommendationsOptOut, products]);

  const [sponsoredAds, setSponsoredAds] = useState<SponsoredAdHighlight[]>([]);
  const impressedAdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const loadAds = async () => {
      try {
        const res = await api.cms.getSponsoredAds({
          placement: 'SEARCH_TOP',
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          q: searchQuery || undefined,
          limit: 3,
        });
        if (cancelled) return;
        const list = (res.sponsored || []) as SponsoredAdHighlight[];
        setSponsoredAds(list);
        for (const ad of list) {
          const key = `${ad.campaignId}:${ad.product.id}`;
          if (!impressedAdsRef.current.has(key)) {
            impressedAdsRef.current.add(key);
            api.cms
              .recordAdEvent({
                campaignId: ad.campaignId,
                productId: ad.product.id,
                eventType: 'IMPRESSION',
              })
              .catch(() => undefined);
          }
        }
      } catch {
        if (!cancelled) setSponsoredAds([]);
      }
    };
    loadAds();
    return () => {
      cancelled = true;
    };
  }, [selectedCategory, searchQuery]);

  const handleSponsoredClick = (ad: SponsoredAdHighlight) => {
    api.cms
      .recordAdEvent({
        campaignId: ad.campaignId,
        productId: ad.product.id,
        eventType: 'CLICK',
      })
      .catch(() => undefined);
    const matched = products.find(p => p.id === ad.product.id);
    if (matched) {
      setSelectedProduct(matched);
    }
  };

  // Dynamic facet extraction from real products
  const availableBrands = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (!p.brand) continue;
      counts.set(p.brand, (counts.get(p.brand) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [products]);

  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      for (const s of p.sizes || []) {
        if (s.available && s.size) set.add(s.size);
      }
    }
    return Array.from(set).slice(0, 10);
  }, [products]);

  const availableColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      for (const c of p.colors || []) {
        if (c.name && !map.has(c.name)) {
          map.set(c.name, c.hex || '#64748B');
        }
      }
    }
    return Array.from(map.entries()).slice(0, 10);
  }, [products]);

  const popularKeywords = [
    'Raw Silk Kurti',
    'Cargo Jacket',
    'Chanderi Saree',
    'Platform Sneakers',
    'Kundan Choker',
    'Vegan Tote',
  ];

  const activeDepartment = useMemo(
    () => (selectedCategory !== 'all' ? findDepartmentById(selectedCategory, categories) : undefined),
    [selectedCategory, categories]
  );

  const breadcrumbItems = useMemo(
    () =>
      buildBreadcrumbs({
        selectedCategory,
        selectedSubcategory,
        searchQuery,
        departments: categories,
      }),
    [selectedCategory, selectedSubcategory, searchQuery, categories]
  );

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        if (showWishlistOnly && !wishlist.includes(p.id)) return false;

        if (discoveryTab === 'trending' && !p.isTrending) return false;
        if (discoveryTab === 'new' && !p.isNew) return false;
        if (discoveryTab === 'bestsellers' && !p.isBestSeller) return false;
        if (discoveryTab === 'flash' && p.discountPercent < 50) return false;
        if (discoveryTab === 'deals' && p.discountPercent < 40) return false;

        if (!matchesCategoryAndSubcategory(p, selectedCategory, selectedSubcategory, categories)) {
          return false;
        }

        if (selectedAttribute) {
          const corpus = [p.title, p.description, p.fabric, p.fit, p.warrantyPolicy, p.subcategory]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!corpus.includes(selectedAttribute.toLowerCase())) {
            return false;
          }
        }

        if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) return false;
        if (
          selectedSize &&
          !(p.sizes || []).some(s => s.available && s.size === selectedSize)
        ) {
          return false;
        }
        if (
          selectedColor &&
          !(p.colors || []).some(c => c.name === selectedColor)
        ) {
          return false;
        }
        if (inStockOnly && Number(p.inStock ?? 0) <= 0 && !(p.sizes || []).some(s => s.available)) {
          return false;
        }

        if (!matchesProductSearch(p, searchQuery)) return false;
        if (p.price > maxPrice) return false;
        if (minRating > 0 && p.rating < minRating) return false;
        if (minDiscount > 0 && p.discountPercent < minDiscount) return false;
        if (codOnly && !p.codAvailable) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'discount') return b.discountPercent - a.discountPercent;
        return (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0);
      });
  }, [
    products,
    categories,
    selectedCategory,
    selectedSubcategory,
    selectedAttribute,
    selectedBrands,
    selectedSize,
    selectedColor,
    inStockOnly,
    searchQuery,
    maxPrice,
    minRating,
    minDiscount,
    codOnly,
    sortBy,
    showWishlistOnly,
    wishlist,
    discoveryTab,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, safePage]);

  const activeFiltersCount =
    (maxPrice < 5000 ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (minDiscount > 0 ? 1 : 0) +
    selectedBrands.length +
    (selectedSize ? 1 : 0) +
    (selectedColor ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (codOnly ? 1 : 0) +
    (showWishlistOnly ? 1 : 0) +
    (selectedAttribute ? 1 : 0) +
    (discoveryTab !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setMaxPrice(5000);
    setMinRating(0);
    setMinDiscount(0);
    setSelectedBrands([]);
    setSelectedSize(null);
    setSelectedColor(null);
    setInStockOnly(false);
    setCodOnly(false);
    setShowWishlistOnly(false);
    setSelectedAttribute(null);
    setDiscoveryTab('all');
    setSortBy('trending');
    setSearchQuery('');
    setCurrentPage(1);
    navigateCategory('all', null);
  };

  const toggleBrand = (brand: string) => {
    setCurrentPage(1);
    setSelectedBrands(prev =>
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const sectionHeading = showWishlistOnly
    ? 'Saved in Wishlist'
    : activeDepartment
    ? activeDepartment.label
    : selectedCategory === 'fashion'
    ? 'Fashion Collections'
    : discoveryTab === 'new'
    ? 'New Arrivals'
    : discoveryTab === 'flash'
    ? 'Flash Deals (50%+ Off)'
    : discoveryTab === 'deals'
    ? "Today's Deals (40%+ Off)"
    : discoveryTab === 'bestsellers'
    ? 'Best Sellers'
    : discoveryTab === 'trending'
    ? 'Top-Rated & Trending'
    : 'All Marketplace Products';

  const isDefaultHomeView =
    selectedCategory === 'all' &&
    !searchQuery.trim() &&
    discoveryTab === 'all' &&
    !showWishlistOnly;

  const renderFilterSidebarContent = () => (
    <div className="space-y-5 text-xs">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-zinc-800">
        <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 font-display">
          <SlidersHorizontal className="w-4 h-4 text-orange-500" />
          <span>Refine Results</span>
        </span>
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] font-bold text-orange-600 hover:underline flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Price Range */}
      <div className="space-y-2">
        <div className="flex items-center justify-between font-bold text-slate-800 dark:text-zinc-200">
          <span>Max Price</span>
          <span className="font-mono text-orange-600 dark:text-orange-400 tabular-nums">
            {formatPrice(maxPrice)}
          </span>
        </div>
        <input
          type="range"
          min="500"
          max="5000"
          step="100"
          value={maxPrice}
          onChange={e => {
            setCurrentPage(1);
            setMaxPrice(parseInt(e.target.value, 10));
          }}
          className="w-full accent-orange-600 cursor-pointer"
        />
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {[999, 1999, 3499, 5000].map(cap => (
            <button
              key={cap}
              type="button"
              onClick={() => {
                setCurrentPage(1);
                setMaxPrice(cap);
              }}
              className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                maxPrice === cap
                  ? 'bg-[#0F172A] text-white border-[#0F172A] dark:bg-orange-600 dark:border-orange-600'
                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300'
              }`}
            >
              {cap === 5000 ? 'All' : `≤ ₹${cap.toLocaleString('en-IN')}`}
            </button>
          ))}
        </div>
      </div>

      {/* Availability & Delivery */}
      <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
        <p className="font-bold text-slate-800 dark:text-zinc-200">Availability &amp; Delivery</p>
        <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={e => {
              setCurrentPage(1);
              setInStockOnly(e.target.checked);
            }}
            className="rounded accent-orange-600 w-4 h-4 cursor-pointer"
          />
          <span>In Stock Only</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={codOnly}
            onChange={e => {
              setCurrentPage(1);
              setCodOnly(e.target.checked);
            }}
            className="rounded accent-orange-600 w-4 h-4 cursor-pointer"
          />
          <span>Cash on Delivery (COD)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={showWishlistOnly}
            onChange={e => {
              setCurrentPage(1);
              setShowWishlistOnly(e.target.checked);
            }}
            className="rounded accent-orange-600 w-4 h-4 cursor-pointer"
          />
          <span>Saved in Wishlist ({wishlist.length})</span>
        </label>
      </div>

      {/* Brands */}
      {availableBrands.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
          <p className="font-bold text-slate-800 dark:text-zinc-200">Brands &amp; Studios</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {availableBrands.map(([brand, count]) => (
              <label
                key={brand}
                className="flex items-center justify-between gap-2 cursor-pointer text-slate-700 dark:text-zinc-300 hover:text-orange-600"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => toggleBrand(brand)}
                    className="rounded accent-orange-600 w-3.5 h-3.5 cursor-pointer shrink-0"
                  />
                  <span className="truncate">{brand}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 tabular-nums">{count}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Size Filter */}
      {availableSizes.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
          <p className="font-bold text-slate-800 dark:text-zinc-200">Size</p>
          <div className="flex flex-wrap gap-1.5">
            {availableSizes.map(size => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setCurrentPage(1);
                  setSelectedSize(selectedSize === size ? null : size);
                }}
                className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors ${
                  selectedSize === size
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color Filter */}
      {availableColors.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
          <p className="font-bold text-slate-800 dark:text-zinc-200">Color</p>
          <div className="flex flex-wrap gap-1.5">
            {availableColors.map(([name, hex]) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setCurrentPage(1);
                  setSelectedColor(selectedColor === name ? null : name);
                }}
                title={name}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] border transition-colors ${
                  selectedColor === name
                    ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 font-bold'
                    : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
                  style={{ backgroundColor: hex }}
                />
                <span className="truncate max-w-[75px]">{name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Customer Rating */}
      <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
        <p className="font-bold text-slate-800 dark:text-zinc-200">Customer Rating</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[0, 4, 4.5, 4.8].map(r => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setCurrentPage(1);
                setMinRating(r);
              }}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border flex items-center justify-center gap-1 transition-colors ${
                minRating === r
                  ? 'bg-[#0F172A] text-white border-[#0F172A] dark:bg-orange-600 dark:border-orange-600'
                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300'
              }`}
            >
              {r === 0 ? (
                'All Ratings'
              ) : (
                <>
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>{r}+</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Discount */}
      <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
        <p className="font-bold text-slate-800 dark:text-zinc-200">Minimum Discount</p>
        <div className="flex flex-wrap gap-1.5">
          {[0, 30, 50, 60].map(d => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setCurrentPage(1);
                setMinDiscount(d);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                minDiscount === d
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300'
              }`}
            >
              {d === 0 ? 'Any' : `${d}%+`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <section id="catalog-section" className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 space-y-5">
      {/* Homepage Curated Discovery Shelves (shown on main home view using real data) */}
      {isDefaultHomeView && (
        <div className="space-y-5">
          {/* Shop Department Collections: Fashion, Electronics, Home & Kitchen, Grocery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                id: 'fashion',
                title: 'Fashion Collections',
                desc: "Women's, Men's, Kids Wear & Footwear",
                tag: 'Primary Launch',
                icon: Shirt,
                bg: 'bg-rose-50 dark:bg-rose-950/25 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300',
              },
              {
                id: 'electronics',
                title: 'Electronics Collections',
                desc: 'Audio, Phones, Laptops & Smart Accessories',
                tag: 'Tech Deals',
                icon: Tv,
                bg: 'bg-sky-50 dark:bg-sky-950/25 border-sky-200 dark:border-sky-900/40 text-sky-700 dark:text-sky-300',
              },
              {
                id: 'home-kitchen',
                title: 'Home & Kitchen',
                desc: 'Cookware, Decor, Lighting & Organization',
                tag: 'Everyday Home',
                icon: Home,
                bg: 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300',
              },
              {
                id: 'grocery',
                title: 'Grocery & Gourmet',
                desc: 'Pantry Staples, Coffee, Dry Fruits & Snacks',
                tag: 'Daily Essentials',
                icon: ShoppingBasket,
                bg: 'bg-amber-50 dark:bg-amber-950/25 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-300',
              },
            ].map(col => {
              const Icon = col.icon;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => navigateCategory(col.id, null)}
                  className={`p-4 rounded-xl border text-left transition-all hover:shadow-sm flex items-start justify-between gap-3 ${col.bg}`}
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">
                      {col.tag}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display mt-0.5">
                      {col.title}
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-zinc-300 mt-1 line-clamp-2">
                      {col.desc}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-white/80 dark:bg-zinc-900/80 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Recommended For You (API-driven with privacy respect) */}
          {fallbackRecommended.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-display">
                    Recommended For You
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDiscoveryTab('bestsellers')}
                  className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"
                >
                  <span>View Best Sellers</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                {fallbackRecommended.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedProduct(item)}
                    className="group text-left rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 p-2 hover:border-orange-400 transition-all"
                  >
                    <div className="aspect-[4/5] rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-800 mb-2">
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-900 dark:text-zinc-100 line-clamp-1">
                      {item.title}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                        {formatPrice(item.price)}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-amber-600 font-semibold">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        {item.rating}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Brands, Verified Stores & Multi-Seller Comparison Strip */}
          {sellers.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-display">
                    Verified Brand Stores &amp; Multi-Seller Offers
                  </h2>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 hidden sm:inline">
                  Compare sellers &amp; delivery dates on any item
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {sellers.slice(0, 4).map(seller => {
                  const sellerCount = products.filter(p => p.sellerId === seller.id).length;
                  return (
                    <button
                      key={seller.id}
                      type="button"
                      onClick={() => openSellerStore(seller.id)}
                      className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/40 hover:border-orange-400 text-left flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {seller.storeName || seller.businessName}
                          </span>
                          {seller.verified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                          {seller.location || 'Verified Seller'} · {sellerCount} listings
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-[11px] font-bold text-slate-800 dark:text-zinc-100 shrink-0 tabular-nums">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        {seller.rating}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Breadcrumbs */}
      {breadcrumbItems.length > 1 && (
        <Breadcrumbs
          items={breadcrumbItems}
          onNavigate={(catId, subId) => {
            setSearchQuery('');
            navigateCategory(catId, subId ?? null);
          }}
        />
      )}

      {/* Category Banner */}
      {activeDepartment && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              {activeDepartment.sector || 'Marketplace Department'}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-display">
              {activeDepartment.promoTitle || activeDepartment.label}
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              {activeDepartment.seoDescription || activeDepartment.tagline}
            </p>
          </div>
          {activeDepartment.bannerUrl && (
            <img
              src={activeDepartment.bannerUrl}
              alt={activeDepartment.label}
              className="w-full sm:w-36 h-16 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-zinc-700"
            />
          )}
        </div>
      )}

      {/* Subcategory Chips */}
      {activeDepartment && activeDepartment.subcategories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => navigateCategory(activeDepartment.id, null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors ${
              !selectedSubcategory
                ? 'bg-[#0F172A] text-white border-[#0F172A] dark:bg-orange-600 dark:border-orange-600'
                : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
            }`}
          >
            All {activeDepartment.label}
          </button>
          {activeDepartment.subcategories.map(sub => (
            <button
              key={sub.id}
              type="button"
              onClick={() => navigateCategory(activeDepartment.id, sub.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                selectedSubcategory === sub.id
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* Attribute Filters */}
      {activeDepartment && activeDepartment.attributes && activeDepartment.attributes.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-[11px]">
          {activeDepartment.attributes.map(attr => (
            <div key={attr.key} className="flex items-center gap-1.5 shrink-0">
              <span className="font-bold text-slate-500 uppercase">{attr.label}:</span>
              {attr.options.map(opt => {
                const isSelected = selectedAttribute === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSelectedAttribute(isSelected ? null : opt)}
                    className={`px-2.5 py-1 rounded-md border whitespace-nowrap transition-colors ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 font-semibold'
                        : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Segmented Discovery Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-semibold">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'deals', label: "Today's Deals" },
            { id: 'flash', label: 'Flash Deals (50%+)' },
            { id: 'bestsellers', label: 'Best Sellers' },
            { id: 'new', label: 'New Arrivals' },
            { id: 'trending', label: 'Top-Rated & Trending' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDiscoveryTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-all ${
                discoveryTab === tab.id
                  ? 'bg-[#0F172A] text-white dark:bg-orange-600 font-bold'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
          <span className="font-semibold text-slate-400 shrink-0">Popular:</span>
          {popularKeywords.slice(0, 4).map(kw => (
            <button
              key={kw}
              type="button"
              onClick={() => setSearchQuery(kw)}
              className="px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:border-orange-500 text-slate-600 dark:text-zinc-300 whitespace-nowrap shrink-0"
            >
              {kw}
            </button>
          ))}
        </div>
      </div>

      {/* Sponsored Products Shelf */}
      {sponsoredAds.length > 0 && !showWishlistOnly && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-orange-500" />
              <span>Sponsored Products</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
              Sponsored
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {sponsoredAds.map(ad => (
              <button
                key={`${ad.campaignId}-${ad.product.id}`}
                type="button"
                onClick={() => handleSponsoredClick(ad)}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-orange-400 text-left transition-colors"
              >
                <img
                  src={ad.product.image}
                  alt={ad.product.title}
                  referrerPolicy="no-referrer"
                  className="w-14 h-16 rounded-md object-cover shrink-0 bg-slate-100"
                />
                <div className="min-w-0 flex-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase truncate">
                      {ad.product.brand}
                    </span>
                    <span className="text-[10px] font-bold text-orange-600 shrink-0">
                      {ad.label || 'Sponsored'}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white truncate mt-0.5">
                    {ad.product.title}
                  </p>
                  <div className="flex items-baseline gap-2 mt-1 font-mono tabular-nums">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatPrice(ad.product.price)}
                    </span>
                    {ad.product.mrp > ad.product.price && (
                      <span className="text-[10px] text-slate-400 line-through">
                        {formatPrice(ad.product.mrp)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Catalog Sync Alert */}
      {catalogError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{catalogError}</span>
          </div>
          <button
            type="button"
            onClick={() => retryCatalogSync()}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Sync</span>
          </button>
        </div>
      )}

      {/* Main 2-Column Marketplace Grid: Left Sidebar Filters (Desktop) + Product Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Desktop Left Filter Sidebar */}
        <aside
          aria-label="Product filters"
          className="hidden lg:block lg:col-span-3 sticky top-28 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800"
        >
          {renderFilterSidebarContent()}
        </aside>

        {/* Main Listing Column */}
        <div className="lg:col-span-9 space-y-4">
          {/* Header, Count & Sort Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-zinc-800">
            <div>
              <h2 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
                {sectionHeading}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 tabular-nums">
                Showing{' '}
                <span className="font-bold text-slate-900 dark:text-white">
                  {filteredProducts.length}
                </span>{' '}
                {showWishlistOnly ? 'saved items' : 'results'}
                {searchQuery && <span> for &ldquo;{searchQuery}&rdquo;</span>}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
                <span>Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowWishlistOnly(!showWishlistOnly)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  showWishlistOnly
                    ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${showWishlistOnly ? 'fill-rose-600 text-rose-600' : ''}`} />
                <span>Wishlist ({wishlist.length})</span>
              </button>

              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  aria-label="Sort products"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-transparent text-slate-800 dark:text-zinc-200 focus:outline-none cursor-pointer font-semibold"
                >
                  <option value="trending" className="dark:bg-zinc-900">Sort: Relevance &amp; Trending</option>
                  <option value="price-low" className="dark:bg-zinc-900">Price: Low to High</option>
                  <option value="price-high" className="dark:bg-zinc-900">Price: High to Low</option>
                  <option value="rating" className="dark:bg-zinc-900">Customer Rating</option>
                  <option value="discount" className="dark:bg-zinc-900">Biggest Discount %</option>
                </select>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {isCatalogLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/5] bg-slate-200 dark:bg-zinc-800" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 w-1/3 bg-slate-200 dark:bg-zinc-800 rounded" />
                    <div className="h-4 w-5/6 bg-slate-200 dark:bg-zinc-800 rounded" />
                    <div className="h-8 w-full bg-slate-200 dark:bg-zinc-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : paginatedProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {paginatedProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-zinc-800 text-xs">
                  <span className="text-slate-500 dark:text-zinc-400 tabular-nums">
                    Page <strong className="text-slate-900 dark:text-white">{safePage}</strong> of{' '}
                    <strong className="text-slate-900 dark:text-white">{totalPages}</strong> ({filteredProducts.length} items)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 disabled:opacity-40 font-semibold flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg font-bold tabular-nums ${
                            safePage === pageNum
                              ? 'bg-[#0F172A] text-white dark:bg-orange-600'
                              : 'border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 disabled:opacity-40 font-semibold flex items-center gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="my-8 py-12 px-4 text-center max-w-md mx-auto rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 mb-3">
                <X className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No products match these filters
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                {activeDepartment
                  ? `${activeDepartment.label} is active in our 34-department catalog. Clear active filters or browse live Fashion drops below.`
                  : 'Try broadening your price cap, brand filters, or search keyword.'}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Slide-Over Filter Drawer */}
      {isMobileFilterOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filter products"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end lg:hidden animate-fadeIn"
          onClick={() => setIsMobileFilterOpen(false)}
        >
          <div
            className="w-full max-w-xs bg-white dark:bg-zinc-900 h-full flex flex-col border-l border-slate-200 dark:border-zinc-800 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-[#0F172A] text-white flex items-center justify-between">
              <span className="text-sm font-bold font-display">Filters</span>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                aria-label="Close filters"
                className="p-2 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{renderFilterSidebarContent()}</div>
            <div className="p-3 border-t border-slate-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full py-2.5 rounded-lg bg-orange-600 text-white text-xs font-bold"
              >
                Show {filteredProducts.length} Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recently Viewed Products */}
      {recentlyViewedProducts.length > 0 && (
        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Recently Viewed Products
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-zinc-400 tabular-nums">
              {recentlyViewedProducts.length} viewed
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {recentlyViewedProducts.slice(0, 8).map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedProduct(item)}
                className="w-40 sm:w-44 shrink-0 text-left rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden hover:border-orange-400 transition-all group"
              >
                <div className="aspect-[4/5] bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-2.5">
                  <p className="text-[11px] font-semibold text-slate-900 dark:text-zinc-100 truncate">
                    {item.title}
                  </p>
                  <p className="text-xs font-bold text-orange-600 dark:text-orange-400 font-mono tabular-nums mt-0.5">
                    {formatPrice(item.price)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
