import React, { useState, useRef } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { 
  X, 
  Heart, 
  Share2, 
  ShoppingBag, 
  Volume2, 
  VolumeX, 
  ChevronUp, 
  ChevronDown, 
  Play, 
  Pause,
  Sparkles,
  Music
} from 'lucide-react';

export const TrendStreamModal: React.FC = () => {
  const { 
    isReelsOpen, 
    setIsReelsOpen, 
    reels, 
    toggleReelLike, 
    products, 
    addToCart, 
    setSelectedProduct, 
    earnCoins,
    notify 
  } = useMarketplace();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!isReelsOpen || reels.length === 0) return null;

  const currentReel = reels[currentIndex];
  const taggedProduct = products.find(p => p.id === currentReel.productId);

  const handleNext = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsPlaying(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleShare = () => {
    earnCoins(30, 'Shared TrendStream Reel');
    navigator.clipboard?.writeText?.(window.location.href);
    notify('Reel link copied! +30 Bazaar Coins earned 🪙');
  };

  const handleQuickAdd = () => {
    if (!taggedProduct) return;
    const availableSize = taggedProduct.sizes.find(s => s.available)?.size || taggedProduct.sizes[0]?.size || 'Standard';
    const color = taggedProduct.colors[0]?.name || 'Standard';
    addToCart(taggedProduct, availableSize, color, 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      {/* Close button */}
      <button
        onClick={() => setIsReelsOpen(false)}
        className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
        title="Close TrendStream"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Reel Container */}
      <div className="relative w-full max-w-sm sm:max-w-md h-[90vh] max-h-[780px] bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between border border-zinc-800">
        {/* Video Element / Backdrop */}
        <div className="absolute inset-0 z-0 bg-zinc-900 cursor-pointer" onClick={togglePlay}>
          <video
            ref={videoRef}
            key={currentReel.videoUrl}
            src={currentReel.videoUrl}
            poster={currentReel.thumbnail}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Gradient Scrim */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90 pointer-events-none" />

          {/* Pause overlay icon if paused */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white">
                <Play className="w-8 h-8 fill-white ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Top Overlay: Title & Sound Toggle */}
        <div className="relative z-10 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center text-[10px] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold tracking-wide uppercase font-display">
              TrendStream Live
            </span>
          </div>

          <button
            onClick={e => {
              e.stopPropagation();
              toggleMute();
            }}
            className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Vertical Reel Switchers (Up/Down) */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
          <button
            disabled={currentIndex === 0}
            onClick={handlePrev}
            className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Previous Reel"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button
            disabled={currentIndex === reels.length - 1}
            onClick={handleNext}
            className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Next Reel"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* Right Action Stack: Like, Share */}
        <div className="absolute right-4 bottom-32 z-20 flex flex-col items-center gap-4 text-white">
          <button
            onClick={e => {
              e.stopPropagation();
              toggleReelLike(currentReel.id);
            }}
            className="flex flex-col items-center gap-1 group"
          >
            <div className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
              currentReel.isLiked ? 'bg-rose-600 text-white' : 'bg-black/40 text-white group-hover:scale-110'
            }`}>
              <Heart className={`w-5 h-5 ${currentReel.isLiked ? 'fill-white' : ''}`} />
            </div>
            <span className="text-[10px] font-semibold">{currentReel.likes}</span>
          </button>

          <button
            onClick={e => {
              e.stopPropagation();
              handleShare();
            }}
            className="flex flex-col items-center gap-1 group"
            title="Share with friends (+30 Coins)"
          >
            <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white group-hover:scale-110 transition-all">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold">+30 🪙</span>
          </button>
        </div>

        {/* Bottom Overlay: Creator info & Tagged Product Buy Card */}
        <div className="relative z-10 p-4 space-y-3">
          {/* Creator handle & Audio */}
          <div className="text-white space-y-1 pr-14">
            <div className="flex items-center gap-2">
              <img
                src={currentReel.creatorAvatar}
                alt={currentReel.creatorName}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-white/40 object-cover"
              />
              <div>
                <span className="font-semibold text-xs block">{currentReel.creatorName}</span>
                <span className="text-[10px] text-zinc-300">{currentReel.creatorHandle}</span>
              </div>
            </div>
            <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed pt-1">
              {currentReel.caption}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-300 pt-0.5">
              <Music className="w-3 h-3 text-rose-400 shrink-0" />
              <span className="truncate">{currentReel.audioTitle}</span>
            </div>
          </div>

          {/* Tagged Product Drawer Card */}
          {taggedProduct && (
            <div className="p-2.5 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-between gap-3 text-zinc-900 dark:text-white">
              <div
                onClick={() => {
                  setSelectedProduct(taggedProduct);
                  setIsReelsOpen(false);
                }}
                className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
              >
                <img
                  src={taggedProduct.images[0]}
                  alt={taggedProduct.title}
                  referrerPolicy="no-referrer"
                  className="w-12 h-14 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block tracking-wider">
                    Featured In Video
                  </span>
                  <h4 className="text-xs font-semibold truncate">{taggedProduct.title}</h4>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xs font-bold font-mono">₹{taggedProduct.price.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-zinc-400 line-through font-mono">₹{taggedProduct.originalPrice}</span>
                    <span className="text-[10px] font-bold text-emerald-600 font-mono">{taggedProduct.discountPercent}% off</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleQuickAdd}
                className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shrink-0 transition-all active:scale-95"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Buy</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
