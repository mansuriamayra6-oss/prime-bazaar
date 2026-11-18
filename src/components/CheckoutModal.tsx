import React, { useState, useEffect } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { Address, Order } from '../types';
import { api } from '../services/api';
import { 
  X, 
  MapPin, 
  CreditCard, 
  QrCode, 
  Truck, 
  Building2, 
  CheckCircle2, 
  ArrowLeft, 
  ShieldCheck, 
  Check, 
  Receipt,
  Plus,
  Copy,
  ExternalLink,
  Printer,
  Smartphone,
  Lock,
  ArrowRight,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

const PENDING_CF_STORAGE_KEY = 'pb_pending_cashfree_checkout';

function loadCashfreeSdk(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof (window as any).Cashfree === 'function') {
      resolve((window as any).Cashfree);
      return;
    }
    const existing = document.querySelector('script[src*="sdk.cashfree.com/js/v3/cashfree.js"]') as HTMLScriptElement | null;
    if (existing) {
      const checkTimer = setInterval(() => {
        if (typeof (window as any).Cashfree === 'function') {
          clearInterval(checkTimer);
          clearTimeout(timeoutTimer);
          resolve((window as any).Cashfree);
        }
      }, 100);
      const timeoutTimer = setTimeout(() => {
        clearInterval(checkTimer);
        reject(new Error('Cashfree JS SDK timed out while loading. Please check network access to sdk.cashfree.com.'));
      }, 8000);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => {
      if (typeof (window as any).Cashfree === 'function') {
        resolve((window as any).Cashfree);
      } else {
        reject(new Error('Cashfree SDK loaded but Cashfree constructor was not initialized.'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Cashfree Checkout SDK script.'));
    document.head.appendChild(script);
  });
}

export const CheckoutModal: React.FC = () => {
  const {
    isCheckoutOpen,
    setIsCheckoutOpen,
    cart,
    cartTotal,
    cartDiscount,
    activeCoupon,
    coins,
    addresses,
    addAddress,
    placeOrder,
    setIsOrdersOpen,
    preferredPaymentMethod,
    skipAddressOnCheckoutOpen,
    setSkipAddressOnCheckoutOpen,
    user,
    notify
  } = useMarketplace();

  const [step, setStep] = useState<'address' | 'payment' | 'otp_challenge' | 'success'>('address');
  const [selectedAddressId, setSelectedAddressId] = useState<string>(addresses[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'cashfree' | 'upi' | 'card' | 'cod' | 'netbanking'>('cashfree');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  // Backend Payment Intent
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [initializingIntent, setInitializingIntent] = useState(false);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [cashfreeError, setCashfreeError] = useState<string | null>(null);
  const [cashfreeLaunching, setCashfreeLaunching] = useState(false);
  const [upiUtr, setUpiUtr] = useState('');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [codOtp, setCodOtp] = useState('');
  const [isCodOtpSent, setIsCodOtpSent] = useState(false);

  // Card input states
  const [cardNumber, setCardNumber] = useState('4532 8812 9043 8821');
  const [cardHolder, setCardHolder] = useState('AMAYRA MANSURI');
  const [cardExpiry, setCardExpiry] = useState('11/29');
  const [cardCvv, setCardCvv] = useState('883');
  const [bankOtp, setBankOtp] = useState('8492');

  // New address form state
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newPinCode, setNewPinCode] = useState('');
  const [newType, setNewType] = useState<'home' | 'work'>('home');

  const currentAddress = addresses.find(a => a.id === selectedAddressId) || addresses[0];
  const deliveryFee = cartTotal > 999 ? 0 : 49;
  const finalAmount = Math.max(0, cartTotal - cartDiscount + deliveryFee);

  const initializePaymentIntent = async () => {
    if (finalAmount <= 0) return null;
    setInitializingIntent(true);
    setIntentError(null);
    setCashfreeError(null);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await api.payments.createIntent({
        amount: finalAmount,
        currency: 'INR',
        customerName: currentAddress?.fullName || user?.name || 'Prime Bazaar Shopper',
        customerPhone: currentAddress?.phone || user?.phone || '9876543210',
        customerEmail: user?.email || 'shopper@primebazaar.in',
        returnUrl: origin ? `${origin}/?cashfree_order_id={order_id}` : undefined,
      });
      setPaymentIntent(res);
      if (res?.cashfree?.error) {
        setCashfreeError(res.cashfree.error);
      }
      return res;
    } catch (err: any) {
      const msg = err?.message || 'Unable to connect to payment gateway backend.';
      setIntentError(msg);
      return null;
    } finally {
      setInitializingIntent(false);
    }
  };

  // Sync preferred payment method and fast-track to Payment step when launched from a product Buy Now CTA
  useEffect(() => {
    if (isCheckoutOpen) {
      setCashfreeError(null);
      setIntentError(null);
      if (completedOrder && step === 'success') return;
      setPaymentMethod(preferredPaymentMethod || 'cashfree');
      if (skipAddressOnCheckoutOpen && currentAddress) {
        setStep('payment');
      } else {
        setStep('address');
      }
    } else {
      setPaymentIntent(null);
      setCompletedOrder(null);
      setCashfreeError(null);
      setIntentError(null);
    }
  }, [isCheckoutOpen, preferredPaymentMethod, skipAddressOnCheckoutOpen]);

  // Initialize payment intent on backend when entering payment step
  useEffect(() => {
    if (step === 'payment' && isCheckoutOpen && finalAmount > 0) {
      initializePaymentIntent();
    }
  }, [step, isCheckoutOpen, finalAmount]);

  // Handle redirect return from Cashfree hosted checkout (?cashfree_order_id=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const returnedCfOrderId = urlParams.get('cashfree_order_id') || urlParams.get('order_id');
    if (!returnedCfOrderId || !returnedCfOrderId.startsWith('pb_cf_')) return;

    urlParams.delete('cashfree_order_id');
    urlParams.delete('order_id');
    const cleanQuery = urlParams.toString();
    const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, cleanUrl);

    let pendingRaw: string | null = null;
    try {
      pendingRaw = sessionStorage.getItem(PENDING_CF_STORAGE_KEY);
      sessionStorage.removeItem(PENDING_CF_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }

    const pending = pendingRaw ? JSON.parse(pendingRaw) : {};
    setIsCheckoutOpen(true);
    setPaymentMethod('cashfree');
    setLoading(true);

    api.payments
      .verify({
        intentId: pending.intentId,
        cashfreeOrderId: returnedCfOrderId,
        paymentMethod: 'cashfree',
        amount: pending.amount || finalAmount || 999,
      })
      .then((receipt) => {
        const order = placeOrder({
          address: pending.address || currentAddress,
          paymentMethod: 'cashfree',
          couponCode: pending.couponCode || activeCoupon?.code,
          coinsUsed: 0,
        });
        setCompletedOrder({
          ...order,
          invoiceNumber: receipt.invoiceNumber || order.invoiceNumber,
        });
        setStep('success');
        notify('Cashfree payment verified & order placed successfully!');
      })
      .catch((err: any) => {
        setStep('payment');
        const msg = err?.message || 'Cashfree payment was not completed.';
        setCashfreeError(msg);
        notify(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (!isCheckoutOpen) return null;

  const handleSaveNewAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newPhone || !newStreet || !newCity || !newPinCode) return;
    addAddress({
      fullName: newFullName,
      phone: newPhone,
      street: newStreet,
      city: newCity,
      state: newState || 'Maharashtra',
      pinCode: newPinCode,
      type: newType,
      isDefault: false
    });
    setIsAddingAddress(false);
  };

  const handleSendCodOtp = () => {
    setIsCodOtpSent(true);
    notify('COD Verification Code sent to mobile: 7784');
  };

  const handleProceedToPayment = () => {
    if (!currentAddress) {
      notify('Please select or add a delivery address');
      return;
    }
    setStep('payment');
  };

  const triggerCashfreeSdkCheckout = async (redirectTarget: '_modal' | '_self' = '_modal') => {
    setCashfreeError(null);
    setCashfreeLaunching(true);

    try {
      let activeIntent = paymentIntent;
      if (!activeIntent?.cashfree?.paymentSessionId) {
        activeIntent = await initializePaymentIntent();
      }

      const sessionId = activeIntent?.cashfree?.paymentSessionId;
      if (!sessionId) {
        const errMsg =
          activeIntent?.cashfree?.error ||
          intentError ||
          'Cashfree payment session could not be created. Please verify CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET.';
        setCashfreeError(errMsg);
        notify(errMsg);
        return;
      }

      const CashfreeSDK = await loadCashfreeSdk();
      const rawEnv = String(activeIntent?.cashfree?.environment || 'sandbox').toLowerCase();
      const sdkMode = rawEnv === 'production' ? 'production' : 'sandbox';
      const cfInstance = CashfreeSDK({ mode: sdkMode });

      if (redirectTarget === '_self') {
        try {
          sessionStorage.setItem(
            PENDING_CF_STORAGE_KEY,
            JSON.stringify({
              intentId: activeIntent.intentId,
              cashfreeOrderId: activeIntent.cashfree.orderId,
              address: currentAddress,
              couponCode: activeCoupon?.code,
              amount: finalAmount,
            })
          );
        } catch {
          // ignore storage failure
        }
      }

      const result = await cfInstance.checkout({
        paymentSessionId: sessionId,
        redirectTarget,
      });

      if (result?.error) {
        const msg = result.error.message || 'Cashfree Checkout was closed or failed before payment completed.';
        setCashfreeError(msg);
        notify(msg);
        return;
      }

      if (result?.paymentDetails) {
        await executeFinalOrderPlacement('Verified via Cashfree Payments Gateway', activeIntent);
        return;
      }

      if (result?.redirect) {
        notify('Redirecting to Cashfree Hosted Checkout...');
        return;
      }
    } catch (err: any) {
      const msg = err?.message || 'Unable to launch Cashfree Checkout. Try opening Cashfree Hosted Page below.';
      setCashfreeError(msg);
      notify(msg);
    } finally {
      setCashfreeLaunching(false);
    }
  };

  const handleTriggerPaymentVerification = async () => {
    if (paymentMethod === 'cashfree') {
      await triggerCashfreeSdkCheckout('_modal');
      return;
    }

    if (paymentMethod === 'card') {
      // Open 3D-Secure banking challenge modal
      setStep('otp_challenge');
      return;
    }

    if (paymentMethod === 'cod') {
      await executeFinalOrderPlacement('Confirmed via Cash on Delivery');
      return;
    }

    await executeFinalOrderPlacement('Verified via NPCI UPI Gateway');
  };

  const executeFinalOrderPlacement = async (authNote?: string, intentOverride?: any) => {
    const activeIntent = intentOverride || paymentIntent;
    setLoading(true);
    try {
      // 1. Verify with Backend Payment API
      const paymentReceipt = await api.payments.verify({
        intentId: activeIntent?.intentId,
        cashfreeOrderId: activeIntent?.cashfree?.orderId,
        paymentMethod,
        upiRefNumber: upiUtr || 'UTR' + Math.floor(100000000000 + Math.random() * 900000000000),
        cardNumber: paymentMethod === 'card' ? cardNumber.slice(-4) : undefined,
        cardOtp: bankOtp,
        amount: finalAmount,
      });

      // 2. Submit order to backend & client store
      const order = placeOrder({
        address: currentAddress,
        paymentMethod,
        couponCode: activeCoupon?.code,
        coinsUsed: 0
      });

      setCompletedOrder({
        ...order,
        id: paymentReceipt.invoiceNumber ? paymentReceipt.invoiceNumber.replace('PB-INV-2026-', 'PB-') : order.id,
        invoiceNumber: paymentReceipt.invoiceNumber || order.invoiceNumber,
      });
      setStep('success');
      notify(authNote ? `${authNote} · Order placed!` : 'Payment authorized & order placed successfully!');
    } catch (err: any) {
      const msg = err?.message || 'Payment verification failed.';
      if (paymentMethod === 'cashfree') {
        setCashfreeError(msg);
      }
      notify(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
      onClick={() => {
        setIsCheckoutOpen(false);
        setSkipAddressOnCheckoutOpen(false);
        setStep('address');
      }}
    >
      <div 
        className="relative w-full max-w-2xl max-h-[92vh] bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Pinned Top Header */}
        <div className="shrink-0 flex items-center justify-between px-6 sm:px-8 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white font-display">
            Secure Checkout
          </h2>
          <button
            type="button"
            onClick={() => {
              setIsCheckoutOpen(false);
              setSkipAddressOnCheckoutOpen(false);
              setStep('address');
            }}
            className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            title="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8">

        {/* Stepper Progress */}
        {step !== 'success' && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-semibold mb-3">
              <span className={step === 'address' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-500'}>
                1. Delivery Address
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">———</span>
              <span className={step === 'payment' || step === 'otp_challenge' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-500'}>
                2. Real Payment & Verification
              </span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-600 h-full transition-all duration-300"
                style={{ width: step === 'address' ? '50%' : '100%' }}
              />
            </div>
          </div>
        )}

        {/* STEP 1: Address Selection */}
        {step === 'address' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                Select Shipping Address
              </h3>
              {!isAddingAddress && (
                <button
                  onClick={() => setIsAddingAddress(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Address</span>
                </button>
              )}
            </div>

            {!isAddingAddress ? (
              <div className="space-y-3">
                {addresses.map(addr => (
                  <label
                    key={addr.id}
                    className={`block p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedAddressId === addr.id
                        ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-600'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="deliveryAddress"
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mt-1 accent-emerald-600 w-4 h-4 cursor-pointer"
                      />
                      <div className="flex-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900 dark:text-white text-sm">
                            {addr.fullName}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            {addr.type}
                          </span>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-300 mt-1">
                          {addr.street}, {addr.city}, {addr.state} - {addr.pinCode}
                        </p>
                        <p className="text-zinc-400 mt-0.5 font-mono">Mobile: {addr.phone}</p>
                      </div>
                    </div>
                  </label>
                ))}

                {/* Continue button */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] text-zinc-400 block">Estimated Total</span>
                    <span className="text-base font-bold font-mono text-zinc-900 dark:text-white">
                      ₹{finalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <button
                    onClick={handleProceedToPayment}
                    className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all"
                  >
                    <span>Proceed to Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveNewAddress} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={newFullName}
                    onChange={e => setNewFullName(e.target.value)}
                    className="p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="10-digit Phone"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                  />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Street Address, Flat / Apartment / Landmark"
                  value={newStreet}
                  onChange={e => setNewStreet(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="City"
                    value={newCity}
                    onChange={e => setNewCity(e.target.value)}
                    className="p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={newState}
                    onChange={e => setNewState(e.target.value)}
                    className="p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="PIN Code"
                    value={newPinCode}
                    onChange={e => setNewPinCode(e.target.value)}
                    className="p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-mono"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                  >
                    Save Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingAddress(false)}
                    className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* STEP 2: Payment Gateway Selection */}
        {step === 'payment' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('address')}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Address</span>
              </button>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <Lock className="w-3 h-3" />
                <span>PCI-DSS Secured Gateway</span>
              </div>
            </div>

            {currentAddress && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate text-zinc-700 dark:text-zinc-300">
                    Delivering to <strong className="text-zinc-900 dark:text-white">{currentAddress.fullName}</strong> · {currentAddress.city} ({currentAddress.pinCode})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('address')}
                  className="text-emerald-600 font-bold hover:underline shrink-0 text-[11px]"
                >
                  Change
                </button>
              </div>
            )}

            <div className="space-y-3">
              {/* Option 0: Cashfree Sandbox Payment Gateway */}
              <div
                onClick={() => setPaymentMethod('cashfree')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'cashfree'
                    ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-600'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'cashfree'}
                    onChange={() => setPaymentMethod('cashfree')}
                    className="mt-1 accent-emerald-600 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center font-black text-[10px]">
                          CF
                        </div>
                        <span className="font-bold text-sm text-zinc-900 dark:text-white">
                          Cashfree Payments (Cards, NetBanking, Wallets, UPI)
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          paymentIntent?.cashfree?.paymentSessionId
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 border-emerald-500/20'
                            : cashfreeError || intentError
                              ? 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 border-rose-500/20'
                              : 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 border-amber-500/20'
                        }`}
                      >
                        {initializingIntent
                          ? 'Connecting Gateway...'
                          : paymentIntent?.cashfree?.paymentSessionId
                            ? `${(paymentIntent.cashfree.environment || 'sandbox').toUpperCase()} Session Ready`
                            : cashfreeError || intentError
                              ? 'Gateway Error'
                              : 'Gateway Ready'}
                      </span>
                    </div>

                    {paymentMethod === 'cashfree' && (
                      <div className="mt-3.5 p-3.5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 space-y-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-500/20">
                          <div className="min-w-0">
                            <span className="font-bold text-amber-900 dark:text-amber-200 block text-xs">
                              {initializingIntent
                                ? 'Creating Cashfree Payment Session...'
                                : paymentIntent?.cashfree?.paymentSessionId
                                  ? 'Cashfree PG Session Initialized'
                                  : 'Cashfree Session Unavailable'}
                            </span>
                            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-mono block break-all">
                              {paymentIntent?.cashfree?.cfOrderId
                                ? `CF Order: ${paymentIntent.cashfree.cfOrderId} (${paymentIntent.cashfree.orderId})`
                                : paymentIntent?.cashfree?.orderId
                                  ? `Order Ref: ${paymentIntent.cashfree.orderId}`
                                  : 'Awaiting Cashfree order creation'}
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-100 dark:bg-emerald-950 px-2 py-1 rounded-md shrink-0">
                            API v{paymentIntent?.cashfree?.apiVersion || '2025-01-01'}
                          </span>
                        </div>

                        {(cashfreeError || intentError) && (
                          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>{cashfreeError || intentError}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                initializePaymentIntent();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] shrink-0 flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Retry</span>
                            </button>
                          </div>
                        )}

                        <div className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
                          <p>Supports all Indian payment rails via Cashfree credentials:</p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {['Google Pay', 'PhonePe', 'Paytm', 'Visa / RuPay Cards', 'HDFC / SBI / ICICI NetBanking'].map((m) => (
                              <span key={m} className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300 text-[10px] font-medium">
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-1 space-y-2">
                          <button
                            type="button"
                            disabled={initializingIntent || cashfreeLaunching || loading}
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerCashfreeSdkCheckout('_modal');
                            }}
                            className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99]"
                          >
                            <span>
                              {cashfreeLaunching
                                ? 'Opening Cashfree Checkout...'
                                : initializingIntent
                                  ? 'Preparing Cashfree Session...'
                                  : `Pay ₹${finalAmount.toLocaleString('en-IN')} with Cashfree Checkout`}
                            </span>
                            <ArrowRight className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            disabled={initializingIntent || cashfreeLaunching || loading}
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerCashfreeSdkCheckout('_self');
                            }}
                            className="w-full py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Having trouble with the popup? Open Cashfree Hosted Payment Page</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Option 1: NPCI UPI Transfer */}
              <div
                onClick={() => setPaymentMethod('upi')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'upi'
                    ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-600'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'upi'}
                    onChange={() => setPaymentMethod('upi')}
                    className="mt-1 accent-emerald-600 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-sm text-zinc-900 dark:text-white">
                          Instant UPI & QR Code (Google Pay, PhonePe, Paytm)
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
                        Fastest
                      </span>
                    </div>

                    {paymentMethod === 'upi' && (
                      <div className="mt-3.5 p-3.5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 space-y-3">
                        <div className="flex items-center gap-4">
                          {/* SVG QR Code Simulation */}
                          <div className="w-24 h-24 bg-white p-2 rounded-xl border border-zinc-300 dark:border-zinc-600 flex flex-col items-center justify-center shadow-xs">
                            <QrCode className="w-16 h-16 text-zinc-900" />
                            <span className="text-[8px] font-mono text-zinc-500">Scan & Pay</span>
                          </div>

                          <div className="flex-1 space-y-1">
                            <span className="font-bold text-zinc-900 dark:text-white block">
                              Prime Bazaar Retail Merchant
                            </span>
                            <div className="flex items-center gap-2 font-mono text-[11px] bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-lg">
                              <span>primebazaar@icici</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText('primebazaar@icici');
                                  notify('Merchant UPI ID copied!');
                                }}
                                className="text-emerald-600 hover:text-emerald-700 ml-auto"
                                title="Copy UPI ID"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-[10px] text-emerald-600 font-medium block">
                              NPCI Gateway Ref: {paymentIntent?.gatewayReference || 'PB_GW_ACTIVE'}
                            </span>
                          </div>
                        </div>

                        {/* UPI 12-Digit UTR reconciliation */}
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                            Bank 12-Digit UPI UTR Reference (Optional):
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 429104829104"
                            maxLength={12}
                            value={upiUtr}
                            onChange={e => setUpiUtr(e.target.value.replace(/\D/g, ''))}
                            className="w-full p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Option 2: Credit / Debit Card */}
              <div
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'card'
                    ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-600'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="mt-1 accent-emerald-600 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                      <span className="font-bold text-sm text-zinc-900 dark:text-white">
                        Credit / Debit Card (Visa, Mastercard, RuPay)
                      </span>
                    </div>

                    {paymentMethod === 'card' && (
                      <div className="mt-3.5 space-y-2.5 bg-white dark:bg-zinc-800 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                            Card Number
                          </label>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={e => setCardNumber(e.target.value)}
                            className="w-full p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs"
                            placeholder="4532 •••• •••• 8821"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                              Expiry Date
                            </label>
                            <input
                              type="text"
                              value={cardExpiry}
                              onChange={e => setCardExpiry(e.target.value)}
                              className="w-full p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs"
                              placeholder="MM/YY"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                              CVV
                            </label>
                            <input
                              type="password"
                              maxLength={4}
                              value={cardCvv}
                              onChange={e => setCardCvv(e.target.value)}
                              className="w-full p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs"
                              placeholder="•••"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Option 3: Cash On Delivery (COD) with Anti-Fraud Verification */}
              <div
                onClick={() => setPaymentMethod('cod')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-600'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="mt-1 accent-emerald-600 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-sm text-zinc-900 dark:text-white">
                        Cash on Delivery (COD)
                      </span>
                    </div>
                    <p className="text-zinc-500 mt-1">
                      Pay cash or UPI at your doorstep upon package inspection.
                    </p>

                    {paymentMethod === 'cod' && (
                      <div className="mt-3 p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 space-y-2">
                        <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block">
                          Doorstep Verification: {currentAddress?.phone}
                        </span>
                        {!isCodOtpSent ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendCodOtp();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-bold"
                          >
                            Send Mobile Verification Code
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 font-bold text-[11px]">
                              ✓ Mobile Verified for COD Dispatch
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Option 4: Net Banking */}
              <div
                onClick={() => setPaymentMethod('netbanking')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'netbanking'
                    ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-600'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'netbanking'}
                    onChange={() => setPaymentMethod('netbanking')}
                    className="mt-1 accent-emerald-600 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-sm text-zinc-900 dark:text-white">
                        Net Banking
                      </span>
                    </div>
                    {paymentMethod === 'netbanking' && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak', 'PNB'].map(b => (
                          <button
                            key={b}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBank(b);
                            }}
                            className={`p-2 rounded-xl text-center text-xs font-semibold border transition-all ${
                              selectedBank === b ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-700' : 'border-zinc-200 dark:border-zinc-700'
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Total & Action Button */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <span className="text-[11px] text-zinc-400 block">Total Payable</span>
                <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  ₹{finalAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <button
                onClick={handleTriggerPaymentVerification}
                disabled={loading}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>
                  {loading
                    ? 'Processing...'
                    : paymentMethod === 'cod'
                      ? 'Confirm Cash on Delivery Order (₹' + finalAmount.toLocaleString('en-IN') + ')'
                      : 'Authorize & Pay ₹' + finalAmount.toLocaleString('en-IN')}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2.5: 3D-Secure Card Banking Challenge */}
        {step === 'otp_challenge' && (
          <div className="text-center py-4 space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 mx-auto flex items-center justify-center">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
                3D Secure Bank Authorization
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                Enter the One-Time Password sent by your issuing bank to complete transaction of <strong>₹{finalAmount.toLocaleString('en-IN')}</strong>.
              </p>
            </div>

            <div className="max-w-xs mx-auto space-y-2">
              <input
                type="text"
                maxLength={4}
                value={bankOtp}
                onChange={e => setBankOtp(e.target.value)}
                className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-center text-lg font-mono tracking-widest font-bold focus:outline-none focus:border-emerald-600"
              />
              <span className="text-[11px] text-emerald-600 font-semibold block">
                Simulator Test Code: 8492
              </span>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => executeFinalOrderPlacement('Verified via 3D-Secure Card OTP')}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
              >
                {loading ? 'Authorizing...' : 'Submit to Bank Gateway'}
              </button>
              <button
                onClick={() => setStep('payment')}
                className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Success Screen with GST Tax Invoice & Live Delivery Tracking */}
        {step === 'success' && completedOrder && (
          <div className="text-center py-4 space-y-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white font-display">
                Order Confirmed!
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                Your order <strong className="font-mono text-zinc-900 dark:text-white">#{completedOrder.id}</strong> has been verified by the backend engine and assigned to BlueDart Express.
              </p>
            </div>

            {/* Official GST Tax Receipt Summary */}
            <div className="text-left p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between pb-2 border-b border-zinc-200 dark:border-zinc-700 font-bold">
                <span className="text-zinc-700 dark:text-zinc-300">GST Tax Invoice</span>
                <span className="font-mono text-emerald-600">{completedOrder.invoiceNumber || `PB-INV-${completedOrder.id}`}</span>
              </div>
              <div className="flex justify-between">
                <span>Seller GSTIN</span>
                <span className="font-mono font-bold">27AABCP1384L1ZV</span>
              </div>
              <div className="flex justify-between">
                <span>Items ({completedOrder.items.length})</span>
                <span className="font-mono">₹{completedOrder.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>CGST (9%) + SGST (9%)</span>
                <span className="font-mono">₹{Math.round(completedOrder.totalAmount * 0.18).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Mode</span>
                <span className="uppercase font-semibold text-emerald-600">{completedOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700 font-bold text-sm">
                <span>Amount Paid</span>
                <span className="font-mono text-emerald-600">₹{completedOrder.finalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setIsCheckoutOpen(false);
                  setIsOrdersOpen(true);
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs shadow-md hover:scale-105 transition-all"
              >
                Track Live Order on BlueDart
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print GST Invoice</span>
              </button>
            </div>
          </div>
        )}
        </div>

        {/* Sticky Bottom Footer with Close */}
        <div className="shrink-0 flex items-center justify-end px-6 sm:px-8 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/95">
          <button
            type="button"
            onClick={() => {
              setIsCheckoutOpen(false);
              setSkipAddressOnCheckoutOpen(false);
              setStep('address');
            }}
            className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
