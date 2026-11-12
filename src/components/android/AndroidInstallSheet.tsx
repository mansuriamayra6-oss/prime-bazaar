import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Star,
  ShieldCheck,
  Share2,
  CheckCircle2,
  Smartphone,
  Copy,
  MoreVertical,
  Share,
  PlusSquare,
  AlertCircle,
  RefreshCw,
  Monitor,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface AndroidInstallSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export const AndroidInstallSheet: React.FC<AndroidInstallSheetProps> = ({
  isOpen,
  onClose,
  onNotify,
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    swReady,
    manifestValid,
    recheckReadiness,
    install,
  } = usePWAInstall();

  const [isPrompting, setIsPrompting] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [guideTab, setGuideTab] = useState<'android' | 'desktop' | 'ios'>(() =>
    isIOS ? 'ios' : isAndroid ? 'android' : 'android'
  );

  useEffect(() => {
    if (isOpen) {
      recheckReadiness();
    }
  }, [isOpen, recheckReadiness]);

  useEffect(() => {
    if (isIOS) setGuideTab('ios');
    else if (isAndroid) setGuideTab('android');
  }, [isIOS, isAndroid]);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isPrivateDevHost =
    typeof window !== 'undefined' && window.location.hostname.startsWith('ais-dev-');
  const shareUrl = currentOrigin;

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsPrompting(true);
      setPromptDismissed(false);
      const outcome = await install();
      setIsPrompting(false);

      if (outcome === 'accepted') {
        onNotify('Prime Bazaar installed! You can now launch it from your home screen.');
        return;
      }
      if (outcome === 'dismissed') {
        setPromptDismissed(true);
        onNotify('Install prompt dismissed. You can install anytime from the Download Apps tab or browser menu.');
        return;
      }
    }

    await recheckReadiness();
    if (isInIframe) {
      onNotify('Preview frames block direct install. Open via the top Share/Preview link, then tap Install.');
    } else if (isIOS) {
      onNotify('In Safari, tap Share → Add to Home Screen to install Prime Bazaar.');
    } else {
      onNotify('Tap Chrome menu (⋮) → Install app / Add to Home screen to install.');
    }
  };

  const handleCopyUrl = async () => {
    if (isPrivateDevHost) {
      onNotify('Private preview URL cannot be opened directly (403). Use the Share App button in AI Studio toolbar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onNotify('App URL copied! Open in Chrome on Android or Desktop to install.');
    } catch {
      onNotify('Copy failed. Use your browser address bar to share this app.');
    }
  };

  const handleShare = async () => {
    if (isPrivateDevHost) {
      onNotify('Use the Share App button in the AI Studio toolbar to get a shareable URL.');
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Prime Bazaar App',
          text: 'Install Prime Bazaar — India’s social fashion & wholesale shopping app!',
          url: shareUrl,
        });
        onNotify('App link shared successfully!');
        return;
      } catch {
        // User cancelled share
      }
    }
    await handleCopyUrl();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Download Apps · Android &amp; Desktop
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close app installer"
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* App Title & Logo */}
        <div className="flex items-start gap-4">
          <img
            src="/pwa-192x192.png"
            alt="Prime Bazaar App Icon"
            className="w-16 h-16 rounded-2xl object-contain shadow-md bg-white p-1 border border-zinc-200 dark:border-zinc-700 shrink-0"
          />
          <div className="flex-1 space-y-1">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-display leading-tight">
              Prime Bazaar: Online Shopping
            </h3>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Prime Bazaar Retail Pvt. Ltd.
            </p>
            <p className="text-[11px] text-zinc-500">
              Standalone App · Offline Catalog · Push Price Alerts
            </p>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-800 py-2 border-y border-zinc-100 dark:border-zinc-800 text-center">
          <div className="space-y-0.5">
            <div className="flex items-center justify-center gap-1 text-xs font-bold text-zinc-900 dark:text-zinc-100">
              <span>4.8</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </div>
            <div className="text-[10px] text-zinc-500">1.2M reviews</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              WebAPK
            </div>
            <div className="text-[10px] text-zinc-500">Instant Install</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              50M+
            </div>
            <div className="text-[10px] text-zinc-500">Shoppers</div>
          </div>
        </div>

        {/* Live Browser Readiness Diagnostics */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                swReady ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
              {swReady ? 'Service Worker Active' : 'Registering Worker'}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                manifestValid && (isInstalled || isInstallable)
                  ? 'bg-emerald-500'
                  : manifestValid
                  ? 'bg-sky-500'
                  : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
              {isInstalled
                ? 'Installed Mode'
                : isInstallable
                ? '1-Tap Install Ready'
                : isInIframe
                ? 'Preview Frame'
                : manifestValid
                ? 'Manifest Verified'
                : 'Checking Manifest'}
            </span>
          </div>
        </div>

        {/* Already Installed Banner */}
        {isInstalled && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Prime Bazaar is already installed!</p>
              <p className="text-[11px] opacity-85 mt-0.5">
                You are running the standalone mobile/desktop app experience.
              </p>
            </div>
          </div>
        )}

        {/* Embedded Preview Frame Notice (no 403 target="_blank" link) */}
        {!isInstalled && isInIframe && !isInstallable && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Running Inside Preview Frame</p>
                <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                  Browsers disable 1-tap app installation inside embedded preview frames. Use the <strong>Share / Open App</strong> button in the top AI Studio bar to launch the standalone URL in Chrome, then install from there.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Platform Install Walkthrough Selector */}
        {!isInstalled && !isInstallable && (
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 p-3.5 space-y-3">
            <div className="grid grid-cols-3 gap-1 bg-zinc-200/70 dark:bg-zinc-900/80 p-1 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setGuideTab('android')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  guideTab === 'android'
                    ? 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('desktop')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  guideTab === 'desktop'
                    ? 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Monitor className="w-3 h-3" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('ios')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  guideTab === 'ios'
                    ? 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Share className="w-3 h-3" />
                <span>iPhone</span>
              </button>
            </div>

            {guideTab === 'android' && (
              <ol className="space-y-1.5 text-[11px] text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start gap-2">
                  <MoreVertical className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>1. Open the standalone app URL in <strong>Chrome for Android</strong> and tap menu (<strong>⋮</strong>).</span>
                </li>
                <li className="flex items-start gap-2">
                  <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>2. Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>3. Confirm <strong>Install</strong> to add Prime Bazaar WebAPK to your app drawer.</span>
                </li>
              </ol>
            )}

            {guideTab === 'desktop' && (
              <ol className="space-y-1.5 text-[11px] text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start gap-2">
                  <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>1. Open the app URL in Chrome or Edge and click the <strong>Install (⊕)</strong> icon in the address bar.</span>
                </li>
                <li className="flex items-start gap-2">
                  <MoreVertical className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>2. Or open menu <strong>⋮ → Cast, save, and share → Install Prime Bazaar</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>3. Launches in a dedicated desktop app window with offline support.</span>
                </li>
              </ol>
            )}

            {guideTab === 'ios' && (
              <ol className="space-y-1.5 text-[11px] text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start gap-2">
                  <Share className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                  <span>1. Open the shared app URL in <strong>Safari</strong> and tap the <strong>Share</strong> icon.</span>
                </li>
                <li className="flex items-start gap-2">
                  <PlusSquare className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                  <span>2. Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                  <span>3. Tap <strong>Add</strong> — Prime Bazaar opens full-screen from your home screen.</span>
                </li>
              </ol>
            )}
          </div>
        )}

        {promptDismissed && (
          <p className="text-[11px] text-center text-zinc-500">
            Prompt dismissed — tap <strong>Install Prime Bazaar App</strong> again or use browser menu (⋮).
          </p>
        )}

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          {isInstalled ? (
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Installed · Continue Shopping</span>
            </button>
          ) : isInstallable ? (
            <button
              onClick={handleInstallClick}
              disabled={isPrompting}
              className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{isPrompting ? 'Opening Installer...' : 'Install Prime Bazaar App'}</span>
            </button>
          ) : (
            <button
              onClick={handleInstallClick}
              className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Check Install Readiness</span>
            </button>
          )}

          {!isPrivateDevHost && (
            <button
              onClick={handleCopyUrl}
              className="p-3 rounded-2xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-all active:scale-95"
              title="Copy Install URL"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={handleShare}
            className="p-3 rounded-2xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-all active:scale-95"
            title="Share App"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Security / Verification Footer */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 pt-1 justify-center">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Verified PWA App · Service Worker &amp; Offline Support</span>
        </div>
      </div>
    </div>
  );
};
