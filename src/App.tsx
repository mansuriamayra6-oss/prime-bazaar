import React from 'react';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext';
import { Header } from './components/Header';
import { ProductCatalog } from './components/ProductCatalog';
import { ProductDetailModal } from './components/ProductDetailModal';
import { TrendStreamModal } from './components/TrendStreamModal';
import { VisualSearchModal } from './components/VisualSearchModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrdersModal } from './components/OrdersModal';
import { RewardsModal } from './components/RewardsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { CompareModal } from './components/CompareModal';
import { VirtualTryOnModal } from './components/VirtualTryOnModal';
import { SupportChatModal } from './components/SupportChatModal';
import { BlueprintProgressModal } from './components/BlueprintProgressModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { SellerStorefrontModal } from './components/SellerStorefrontModal';
import { LiveShoppingModal } from './components/LiveShoppingModal';
import { BuyerSellerChatModal } from './components/BuyerSellerChatModal';
import { LaunchChecklistModal } from './components/LaunchChecklistModal';
import { MerchantPartnerModal } from './components/seller/MerchantPartnerModal';
import { SellerDashboard } from './components/seller/SellerDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AndroidInstallSheet } from './components/android/AndroidInstallSheet';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Footer } from './components/Footer';

import { 
  Sparkles, 
  Play, 
  ShoppingBag, 
  Package, 
  Coins, 
  CheckCircle2, 
  X,
  Layers,
  Shirt,
  Database,
  Heart,
  User
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { 
    activePortal, 
    setActivePortal, 
    notification, 
    setIsReelsOpen, 
    setIsCartOpen, 
    setIsOrdersOpen, 
    setIsRewardsOpen,
    setIsBlueprintOpen,
    setIsArchitectureOpen,
    setIsLiveShoppingOpen,
    setIsLaunchChecklistOpen,
    openWishlist,
    openTryOn,
    setIsProfileOpen,
    setIsAuthOpen,
    isApkModalOpen,
    setIsApkModalOpen,
    notify,
    user,
    wishlist,
    products,
    cart 
  } = useMarketplace();

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const isWishlistToast = notification && (notification.toLowerCase().includes('wishlist') || notification.includes('❤️'));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-70 transition-all duration-300 pointer-events-auto">
          <div className="px-4 py-2.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold shadow-2xl flex items-center gap-2.5 border border-zinc-700/60 dark:border-zinc-300/80 backdrop-blur-md">
            {isWishlistToast ? (
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0 animate-scale-up" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            )}
            <span>{notification}</span>
            {isWishlistToast && (
              <button
                type="button"
                onClick={() => openWishlist()}
                className="ml-1 pl-2 border-l border-zinc-700 dark:border-zinc-300 text-rose-400 dark:text-rose-600 font-bold hover:underline shrink-0 text-[11px]"
              >
                View Wishlist
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Top Header */}
      <Header />

      {/* Main View Router */}
      <main className="flex-1 pb-20 md:pb-8">
        {activePortal === 'customer' && (
          <div>
            <ProductCatalog />

            {/* Video Shopping & Live Stream Teaser Ribbon */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-10 space-y-4">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-900 via-indigo-950 to-zinc-950 p-6 sm:p-10 text-white flex flex-col sm:flex-row items-center justify-between gap-6 border border-rose-500/20 shadow-xl">
                <div className="space-y-2 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/30 text-rose-300 text-[11px] font-bold uppercase tracking-wider border border-rose-500/40">
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                      Live Social Commerce
                    </span>
                    <span className="text-xs text-zinc-400 hidden sm:inline">• 1,420 Shoppers Watching</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold font-display">
                    Watch Verified Stylists & Weavers Demonstrate Live Drops
                  </h3>
                  <p className="text-xs text-zinc-300 max-w-lg">
                    Interact directly with sellers, ask real-time fit questions, and tap pinned flash deals to purchase without leaving the stream.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 shrink-0">
                  <button
                    onClick={() => setIsLiveShoppingOpen(true)}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    <span>Watch Live Shopping Drop</span>
                  </button>

                  <button
                    onClick={() => openTryOn(products[0])}
                    className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 font-bold text-xs flex items-center gap-2 backdrop-blur-md transition-all active:scale-95"
                  >
                    <Shirt className="w-4 h-4 text-rose-400" />
                    <span>AI Virtual Fit</span>
                  </button>

                  <button
                    onClick={() => setIsReelsOpen(true)}
                    className="px-5 py-3 rounded-2xl bg-white text-zinc-900 font-bold text-xs flex items-center gap-2 shadow-lg hover:bg-zinc-100 transition-all active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-zinc-900 text-zinc-900" />
                    <span>Reels Feed</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePortal === 'seller' && <SellerDashboard />}

        {activePortal === 'admin' && <AdminDashboard />}
      </main>

      {/* Floating Blueprint, Architecture & Acceptance 20/20 Toolbar (Tablet & Desktop only) */}
      <div className="fixed bottom-6 left-4 z-40 hidden sm:flex items-center gap-2">
        <button
          onClick={() => setIsLaunchChecklistOpen(true)}
          className="px-3.5 py-2.5 rounded-2xl bg-emerald-900/90 hover:bg-emerald-800 text-white dark:bg-emerald-950 dark:hover:bg-emerald-900 backdrop-blur-md shadow-xl border border-emerald-500/50 flex items-center gap-2 text-xs font-extrabold hover:scale-105 transition-all"
          title="Section 12: 20/20 Acceptance Checklist"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">20/20 Acceptance</span>
          <span className="sm:hidden">20/20</span>
        </button>

        <button
          onClick={() => setIsArchitectureOpen(true)}
          className="px-3 py-2.5 rounded-2xl bg-indigo-950/90 dark:bg-indigo-100/90 text-indigo-300 dark:text-indigo-900 backdrop-blur-md shadow-xl border border-indigo-700/50 dark:border-indigo-300/50 flex items-center gap-1.5 text-xs font-bold hover:scale-105 transition-all"
          title="Inspect System Topology, PostgreSQL ERD, Prisma Schema & REST API Spec"
        >
          <Database className="w-4 h-4 text-indigo-400 dark:text-indigo-600" />
          <span className="hidden sm:inline">28 Tables & ERD</span>
          <span className="sm:hidden">ERD</span>
        </button>

        <button
          onClick={() => setIsBlueprintOpen(true)}
          className="px-3 py-2.5 rounded-2xl bg-zinc-900/90 dark:bg-white/90 text-white dark:text-zinc-900 backdrop-blur-md shadow-xl border border-zinc-700/50 dark:border-zinc-300/50 flex items-center gap-1.5 text-xs font-bold hover:scale-105 transition-all"
          title="View 58-Feature SRS Architecture Progress"
        >
          <Layers className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span className="hidden sm:inline">SRS 58/58</span>
        </button>
      </div>

      {/* Footer */}
      <Footer />

      {/* Modals and Drawers */}
      <ProductDetailModal />
      <TrendStreamModal />
      <VisualSearchModal />
      <CartDrawer />
      <CheckoutModal />
      <OrdersModal />
      <RewardsModal />
      <OnboardingModal />
      <AuthModal />
      <ProfileModal />
      <CompareModal />
      <VirtualTryOnModal />
      <SupportChatModal />
      <BlueprintProgressModal />
      <ArchitectureModal />
      <SellerStorefrontModal />
      <LiveShoppingModal />
      <BuyerSellerChatModal />
      <LaunchChecklistModal />
      <MerchantPartnerModal />
      <AndroidInstallSheet
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
        onNotify={notify}
      />
      <OfflineIndicator />


      {/* Native Mobile Bottom App Navigation Bar (Phone viewport only, auto-hides on PC/Tablet) */}
      <nav 
        aria-label="Mobile Bottom App Bar"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-5 items-center h-16 px-1 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]"
      >
        <button
          onClick={() => setActivePortal('customer')}
          className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-90 ${
            activePortal === 'customer' 
              ? 'text-emerald-600 dark:text-emerald-400 font-bold' 
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Discover</span>
        </button>

        <button
          onClick={() => setIsReelsOpen(true)}
          className="flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-rose-600 transition-all active:scale-90"
        >
          <Play className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">Reels</span>
        </button>

        <button
          onClick={() => openWishlist()}
          className="relative flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-rose-600 transition-all active:scale-90"
        >
          <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'text-rose-600 fill-rose-600' : ''}`} />
          <span className="text-[10px] font-medium tracking-tight">Wishlist</span>
          {wishlist.length > 0 && (
            <span className="absolute top-0 right-3.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center animate-scale-up">
              {wishlist.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-emerald-600 transition-all active:scale-90"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">Bag</span>
          {cartCount > 0 && (
            <span className="absolute top-0 right-3.5 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center animate-scale-up">
              {cartCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            if (user?.isLoggedIn) {
              setIsProfileOpen(true);
            } else {
              setIsAuthOpen(true);
            }
          }}
          className="flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all active:scale-90"
        >
          {user?.isLoggedIn && user.avatar ? (
            <img src={user.avatar} alt="Profile" className="w-5 h-5 rounded-full object-cover border border-emerald-500" />
          ) : (
            <User className="w-5 h-5" />
          )}
          <span className="text-[10px] font-medium tracking-tight">{user?.isLoggedIn ? 'Account' : 'Sign In'}</span>
        </button>
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <MarketplaceProvider>
      <AppContent />
    </MarketplaceProvider>
  );
}
