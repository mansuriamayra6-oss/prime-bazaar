import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useMarketplace, DiscoveryTab } from '../context/MarketplaceContext';
import { matchesCategoryAndSubcategory } from '../data/categories';
import {
  getStorefrontDepartments,
  STOREFRONT_FASHION_NAV_IDS,
  STOREFRONT_NAV_LABELS,
} from '../data/storefrontScope';
import { CategoryDepartment } from '../types';
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  Menu,
  ArrowRight,
  X,
  Shirt,
  Footprints,
  ShoppingBag,
  Watch,
  Gem,
  Palette,
  Tv,
  Home,
  Flame,
  Play,
  Coins,
  LayoutGrid,
} from 'lucide-react';

const DEPT_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'womens-fashion': Sparkles,
  'mens-fashion': Shirt,
  'kids-fashion': Sparkles,
  footwear: Footprints,
  bags: ShoppingBag,
  watches: Watch,
  jewellery: Gem,
  accessories: ShoppingBag,
  beauty: Palette,
  electronics: Tv,
};

const ELECTRONICS_NAV_SUBS = [
  { id: 'mobile-accessories', label: 'Mobile Accessories', keyword: 'mobile' },
  { id: 'audio', label: 'Headphones & Earphones', keyword: 'earbuds' },
  { id: 'smart-wearables', label: 'Smart Watches', keyword: 'watch' },
  { id: 'chargers-cables', label: 'Chargers & Cables', keyword: 'charger' },
  { id: 'small-gadgets', label: 'Small Gadgets', keyword: 'gadget' },
];

