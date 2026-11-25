import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import {
  matchesCategoryAndSubcategory,
  matchesDepartmentCategory,
} from '../data/categories';
import { CategoryDepartment } from '../types';
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
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
  Dumbbell,
  Luggage,
  SlidersHorizontal,
  BookOpen,
  Car,
  Factory,
  ShoppingBasket,
  HeartPulse,
  Laptop,
  Smartphone,
  Gamepad2,
  Camera,
  Cpu,
  Wrench,
  Briefcase,
  Baby,
  PawPrint,
  Sprout,
  Music,
  Crown,
  Search,
} from 'lucide-react';

const DEPT_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'womens-fashion': Sparkles,
  'mens-fashion': Shirt,
  'kids-fashion': Sparkles,
  'luxury-designer': Crown,
  ethnic: Sparkles,
  footwear: Footprints,
  bags: ShoppingBag,
  watches: Watch,
  jewellery: Gem,
  accessories: ShoppingBag,
  beauty: Palette,
  electronics: Tv,
  'mobile-accessories': Smartphone,
  computers: Laptop,
  gaming: Gamepad2,
  'cameras-optics': Camera,
  'smart-home': Cpu,
  'home-kitchen': Home,
  furniture: Home,
  grocery: ShoppingBasket,
  health: HeartPulse,
  'sports-outdoor': Dumbbell,
  books: BookOpen,
  automotive: Car,
  industrial: Factory,
  'diy-tools': Wrench,
  'office-supplies': Briefcase,
  'baby-products': Baby,
  'toys-games': Gamepad2,
  'pet-supplies': PawPrint,
  'garden-products': Sprout,
  travel: Luggage,
  handmade: Palette,
  'musical-instruments': Music,
};

