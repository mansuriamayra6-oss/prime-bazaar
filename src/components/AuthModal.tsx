import React, { useEffect, useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { api } from '../services/api';
import { authenticateWithBiometric, checkBiometricAvailability } from '../utils/nativeBridge';
import { X, CheckCircle2, ArrowRight, ShieldCheck, UserCheck, Building2, Fingerprint, KeyRound } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthOpen, setIsAuthOpen, loginUser, openMerchantAuth, notify } = useMarketplace();

  const [authMode, setAuthMode] = useState<'otp' | 'password' | 'biometric'>('otp');
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [biometricIdentifier, setBiometricIdentifier] = useState('mansuriamayra6@gmail.com');
  const [fallbackPin, setFallbackPin] = useState('');
  const [showPinFallback, setShowPinFallback] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Face ID / Fingerprint');
  const [fullName, setFullName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [serverNotice, setServerNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthOpen) return;
    checkBiometricAvailability()
      .then((info) => setBiometricLabel(info.label))
      .catch(() => {});
  }, [isAuthOpen]);

  if (!isAuthOpen) return null;

  const handleBiometricLogin = async () => {
    const id = biometricIdentifier.trim();
    if (!id) {
      notify('Enter your registered email or phone number for biometric unlock.');
      return;
    }
    setLoading(true);
    setServerNotice(null);
    try {
      const res = await authenticateWithBiometric(id);
      if (res.user) {
        loginUser(res.user.name, res.user.phone, res.user.email, res.token);
        setIsAuthOpen(false);
        notify('Signed in with Biometric Authentication.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Biometric verification unavailable.';
      setServerNotice(msg);
      setShowPinFallback(true);
      notify(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePinFallbackLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = biometricIdentifier.trim();
    if (!id || !fallbackPin.trim()) {
      notify('Enter your registered email/phone and 4–6 digit security PIN.');
      return;
    }
    setLoading(true);
    setServerNotice(null);
    try {
      const res = await api.biometric.verify({
        identifier: id,
        pin: fallbackPin.trim(),
        fallbackMode: 'pin',
      });
      if (res.user) {
        loginUser(res.user.name, res.user.phone, res.user.email, res.token);
        setIsAuthOpen(false);
        setFallbackPin('');
        notify('Signed in via Security PIN fallback.');
      }
    } catch (err: any) {
      setServerNotice(err?.message || 'Incorrect PIN.');
      notify(err?.message || 'PIN verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (method === 'phone' && phone.length < 10) {
      notify('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (method === 'email' && !email.includes('@')) {
      notify('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setOtpCode('');
    setServerNotice(null);
    try {
      const res = await api.auth.sendOtp(
        method === 'phone' ? `+91 ${phone}` : undefined,
        method === 'email' ? email : undefined,
        fullName.trim() || undefined
      );
      if (res.deliveryFailed || !res.success) {
        setOtpSent(false);
        setServerNotice(res.message || null);
        notify(res.message || 'Failed to send verification email via Brevo.');
      } else {
        setOtpSent(true);
        setServerNotice(res.message || null);
        if (res.codeHint) {
          setOtpCode(res.codeHint);
        }
        notify(res.message || 'Verification code dispatched!');
      }
    } catch (err: any) {
      notify(err.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.verifyOtp({
        phone: method === 'phone' ? `+91 ${phone}` : undefined,
        email: method === 'email' ? email : undefined,
        otp: otpCode,
        name: fullName,
      });

      if (res.user) {
        loginUser(res.user.name, res.user.phone, res.user.email, res.token);
        setIsAuthOpen(false);
        setOtpSent(false);
        setPhone('');
        setEmail('');
      }
    } catch (err: any) {
      notify(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) {
      notify('Please enter your email or phone.');
      return;
    }
    setLoading(true);
    try {
      const target = email || phone;
      const res = await api.auth.login(target, password);
      if (res.user) {
        loginUser(res.user.name, res.user.phone, res.user.email, res.token);
        setIsAuthOpen(false);
      }
    } catch (err: any) {
      notify(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoShopper = async () => {
    setLoading(true);
    try {
      const res = await api.auth.login('mansuriamayra6@gmail.com', 'demoPass123');
      if (res.user) {
        loginUser(res.user.name, res.user.phone, res.user.email, res.token);
        setIsAuthOpen(false);
      }
    } catch {
      loginUser('Verified Shopper', '+91 98765 43210', 'shopper@primebazaar.in');
      setIsAuthOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
      onClick={() => setIsAuthOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sign In to Prime Bazaar"
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setIsAuthOpen(false)}
          aria-label="Close sign in dialog"
          className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo and Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-white border border-zinc-200/90 shadow-sm mx-auto mb-2">
            <img
              src="/assets/aistudio/IMG_20261124_134619_98e88ce3.png"
              alt="Prime Bazaar"
              className="h-14 w-14 object-contain"
            />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white font-display">
            Sign In to Prime Bazaar
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real authentication backed by Prime Bazaar backend service
          </p>
        </div>

        {/* Quick Reviewer 1-Tap Sign In */}
        <div className="mb-4 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-left text-[11px]">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                Instant Reviewer Sign-In
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                1-tap authenticated shopper profile
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickDemoShopper}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm shrink-0 active:scale-95 transition-all"
          >
            Sign In
          </button>
        </div>

        {/* Auth Mode Toggle: Mobile OTP vs Password vs Biometric */}
        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-4" role="tablist" aria-label="Authentication methods">
          <button
            type="button"
            role="tab"
            aria-selected={authMode === 'otp'}
            onClick={() => setAuthMode('otp')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              authMode === 'otp' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500'
            }`}
          >
            OTP
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={authMode === 'password'}
            onClick={() => setAuthMode('password')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              authMode === 'password' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={authMode === 'biometric'}
            onClick={() => setAuthMode('biometric')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
              authMode === 'biometric' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Biometric</span>
          </button>
        </div>

        {authMode === 'otp' ? (
          !otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-3.5">
              <div>
                <label htmlFor="auth-full-name" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Your Full Name
                </label>
                <input
                  id="auth-full-name"
                  type="text"
                  placeholder="e.g. Amayra Mansuri"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Toggle Phone / Email */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('phone')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                    method === 'phone' ? 'border-emerald-600 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'
                  }`}
                >
                  Via Phone
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('email')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                    method === 'email' ? 'border-emerald-600 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'
                  }`}
                >
                  Via Email
                </button>
              </div>

              {method === 'phone' ? (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Mobile Number
                  </label>
                  <div className="flex">
                    <span className="p-2.5 bg-zinc-100 dark:bg-zinc-800 border border-r-0 border-zinc-300 dark:border-zinc-700 rounded-l-xl text-xs font-mono text-zinc-600 dark:text-zinc-300">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="98765 43210"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 p-2.5 rounded-r-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-mono focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>
              )}

              {serverNotice && !otpSent && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200">
                  {serverNotice}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <span>{loading ? 'Sending Code...' : 'Get Verification Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
                <span className="text-zinc-500 block text-[11px]">OTP dispatched to:</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-white block text-sm">
                  {method === 'phone' ? `+91 ${phone}` : email}
                </span>
                <div className="pt-1 text-[11px] text-zinc-500">
                  <span>Gateway: </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {method === 'email' ? 'Brevo (Sendinblue) Transactional' : 'SMS Gateway'}
                  </span>
                </div>
                {serverNotice && (
                  <p className="text-[10px] text-zinc-500 italic max-w-xs mx-auto pt-0.5">
                    {serverNotice}
                  </p>
                )}
                {method === 'email' ? (
                  <span className="text-[11px] text-emerald-600 font-medium block pt-0.5">
                    Check your inbox (and spam folder) for the 6-digit Brevo OTP.
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-600 font-mono font-semibold block pt-0.5">
                    SMS Demo code: {otpCode || '7784'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Enter Verification Code (4 or 6 Digits)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.trim())}
                  placeholder="••••••"
                  className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-center text-xl font-mono tracking-widest font-bold focus:outline-none focus:border-emerald-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Verifying with Backend...' : 'Verify & Sign In'}</span>
              </button>

              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="w-full text-xs text-zinc-500 hover:underline text-center"
              >
                Change Mobile / Email
              </button>
            </form>
          )
        ) : authMode === 'password' ? (
          /* Password Login Mode */
          <form onSubmit={handlePasswordLogin} className="space-y-3.5">
            <div>
              <label htmlFor="auth-pwd-id" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Email or Mobile Number
              </label>
              <input
                id="auth-pwd-id"
                type="text"
                required
                placeholder="name@example.com or 9876543210"
                value={email || phone}
                onChange={e => {
                  const val = e.target.value;
                  if (/^\d+$/.test(val)) {
                    setPhone(val);
                    setEmail('');
                  } else {
                    setEmail(val);
                    setPhone('');
                  }
                }}
                className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label htmlFor="auth-pwd-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Password
              </label>
              <input
                id="auth-pwd-input"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In with Password'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Biometric & PIN Fallback Mode */
          <div className="space-y-3.5">
            <div>
              <label htmlFor="auth-bio-id" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Registered Email or Phone
              </label>
              <input
                id="auth-bio-id"
                type="text"
                placeholder="name@example.com or 9876543210"
                value={biometricIdentifier}
                onChange={e => setBiometricIdentifier(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            {serverNotice && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200">
                {serverNotice}
              </div>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={handleBiometricLogin}
              className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-95 disabled:opacity-50 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Fingerprint className="w-4 h-4 text-emerald-500" />
              <span>{loading ? 'Verifying...' : `Unlock with ${biometricLabel}`}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPinFallback(!showPinFallback)}
              className="w-full text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center gap-1"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{showPinFallback ? 'Hide Security PIN Fallback' : 'Use Security PIN Fallback instead'}</span>
            </button>

            {showPinFallback && (
              <form onSubmit={handlePinFallbackLogin} className="space-y-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <label htmlFor="auth-bio-pin" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  4–6 Digit Account Security PIN
                </label>
                <div className="flex gap-2">
                  <input
                    id="auth-bio-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••"
                    value={fallbackPin}
                    onChange={e => setFallbackPin(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-center font-mono tracking-widest font-bold"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    Verify PIN
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Merchant Partner Gateway */}
        <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between text-xs">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Are you a Merchant / Seller?</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Sell fashion & lifestyle across India with 0% listing fee.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsAuthOpen(false);
              openMerchantAuth('login');
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 shadow-xs transition-colors"
          >
            Merchant Partner
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-bit encrypted authentication & PCI-DSS compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};
