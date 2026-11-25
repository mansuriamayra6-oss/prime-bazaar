import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { ProductCard } from './ProductCard';
import { Breadcrumbs } from './Breadcrumbs';
import { matchesProductSearch } from '../utils/productSearch';
import { api } from '../services/api';
import { SponsoredAdHighlight } from '../types';
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
} from 'lucide-react';

export const ProductCatalog: React.FC = () => {
  const {
    products,
    selectedCategory,
    selectedSubcategory,
    navigateCategory,
    searchQuery,
    setSearchQuery,
    wishlist,
    recentlyViewedProducts,
    setSelectedProduct,
    formatPrice,
    isCatalogLoading,
    catalogError,
    retryCatalogSync,
    categories,
  } = useMarketplace();

  // Local filter states
  const [discoveryTab, setDiscoveryTab] = useState<
    'all' | 'trending' | 'new' | 'bestsellers' | 'flash' | 'deals'
  >('all');
  const [sortBy, setSortBy] = useState<'trending' | 'price-low' | 'price-high' | 'rating' | 'discount'>(
    'trending'
  );
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [minRating, setMinRating] = useState<number>(0);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [codOnly, setCodOnly] = useState<boolean>(false);
  const [showWishlistOnly, setShowWishlistOnly] = useState<boolean>(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [selectedAttribute, setSelectedAttribute] = useState<string | null>(null);

  useEffect(() => {
    setSelectedAttribute(null);
  }, [selectedCategory, selectedSubcategory]);

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

  const activeFiltersCount =
    (maxPrice < 5000 ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (minDiscount > 0 ? 1 : 0) +
    (codOnly ? 1 : 0) +
    (showWishlistOnly ? 1 : 0) +
    (selectedAttribute ? 1 : 0) +
    (discoveryTab !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setMaxPrice(5000);
    setMinRating(0);
    setMinDiscount(0);
    setCodOnly(false);
    setShowWishlistOnly(false);
    setSelectedAttribute(null);
    setDiscoveryTab('all');
    setSortBy('trending');
    setSearchQuery('');
    navigateCategory('all', null);
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
    ? 'Lightning Flash Deals (50%+ Off)'
    : discoveryTab === 'bestsellers'
    ? 'Best Sellers'
    : 'Featured Fashion & Marketplace Drops';

  return (
    <section id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Hierarchical Breadcrumb Trail */}
      {breadcrumbItems.length > 1 && (
        <div className="mb-3">
          <Breadcrumbs
            items={breadcrumbItems}
            onNavigate={(catId, subId) => {
              setSearchQuery('');
              navigateCategory(catId, subId ?? null);
            }}
          />
        </div>
      )}

      {/* Category Hero Banner & SEO Summary when viewing a specific category */}
      {activeDepartment && (
        <div className="mb-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              {activeDepartment.sector || 'Marketplace Department'}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white font-display">
              {activeDepartment.promoTitle || activeDepartment.label}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {activeDepartment.seoDescription || activeDepartment.tagline}
            </p>
          </div>
          {activeDepartment.bannerUrl && (
            <img
              src={activeDepartment.bannerUrl}
              alt={activeDepartment.label}
              className="w-full sm:w-32 h-16 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
            />
          )}
        </div>
      )}

      {/* Subcategory Filter Bar when browsing a Department */}
      {activeDepartment && activeDepartment.subcategories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-2">
          <button
            type="button"
            onClick={() => navigateCategory(activeDepartment.id, null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors ${
              !selectedSubcategory
                ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            All {activeDepartment.label}
          </button>
          {activeDepartment.subcategories.map(sub => {
            const isSubActive = selectedSubcategory === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => navigateCategory(activeDepartment.id, sub.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                  isSubActive
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {sub.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Category-Specific Attribute Filter Bar */}
      {activeDepartment && activeDepartment.attributes && activeDepartment.attributes.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-2 text-[11px]">
          {activeDepartment.attributes.map(attr => (
            <div key={attr.key} className="flex items-center gap-1.5 shrink-0">
              <span className="font-bold text-zinc-500 uppercase">{attr.label}:</span>
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
                        : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
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

      {/* Discovery Collection Segmented Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-2 border-b border-zinc-100 dark:border-zinc-800 text-xs font-semibold">
        {[
          { id: 'all', label: 'All Items' },
          { id: 'trending', label: 'Trending Now' },
          { id: 'new', label: 'New Arrivals' },
          { id: 'bestsellers', label: 'Best Sellers' },
          { id: 'flash', label: 'Flash Deals (50%+ Off)' },
          { id: 'deals', label: 'Special Offers' },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setDiscoveryTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-all ${
              discoveryTab === tab.id
                ? 'bg-rose-600 text-white shadow-xs font-bold'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trending Searches Strip */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 text-[11px] text-zinc-500">
        <span className="font-semibold text-zinc-500 dark:text-zinc-400 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-rose-500" />
          <span>Trending searches:</span>
        </span>
        {popularKeywords.map(kw => (
          <button
            key={kw}
            type="button"
            onClick={() => setSearchQuery(kw)}
            className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 whitespace-nowrap shrink-0 transition-colors"
          >
            {kw}
          </button>
        ))}
      </div>

      {/* Dedicated Sponsored Highlights Strip (never mixed into organic grid) */}
      {sponsoredAds.length > 0 && !showWishlistOnly && (
        <div className="my-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-900 dark:text-white">Sponsored Highlights</span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Sponsored · Verified Merchants
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {sponsoredAds.map(ad => (
              <button
                key={`${ad.campaignId}-${ad.product.id}`}
                type="button"
                onClick={() => handleSponsoredClick(ad)}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-rose-400 text-left transition-colors"
              >
                <img
                  src={ad.product.image}
                  alt={ad.product.title}
                  referrerPolicy="no-referrer"
                  className="w-14 h-16 rounded-md object-cover shrink-0 bg-zinc-100 dark:bg-zinc-800"
                />
                <div className="min-w-0 flex-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase truncate">
                      {ad.product.brand}
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-500 shrink-0">
                      {ad.label}
                    </span>
                  </div>
                  <p className="font-semibold text-zinc-900 dark:text-white truncate mt-0.5">
                    {ad.product.title}
                  </p>
                  <div className="flex items-baseline gap-2 mt-1 font-mono tabular-nums">
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {formatPrice(ad.product.price)}
                    </span>
                    {ad.product.mrp > ad.product.price && (
                      <span className="text-[10px] text-zinc-400 line-through">
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

      {/* Catalog Error State */}
      {catalogError && (
        <div
          role="alert"
          className="my-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{catalogError}</span>
          </div>
          <button
            type="button"
            onClick={() => retryCatalogSync()}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 self-start sm:self-auto whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Sync</span>
          </button>
        </div>
      )}

      {/* Catalog Header & Filter Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white font-display">
            {sectionHeading}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
            Showing <span className="font-semibold text-zinc-900 dark:text-white">{filteredProducts.length}</span>{' '}
            {showWishlistOnly ? 'saved wishlist items' : 'curated products'}
            {searchQuery && <span> matching &ldquo;{searchQuery}&rdquo;</span>}
          </p>
        </div>

        {/* Filter and Sort triggers */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowWishlistOnly(!showWishlistOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap shrink-0 ${
              showWishlistOnly
                ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${showWishlistOnly ? 'fill-rose-600 text-rose-600' : 'text-zinc-500'}`} />
            <span>Wishlist</span>
            {wishlist.length > 0 && (
              <span className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                ({wishlist.length})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              activeFiltersCount > 0
                ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="text-[11px] font-mono tabular-nums text-rose-600 dark:text-rose-400">
                ({activeFiltersCount})
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <select
              aria-label="Sort products"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer font-medium"
            >
              <option value="trending" className="dark:bg-zinc-900">Trending First</option>
              <option value="price-low" className="dark:bg-zinc-900">Price: Low to High</option>
              <option value="price-high" className="dark:bg-zinc-900">Price: High to Low</option>
              <option value="rating" className="dark:bg-zinc-900">Highest Rated</option>
              <option value="discount" className="dark:bg-zinc-900">Biggest Discount %</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expandable Filter Drawer Panel */}
      {isFilterDrawerOpen && (
        <div className="my-4 p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 animate-fadeIn">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
              <span>Max Price</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                ₹{maxPrice.toLocaleString('en-IN')}
              </span>
            </div>
            <input
              type="range"
              min="500"
              max="5000"
              step="100"
              value={maxPrice}
              onChange={e => setMaxPrice(parseInt(e.target.value, 10))}
              className="w-full accent-rose-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-1 tabular-nums">
              <span>₹500</span>
              <span>₹5,000</span>
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
              Customer Rating
            </span>
            <div className="flex items-center gap-1.5">
              {[0, 4, 4.5, 4.8].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setMinRating(r)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    minRating === r
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {r === 0 ? 'All' : `${r}★+`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
              Minimum Discount
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[0, 30, 50, 60].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setMinDiscount(d)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    minDiscount === d
                      ? 'bg-rose-600 text-white font-semibold'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {d === 0 ? 'Any' : `${d}%+`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
              Payment & Delivery
            </span>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={codOnly}
                onChange={e => setCodOnly(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 accent-rose-600 w-4 h-4 cursor-pointer"
              />
              <span>Cash on Delivery (COD) Only</span>
            </label>
          </div>

          <div className="flex items-end justify-end sm:col-span-2 md:col-span-4">
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton State */}
      {isCatalogLoading ? (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden animate-pulse"
            >
              <div className="aspect-[4/5] bg-zinc-200 dark:bg-zinc-800" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-4 w-5/6 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="my-12 py-12 px-4 text-center max-w-md mx-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="w-12 h-12 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
            <X className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            No items in this view yet
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {activeDepartment
              ? `${activeDepartment.label} is ready for upcoming studio drops. Browse our live fashion edits or reset filters below.`
              : 'Try adjusting your search keywords, price range, or category selection.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 transition-colors"
            >
              Browse All Fashion
            </button>
          </div>
        </div>
      )}

      {/* Recently Viewed Strip (persisted as shopper inspects items) */}
      {recentlyViewedProducts.length > 0 && (
        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-600" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                Recently Viewed Items
              </h3>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {recentlyViewedProducts.length} viewed
            </span>
          </div>
          <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2">
            {recentlyViewedProducts.slice(0, 8).map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedProduct(item)}
                className="w-40 sm:w-44 shrink-0 text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden hover:border-rose-400 transition-all group"
              >
                <div className="aspect-[4/5] bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-2.5">
                  <p className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {item.title}
                  </p>
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums mt-0.5">
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
