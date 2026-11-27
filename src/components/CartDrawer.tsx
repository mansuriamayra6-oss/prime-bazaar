import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Tag,
  Coins,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Bookmark,
  RotateCcw,
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    savedForLater,
    updateCartQuantity,
    removeFromCart,
    saveForLater,
    moveSavedToCart,
    removeSavedItem,
    getVariantStock,
    products,
    cartTotal,
    cartDiscount,
    activeCoupon,
    applyCoupon,
    removeCoupon,
    availableCoupons,
    coins,
    setIsCheckoutOpen,
    formatPrice,
    notify,
  } = useMarketplace();

  const [couponInput, setCouponInput] = useState('');
  const [useCoinsDiscount, setUseCoinsDiscount] = useState(false);

  if (!isCartOpen) return null;

  const coinsToRedeem = useCoinsDiscount ? Math.min(coins, 100) : 0;
  const deliveryFee = cartTotal > 999 || cart.length === 0 ? 0 : 49;
  const totalPayable = Math.max(0, cartTotal - cartDiscount - coinsToRedeem + deliveryFee);

  const handleApplyCoupon = (code: string) => {
    const res = applyCoupon(code);
    notify(res.message);
    if (res.success) {
      setCouponInput('');
    }
  };

  const handleProceedToCheckout = () => {
    if (cart.length === 0) {
      notify('Your shopping bag is empty.');
      return;
    }
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-fadeIn"
      onClick={() => setIsCartOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Bag and Saved Items"
        className="w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col justify-between border-l border-zinc-200 dark:border-zinc-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-rose-600" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-white font-display tabular-nums">
              Shopping Bag ({cart.reduce((sum, i) => sum + i.quantity, 0)})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="Close shopping bag"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items + Saved For Later Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {cart.length > 0 ? (
            <div className="space-y-3">
              {cart.map(item => {
                const latestProduct = products.find(p => p.id === item.productId) || item.product;
                const maxStock = getVariantStock(latestProduct, item.selectedSize);
                const atStockCap = maxStock > 0 && item.quantity >= maxStock;

                return (
                  <div
                    key={item.id}
                    className="flex gap-3.5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800"
                  >
                    <img
                      src={item.product.images[0]}
                      alt={item.product.title}
                      referrerPolicy="no-referrer"
                      className="w-18 h-22 object-cover rounded-xl shrink-0"
                    />
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                            {item.product.brand}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="text-zinc-400 hover:text-rose-600 p-1"
                            title="Remove item"
                            aria-label={`Remove ${item.product.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                          {item.product.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-1">
                          <span>
                            Size: <strong>{item.selectedSize}</strong>
                          </span>
                          <span>·</span>
                          <span>
                            Color: <strong>{item.selectedColor}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Quantity, Save for Later, and Price */}
                      <div className="pt-2 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                              className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                              title="Decrease"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold px-1.5 font-mono tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={atStockCap}
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                              className={`p-1 ${
                                atStockCap
                                  ? 'text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
                                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                              }`}
                              title={atStockCap ? `Max stock (${maxStock}) reached` : 'Increase'}
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="text-right font-mono tabular-nums">
                            <span className="text-sm font-bold text-zinc-900 dark:text-white">
                              {formatPrice(item.product.price * item.quantity)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <button
                            type="button"
                            onClick={() => saveForLater(item.id)}
                            className="inline-flex items-center gap-1 font-semibold text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          >
                            <Bookmark className="w-3 h-3" />
                            <span>Save for later</span>
                          </button>
                          {maxStock > 0 && maxStock <= 4 && (
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              Only {maxStock} left
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-10">
              <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Your bag is empty</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                {savedForLater.length > 0
                  ? 'You have saved items waiting below — move any item back into your bag anytime.'
                  : 'Explore our fashion catalog and creator video reels to discover your next look!'}
              </p>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="mt-4 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 transition-colors shadow-sm"
              >
                Continue Shopping
              </button>
            </div>
          )}

          {/* Coupon and Coins Modules (shown if cart has items) */}
          {cart.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-white mb-2">
                  <Tag className="w-3.5 h-3.5 text-rose-600" />
                  <span>Apply Promotional Coupon</span>
                </div>

                {!activeCoupon ? (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        aria-label="Promotional coupon code"
                        placeholder="Enter coupon code"
                        value={couponInput}
                        onChange={e => setCouponInput(e.target.value.toUpperCase())}
                        className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white uppercase font-mono focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon(couponInput)}
                        className="px-3 py-1.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
                      >
                        Apply
                      </button>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {availableCoupons.map(c => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleApplyCoupon(c.code)}
                          className="px-2 py-1 rounded-md bg-white dark:bg-zinc-800 border border-dashed border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[10px] font-mono font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          {c.code} ({c.discountType === 'flat' ? `₹${c.discountValue}` : `${c.discountValue}%`} OFF)
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
                    <div>
                      <span className="font-bold font-mono">{activeCoupon.code}</span> Applied!
                      <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                        {activeCoupon.description}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {coins > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                        Redeem Bazaar Coins
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        Balance: {coins} coins (₹1 = 1 coin)
                      </span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCoinsDiscount}
                      onChange={e => setUseCoinsDiscount(e.target.checked)}
                      className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      -₹{Math.min(coins, 100)}
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Saved For Later Section */}
          {savedForLater.length > 0 && (
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-rose-600" />
                  <span>Saved for Later ({savedForLater.length})</span>
                </h3>
              </div>

              <div className="space-y-2.5">
                {savedForLater.map(saved => {
                  const latestProduct = products.find(p => p.id === saved.productId) || saved.product;
                  const availableStock = getVariantStock(latestProduct, saved.selectedSize);
                  const outOfStock = availableStock <= 0;

                  return (
                    <div
                      key={saved.id}
                      className="flex gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                    >
                      <img
                        src={latestProduct.images[0]}
                        alt={latestProduct.title}
                        referrerPolicy="no-referrer"
                        className="w-14 h-16 object-cover rounded-lg shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                          {latestProduct.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                          <span>Size: {saved.selectedSize}</span>
                          <span>·</span>
                          <span>Color: {saved.selectedColor}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs font-bold font-mono text-zinc-900 dark:text-white tabular-nums">
                            {formatPrice(latestProduct.price)}
                          </span>
                          <span
                            className={`text-[10px] font-semibold ${
                              outOfStock
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {outOfStock ? 'Out of stock' : 'In stock'}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            disabled={outOfStock}
                            onClick={() => moveSavedToCart(saved.id)}
                            className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                              outOfStock
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                                : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                            }`}
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Move to Bag</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSavedItem(saved.id)}
                            className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:text-rose-600 hover:border-rose-300 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Bottom Price Summary & CTA */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
            <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="flex justify-between">
                <span>Total Bag Value</span>
                <span className="font-mono tabular-nums">{formatPrice(cartTotal)}</span>
              </div>
              {cartDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Coupon Discount</span>
                  <span className="font-mono tabular-nums">-{formatPrice(cartDiscount)}</span>
                </div>
              )}
              {coinsToRedeem > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                  <span>Bazaar Coins Redeemed</span>
                  <span className="font-mono tabular-nums">-{formatPrice(coinsToRedeem)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated Delivery Fee</span>
                <span className="font-mono tabular-nums">
                  {deliveryFee === 0 ? <strong className="text-emerald-600">FREE</strong> : formatPrice(deliveryFee)}
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between text-sm font-bold text-zinc-900 dark:text-white">
                <span>Total Payable Amount</span>
                <span className="text-base font-extrabold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                  {formatPrice(totalPayable)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleProceedToCheckout}
              className="w-full py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 transition-all active:scale-[0.98]"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Safe & Secure 256-Bit Encrypted Payments</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
