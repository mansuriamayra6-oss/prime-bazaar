import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { 
  X, 
  Send, 
  Store, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  ShoppingBag, 
  Check, 
  CheckCheck,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { INITIAL_BUYER_CHATS } from '../data/mockData';

export const BuyerSellerChatModal: React.FC = () => {
  const { 
    isBuyerSellerChatOpen, 
    setIsBuyerSellerChatOpen, 
    activeChatSellerId, 
    chatProductContext, 
    sellers,
    formatPrice,
    addToCart,
    notify 
  } = useMarketplace();

  const seller = sellers.find(s => s.id === activeChatSellerId) || sellers[0];
  const initialConv = INITIAL_BUYER_CHATS.find(c => c.sellerId === seller.id) || INITIAL_BUYER_CHATS[0];

  const [messages, setMessages] = useState<any[]>(initialConv.messages || []);
  const [inputText, setInputText] = useState<string>('');

  if (!isBuyerSellerChatOpen) return null;

  const quickQuestions = [
    'Is this item in stock in size M?',
    'Can this be dispatched today for express delivery?',
    'Does the color match the catalog photos exactly?',
    'What is the return and replacement policy?'
  ];

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const buyerMsg = {
      id: `msg-${Date.now()}`,
      conversationId: initialConv.id,
      sellerId: seller.id,
      sellerName: seller.businessName,
      sender: 'buyer',
      senderName: 'Amayra Mansuri',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, buyerMsg]);
    setInputText('');

    // Automated merchant response simulation based on inquiry
    setTimeout(() => {
      let reply = 'Namaste Amayra! Thank you for contacting our store desk. We will assist you promptly.';
      const lower = text.toLowerCase();
      if (lower.includes('stock') || lower.includes('size')) {
        reply = `Namaste Amayra! Yes, size M is currently available in our primary warehouse. Our items have true-to-size standard Indian tailoring.`;
      } else if (lower.includes('dispatch') || lower.includes('delivery')) {
        reply = `All orders verified before 2:00 PM are packed and handed over to BlueDart Express today with real-time tracking!`;
      } else if (lower.includes('return') || lower.includes('policy')) {
        reply = `We provide a 7-day hassle-free replacement or full refund window with doorstep reverse pickup.`;
      }

      const sellerMsg = {
        id: `msg-${Date.now() + 1}`,
        conversationId: initialConv.id,
        sellerId: seller.id,
        sellerName: seller.businessName,
        sender: 'seller',
        senderName: `${seller.businessName} Specialist`,
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, sellerMsg]);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col h-[85vh] max-h-[720px]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Strip */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                  {seller.businessName}
                </h3>
                <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                  Verified Seller
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Online Now
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  Replies in ~15 mins
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsBuyerSellerChatOpen(false)}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pinned Product Context (If chatting from PDP) */}
        {chatProductContext && (
          <div className="px-5 py-2.5 bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={chatProductContext.images[0]}
                alt={chatProductContext.title}
                className="w-10 h-10 object-cover rounded-lg shrink-0 border border-emerald-200 dark:border-emerald-800"
              />
              <div className="min-w-0">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block uppercase tracking-wider">
                  Inquiring About SKU
                </span>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {chatProductContext.title}
                </h4>
              </div>
            </div>

            <button
              onClick={() => {
                addToCart(chatProductContext, 'M', 'Standard');
                notify(`Added ${chatProductContext.title} to bag!`);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm shrink-0"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Add to Bag ({formatPrice(chatProductContext.price)})</span>
            </button>
          </div>
        )}

        {/* Chat Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          <div className="text-center my-2">
            <span className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-semibold">
              End-to-end encrypted direct buyer-seller marketplace session
            </span>
          </div>

          {messages.map(m => {
            const isMe = m.sender === 'buyer';
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-zinc-400 mb-0.5 px-1 font-medium">
                  {isMe ? 'You' : m.senderName}
                </span>
                <div
                  className={`max-w-[82%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-bl-none border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {m.text}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-1 px-1">
                  <span>{m.timestamp}</span>
                  {isMe && <CheckCheck className="w-3 h-3 text-emerald-500" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 text-[11px] text-zinc-700 dark:text-zinc-300 font-medium whitespace-nowrap transition-colors shrink-0 shadow-2xs"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input Box */}
        <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={`Message ${seller.businessName}...`}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
