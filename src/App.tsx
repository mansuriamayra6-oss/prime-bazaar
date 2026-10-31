import React from 'react';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategoryBar } from './components/CategoryBar';
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
import { SellerDashboard } from './components/seller/SellerDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Footer } from './components/Footer';
import { AndroidDeviceWrapper } from './components/android/AndroidDeviceWrapper';
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
  Database
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
    openTryOn,
    products,
    cart 
  } = useMarketplace();

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-4 py-2.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold shadow-2xl flex items-center gap-2 border border-zinc-700/50">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      {/* Main Top Header */}
      <Header />

      {/* Main View Router */}
      <main className="flex-1 pb-16 md:pb-0">
        {activePortal === 'customer' && (
          <div>
            <HeroBanner />
            <CategoryBar />
            <ProductCatalog />

            {/* Video Shopping & Try-On Teaser Ribbon */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-10 space-y-4">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-900 via-indigo-950 to-zinc-950 p-6 sm:p-10 text-white flex flex-col sm:flex-row items-center justify-between gap-6 border border-rose-500/20 shadow-xl">
                <div className="space-y-2 text-center sm:text-left">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                    Live Social Commerce
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold font-display">
                    Watch Verified Stylists Try On Today’s Drops
                  </h3>
                  <p className="text-xs text-zinc-300 max-w-lg">
                    Discover fit reviews, styling tips, and tap directly to add looks into your bag without interrupting the stream.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => openTryOn(products[0])}
                    className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 font-bold text-xs flex items-center gap-2 backdrop-blur-md transition-all active:scale-95"
                  >
                    <Shirt className="w-4 h-4 text-rose-400" />
                    <span>AI Virtual Fit Room</span>
                  </button>

                  <button
                    onClick={() => setIsReelsOpen(true)}
                    className="px-6 py-3 rounded-2xl bg-white text-zinc-900 font-bold text-xs flex items-center gap-2 shadow-lg hover:bg-zinc-100 transition-all active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-zinc-900 text-zinc-900" />
                    <span>Launch TrendStream Feed</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePortal === 'seller' && <SellerDashboard />}

        {activePortal === 'admin' && <AdminDashboard />}
      </main>

      {/* Floating Blueprint & Architecture FAB (Bottom Left) */}
      <div className="fixed bottom-20 md:bottom-6 left-4 z-40 flex items-center gap-2">
        <button
          onClick={() => setIsBlueprintOpen(true)}
          className="px-3.5 py-2.5 rounded-2xl bg-zinc-900/90 dark:bg-white/90 text-white dark:text-zinc-900 backdrop-blur-md shadow-xl border border-zinc-700/50 dark:border-zinc-300/50 flex items-center gap-2 text-xs font-bold hover:scale-105 transition-all"
          title="View 58-Feature SRS Architecture Progress"
        >
          <Layers className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span className="hidden sm:inline">SRS Progress: 100% (58/58)</span>
          <span className="sm:hidden">SRS 58/58</span>
        </button>

        <button
          onClick={() => setIsArchitectureOpen(true)}
          className="px-3 py-2.5 rounded-2xl bg-indigo-950/90 dark:bg-indigo-100/90 text-indigo-300 dark:text-indigo-900 backdrop-blur-md shadow-xl border border-indigo-700/50 dark:border-indigo-300/50 flex items-center gap-1.5 text-xs font-bold hover:scale-105 transition-all"
          title="Inspect System Topology, PostgreSQL ERD, Prisma Schema & REST API Spec"
        >
          <Database className="w-4 h-4 text-indigo-400 dark:text-indigo-600" />
          <span className="hidden sm:inline">DB & Architecture</span>
          <span className="sm:hidden">ERD</span>
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

      {/* Mobile Bottom Navigation Bar (Docked right above Android System bar) */}
      <div className="sticky bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-4 items-center h-16 px-2 shadow-lg">
        <button
          onClick={() => setActivePortal('customer')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activePortal === 'customer' ? 'text-emerald-600 font-bold' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Discover</span>
        </button>

        <button
          onClick={() => setIsReelsOpen(true)}
          className="flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-rose-600 transition-colors"
        >
          <Play className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">Reels</span>
        </button>

        <button
          onClick={() => setIsRewardsOpen(true)}
          className="flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-amber-500 transition-colors"
        >
          <Coins className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">Coins</span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-emerald-600 transition-colors"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">Bag</span>
          {cartCount > 0 && (
            <span className="absolute top-1 right-5 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <MarketplaceProvider>
      <AndroidDeviceWrapper>
        <AppContent />
      </AndroidDeviceWrapper>
    </MarketplaceProvider>
  );
}
