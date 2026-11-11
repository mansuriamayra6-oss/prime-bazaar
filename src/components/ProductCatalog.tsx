import React, { useState, useMemo } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { ProductCard } from './ProductCard';
import { SlidersHorizontal, ArrowUpDown, X, RotateCcw, Heart } from 'lucide-react';

export const ProductCatalog: React.FC = () => {
  const { products, selectedCategory, searchQuery, setSearchQuery, wishlist } = useMarketplace();

  // Local filter states
  const [discoveryTab, setDiscoveryTab] = useState<'all' | 'trending' | 'flash' | 'bestsellers' | 'deals' | 'group'>('all');
  const [sortBy, setSortBy] = useState<'trending' | 'price-low' | 'price-high' | 'rating' | 'discount'>('trending');
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [minRating, setMinRating] = useState<number>(0);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [codOnly, setCodOnly] = useState<boolean>(false);
  const [showWishlistOnly, setShowWishlistOnly] = useState<boolean>(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);

  // Quick search keywords
  const popularKeywords = ['Raw Silk Kurti', 'Cargo Jacket', 'ANC Earbuds', 'Kundan Jewellery', 'Saffron Serum', 'Yoga Mat'];

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Wishlist only filter
      if (showWishlistOnly && !wishlist.includes(p.id)) {
        return false;
      }
      // Discovery sub-tab filter
      if (discoveryTab === 'trending' && !p.isTrending) return false;
      if (discoveryTab === 'bestsellers' && !p.isBestSeller) return false;
      if (discoveryTab === 'flash' && p.discountPercent < 50) return false;
      if (discoveryTab === 'deals' && p.discountPercent < 40) return false;
      if (discoveryTab === 'group' && p.price < 1000) return false;

      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'fashion') {
          if (p.category !== 'ethnic' && p.category !== 'streetwear' && p.category !== 'western' && p.category !== 'fashion') {
            return false;
          }
        } else if (p.category !== selectedCategory) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesBrand = p.brand.toLowerCase().includes(query);
        const matchesDesc = p.description.toLowerCase().includes(query);
        if (!matchesTitle && !matchesBrand && !matchesDesc) {
          return false;
        }
      }
      // Price
      if (p.price > maxPrice) {
        return false;
      }
      // Rating
      if (minRating > 0 && p.rating < minRating) {
        return false;
      }
      // Min Discount
      if (minDiscount > 0 && p.discountPercent < minDiscount) {
        return false;
      }
      // COD
      if (codOnly && !p.codAvailable) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'discount') return b.discountPercent - a.discountPercent;
      // Default trending
      return (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0);
    });
  }, [products, selectedCategory, searchQuery, maxPrice, minRating, minDiscount, codOnly, sortBy, showWishlistOnly, wishlist, discoveryTab]);

  const activeFiltersCount = (maxPrice < 5000 ? 1 : 0) + (minRating > 0 ? 1 : 0) + (minDiscount > 0 ? 1 : 0) + (codOnly ? 1 : 0) + (showWishlistOnly ? 1 : 0) + (discoveryTab !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setMaxPrice(5000);
    setMinRating(0);
    setMinDiscount(0);
    setCodOnly(false);
    setShowWishlistOnly(false);
    setDiscoveryTab('all');
    setSortBy('trending');
    setSearchQuery('');
  };

  return (
    <section id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Quick Discovery Segmented Tabs (Section B) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-2 border-b border-zinc-100 dark:border-zinc-800 text-xs font-semibold">
        {[
          { id: 'all', label: '🌟 All Items' },
          { id: 'trending', label: '🔥 Trending' },
          { id: 'flash', label: '⚡ Flash Sale (50%+ Off)' },
          { id: 'bestsellers', label: '⭐ Best Sellers' },
          { id: 'deals', label: "🏷️ Today's Deals" },
          { id: 'group', label: '👥 Group Buying' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setDiscoveryTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all shrink-0 ${
              discoveryTab === tab.id
                ? 'bg-rose-600 text-white shadow-xs font-bold'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Popular Search Suggestions (Section D) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 text-[11px] text-zinc-500">
        <span className="font-semibold text-zinc-400 shrink-0">Popular:</span>
        {popularKeywords.map(kw => (
          <button
            key={kw}
            onClick={() => setSearchQuery(kw)}
            className="px-2.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 whitespace-nowrap transition-colors"
          >
            {kw}
          </button>
        ))}
      </div>

      {/* Catalog Header & Filter Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white font-display">
            {showWishlistOnly 
              ? 'Saved in Wishlist' 
              : discoveryTab === 'flash'
                ? '⚡ Lightning Flash Sale Drops'
                : selectedCategory === 'all' 
                  ? 'All Collections' 
                  : `${selectedCategory.toUpperCase()} COLLECTION`}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Showing <span className="font-semibold text-zinc-900 dark:text-white">{filteredProducts.length}</span> {showWishlistOnly ? 'saved wishlist items' : 'curated products'}
            {searchQuery && <span> matching &ldquo;{searchQuery}&rdquo;</span>}
          </p>
        </div>

        {/* Filter and Sort triggers */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Wishlist quick toggle */}
          <button
            onClick={() => setShowWishlistOnly(!showWishlistOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
              showWishlistOnly
                ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 shadow-xs ring-1 ring-rose-500/20'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
            title="Filter to Saved Wishlist items"
          >
            <Heart className={`w-3.5 h-3.5 ${showWishlistOnly ? 'fill-rose-600 text-rose-600' : 'text-zinc-500'}`} />
            <span>Wishlist</span>
            {wishlist.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                showWishlistOnly 
                  ? 'bg-rose-600 text-white' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}>
                {wishlist.length}
              </span>
            )}
          </button>

          {/* Filter button */}
          <button
            onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border transition-colors ${
              activeFiltersCount > 0
                ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <select
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
          {/* Max Price Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
              <span>Max Price</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">₹{maxPrice.toLocaleString('en-IN')}</span>
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
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-1">
              <span>₹500</span>
              <span>₹5,000</span>
            </div>
          </div>

          {/* Min Rating */}
          <div>
            <span className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
              Customer Rating
            </span>
            <div className="flex items-center gap-1.5">
              {[0, 4, 4.5, 4.8].map(r => (
                <button
                  key={r}
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

          {/* Min Discount */}
          <div>
            <span className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
              Minimum Discount
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[0, 30, 50, 60].map(d => (
                <button
                  key={d}
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

          {/* Cash on delivery filter */}
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

          {/* Reset Filters button */}
          <div className="flex items-end justify-end sm:col-span-2 md:col-span-5">
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        </div>
      )}

      {/* Product Grid - Fluid multi-device responsive columns */}
      {filteredProducts.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="my-16 py-12 px-4 text-center max-w-md mx-auto">
          <div className="w-12 h-12 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
            <X className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">No products found</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Try adjusting your search keywords, price filter, or category selection.
          </p>
          <button
            onClick={resetFilters}
            className="mt-4 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </section>
  );
};