export const CategoryBar: React.FC = () => {
  const {
    selectedCategory,
    selectedSubcategory,
    navigateCategory,
    discoveryTab,
    setDiscoveryTab,
    isMobileCategoriesOpen,
    setIsMobileCategoriesOpen,
    products,
    setSearchQuery,
    categories,
    setIsReelsOpen,
    setIsLiveShoppingOpen,
    setIsRewardsOpen,
    coins,
  } = useMarketplace();

  const [hoveredDeptId, setHoveredDeptId] = useState<string | null>(null);
  const [expandedMobileDeptId, setExpandedMobileDeptId] = useState<string | null>('womens-fashion');

  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storefrontDepartments = useMemo(
    () => getStorefrontDepartments(categories),
    [categories]
  );

  const fashionNavDepartments = useMemo(
    () =>
      storefrontDepartments.filter(d =>
        (STOREFRONT_FASHION_NAV_IDS as readonly string[]).includes(d.id)
      ),
    [storefrontDepartments]
  );

  const electronicsNavDept = useMemo(
    () => storefrontDepartments.find(d => d.id === 'electronics'),
    [storefrontDepartments]
  );

  const activeFlyoutDept: CategoryDepartment | null = useMemo(() => {
    if (!hoveredDeptId) return null;
    return storefrontDepartments.find(d => d.id === hoveredDeptId || d.slug === hoveredDeptId) || null;
  }, [hoveredDeptId, storefrontDepartments]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setHoveredDeptId(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHoveredDeptId(null);
        setIsMobileCategoriesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [setIsMobileCategoriesOpen]);

  const scheduleClose = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredDeptId(null);
    }, 170);
  };

  const cancelClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scrollToCatalog = () => {
    const el = document.getElementById('catalog-section');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelectCategory = (deptId: string, subId: string | null = null, childKeyword?: string) => {
    setSearchQuery(childKeyword || '');
    setDiscoveryTab('all');
    navigateCategory(deptId, subId);
    setHoveredDeptId(null);
    setIsMobileCategoriesOpen(false);
    if (deptId === 'all' && !subId && !childKeyword) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      scrollToCatalog();
    }
  };

  const handleSelectDiscovery = (tab: DiscoveryTab) => {
    setSearchQuery('');
    navigateCategory('all', null);
    setDiscoveryTab(tab);
    setHoveredDeptId(null);
    setIsMobileCategoriesOpen(false);
    scrollToCatalog();
  };

  return (
    <div
      ref={containerRef}
      className="relative z-30 bg-[#1E293B] text-slate-100 border-b border-slate-800"
      onMouseLeave={scheduleClose}
      onMouseEnter={cancelClose}
    >
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2 py-1.5">
          {/* Fashion & Electronics Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 flex-1">
            {/* Mobile Categories Menu Trigger */}
            <button
              type="button"
              onClick={() => setIsMobileCategoriesOpen(true)}
              aria-expanded={isMobileCategoriesOpen}
              aria-controls="mobile-mega-menu-drawer"
              className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold whitespace-nowrap shrink-0"
            >
              <Menu className="w-3.5 h-3.5 shrink-0" />
              <span>Categories</span>
            </button>

            {/* Home */}
            <button
              type="button"
              onClick={() => handleSelectCategory('all', null)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1 transition-colors ${
                selectedCategory === 'all' && discoveryTab === 'all'
                  ? 'bg-white text-slate-900'
                  : 'text-slate-100 hover:bg-white/10'
              }`}
            >
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span>Home</span>
            </button>

            {/* Primary Fashion Categories + Selected Electronics */}
            {storefrontDepartments.map(dept => {
              const Icon = DEPT_ICON_MAP[dept.id] || LayoutGrid;
              const isActive = selectedCategory === dept.id;
              const isExpanded = hoveredDeptId === dept.id;
              const isElectronics = dept.id === 'electronics';

              return (
                <div
                  key={dept.id}
                  className="relative shrink-0"
                  onMouseEnter={() => {
                    cancelClose();
                    setHoveredDeptId(dept.id);
                  }}
                >
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-haspopup="true"
                    onClick={() => handleSelectCategory(dept.id, null)}
                    onFocus={() => setHoveredDeptId(dept.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs whitespace-nowrap shrink-0 transition-colors ${
                      isActive || isExpanded
                        ? 'bg-white text-slate-900 font-bold'
                        : isElectronics
                        ? 'text-sky-300 hover:bg-white/10 font-semibold border-l border-slate-700/80 pl-3 ml-0.5'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white font-medium'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 opacity-85" />
                    <span>{STOREFRONT_NAV_LABELS[dept.id] || dept.label}</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-150 hidden lg:inline ${
                        isExpanded ? 'rotate-180' : 'opacity-60'
                      }`}
                    />
                  </button>
                </div>
              );
            })}

            {/* Flash Deals & New Arrivals */}
            <button
              type="button"
              onClick={() => handleSelectDiscovery('flash')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1 transition-colors ${
                discoveryTab === 'flash'
                  ? 'bg-orange-500 text-white'
                  : 'text-orange-300 hover:bg-white/10'
              }`}
            >
              <Flame className="w-3.5 h-3.5 shrink-0" />
              <span>Flash Deals</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDiscovery('new')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                discoveryTab === 'new'
                  ? 'bg-white text-slate-900 font-bold'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              New Arrivals
            </button>
          </div>

          {/* Right Quick Social & Rewards Actions */}
          <div className="hidden xl:flex items-center gap-1.5 shrink-0 border-l border-slate-700 pl-2">
            <button
              type="button"
              onClick={() => setIsLiveShoppingOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold text-rose-300 hover:bg-white/10 whitespace-nowrap"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Live</span>
            </button>
            <button
              type="button"
              onClick={() => setIsReelsOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-slate-200 hover:bg-white/10 whitespace-nowrap"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Reels</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRewardsOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold whitespace-nowrap"
              title="Daily Deals & Bazaar Coins"
            >
              <Coins className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-mono tabular-nums">{coins}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Hover/Keyboard Mega Menu Flyout (Scoped to Fashion & Selected Electronics) */}
      {activeFlyoutDept && (
        <div
          role="region"
          aria-label={`${activeFlyoutDept.label} menu`}
          className="hidden lg:block absolute left-0 right-0 top-full bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 border-b border-slate-200 dark:border-zinc-800 shadow-2xl z-40 animate-fadeIn"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="max-w-[1440px] mx-auto px-6 py-6 grid grid-cols-12 gap-6 items-start">
            <div className="col-span-7 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                    {activeFlyoutDept.id === 'electronics'
                      ? 'Selected Tech & Accessories'
                      : 'Fashion Department'}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                    {activeFlyoutDept.label}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    {activeFlyoutDept.tagline}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectCategory(activeFlyoutDept.id, null)}
                  className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <span>Shop All {activeFlyoutDept.label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {activeFlyoutDept.id === 'electronics' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {ELECTRONICS_NAV_SUBS.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        handleSelectCategory(
                          item.id === 'mobile-accessories' ? 'mobile-accessories' : 'electronics',
                          null
                        )
                      }
                      className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/40 hover:border-orange-500 text-left flex items-center justify-between transition-colors"
                    >
                      <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                        {item.label}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {activeFlyoutDept.subcategories.map(sub => {
                    const subCount = products.filter(p =>
                      matchesCategoryAndSubcategory(p, activeFlyoutDept.id, sub.id, categories)
                    ).length;
                    const isSubSelected =
                      selectedCategory === activeFlyoutDept.id && selectedSubcategory === sub.id;

                    return (
                      <div
                        key={sub.id}
                        className={`p-3 rounded-xl border transition-all space-y-2 ${
                          isSubSelected
                            ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/30'
                            : 'border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/40'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectCategory(activeFlyoutDept.id, sub.id)}
                          className="w-full flex items-center justify-between text-left group"
                        >
                          <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 group-hover:text-orange-600">
                            {sub.label}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 tabular-nums">
                            {subCount > 0 ? `${subCount}` : 'Explore'}
                          </span>
                        </button>
                        {Array.isArray(sub.children) && sub.children.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-200/70 dark:border-zinc-800">
                            {sub.children.map(child => (
                              <button
                                key={child}
                                type="button"
                                onClick={() => handleSelectCategory(activeFlyoutDept.id, sub.id, child)}
                                className="text-[11px] px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:border-orange-500 hover:text-orange-600"
                              >
                                {child}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="col-span-5">
              <div
                onClick={() => handleSelectCategory(activeFlyoutDept.id, null)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectCategory(activeFlyoutDept.id, null);
                  }
                }}
                className="group relative h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 cursor-pointer"
              >
                <img
                  src={activeFlyoutDept.promoImage}
                  alt={activeFlyoutDept.promoTitle}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-4 flex flex-col justify-end">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300">
                    Featured Collection
                  </span>
                  <p className="text-sm font-bold text-white font-display mt-0.5">
                    {activeFlyoutDept.promoTitle}
                  </p>
                  <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-white/90 group-hover:text-orange-300">
                    <span>Shop {activeFlyoutDept.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Slide-Out Drawer (Fashion First + Selected Electronics Only) */}
      {isMobileCategoriesOpen && (
        <div
          id="mobile-mega-menu-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Browse Fashion and Electronics categories"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex lg:hidden animate-fadeIn"
          onClick={() => setIsMobileCategoriesOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 h-full flex flex-col border-r border-slate-200 dark:border-zinc-800 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 bg-[#0F172A] text-white flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold font-display">
                  Shop Fashion &amp; Electronics
                </h2>
                <p className="text-[11px] text-slate-300">Curated style + everyday gadgets</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileCategoriesOpen(false)}
                aria-label="Close category menu"
                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => handleSelectDiscovery('flash')}
                  className="px-3 py-2.5 min-h-[44px] rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 text-xs font-bold flex items-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Flash Deals</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDiscovery('new')}
                  className="px-3 py-2.5 min-h-[44px] rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-xs font-bold flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>New Arrivals</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleSelectCategory('all', null)}
                className={`w-full px-3.5 py-3 min-h-[44px] rounded-xl text-left text-xs font-bold flex items-center justify-between ${
                  selectedCategory === 'all'
                    ? 'bg-[#0F172A] text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200'
                }`}
              >
                <span>Home · All Fashion &amp; Tech</span>
                <Home className="w-4 h-4" />
              </button>

              <p className="px-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                Fashion Categories
              </p>

              {fashionNavDepartments.map(dept => {
                const isOpen = expandedMobileDeptId === dept.id;
                return (
                  <div key={dept.id} className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedMobileDeptId(isOpen ? null : dept.id)}
                      aria-expanded={isOpen}
                      className="w-full px-3.5 py-3 min-h-[44px] flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-zinc-100 bg-slate-50/80 dark:bg-zinc-950/40"
                    >
                      <span>{dept.label}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="p-2 bg-white dark:bg-zinc-900 space-y-1 border-t border-slate-100 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => handleSelectCategory(dept.id, null)}
                          className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-lg text-xs font-bold text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                        >
                          Shop All {dept.label}
                        </button>
                        {dept.subcategories.map(sub => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleSelectCategory(dept.id, sub.id)}
                            className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-lg text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-between"
                          >
                            <span>{sub.label}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Selected Electronics Section */}
              {electronicsNavDept && (
                <>
                  <p className="px-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    Selected Electronics
                  </p>
                  <div className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedMobileDeptId(
                          expandedMobileDeptId === 'electronics' ? null : 'electronics'
                        )
                      }
                      aria-expanded={expandedMobileDeptId === 'electronics'}
                      className="w-full px-3.5 py-3 min-h-[44px] flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-zinc-100 bg-sky-50/70 dark:bg-sky-950/20"
                    >
                      <span>Electronics &amp; Smart Gadgets</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          expandedMobileDeptId === 'electronics' ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {expandedMobileDeptId === 'electronics' && (
                      <div className="p-2 bg-white dark:bg-zinc-900 space-y-1 border-t border-slate-100 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => handleSelectCategory('electronics', null)}
                          className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-lg text-xs font-bold text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                        >
                          Shop All Electronics
                        </button>
                        {ELECTRONICS_NAV_SUBS.map(sub => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() =>
                              handleSelectCategory(
                                sub.id === 'mobile-accessories' ? 'mobile-accessories' : 'electronics',
                                null
                              )
                            }
                            className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-lg text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-between"
                          >
                            <span>{sub.label}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
