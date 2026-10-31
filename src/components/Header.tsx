import React from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { 
  ShoppingBag, 
  Heart, 
  Search, 
  Play, 
  Camera, 
  Package, 
  Coins, 
  Sun, 
  Moon, 
  Store, 
  ShieldCheck, 
  User,
  Sparkles,
  Headphones,
  SlidersHorizontal,
  CheckCircle2,
  Globe,
  Database
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activePortal,
    setActivePortal,
    cart,
    wishlist,
    coins,
    setIsCartOpen,
    setIsReelsOpen,
    setIsOrdersOpen,
    setIsVisualSearchOpen,
    setIsRewardsOpen,
    setIsSupportOpen,
    setIsBlueprintOpen,
    setIsArchitectureOpen,
    setIsCompareOpen,
    compareList,
    setIsProfileOpen,
    setIsAuthOpen,
    setIsOnboardingOpen,
    user,
    searchQuery,
    setSearchQuery,
    theme,
    toggleTheme,
    currency,
    language
  } = useMarketplace();

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">
      {/* Top micro announcement */}
      <div className="bg-zinc-900 dark:bg-zinc-900 text-white text-xs py-1.5 px-4 text-center flex items-center justify-between gap-3">
        <div className="hidden lg:flex items-center gap-2 text-[11px] text-zinc-400">
          <button onClick={() => setIsOnboardingOpen(true)} className="hover:text-white flex items-center gap-1">
            <Globe className="w-3 h-3" />
            <span className="uppercase">{language} · {currency}</span>
          </button>
        </div>

        <div className="flex-1 text-center">
          <span className="font-medium tracking-wide">FESTIVE MEGA SALE: Up to 60% Off + Extra 20% with code MEESHO20</span>
          <span className="hidden sm:inline text-zinc-400 mx-2">·</span>
          <span className="hidden sm:inline text-zinc-300">Free Express Delivery on orders above ₹999</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsArchitectureOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/25 text-indigo-300 hover:bg-indigo-500/35 font-mono text-[10px] font-bold border border-indigo-400/40 transition-colors"
            title="Inspect System Architecture, PostgreSQL ERD & API Spec"
          >
            <Database className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline">Architecture & DB</span>
            <span className="sm:hidden">ERD</span>
          </button>

          <button
            onClick={() => setIsBlueprintOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-mono text-[10px] font-bold border border-emerald-500/40 transition-colors"
            title="Inspect Complete 58-Feature SRS Architecture"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">SRS Blueprint (58/58)</span>
            <span className="sm:hidden">58/58</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActivePortal('customer')}
            className="text-left group flex items-center focus:outline-none transition-transform active:scale-98"
            aria-label="Prime Bazaar Home"
          >
            <div className="h-11 sm:h-12 px-2 py-1 rounded-xl bg-white border border-zinc-200/90 shadow-xs flex items-center justify-center">
              <img
                src="/assets/aistudio/Prime_Bazaar_Shopping_Logo_0c82d149.png"
                alt="Prime Bazaar - Shop Smarter. Live Better."
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          <button
            onClick={() => setActivePortal('customer')}
            className={`whitespace-nowrap transition-colors hover:text-rose-600 ${
              activePortal === 'customer' ? 'text-rose-600 font-semibold' : ''
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => setIsReelsOpen(true)}
            className="flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-rose-600 text-rose-600 font-medium"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>TrendStream Reels</span>
          </button>
          <button
            onClick={() => setIsCompareOpen(true)}
            className="flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-indigo-600"
            title="Side-by-Side Product Comparison"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Compare ({compareList.length})</span>
          </button>
          <button
            onClick={() => setIsRewardsOpen(true)}
            className="flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-amber-500"
          >
            <Coins className="w-4 h-4 text-amber-500" />
            <span>Coins ({coins})</span>
          </button>
          <button
            onClick={() => setIsOrdersOpen(true)}
            className="flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-zinc-900 dark:hover:text-white"
          >
            <Package className="w-4 h-4" />
            <span>Track Orders</span>
          </button>
          <button
            onClick={() => setIsSupportOpen(true)}
            className="flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-rose-600"
            title="Live AI Support"
          >
            <Headphones className="w-4 h-4" />
            <span>24/7 Help</span>
          </button>
        </nav>

        {/* Zone 3: Search, Bag, Profile, Portals */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Search bar & Visual Search trigger */}
          {activePortal === 'customer' && (
            <div className="relative hidden md:flex items-center">
              <input
                type="text"
                placeholder="Search kurti, jacket, sneakers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-40 xl:w-56 pl-8 pr-8 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 focus:outline-none transition-all"
              />
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
              <button
                onClick={() => setIsVisualSearchOpen(true)}
                title="Search by image (AI visual match)"
                className="absolute right-2 p-1 text-zinc-400 hover:text-rose-600 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Visual search button on mobile */}
          <button
            onClick={() => setIsVisualSearchOpen(true)}
            title="AI Visual Search"
            className="md:hidden p-2 text-zinc-600 dark:text-zinc-300 hover:text-rose-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Wishlist count */}
          <button
            onClick={() => setActivePortal('customer')}
            title="Wishlist"
            className="relative p-2 text-zinc-600 dark:text-zinc-300 hover:text-rose-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Heart className="w-4 h-4" />
            {wishlist.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                {wishlist.length}
              </span>
            )}
          </button>

          {/* Shopping Bag Drawer Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium text-xs hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bag</span>
            {totalCartItems > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none">
                {totalCartItems}
              </span>
            )}
          </button>

          {/* User Account / Profile Button */}
          <button
            onClick={() => {
              if (user?.isLoggedIn) {
                setIsProfileOpen(true);
              } else {
                setIsAuthOpen(true);
              }
            }}
            title={user?.isLoggedIn ? `Account (${user.name})` : 'Sign In'}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold text-zinc-700 dark:text-zinc-200"
          >
            {user?.isLoggedIn && user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-4 h-4 rounded-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
            )}
            <span className="hidden sm:inline">
              {user?.isLoggedIn ? user.name.split(' ')[0] : 'Sign In'}
            </span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            className="p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Portal Switcher */}
          <div className="relative border-l border-zinc-200 dark:border-zinc-800 pl-2 sm:pl-3">
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
              <button
                onClick={() => setActivePortal('customer')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                  activePortal === 'customer'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
                title="Customer Storefront"
              >
                <User className="w-3 h-3" />
                <span className="hidden sm:inline">Shop</span>
              </button>
              <button
                onClick={() => setActivePortal('seller')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                  activePortal === 'seller'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-semibold text-rose-600 dark:text-rose-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
                title="Seller Studio"
              >
                <Store className="w-3 h-3" />
                <span className="hidden sm:inline">Seller</span>
              </button>
              <button
                onClick={() => setActivePortal('admin')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                  activePortal === 'admin'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-semibold text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
                title="Admin Control Center"
              >
                <ShieldCheck className="w-3 h-3" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
