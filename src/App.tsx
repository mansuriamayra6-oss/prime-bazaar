import React, { Component, Suspense, lazy, useEffect, useRef } from 'react';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext';
import { Header } from './components/Header';
import { CategoryBar } from './components/CategoryBar';
import { HeroBanner } from './components/HeroBanner';
import { ProductCatalog } from './components/ProductCatalog';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Footer } from './components/Footer';
import { initDeepLinks } from './utils/nativeBridge';

import {
  Play,
  ShoppingBag,
  CheckCircle2,
  Layers,
  Shirt,
  Database,
  Heart,
  Home,
  LayoutGrid,
  Search,
} from 'lucide-react';

// Phase 7C: Route / Portal / Modal Code-Splitting via React.lazy
const ProductDetailModal = lazy(() =>
  import('./components/ProductDetailModal').then(m => ({ default: m.ProductDetailModal }))
);
const TrendStreamModal = lazy(() =>
  import('./components/TrendStreamModal').then(m => ({ default: m.TrendStreamModal }))
);
const VisualSearchModal = lazy(() =>
  import('./components/VisualSearchModal').then(m => ({ default: m.VisualSearchModal }))
);
const CartDrawer = lazy(() =>
  import('./components/CartDrawer').then(m => ({ default: m.CartDrawer }))
);
const CheckoutModal = lazy(() =>
  import('./components/CheckoutModal').then(m => ({ default: m.CheckoutModal }))
);
const OrdersModal = lazy(() =>
  import('./components/OrdersModal').then(m => ({ default: m.OrdersModal }))
);
const RewardsModal = lazy(() =>
  import('./components/RewardsModal').then(m => ({ default: m.RewardsModal }))
);
const OnboardingModal = lazy(() =>
  import('./components/OnboardingModal').then(m => ({ default: m.OnboardingModal }))
);
const AuthModal = lazy(() =>
  import('./components/AuthModal').then(m => ({ default: m.AuthModal }))
);
const ProfileModal = lazy(() =>
  import('./components/ProfileModal').then(m => ({ default: m.ProfileModal }))
);
const CompareModal = lazy(() =>
  import('./components/CompareModal').then(m => ({ default: m.CompareModal }))
);
const VirtualTryOnModal = lazy(() =>
  import('./components/VirtualTryOnModal').then(m => ({ default: m.VirtualTryOnModal }))
);
const SupportChatModal = lazy(() =>
  import('./components/SupportChatModal').then(m => ({ default: m.SupportChatModal }))
);
const BlueprintProgressModal = lazy(() =>
  import('./components/BlueprintProgressModal').then(m => ({ default: m.BlueprintProgressModal }))
);
const ArchitectureModal = lazy(() =>
  import('./components/ArchitectureModal').then(m => ({ default: m.ArchitectureModal }))
);
const SellerStorefrontModal = lazy(() =>
  import('./components/SellerStorefrontModal').then(m => ({ default: m.SellerStorefrontModal }))
);
const LiveShoppingModal = lazy(() =>
  import('./components/LiveShoppingModal').then(m => ({ default: m.LiveShoppingModal }))
);
const BuyerSellerChatModal = lazy(() =>
  import('./components/BuyerSellerChatModal').then(m => ({ default: m.BuyerSellerChatModal }))
);
const LaunchChecklistModal = lazy(() =>
  import('./components/LaunchChecklistModal').then(m => ({ default: m.LaunchChecklistModal }))
);
const MerchantPartnerModal = lazy(() =>
  import('./components/seller/MerchantPartnerModal').then(m => ({ default: m.MerchantPartnerModal }))
);
const SellerDashboard = lazy(() =>
  import('./components/seller/SellerDashboard').then(m => ({ default: m.SellerDashboard }))
);
const AdminDashboard = lazy(() =>
  import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard }))
);
const AndroidInstallSheet = lazy(() =>
  import('./components/android/AndroidInstallSheet').then(m => ({ default: m.AndroidInstallSheet }))
);
const MarketplaceInfoModal = lazy(() =>
  import('./components/MarketplaceInfoModal').then(m => ({ default: m.MarketplaceInfoModal }))
);

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || 'Unexpected UI error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 text-center">
          <div className="max-w-md p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-lg">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Something went wrong</h2>
            <p className="text-xs text-zinc-500">{this.state.message}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold"
            >
              Reload Marketplace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const PortalLoader: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-zinc-500">
    Loading marketplace module...
  </div>
);

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
    setIsVisualSearchOpen,
    setIsCheckoutOpen,
    setSelectedProduct,
    selectedProduct,
    navigateCategory,
    setDiscoveryTab,
    setIsMobileCategoriesOpen,
    setInfoModalPage,
    openWishlist,
    openTryOn,
    openSellerStore,
    user,
    setIsProfileOpen,
    setIsAuthOpen,
    isApkModalOpen,
    setIsApkModalOpen,
    notify,
    wishlist,
    products,
    cart,
  } = useMarketplace();

  const pendingDeepLinkRef = useRef<'orders' | 'account' | null>(null);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const isWishlistToast =
    notification && (notification.toLowerCase().includes('wishlist') || notification.includes('❤️'));

  useEffect(() => {
    if (user?.isLoggedIn && pendingDeepLinkRef.current) {
      const pending = pendingDeepLinkRef.current;
      pendingDeepLinkRef.current = null;
      if (pending === 'orders') {
        setActivePortal('customer');
        setIsOrdersOpen(true);
      } else if (pending === 'account') {
        setActivePortal('customer');
        setIsProfileOpen(true);
      }
    }
  }, [user?.isLoggedIn]);

  // Phase 7B & 7D: Capacitor Deep Link listener + Global Escape-to-close keyboard navigation
  useEffect(() => {
    const cleanupDeepLinks = initDeepLinks({
      onProductLink: (productId) => {
        const found = products.find(p => p.id === productId);
        if (found) {
          setActivePortal('customer');
          setSelectedProduct(found);
        }
      },
      onCategoryLink: (slug) => {
        setActivePortal('customer');
        navigateCategory(slug);
      },
      onSellerLink: (sellerId) => {
        setActivePortal('customer');
        openSellerStore(sellerId);
      },
      onCartLink: () => {
        setActivePortal('customer');
        setIsCartOpen(true);
      },
      onOrdersLink: () => {
        setActivePortal('customer');
        if (!user?.isLoggedIn) {
          pendingDeepLinkRef.current = 'orders';
          setIsAuthOpen(true);
          notify('Sign in to view your orders.');
          return;
        }
        setIsOrdersOpen(true);
      },
      onPromotionsLink: () => {
        setActivePortal('customer');
        setDiscoveryTab('flash');
      },
      onAccountLink: () => {
        setActivePortal('customer');
        if (!user?.isLoggedIn) {
          pendingDeepLinkRef.current = 'account';
          setIsAuthOpen(true);
          notify('Sign in to manage your account and security settings.');
          return;
        }
        setIsProfileOpen(true);
      },
      onBackDismiss: () => {
        if (selectedProduct) {
          setSelectedProduct(null);
          return true;
        }
        return false;
      },
    });

    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setSelectedProduct(null);
      setIsCartOpen(false);
      setIsCheckoutOpen(false);
      setIsOrdersOpen(false);
      setIsRewardsOpen(false);
      setIsProfileOpen(false);
      setIsVisualSearchOpen(false);
      setIsReelsOpen(false);
      setIsAuthOpen(false);
      setIsBlueprintOpen(false);
      setIsArchitectureOpen(false);
      setIsLiveShoppingOpen(false);
      setIsLaunchChecklistOpen(false);
      setIsApkModalOpen(false);
      setIsMobileCategoriesOpen(false);
      setInfoModalPage(null);
    };
    window.addEventListener('keydown', onEscape);

    return () => {
      cleanupDeepLinks();
      window.removeEventListener('keydown', onEscape);
    };
  }, [products, user?.isLoggedIn]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      {/* Phase 7D: Keyboard Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-90 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-zinc-900 focus:text-white focus:text-xs focus:font-bold"
      >
        Skip to main content
      </a>

      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-70 transition-all duration-300 pointer-events-auto"
        >
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
      <main id="main-content" className="flex-1 pb-20 md:pb-8">
        {activePortal === 'customer' && (
          <div>
            <CategoryBar />
            <HeroBanner />
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
                  <h2 className="text-xl sm:text-2xl font-bold font-display">
                    Watch Verified Stylists & Weavers Demonstrate Live Drops
                  </h2>
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
                    onClick={() => products[0] && openTryOn(products[0])}
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

        <Suspense fallback={<PortalLoader />}>
          {activePortal === 'seller' && <SellerDashboard />}
          {activePortal === 'admin' && <AdminDashboard />}
        </Suspense>
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

      {/* Lazy-Loaded Modals and Drawers */}
      <Suspense fallback={null}>
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
        <MarketplaceInfoModal />
      </Suspense>
      <OfflineIndicator />

      {/* Native Mobile Bottom App Navigation Bar (Home, Categories, Search, Wishlist, Cart) */}
      <nav
        aria-label="Mobile Bottom App Bar"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-t border-slate-200 dark:border-zinc-800 grid grid-cols-5 items-center h-16 px-1 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]"
      >
        <button
          type="button"
          onClick={() => {
            setActivePortal('customer');
            navigateCategory('all', null);
            setDiscoveryTab('all');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center gap-1 min-h-[44px] transition-all active:scale-90 ${
            activePortal === 'customer'
              ? 'text-orange-600 dark:text-orange-400 font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Home</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActivePortal('customer');
            setIsMobileCategoriesOpen(true);
          }}
          className="flex flex-col items-center justify-center gap-1 min-h-[44px] text-slate-500 hover:text-orange-600 transition-all active:scale-90"
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">Categories</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActivePortal('customer');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => {
              const input = document.getElementById('pb-main-search') as HTMLInputElement | null;
              input?.focus();
            }, 220);
          }}
          className="flex flex-col items-center justify-center gap-1 min-h-[44px] text-slate-500 hover:text-orange-600 transition-all active:scale-90"
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">Search</span>
        </button>

        <button
          type="button"
          onClick={() => openWishlist()}
          className="relative flex flex-col items-center justify-center gap-1 min-h-[44px] text-slate-500 hover:text-rose-600 transition-all active:scale-90"
        >
          <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'text-rose-600 fill-rose-600' : ''}`} />
          <span className="text-[10px] font-medium tracking-tight">Wishlist</span>
          {wishlist.length > 0 && (
            <span className="absolute top-0.5 right-3.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
              {wishlist.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center justify-center gap-1 min-h-[44px] text-slate-500 hover:text-orange-600 transition-all active:scale-90"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">Cart</span>
          {cartCount > 0 && (
            <span className="absolute top-0.5 right-3.5 w-4 h-4 rounded-full bg-orange-600 text-white text-[9px] font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <AppErrorBoundary>
      <MarketplaceProvider>
        <AppContent />
      </MarketplaceProvider>
    </AppErrorBoundary>
  );
}
