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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-6">
        {/* Zone 1: Brand Logo & Search Bar near Logo */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xl">
          <button
            onClick={() => setActivePortal('customer')}
            className="text-left group flex items-center focus:outline-none transition-transform active:scale-98 shrink-0"
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

          {/* Search bar directly beside the logo */}
          {activePortal === 'customer' && (
            <div className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md flex items-center">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search kurti, jacket, sneakers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none transition-all shadow-2xs font-medium placeholder:text-zinc-400"
              />
              <button
                onClick={() => setIsVisualSearchOpen(true)}
                title="Search by image (AI visual match)"
                className="absolute right-2.5 p-1 text-zinc-400 hover:text-emerald-600 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden xl:flex items-center gap-4 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
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
            <span>Live Shopping</span>
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
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>Coins ({coins})</span>
          </button>
          <button
            onClick={() => setIsOrdersOpen(true)}
            className="flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-zinc-900 dark:hover:text-white"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Track Orders</span>
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
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">

          {/* Wishlist count */}
          <button
            onClick={() => openWishlist()}
            title="View Saved Wishlist"
            aria-label={`Wishlist (${wishlist.length} saved)`}
            className="relative p-2 text-zinc-600 dark:text-zinc-300 hover:text-rose-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
