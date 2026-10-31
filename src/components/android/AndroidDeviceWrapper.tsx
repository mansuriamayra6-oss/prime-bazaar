import React, { useState, useRef } from 'react';
import { 
  Smartphone, 
  Monitor, 
  Wifi, 
  Signal, 
  RotateCcw, 
  Download, 
  Layers, 
  SlidersHorizontal,
  ChevronDown,
  Info
} from 'lucide-react';
import { AndroidStatusBar } from './AndroidStatusBar';
import { AndroidNavBar } from './AndroidNavBar';
import { AndroidRecentsModal } from './AndroidRecentsModal';
import { AndroidInstallSheet } from './AndroidInstallSheet';
import { useMarketplace } from '../../context/MarketplaceContext';

interface AndroidDeviceWrapperProps {
  children: React.ReactNode;
}

export const AndroidDeviceWrapper: React.FC<AndroidDeviceWrapperProps> = ({ children }) => {
  const { 
    notification, 
    notify,
    setActivePortal, 
    activePortal,
    setIsReelsOpen,
    setIsCartOpen,
    setIsOrdersOpen,
    setIsRewardsOpen,
    setIsBlueprintOpen,
    setIsArchitectureOpen,
    setSelectedProduct,
    setIsAuthOpen,
    setIsOnboardingOpen,
    setIsProfileOpen,
    setIsCompareOpen,
    setIsTryOnOpen,
    setIsVisualSearchOpen,
    setIsSupportOpen
  } = useMarketplace();

  // Mode: phone shell (Android handset) vs full responsive web
  const [deviceMode, setDeviceMode] = useState<'phone' | 'expanded'>('phone');
  const [networkType, setNetworkType] = useState<'5G' | '4G' | 'Wi-Fi'>('5G');
  const [navStyle, setNavStyle] = useState<'buttons' | 'gesture'>('buttons');
  const [isRecentsOpen, setIsRecentsOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);

  const phoneScrollRef = useRef<HTMLDivElement>(null);

  // Close top-level modals on Android Back action
  const handleAndroidBack = () => {
    // Check if any modal is open and close it in order of priority
    setIsReelsOpen(false);
    setIsCartOpen(false);
    setIsOrdersOpen(false);
    setIsRewardsOpen(false);
    setIsBlueprintOpen(false);
    setIsArchitectureOpen(false);
    setSelectedProduct(null);
    setIsAuthOpen(false);
    setIsOnboardingOpen(false);
    setIsProfileOpen(false);
    setIsCompareOpen(false);
    setIsTryOnOpen(false);
    setIsVisualSearchOpen(false);
    setIsSupportOpen(false);
    setIsRecentsOpen(false);

    if (activePortal !== 'customer') {
      setActivePortal('customer');
      notify('Returned to Customer Discover');
    }
  };

  const handleAndroidHome = () => {
    handleAndroidBack();
    setActivePortal('customer');
    if (phoneScrollRef.current) {
      phoneScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAndroidRecents = () => {
    setIsRecentsOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Android Platform Switcher Bar */}
      <header className="w-full bg-zinc-900/90 border-b border-zinc-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-extrabold text-zinc-100 font-display tracking-tight text-sm">
              Prime Bazaar
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 font-bold text-[10px] border border-emerald-800/50">
              Android Edition (OS 14)
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-zinc-400 border-l border-zinc-700/60 pl-3">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Target: Google Pixel 8 / Galaxy S24</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Network Switcher */}
          <div className="flex items-center bg-zinc-800/80 rounded-xl p-1 border border-zinc-700/60">
            <button
              onClick={() => setNetworkType('5G')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                networkType === '5G' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              5G
            </button>
            <button
              onClick={() => setNetworkType('Wi-Fi')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                networkType === 'Wi-Fi' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Wi-Fi
            </button>
          </div>

          {/* Navigation Bar Style (Buttons vs Gesture) */}
          <button
            onClick={() => setNavStyle(navStyle === 'buttons' ? 'gesture' : 'buttons')}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-[11px] flex items-center gap-1.5 border border-zinc-700 transition-all active:scale-95"
            title="Toggle Android 3-Button or Gesture Bar"
          >
            <span>{navStyle === 'buttons' ? '◀ ● ◾ 3-Button' : '━ Gesture Pill'}</span>
          </button>

          {/* Device Frame Viewport Toggle */}
          <div className="flex items-center bg-zinc-800/80 rounded-xl p-1 border border-zinc-700/60">
            <button
              onClick={() => setDeviceMode('phone')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all ${
                deviceMode === 'phone'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="View in Android Phone Frame"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android Frame</span>
            </button>
            <button
              onClick={() => setDeviceMode('expanded')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all ${
                deviceMode === 'expanded'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="View Fullscreen Responsive"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Full View</span>
            </button>
          </div>

          {/* Install Android APK Button */}
          <button
            onClick={() => setIsInstallOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-extrabold text-[11px] flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Install Android APK</span>
            <span className="md:hidden">APK</span>
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <div className="flex-1 flex items-center justify-center p-0 md:p-6 bg-zinc-950/95 overflow-hidden relative">
        {deviceMode === 'phone' ? (
          /* Android Handset Phone Chassis */
          <div className="relative w-full max-w-[430px] h-[100dvh] md:h-[880px] bg-zinc-900 rounded-none md:rounded-[48px] p-0 md:p-3 shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-0 md:border-[10px] md:border-zinc-800 ring-1 ring-zinc-700/40 flex flex-col overflow-hidden">
            
            {/* Phone Top Speaker Grill (Visible on phone chassis) */}
            <div className="hidden md:flex justify-center py-0.5">
              <div className="w-16 h-1 rounded-full bg-zinc-700/80" />
            </div>

            {/* Android Device Screen */}
            <div className="relative flex-1 bg-zinc-50 dark:bg-zinc-950 rounded-none md:rounded-[36px] overflow-hidden flex flex-col shadow-inner">
              
              {/* Android Status Bar */}
              <AndroidStatusBar 
                batteryLevel={94} 
                networkType={networkType} 
                hasNotification={!!notification}
                notificationText={notification}
              />

              {/* Scrollable Screen Content */}
              <div 
                ref={phoneScrollRef}
                className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth no-scrollbar"
              >
                {children}
              </div>

              {/* Android System Navigation Bar */}
              <AndroidNavBar 
                navStyle={navStyle}
                onBack={handleAndroidBack}
                onHome={handleAndroidHome}
                onRecents={handleAndroidRecents}
                onToggleNavStyle={() => setNavStyle(navStyle === 'buttons' ? 'gesture' : 'buttons')}
              />

              {/* Android Recents Multitasking Modal */}
              <AndroidRecentsModal 
                isOpen={isRecentsOpen}
                onClose={() => setIsRecentsOpen(false)}
              />
            </div>
          </div>
        ) : (
          /* Expanded Fullscreen Mode */
          <div className="w-full h-full flex flex-col flex-1 overflow-y-auto relative">
            <AndroidStatusBar 
              batteryLevel={98} 
              networkType={networkType} 
              hasNotification={!!notification}
              notificationText={notification}
            />
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
            <AndroidNavBar 
              navStyle={navStyle}
              onBack={handleAndroidBack}
              onHome={handleAndroidHome}
              onRecents={handleAndroidRecents}
              onToggleNavStyle={() => setNavStyle(navStyle === 'buttons' ? 'gesture' : 'buttons')}
            />
            <AndroidRecentsModal 
              isOpen={isRecentsOpen}
              onClose={() => setIsRecentsOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Android Play Store / WebAPK Install Modal */}
      <AndroidInstallSheet 
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
        onNotify={(msg) => notify(msg)}
      />
    </div>
  );
};
