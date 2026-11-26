import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  useMarketplace,
  SupportedLanguage,
  SupportedCurrency,
} from '../context/MarketplaceContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { filterProductsBySearch, getCategoryDisplayName } from '../utils/productSearch';
import { getStorefrontDepartments } from '../data/storefrontScope';
import { api } from '../services/api';
import {
  ShoppingCart,
  Heart,
  Search,
  Camera,
  Package,
  Store,
  ShieldCheck,
  User,
  MapPin,
  Sun,
  Moon,
  Building2,
  Smartphone,
  Bell,
  X,
  Tag,
  ArrowRight,
  Clock,
  Sparkles,
  ChevronDown,
  Truck,
  Flame,
  SlidersHorizontal,
} from 'lucide-react';

const RECENT_SEARCHES_KEY = 'pb_recent_searches';
const POPULAR_SEARCH_CHIPS = [
  'Silk Kurti',
  'Cargo Jacket',
  'Chanderi Saree',
  'Platform Sneakers',
  'Kundan Choker',
  'ANC Earbuds',
];

export const Header: React.FC = () => {
  const {
    activePortal,
    setActivePortal,
    products,
    setSelectedProduct,
    selectedCategory,
    setSelectedCategory,
    setDiscoveryTab,
    categories,
    addresses,
    countryCode,
    formatPrice,
    cart,
    wishlist,
    openWishlist,
    setIsCartOpen,
    setIsOrdersOpen,
    setIsVisualSearchOpen,
    setIsProfileOpen,
    setProfileActiveTab,
    setIsAuthOpen,
    openMerchantAuth,
    setIsApkModalOpen,
    priceAlerts,
    unreadPriceDropCount,
    user,
    searchQuery,
    setSearchQuery,
    theme,
    toggleTheme,
    currency,
    setCurrency,
    language,
    setLanguage,
    setIsCompareOpen,
    compareList,
  } = useMarketplace();

  const { isInstallable, isInstalled } = usePWAInstall();
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const storefrontCategories = useMemo(
    () => getStorefrontDepartments(categories),
    [categories]
  );

  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isUtilityOpen, setIsUtilityOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [smartSuggest, setSmartSuggest] = useState<{
    correctedQuery: string | null;
    matchedCategories: Array<{ slug: string; name: string }>;
    suggestions: any[];
  } | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const utilityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (utilityRef.current && !utilityRef.current.contains(event.target as Node)) {
        setIsUtilityOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmedQuery = searchQuery.trim();

  useEffect(() => {
    if (!isSearchFocused || trimmedQuery.length < 2) {
      setSmartSuggest(null);
      return;
    }
    const timer = setTimeout(() => {
      api.discovery
        .searchSuggest(trimmedQuery)
        .then(res => {
          if (res?.success) {
            setSmartSuggest({
              correctedQuery: res.correctedQuery || null,
              matchedCategories: res.matchedCategories || [],
              suggestions: res.suggestions || [],
            });
          }
        })
        .catch(() => {});
    }, 180);
    return () => clearTimeout(timer);
  }, [trimmedQuery, isSearchFocused]);

  const recordRecentSearch = (term: string) => {
    const clean = term.trim();
    if (clean.length < 2) return;
    setRecentSearches(prev => {
      const next = [clean, ...prev.filter(t => t.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

  const scopedProducts = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') return products;
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const matchedProducts = useMemo(() => {
    if (!trimmedQuery) return [];
    const pool = scopedProducts.length > 0 ? scopedProducts : products;
    const local = filterProductsBySearch(pool, trimmedQuery);
    if (local.length > 0) return local;
    const suggestIds = new Set((smartSuggest?.suggestions || []).map((s: any) => s.id));
    return products.filter(p => suggestIds.has(p.id));
  }, [scopedProducts, products, trimmedQuery, smartSuggest]);

  const matchedCategories = useMemo(() => {
    if (!trimmedQuery) return [];
    const q = trimmedQuery.toLowerCase();
    const categoryCounts = new Map<string, number>();

    products.forEach(p => {
      const cat = p.category || '';
      const displayName = getCategoryDisplayName(cat).toLowerCase();
      if (cat.toLowerCase().includes(q) || displayName.includes(q)) {
        categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
      }
    });

    return Array.from(categoryCounts.entries())
      .map(([id, count]) => ({
        id,
        label: getCategoryDisplayName(id),
        count,
      }))
      .slice(0, 5);
  }, [products, trimmedQuery]);

  const scrollToCatalog = () => {
    const catalogEl = document.getElementById('catalog-section');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setIsSearchFocused(true);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const executeSearch = (overrideQuery?: string) => {
    const term = (overrideQuery ?? searchQuery).trim();
    if (overrideQuery !== undefined) {
      setSearchQuery(overrideQuery);
    }
    if (term) {
      recordRecentSearch(term);
    }
    setIsSearchFocused(false);
    setActivePortal('customer');
    scrollToCatalog();
  };

  const defaultAddress = addresses.find(a => a.isDefault) || addresses[0];
  const deliveryLabel = defaultAddress
    ? `${defaultAddress.city || 'India'} ${defaultAddress.pinCode || ''}`.trim()
    : `${countryCode} · Delivery`;

  return (
    <header className="sticky top-0 z-40 bg-[#0F172A] text-white shadow-md pt-[env(safe-area-inset-top,0px)]">
      {/* 1. Top Announcement Bar (compact single bar, dismissible) */}
      {showAnnouncement && activePortal === 'customer' && (
        <div className="bg-gradient-to-r from-orange-600 via-rose-600 to-orange-600 text-white text-[11px] font-medium">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-6 h-7 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 truncate">
              <span className="inline-flex items-center gap-1 font-bold whitespace-nowrap">
                <Truck className="w-3.5 h-3.5 shrink-0" />
                <span>Special Offers • New Arrivals • Shopping Deals</span>
              </span>
              <span className="hidden md:inline text-white/75">|</span>
              <span className="hidden md:inline truncate">
                Free Express Delivery ₹999+ · Fashion-First Collection &amp; Smart Electronics
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActivePortal('customer');
                  setDiscoveryTab('flash');
                  scrollToCatalog();
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 font-bold text-[10px] whitespace-nowrap transition-colors"
              >
                <Flame className="w-3 h-3 text-amber-200" />
                <span>Flash Deals</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAnnouncement(false)}
                aria-label="Dismiss announcement"
                className="p-0.5 rounded hover:bg-white/20 text-white/90 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Marketplace Header */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3 lg:gap-4">
        {/* Zone 1: Brand Logo + Delivery Location */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActivePortal('customer');
              setSelectedCategory('all');
              setDiscoveryTab('all');
            }}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 shrink-0"
            aria-label="Prime Bazaar Home"
          >
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-white p-1 flex items-center justify-center shrink-0">
              <img
                src="/assets/aistudio/IMG_20261124_134619_98e88ce3.png"
                alt="Prime Bazaar"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="hidden sm:flex flex-col text-left leading-none">
              <span className="text-sm lg:text-base font-extrabold tracking-tight font-display text-white whitespace-nowrap">
                Prime Bazaar
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-orange-400 whitespace-nowrap mt-0.5">
                One Marketplace
              </span>
            </div>
          </button>

          {/* Delivery Location Selector */}
          {activePortal === 'customer' && (
            <button
              type="button"
              onClick={() => {
                setProfileActiveTab('addresses');
                setIsProfileOpen(true);
              }}
              title="Choose delivery location"
              className="hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/10 text-left transition-colors shrink-0 border border-transparent hover:border-slate-700"
            >
              <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
              <div className="leading-tight">
                <span className="block text-[10px] text-slate-300 whitespace-nowrap">
                  Deliver to {countryCode}
                </span>
                <span className="block text-xs font-bold text-white whitespace-nowrap max-w-[115px] truncate">
                  {deliveryLabel}
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Zone 2: Amazon-Style Scoped Search Bar */}
        {activePortal === 'customer' ? (
          <div
            ref={searchContainerRef}
            className="relative flex-1 min-w-0 max-w-2xl flex items-center"
          >
            <div className="w-full flex items-stretch rounded-lg overflow-hidden bg-white text-slate-900 shadow-sm ring-1 ring-slate-700/60 focus-within:ring-2 focus-within:ring-orange-500">
              {/* Scoped Category Dropdown */}
              <div className="hidden sm:flex items-center bg-slate-100 border-r border-slate-200 shrink-0">
                <select
                  aria-label="Search category"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="h-9 sm:h-10 pl-2.5 pr-2 bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer max-w-[138px]"
                >
                  <option value="all">All</option>
                  <option value="fashion">Fashion</option>
                  {storefrontCategories.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Input */}
              <div className="relative flex-1 flex items-center min-w-0">
                <input
                  id="pb-main-search"
                  type="text"
                  role="searchbox"
                  aria-label="Search fashion, shoes, bags, electronics"
                  placeholder="Search fashion, shoes, bags, electronics..."
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={e => handleSearchChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') {
                      setIsSearchFocused(false);
                    } else if (e.key === 'Enter') {
                      executeSearch();
                    }
                  }}
                  className="w-full h-9 sm:h-10 pl-3 pr-14 bg-white text-slate-900 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:outline-none"
                />
                {trimmedQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                    className="absolute right-8 p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsVisualSearchOpen(true)}
                  title="Visual product search (camera match)"
                  aria-label="Search by image"
                  className="absolute right-1.5 p-1.5 text-slate-500 hover:text-orange-600 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Vivid Orange Search Submit Button */}
              <button
                type="button"
                onClick={() => executeSearch()}
                aria-label="Search marketplace"
                className="px-3 sm:px-4 bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors shrink-0"
              >
                <Search className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </button>
            </div>

            {/* Live Search Dropdown: Suggestions, Popular & Recent Searches */}
            {isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-2xl overflow-hidden z-50 animate-fadeIn">
                {trimmedQuery.length === 0 ? (
                  <div className="p-3.5 space-y-3">
                    {recentSearches.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Recent Searches</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setRecentSearches([]);
                              localStorage.removeItem(RECENT_SEARCHES_KEY);
                            }}
                            className="text-[11px] text-orange-600 font-semibold hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recentSearches.map(term => (
                            <button
                              key={term}
                              type="button"
                              onClick={() => executeSearch(term)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-xs font-medium text-slate-700 dark:text-zinc-200"
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1.5">
                        <Sparkles className="w-3 h-3 text-orange-500" />
                        <span>Popular Searches</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {POPULAR_SEARCH_CHIPS.map(term => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => executeSearch(term)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 hover:border-orange-500 text-xs font-medium text-slate-700 dark:text-zinc-200 transition-colors"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="px-3.5 py-2 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-zinc-950/60">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                        {smartSuggest?.correctedQuery ? (
                          <button
                            type="button"
                            onClick={() => setSearchQuery(smartSuggest.correctedQuery!)}
                            className="text-left hover:underline"
                          >
                            Did you mean{' '}
                            <strong className="text-orange-600">{smartSuggest.correctedQuery}</strong>? (
                            {matchedProducts.length})
                          </button>
                        ) : (
                          `${matchedProducts.length} ${matchedProducts.length === 1 ? 'product' : 'products'} found`
                        )}
                      </span>
                      {selectedCategory !== 'all' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory('all');
                            scrollToCatalog();
                          }}
                          className="text-[11px] font-bold text-orange-600 hover:underline"
                        >
                          Search all Fashion &amp; Electronics
                        </button>
                      )}
                    </div>

                    {matchedCategories.length > 0 && (
                      <div className="px-3.5 py-2 border-b border-slate-100 dark:border-zinc-800">
                        <div className="flex flex-wrap gap-1.5">
                          {matchedCategories.map(cat => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setSelectedCategory(cat.id);
                                setSearchQuery('');
                                setIsSearchFocused(false);
                                scrollToCatalog();
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 text-[11px] font-semibold"
                            >
                              <Tag className="w-3 h-3" />
                              <span>{cat.label}</span>
                              <span className="text-[10px] opacity-75">({cat.count})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {matchedProducts.length > 0 ? (
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
                        {matchedProducts.slice(0, 6).map(product => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              recordRecentSearch(product.title);
                              setSelectedProduct(product);
                              setIsSearchFocused(false);
                            }}
                            className="w-full px-3.5 py-2.5 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-zinc-800/70 transition-colors"
                          >
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              className="w-10 h-10 rounded-md object-cover bg-slate-100 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                                {product.title}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                                {getCategoryDisplayName(product.category)} · {product.brand} · {product.sellerName}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white font-mono tabular-nums shrink-0">
                              {formatPrice(product.price)}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-5 text-center">
                        <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          No products matching &ldquo;{trimmedQuery}&rdquo;
                        </p>
                        <button
                          type="button"
                          onClick={handleClearSearch}
                          className="mt-2 px-3 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold"
                        >
                          Reset search
                        </button>
                      </div>
                    )}

                    {matchedProducts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => executeSearch()}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-zinc-950/70 border-t border-slate-100 dark:border-zinc-800 text-[11px] font-bold text-orange-600 flex items-center justify-center gap-1"
                      >
                        <span>View all {matchedProducts.length} search results</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-3 px-2">
            <span className="text-xs font-semibold text-slate-300">
              {activePortal === 'seller' ? 'Seller Central Dashboard' : 'Marketplace Admin Console'}
            </span>
            <button
              type="button"
              onClick={() => setActivePortal('customer')}
              className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold whitespace-nowrap"
            >
              Back to Shopping
            </button>
          </div>
        )}

        {/* Zone 3: Language, Currency, Account, Returns & Orders, Wishlist, Cart & Portals */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Language & Currency Selectors */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold">
            <select
              aria-label="Language"
              value={language}
              onChange={e => setLanguage(e.target.value as SupportedLanguage)}
              className="bg-transparent text-white focus:outline-none cursor-pointer uppercase"
            >
              <option value="en" className="bg-slate-900">EN</option>
              <option value="hi" className="bg-slate-900">HI</option>
              <option value="mr" className="bg-slate-900">MR</option>
              <option value="ta" className="bg-slate-900">TA</option>
            </select>
            <span className="text-slate-600">|</span>
            <select
              aria-label="Currency"
              value={currency}
              onChange={e => setCurrency(e.target.value as SupportedCurrency)}
              className="bg-transparent text-orange-300 focus:outline-none cursor-pointer uppercase font-mono"
            >
              <option value="INR" className="bg-slate-900">INR ₹</option>
              <option value="USD" className="bg-slate-900">USD $</option>
              <option value="EUR" className="bg-slate-900">EUR €</option>
              <option value="GBP" className="bg-slate-900">GBP £</option>
              <option value="AED" className="bg-slate-900">AED</option>
              <option value="SGD" className="bg-slate-900">SGD</option>
            </select>
          </div>

          {/* Account / Sign In */}
          <button
            type="button"
            onClick={() => {
              if (user?.isLoggedIn) {
                setProfileActiveTab('details');
                setIsProfileOpen(true);
              } else {
                setIsAuthOpen(true);
              }
            }}
            className="hidden sm:flex flex-col text-left px-2 py-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          >
            <span className="text-[10px] text-slate-300 leading-none whitespace-nowrap">
              {user?.isLoggedIn ? `Hello, ${user.name.split(' ')[0]}` : 'Hello, Sign in'}
            </span>
            <span className="text-xs font-bold text-white flex items-center gap-0.5 whitespace-nowrap mt-0.5">
              <span>Account</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </span>
          </button>

          {/* Returns & Orders */}
          <button
            type="button"
            onClick={() => setIsOrdersOpen(true)}
            className="hidden lg:flex flex-col text-left px-2 py-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          >
            <span className="text-[10px] text-slate-300 leading-none whitespace-nowrap">
              Returns
            </span>
            <span className="text-xs font-bold text-white flex items-center gap-1 whitespace-nowrap mt-0.5">
              <Package className="w-3.5 h-3.5 text-orange-400" />
              <span>&amp; Orders</span>
            </span>
          </button>

          {/* Price-Drop Notifications */}
          <button
            type="button"
            onClick={() => openWishlist()}
            title={`Price alerts (${unreadPriceDropCount} new)`}
            aria-label="Price notifications"
            className="hidden md:flex relative p-2 rounded-lg hover:bg-white/10 text-slate-200 transition-colors shrink-0"
          >
            <Bell className={`w-4 h-4 ${unreadPriceDropCount > 0 ? 'text-orange-400 animate-bounce' : ''}`} />
            {(unreadPriceDropCount > 0 || priceAlerts.some(a => a.status === 'ACTIVE')) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500" />
            )}
          </button>

          {/* Wishlist Icon */}
          <button
            type="button"
            onClick={() => openWishlist()}
            aria-label={`Wishlist (${wishlist.length})`}
            title="Wishlist"
            className="hidden sm:flex relative p-2 rounded-lg hover:bg-white/10 text-slate-200 transition-colors shrink-0"
          >
            <Heart className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${wishlist.length > 0 ? 'text-rose-400 fill-rose-400' : ''}`} />
            {wishlist.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {wishlist.length}
              </span>
            )}
          </button>

          {/* Shopping Cart */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label={`Cart (${totalCartItems} items)`}
            className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition-colors shrink-0"
          >
            <ShoppingCart className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="hidden sm:inline">Cart</span>
            <span className="px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-extrabold leading-none tabular-nums">
              {totalCartItems}
            </span>
          </button>

          {/* Portals / App / Theme Utility Menu */}
          <div ref={utilityRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsUtilityOpen(prev => !prev)}
              aria-expanded={isUtilityOpen}
              aria-label="Portals, settings, and app menu"
              className="flex items-center gap-1 px-2 py-1.5 sm:py-2 rounded-lg hover:bg-white/10 text-xs font-semibold text-slate-200 border border-slate-700/80 transition-colors"
            >
              <Store className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">
                {activePortal === 'seller' ? 'Seller' : activePortal === 'admin' ? 'Admin' : 'More'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {isUtilityOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-700 shadow-2xl p-2 z-50 space-y-1 text-xs animate-fadeIn">
                <p className="px-2.5 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Portal
                </p>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-zinc-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePortal('customer');
                      setIsUtilityOpen(false);
                    }}
                    className={`py-1.5 rounded-md font-semibold flex items-center justify-center gap-1 ${
                      activePortal === 'customer'
                        ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    <User className="w-3 h-3" />
                    <span>Shop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePortal('seller');
                      setIsUtilityOpen(false);
                    }}
                    className={`py-1.5 rounded-md font-semibold flex items-center justify-center gap-1 ${
                      activePortal === 'seller'
                        ? 'bg-white dark:bg-zinc-700 text-orange-600 shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    <Store className="w-3 h-3" />
                    <span>Seller</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePortal('admin');
                      setIsUtilityOpen(false);
                    }}
                    className={`py-1.5 rounded-md font-semibold flex items-center justify-center gap-1 ${
                      activePortal === 'admin'
                        ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>Admin</span>
                  </button>
                </div>

                <div className="xl:hidden pt-1 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2 px-2 py-1.5">
                  <select
                    aria-label="Mobile language"
                    value={language}
                    onChange={e => setLanguage(e.target.value as SupportedLanguage)}
                    className="flex-1 bg-slate-100 dark:bg-zinc-800 rounded px-2 py-1 text-xs font-semibold"
                  >
                    <option value="en">English (EN)</option>
                    <option value="hi">Hindi (HI)</option>
                    <option value="mr">Marathi (MR)</option>
                    <option value="ta">Tamil (TA)</option>
                  </select>
                  <select
                    aria-label="Mobile currency"
                    value={currency}
                    onChange={e => setCurrency(e.target.value as SupportedCurrency)}
                    className="flex-1 bg-slate-100 dark:bg-zinc-800 rounded px-2 py-1 text-xs font-semibold"
                  >
                    <option value="INR">INR ₹</option>
                    <option value="USD">USD $</option>
                    <option value="EUR">EUR €</option>
                    <option value="GBP">GBP £</option>
                    <option value="AED">AED</option>
                    <option value="SGD">SGD</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    openMerchantAuth('login');
                    setIsUtilityOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Merchant Partner Login / Sign Up</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOrdersOpen(true);
                    setIsUtilityOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                >
                  <Package className="w-4 h-4 text-slate-500" />
                  <span>Returns &amp; Track Orders</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCompareOpen(true);
                    setIsUtilityOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                >
                  <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                  <span>Compare Products ({compareList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsApkModalOpen(true);
                    setIsUtilityOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-between font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-slate-500" />
                    <span>{isInstalled ? 'Prime Bazaar App Active' : 'Get Mobile App'}</span>
                  </span>
                  {!isInstalled && isInstallable && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                    setIsUtilityOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-500" />
                  )}
                  <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
