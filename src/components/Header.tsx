import React from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
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
  Database,
  Building2,
  Smartphone,
  Bell
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activePortal,
    setActivePortal,
    cart,
    wishlist,
    openWishlist,
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
    setIsLiveShoppingOpen,
    setIsLaunchChecklistOpen,
    openSellerStore,
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
    language
  } = useMarketplace();


  const { isInstallable, isInstalled } = usePWAInstall();
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4 lg:gap-6">
        {/* Zone 1: Brand Logo & Search Bar near Logo */}
        <div className="flex items-center gap-2.5 sm:gap-4 flex-1 min-w-0 max-w-xl">
          <button
            onClick={() => setActivePortal('customer')}
            className="text-left group flex items-center focus:outline-none transition-transform active:scale-98 shrink-0"
            aria-label="Prime Bazaar Home"
          >
            <div className="h-12 sm:h-15 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-2xl bg-white border border-zinc-200/90 shadow-xs flex items-center justify-center transition-all group-hover:shadow-md">
              <img
                src="/assets/aistudio/Prime_Bazaar_Shopping_Logo_0c82d149.png"
                alt="Prime Bazaar - Shop Smarter. Live Better."
                className="h-9 sm:h-12 md:h-13 w-auto object-contain transition-transform group-hover:scale-102"
              />
            </div>
          </button>

          {/* Search bar directly beside the logo */}
          {activePortal === 'customer' && (
            <div className="relative flex-1 min-w-[130px] max-w-xs sm:max-w-sm md:max-w-md flex items-center">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 sm:left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search kurti, jacket, sneakers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 sm:pl-9 pr-7 sm:pr-9 py-1.5 sm:py-2 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none transition-all shadow-2xs font-medium placeholder:text-zinc-400"
              />
              <button
                onClick={() => setIsVisualSearchOpen(true)}
                title="Search by image (AI visual match)"
                className="absolute right-1.5 sm:right-2.5 p-1 text-zinc-400 hover:text-emerald-600 transition-colors"
              >
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Zone 2: Navigation Links (adaptive for tablet and PC) */}
        <nav className="hidden lg:flex items-center gap-3 xl:gap-4 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          <button
            onClick={() => setActivePortal('customer')}
            className={`whitespace-nowrap transition-colors hover:text-rose-600 ${
              activePortal === 'customer' ? 'text-rose-600 font-bold' : ''
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => setIsLiveShoppingOpen(true)}
            className="flex items-center gap-1.5 whitespace-nowrap transition-colors text-rose-600 font-bold hover:text-rose-700"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span>Live</span>
          </button>
          <button
            onClick={() => openSellerStore('seller-1')}
            className="flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-emerald-600"
          >
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            <span>Stores</span>
          </button>
          <button
            onClick={() => setIsReelsOpen(true)}
            className="flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-rose-600"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Reels</span>
          </button>

          <button
            onClick={() => setIsCompareOpen(true)}
            className="hidden xl:flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-indigo-600"
            title="Side-by-Side Product Comparison"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Compare ({compareList.length})</span>
          </button>
          <button
            onClick={() => setIsRewardsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold whitespace-nowrap hover:bg-amber-100 transition-colors"
            title="Deals, Games & Rewards Hub (Spin the Wheel, Scratch Card, Flash Sale)"
          >
            <Coins className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="hidden md:inline">Deals & Games</span>
            <span className="md:hidden">Deals</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-mono">
              {coins}
            </span>
          </button>
          <button
            onClick={() => setIsOrdersOpen(true)}
            className="flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-zinc-900 dark:hover:text-white"
          >
            <Package className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Track Orders</span>
            <span className="xl:hidden">Orders</span>
          </button>

          <button
            onClick={() => setIsLaunchChecklistOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
            title="Section 12: 20/20 Acceptance Verification"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>20/20</span>
          </button>
        </nav>

        {/* Zone 3: Bag, Wishlist, Profile, Portals */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

          {/* Download Apps Tab Icon (always visible across phone, tablet, PC) */}
          <button
            onClick={() => setIsApkModalOpen(true)}
            title={
              isInstalled
                ? 'Prime Bazaar App Installed'
                : isInstallable
                ? '1-Tap Download & Install Prime Bazaar App'
                : 'Download Apps — Install Prime Bazaar App'
            }
            aria-label="Download Apps"
            className="relative flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-all active:scale-95 shrink-0"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">{isInstalled ? 'App Active' : 'Download Apps'}</span>
            <span className="sm:hidden text-[11px]">{isInstalled ? 'App' : 'Apps'}</span>
            {!isInstalled && isInstallable && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            )}
          </button>

          {/* Price-Drop Alerts Bell */}
          <button
            onClick={() => openWishlist()}
            title={`Price-Drop Alerts (${unreadPriceDropCount} new, ${priceAlerts.filter(a => a.status === 'ACTIVE').length} watching)`}
            aria-label="Price-Drop Notifications"
            className="relative p-2 text-zinc-600 dark:text-zinc-300 hover:text-amber-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            <Bell className={`w-4 h-4 ${unreadPriceDropCount > 0 ? 'text-amber-500 fill-amber-500 animate-bounce' : priceAlerts.length > 0 ? 'text-amber-500' : ''}`} />
            {unreadPriceDropCount > 0 ? (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center animate-scale-up">
                {unreadPriceDropCount}
              </span>
            ) : priceAlerts.some(a => a.status === 'ACTIVE') ? (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500"></span>
            ) : null}
          </button>

          {/* Wishlist count (visible on tablet and PC; docked in bottom bar on phone) */}
          <button
            onClick={() => openWishlist()}
            title="View Saved Wishlist"
            aria-label={`Wishlist (${wishlist.length} saved)`}
            className="hidden sm:flex relative p-2 text-zinc-600 dark:text-zinc-300 hover:text-rose-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Heart className={`w-4 h-4 ${wishlist.length > 0 ? 'text-rose-600' : ''}`} />
            {wishlist.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-scale-up">
                {wishlist.length}
              </span>
            )}
          </button>

          {/* Shopping Bag Drawer Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium text-xs hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bag</span>
            {totalCartItems > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none">
                {totalCartItems}
              </span>
            )}
          </button>

          {/* User Account / Profile Button (visible on tablet/PC; phone has bottom tab) */}
          <button
            onClick={() => {
              if (user?.isLoggedIn) {
                setIsProfileOpen(true);
              } else {
                setIsAuthOpen(true);
              }
            }}
            title={user?.isLoggedIn ? `Account (${user.name})` : 'Sign In'}
            className="hidden sm:flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold text-zinc-700 dark:text-zinc-200"
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
            <span className="hidden md:inline">
              {user?.isLoggedIn ? user.name.split(' ')[0] : 'Sign In'}
            </span>
          </button>

          {/* Merchant Partner Login / Sign Up Button */}
          <button
            onClick={() => openMerchantAuth('login')}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all shrink-0"
            title="Merchant Partner - Login or Register as Seller"
          >
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Merchant Partner</span>
            <span className="hidden sm:inline md:hidden">Partner</span>
            <span className="sm:hidden text-[11px]">Partner</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* Portal Switcher (visible on tablet and PC) */}
          <div className="hidden sm:block relative border-l border-zinc-200 dark:border-zinc-800 pl-2 sm:pl-3">
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
                <span className="hidden md:inline">Shop</span>
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
                <span className="hidden md:inline">Seller</span>
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
                <span className="hidden md:inline">Admin</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
