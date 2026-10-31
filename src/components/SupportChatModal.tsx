import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { X, Send, Bot, User, Sparkles, MessageSquare, Headphones } from 'lucide-react';

export const SupportChatModal: React.FC = () => {
  const { 
    isSupportOpen, 
    setIsSupportOpen, 
    supportMessages, 
    sendSupportMessage, 
    setIsOrdersOpen, 
    setIsRewardsOpen 
  } = useMarketplace();

  const [input, setInput] = useState('');

  if (!isSupportOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendSupportMessage(input);
    setInput('');
  };

  const handleQuickAction = (action: string) => {
    if (action === 'track_order') {
      setIsSupportOpen(false);
      setIsOrdersOpen(true);
    } else if (action === 'return_policy') {
      sendSupportMessage('What is your return and refund policy?');
    } else if (action === 'show_coupons') {
      sendSupportMessage('Which discount coupons are currently active?');
    } else if (action === 'earn_coins') {
      setIsSupportOpen(false);
      setIsRewardsOpen(true);
    }
  };

  return (
    <div className="fixed inset-0 z-60 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div 
        className="w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col justify-between border-l border-zinc-200 dark:border-zinc-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                Prime Bazaar Assistant
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online · Instant 24/7 Resolution</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsSupportOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {supportMessages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'bot' && (
                <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div className={`max-w-[80%] space-y-2`}>
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-rose-600 text-white rounded-tr-none'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none border border-zinc-200 dark:border-zinc-700/60'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className={`block text-[9px] mt-1 ${msg.sender === 'user' ? 'text-rose-200' : 'text-zinc-400'} font-mono text-right`}>
                    {msg.timestamp}
                  </span>
                </div>

                {/* Quick actions if provided */}
                {msg.quickActions && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.quickActions.map(qa => (
                      <button
                        key={qa.label}
                        onClick={() => handleQuickAction(qa.action)}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-rose-400 text-[11px] font-medium transition-colors"
                      >
                        {qa.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
          <input
            type="text"
            placeholder="Type your question (e.g. tracking, returns)..."
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 px-3.5 py-2 text-xs bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-rose-600 rounded-xl focus:outline-none"
          />
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