export const CategoryBar: React.FC = () => {
  const {
    selectedCategory,
    selectedSubcategory,
    navigateCategory,
    products,
    setSearchQuery,
    categories,
    fashionDepartments,
    moreDepartments,
  } = useMarketplace();

  const [hoveredDeptId, setHoveredDeptId] = useState<string | null>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [moreFilter, setMoreFilter] = useState('');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [expandedMobileDeptId, setExpandedMobileDeptId] = useState<string | null>('womens-fashion');

  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeFlyoutDept: CategoryDepartment | null = useMemo(() => {
    if (!hoveredDeptId) return null;
    return categories.find(d => d.id === hoveredDeptId || d.slug === hoveredDeptId) || null;
  }, [hoveredDeptId, categories]);

  const filteredMoreDepartments = useMemo(() => {
    const q = moreFilter.trim().toLowerCase();
    if (!q) return moreDepartments;
    return moreDepartments.filter(
      d =>
        d.label.toLowerCase().includes(q) ||
        (d.sector || '').toLowerCase().includes(q) ||
        d.subcategories.some(s => s.label.toLowerCase().includes(q))
    );
  }, [moreDepartments, moreFilter]);

  const groupedMoreDepartments = useMemo(() => {
    const groups = new Map<string, CategoryDepartment[]>();
    for (const dept of filteredMoreDepartments) {
      const sector = dept.sector || 'Marketplace Expansion';
      if (!groups.has(sector)) groups.set(sector, []);
      groups.get(sector)!.push(dept);
    }
    return Array.from(groups.entries());
  }, [filteredMoreDepartments]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setHoveredDeptId(null);
        setIsMoreOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHoveredDeptId(null);
        setIsMoreOpen(false);
        setIsMobileDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const scheduleClose = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredDeptId(null);
    }, 160);
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
    navigateCategory(deptId, subId);
    setHoveredDeptId(null);
    setIsMoreOpen(false);
    setIsMobileDrawerOpen(false);
    scrollToCatalog();
  };

  return (
    <div
      ref={containerRef}
      className="relative z-30 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800"
      onMouseLeave={scheduleClose}
      onMouseEnter={cancelClose}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Desktop & Tablet Mega Menu Bar */}
        <div className="flex items-center justify-between gap-2 py-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1">
            {/* Mobile Menu Trigger */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-expanded={isMobileDrawerOpen}
              aria-controls="mobile-mega-menu-drawer"
              className="lg:hidden flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span>All {categories.length} Categories</span>
            </button>

            {/* All Fashion / Launch Home */}
            <button
              type="button"
              onClick={() => handleSelectCategory('all', null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              All Fashion ({products.length})
            </button>

            {/* Fashion-First Primary Departments */}
            {fashionDepartments.map(dept => {
              const Icon = DEPT_ICON_MAP[dept.id] || Sparkles;
              const isActive = selectedCategory === dept.id;
              const isExpanded = hoveredDeptId === dept.id;
              const itemCount = products.filter(p => matchesDepartmentCategory(p, dept.id, categories)).length;

              return (
                <div
                  key={dept.id}
                  className="relative shrink-0"
                  onMouseEnter={() => {
                    cancelClose();
                    setIsMoreOpen(false);
                    setHoveredDeptId(dept.id);
                  }}
                >
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-haspopup="true"
                    onClick={() => handleSelectCategory(dept.id, null)}
                    onFocus={() => {
                      setIsMoreOpen(false);
                      setHoveredDeptId(dept.id);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      isActive || isExpanded
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{dept.label}</span>
                    {itemCount > 0 && (
                      <span className="hidden xl:inline text-[10px] text-zinc-400 font-mono tabular-nums">
                        {itemCount}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-150 hidden lg:inline ${
                        isExpanded ? 'rotate-180 text-rose-600' : 'text-zinc-400'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Expandable Route to All Remaining Categories (34-Category Marketplace Directory) */}
          <div className="relative shrink-0 hidden sm:block">
            <button
              type="button"
              aria-expanded={isMoreOpen}
              aria-controls="more-departments-panel"
              onClick={() => {
                setHoveredDeptId(null);
                setIsMoreOpen(prev => !prev);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                isMoreOpen || moreDepartments.some(d => d.id === selectedCategory)
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span>All {categories.length} Categories</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Hover/Keyboard Mega Menu Flyout (3-Level Hierarchy) */}
      {activeFlyoutDept && (
        <div
          role="region"
          aria-label={`${activeFlyoutDept.label} mega menu`}
          className="hidden lg:block absolute left-0 right-0 top-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-2xl z-40 animate-fadeIn"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 grid grid-cols-12 gap-6 items-start">
            {/* Left: Department, Subcategories & Nested 3rd-Level Child Links */}
            <div className="col-span-7 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                    {activeFlyoutDept.label}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {activeFlyoutDept.tagline}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectCategory(activeFlyoutDept.id, null)}
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <span>Shop All {activeFlyoutDept.label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

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
                          ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/30'
                          : 'border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectCategory(activeFlyoutDept.id, sub.id)}
                        className="w-full flex items-center justify-between text-left group"
                      >
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-rose-600">
                          {sub.label}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                          {subCount > 0 ? `${subCount}` : 'Explore'}
                        </span>
                      </button>
                      {Array.isArray(sub.children) && sub.children.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
                          {sub.children.map(child => (
                            <button
                              key={child}
                              type="button"
                              onClick={() => handleSelectCategory(activeFlyoutDept.id, sub.id, child)}
                              className="text-[11px] px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-rose-400 hover:text-rose-600"
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
            </div>

            {/* Right: Editorial Featured Category Card */}
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
                className="group relative h-44 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 cursor-pointer"
              >
                <img
                  src={activeFlyoutDept.promoImage}
                  alt={activeFlyoutDept.promoTitle}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent p-4 flex flex-col justify-end">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                    Featured Fashion Edit
                  </span>
                  <p className="text-sm font-bold text-white font-display mt-0.5">
                    {activeFlyoutDept.promoTitle}
                  </p>
                  <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-white/90 group-hover:text-rose-300">
                    <span>Explore Collection</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full 34-Category Expandable Directory Panel */}
      {isMoreOpen && (
        <div
          id="more-departments-panel"
          role="region"
          aria-label="All marketplace departments"
          className="absolute left-0 right-0 top-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-2xl z-40 animate-fadeIn max-h-[75vh] overflow-y-auto"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                  All {categories.length} Marketplace Departments
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Fashion leads our launch; Electronics, Grocery, Books, Automotive, Industrial &amp; more are live dynamically from the database.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={moreFilter}
                    onChange={e => setMoreFilter(e.target.value)}
                    placeholder="Filter 34 departments..."
                    aria-label="Filter marketplace departments"
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsMoreOpen(false)}
                  aria-label="Close departments panel"
                  className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {groupedMoreDepartments.map(([sector, sectorDepts]) => (
                <div key={sector} className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    {sector} ({sectorDepts.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {sectorDepts.map(dept => {
                      const Icon = DEPT_ICON_MAP[dept.id] || LayoutGrid;
                      const count = products.filter(p => matchesDepartmentCategory(p, dept.id, categories)).length;
                      return (
                        <div
                          key={dept.id}
                          className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-2"
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectCategory(dept.id, null)}
                            className="w-full flex items-center justify-between text-left group"
                          >
                            <span className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600">
                              <Icon className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{dept.label}</span>
                            </span>
                            <span className="text-[11px] font-mono text-zinc-500 tabular-nums">{count}</span>
                          </button>
                          <div className="space-y-1">
                            {dept.subcategories.map(sub => (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => handleSelectCategory(dept.id, sub.id)}
                                className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white py-1 flex items-center justify-between"
                              >
                                <span className="truncate">{sub.label}</span>
                                <ChevronRight className="w-3 h-3 opacity-60 shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {groupedMoreDepartments.length === 0 && (
                <p className="text-xs text-zinc-500 py-4 text-center">
                  No departments match &ldquo;{moreFilter}&rdquo;.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Tap Accordion Drawer */}
      {isMobileDrawerOpen && (
        <div
          id="mobile-mega-menu-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Browse all 34 fashion and marketplace categories"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex lg:hidden animate-fadeIn"
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-zinc-900 h-full flex flex-col border-r border-zinc-200 dark:border-zinc-800 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                  Shop All {categories.length} Departments
                </h2>
                <p className="text-[11px] text-zinc-500">Fashion launch + full marketplace expansion</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                aria-label="Close category menu"
                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <button
                type="button"
                onClick={() => handleSelectCategory('all', null)}
                className={`w-full px-3.5 py-3 min-h-[44px] rounded-xl text-left text-xs font-bold flex items-center justify-between ${
                  selectedCategory === 'all'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                }`}
              >
                <span>All Fashion &amp; Featured Drops</span>
                <span className="font-mono">{products.length}</span>
              </button>

              <p className="px-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Fashion Launch Departments ({fashionDepartments.length})
              </p>

              {[...fashionDepartments, ...moreDepartments].map((dept, idx) => {
                const isOpen = expandedMobileDeptId === dept.id;
                const isDivider = idx === fashionDepartments.length;
                return (
                  <React.Fragment key={dept.id}>
                    {isDivider && (
                      <p className="px-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Multi-Category Marketplace ({moreDepartments.length})
                      </p>
                    )}
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedMobileDeptId(isOpen ? null : dept.id)}
                        aria-expanded={isOpen}
                        className="w-full px-3.5 py-3 min-h-[44px] flex items-center justify-between text-xs font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-50/70 dark:bg-zinc-950/40"
                      >
                        <span>{dept.label}</span>
                        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="p-2 bg-white dark:bg-zinc-900 space-y-1 border-t border-zinc-100 dark:border-zinc-800">
                          <button
                            type="button"
                            onClick={() => handleSelectCategory(dept.id, null)}
                            className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            View All {dept.label}
                          </button>
                          {dept.subcategories.map(sub => (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => handleSelectCategory(dept.id, sub.id)}
                              className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between"
                            >
                              <span>{sub.label}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
