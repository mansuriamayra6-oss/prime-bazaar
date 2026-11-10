import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ShoppingBag, 
  Heart, 
  Send, 
  Users, 
  Radio, 
  Sparkles, 
  ChevronRight, 
  Flame, 
  Share2, 
  MessageCircle,
  Tag
} from 'lucide-react';
import { INITIAL_LIVE_SESSIONS } from '../data/mockData';

export const LiveShoppingModal: React.FC = () => {
  const { 
    isLiveShoppingOpen, 
    setIsLiveShoppingOpen, 
    products, 
    addToCart, 
    setIsCheckoutOpen,
    formatPrice,
    notify 
  } = useMarketplace();

  const [activeSessionId, setActiveSessionId] = useState<string>('live-1');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [chatMessage, setChatMessage] = useState<string>('');
  const [likeCount, setLikeCount] = useState<number>(3420);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [selectedSize, setSelectedSize] = useState<string>('M');

  const session = INITIAL_LIVE_SESSIONS.find(s => s.id === activeSessionId) || INITIAL_LIVE_SESSIONS[0];
  const pinnedProduct = products.find(p => p.id === session.pinnedProductId) || products[0];

  const [liveChat, setLiveChat] = useState<any[]>(session.chatMessages || []);

  if (!isLiveShoppingOpen) return null;

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const newMsg = {
      id: `cm-${Date.now()}`,
      userName: 'You (Amayra)',
      message: chatMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      badge: 'Shopper'
    };

    setLiveChat(prev => [...prev, newMsg]);
    setChatMessage('');
  };

  const handleLike = () => {
    setLikeCount(prev => prev + 1);
    setHasLiked(true);
  };

  const handleBuyNow = () => {
    addToCart(pinnedProduct, selectedSize, pinnedProduct.colors[0]?.name || 'Standard', 1);
    setIsLiveShoppingOpen(false);
    setIsCheckoutOpen(true);
    notify(`Flash Deal applied! Checking out ${pinnedProduct.title}`);
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      <div 
        className="relative w-full max-w-5xl bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col md:flex-row h-[88vh] max-h-[820px]"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => setIsLiveShoppingOpen(false)}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/60 hover:bg-black text-white backdrop-blur-md transition-all shadow-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Video Player with Live Overlays */}
        <div className="relative flex-1 bg-black overflow-hidden flex flex-col justify-between">
          {/* Main Video Stream */}
          <div className="absolute inset-0 flex items-center justify-center">
            {session.streamUrl ? (
              <video
                src={session.streamUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={session.thumbnail}
                alt={session.title}
                className="w-full h-full object-cover opacity-60"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60" />
          </div>

          {/* Top Video Header Overlay */}
          <div className="relative z-20 p-4 sm:p-5 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg animate-pulse">
                <Radio className="w-3.5 h-3.5" />
                Live
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-xs font-semibold">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                {session.viewerCount.toLocaleString()} watching
              </span>
            </div>

            <div className="flex items-center gap-2 pr-12 md:pr-0">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 transition-all"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Middle Host Info Pill */}
          <div className="relative z-20 px-4 sm:px-5">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs">
              <img
                src={session.sellerAvatar}
                alt={session.sellerName}
                className="w-6 h-6 rounded-full object-cover border border-emerald-400"
              />
              <span className="font-bold">{session.sellerName}</span>
              <span className="text-[10px] text-emerald-400 font-semibold">• Host</span>
            </div>
          </div>

          {/* Bottom Pinned Product Overlay (Buy Now Card) */}
          <div className="relative z-20 p-4 sm:p-5">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/95 backdrop-blur-md border border-white/15 text-white shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={pinnedProduct.images[0]}
                  alt={pinnedProduct.title}
                  className="w-14 h-18 sm:w-16 sm:h-20 object-cover rounded-xl shrink-0 border border-white/10"
                />
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                    <Flame className="w-3.5 h-3.5 fill-amber-400" />
                    <span>Pinned Flash Deal • Limited Live Stock</span>
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm truncate text-white">
                    {pinnedProduct.title}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-extrabold text-emerald-400">
                      {formatPrice(pinnedProduct.price)}
                    </span>
                    <span className="text-xs text-zinc-400 line-through">
                      {formatPrice(pinnedProduct.originalPrice)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                      {pinnedProduct.discountPercent}% OFF
                    </span>
                  </div>
                </div>
              </div>

              {/* Sizes and Buy Now CTAs */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <div className="flex items-center gap-1">
                  {pinnedProduct.sizes.slice(0, 3).map(sz => (
                    <button
                      key={sz.size}
                      onClick={() => setSelectedSize(sz.size)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        selectedSize === sz.size
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white/10 hover:bg-white/20 text-zinc-300'
                      }`}
                    >
                      {sz.size}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleBuyNow}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Buy Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Live Chat & Other Streams */}
        <div className="w-full md:w-80 lg:w-96 bg-zinc-900 border-t md:border-t-0 md:border-l border-zinc-800 flex flex-col justify-between shrink-0">
          {/* Stream Information */}
          <div className="p-4 border-b border-zinc-800 space-y-1">
            <h3 className="font-bold text-sm text-white line-clamp-1">{session.title}</h3>
            <p className="text-xs text-zinc-400">Live questions answered by verified weavers & stylists.</p>
          </div>

          {/* Real-Time Live Chat Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs">
            {liveChat.map(msg => (
              <div key={msg.id} className="p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/50 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-bold ${msg.badge === 'Host' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {msg.userName}
                    {msg.badge && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded bg-zinc-700 text-zinc-200 text-[9px]">
                        {msg.badge}
                      </span>
                    )}
                  </span>
                  <span className="text-zinc-500 text-[10px]">{msg.timestamp}</span>
                </div>
                <p className="text-zinc-200 text-xs leading-relaxed">{msg.message}</p>
              </div>
            ))}
          </div>

          {/* Other Live Sessions Rail */}
          <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-950/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
              Other Live Sessions
            </span>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {INITIAL_LIVE_SESSIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveSessionId(s.id);
                    setLiveChat(s.chatMessages || []);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap border transition-colors flex items-center gap-1.5 ${
                    activeSessionId === s.id
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  {s.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
                  <span>{s.category}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Chat Input & Floating Hearts */}
          <div className="p-3 border-t border-zinc-800 bg-zinc-900 flex items-center gap-2">
            <form onSubmit={handleSendChat} className="flex-1 flex items-center gap-1.5">
              <input
                type="text"
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                placeholder="Ask host a question live..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!chatMessage.trim()}
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <button
              onClick={handleLike}
              className={`p-2 rounded-xl border transition-transform active:scale-125 flex items-center gap-1 ${
                hasLiked ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
              }`}
              title="Send Heart"
            >
              <Heart className={`w-4 h-4 ${hasLiked ? 'fill-rose-500' : ''}`} />
              <span className="text-[10px] font-bold">{likeCount}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
