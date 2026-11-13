import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { 
  X, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Building2, 
  CreditCard, 
  Upload, 
  Store,
  Phone,
  Mail,
  FileText,
  Sparkles
} from 'lucide-react';

interface SellerRegistrationModalProps {
  onClose: () => void;
  onSuccess: (sellerId: string) => void;
}

export const SellerRegistrationModal: React.FC<SellerRegistrationModalProps> = ({ onClose, onSuccess }) => {
  const { registerSeller, notify } = useMarketplace();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Account & Verification
  const [phone, setPhone] = useState('+91 98450 12849');
  const [email, setEmail] = useState('crafts.artisan@gmail.com');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  // Step 2: Business Info
  const [sellerName, setSellerName] = useState('Raghavendra Sharma');
  const [storeName, setStoreName] = useState('Jaipur Craft Emporium');
  const [businessType, setBusinessType] = useState<'Proprietorship' | 'Partnership' | 'Private Limited' | 'Individual Artisan'>('Proprietorship');
  const [street, setStreet] = useState('B-14, Johari Bazaar, Pink City');
  const [city, setCity] = useState('Jaipur');
  const [state, setState] = useState('Rajasthan');
  const [pinCode, setPinCode] = useState('302003');

  // Step 3: Documents & Bank Account
  const [panNumber, setPanNumber] = useState('AAQCS1920R');
  const [gstNumber, setGstNumber] = useState('08AAQCS1920R1Z4');
  const [accountHolderName, setAccountHolderName] = useState('Raghavendra Sharma');
  const [accountNumber, setAccountNumber] = useState('50100294819032');
  const [ifscCode, setIfscCode] = useState('HDFC0000184');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [panUploaded, setPanUploaded] = useState(true);
  const [gstUploaded, setGstUploaded] = useState(true);
  const [chequeUploaded, setChequeUploaded] = useState(true);

  // Step 4: Submission result
  const [registeredSellerId, setRegisteredSellerId] = useState<string>('');

  const handleSendOtp = () => {
    setOtpSent(true);
    setOtp('7784');
    notify('OTP sent! Use verification code 7784 to confirm.');
  };

  const handleVerifyOtp = () => {
    if (otp === '7784' || otp.length === 4) {
      setIsOtpVerified(true);
      notify('Mobile & Email verified successfully!');
      setStep(2);
    } else {
      notify('Please enter valid 4-digit OTP (hint: 7784)');
    }
  };

  const handleSubmitRegistration = () => {
    const newSeller = registerSeller({
      name: sellerName,
      storeName,
      businessName: storeName,
      phone,
      email,
      businessType,
      gstNumber,
      panNumber,
      pickupAddress: {
        street,
        city,
        state,
        pinCode
      },
      bankAccount: {
        accountHolderName,
        accountNumber,
        ifscCode,
        bankName
      },
      kycDocuments: {
        panNumber,
        status: 'pending',
        submittedAt: new Date().toLocaleDateString('en-IN')
      }
    });

    setRegisteredSellerId(newSeller.id);
    setStep(4);
  };

  const handleLaunchDashboard = () => {
    onSuccess(registeredSellerId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full max-h-[92vh] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="shrink-0 p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                Seller Onboarding Studio
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Sell to millions of shoppers across India on Prime Bazaar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Step Stepper Ribbon */}
        <div className="shrink-0 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Account' },
              { num: 2, label: 'Business' },
              { num: 3, label: 'Documents & Bank' },
              { num: 4, label: 'Approval Status' },
              { num: 5, label: 'Launch Studio' }
            ].map(s => {
              const isActive = step === s.num;
              const isDone = step > s.num;
              return (
                <div key={s.num} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone 
                      ? 'bg-emerald-500 text-white' 
                      : isActive 
                        ? 'bg-rose-600 text-white ring-4 ring-rose-100 dark:ring-rose-950' 
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`text-[11px] font-semibold hidden md:inline ${
                    isActive ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-400'
                  }`}>
                    {s.label}
                  </span>
                  {s.num < 5 && (
                    <div className="w-4 lg:w-8 h-0.5 bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 text-xs text-zinc-700 dark:text-zinc-300">
          {/* STEP 1: Account Verification */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Step 1: Create Seller Account & Verification
                </h4>
                <p className="text-zinc-500 text-[11px]">
                  Provide your registered contact information for seller communications and dispatch OTPs.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block font-semibold mb-1 text-zinc-800 dark:text-zinc-200">
                    Mobile Phone Number (for dispatch notifications)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      />
                    </div>
                    {!otpSent ? (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold hover:opacity-90 shrink-0"
                      >
                        Send OTP
                      </button>
                    ) : (
                      <span className="text-emerald-600 text-[11px] font-bold shrink-0">
                        OTP Sent ✓
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-zinc-800 dark:text-zinc-200">
                    Business Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seller@craftstore.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>

                {otpSent && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-2">
                    <label className="block font-semibold text-rose-900 dark:text-rose-200">
                      Enter 4-Digit Verification OTP (Received on Phone & Brevo Email)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                        placeholder="7784"
                        className="w-32 text-center text-lg font-mono font-bold tracking-widest py-2 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-zinc-900"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-500 shadow-sm"
                      >
                        Verify & Continue
                      </button>
                    </div>
                    <span className="text-[10px] text-zinc-500 block">
                      Code automatically filled: 7784 (Valid for 5 mins)
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpVerified(true);
                    setStep(2);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <span>Proceed to Business Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Business Information */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Step 2: Business & Pickup Warehouse Information
                </h4>
                <p className="text-zinc-500 text-[11px]">
                  Where should courier associates arrive to collect customer parcels?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold mb-1">Seller Full Name</label>
                  <input
                    type="text"
                    value={sellerName}
                    onChange={e => setSellerName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Display Store Name</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Business Entity Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Proprietorship', 'Partnership', 'Private Limited', 'Individual Artisan'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBusinessType(type)}
                      className={`p-2 rounded-xl text-center font-semibold border transition-all ${
                        businessType === type
                          ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block font-semibold mb-1">Pickup Warehouse Street Address</label>
                  <input
                    type="text"
                    value={street}
                    onChange={e => setStreet(e.target.value)}
                    placeholder="Shop/Godown No., Industrial Estate, Landmark"
                    className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={e => setState(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">PIN Code</label>
                    <input
                      type="text"
                      value={pinCode}
                      onChange={e => setPinCode(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <span>Proceed to Tax & Documents</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Tax Details & KYC Documents */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Step 3: Document Verification & Bank Account
                </h4>
                <p className="text-zinc-500 text-[11px]">
                  Enter your PAN, GSTIN, and bank account for automatic sales payouts.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold mb-1">Business PAN Number</label>
                  <input
                    type="text"
                    value={panNumber}
                    onChange={e => setPanNumber(e.target.value.toUpperCase())}
                    placeholder="AAECV1234M"
                    className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">GSTIN (Where applicable)</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={e => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="08AAECV1234M1Z2"
                    className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold">
                  <CreditCard className="w-4 h-4 text-rose-600" />
                  <span>Settlement Bank Account</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Account Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value)}
                      className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={e => setIfscCode(e.target.value.toUpperCase())}
                      className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* KYC Document Uploads */}
              <div className="space-y-2">
                <label className="block font-semibold">Upload Required KYC Documents</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 text-center space-y-1">
                    <FileText className="w-5 h-5 mx-auto text-zinc-400" />
                    <span className="block font-bold text-zinc-800 dark:text-zinc-200">PAN Card</span>
                    <span className="text-[10px] text-emerald-600 font-bold block">✓ Document Ready</span>
                  </div>
                  <div className="p-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 text-center space-y-1">
                    <FileText className="w-5 h-5 mx-auto text-zinc-400" />
                    <span className="block font-bold text-zinc-800 dark:text-zinc-200">GST Certificate</span>
                    <span className="text-[10px] text-emerald-600 font-bold block">✓ Document Ready</span>
                  </div>
                  <div className="p-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 text-center space-y-1">
                    <CreditCard className="w-5 h-5 mx-auto text-zinc-400" />
                    <span className="block font-bold text-zinc-800 dark:text-zinc-200">Cancelled Cheque</span>
                    <span className="text-[10px] text-emerald-600 font-bold block">✓ Document Ready</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRegistration}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/20"
                >
                  <span>Submit Seller Application</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Application Submitted & Approval Status */}
          {step === 4 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
                  Seller Application Successfully Submitted!
                </h4>
                <p className="text-zinc-500 max-w-md mx-auto text-xs">
                  Your store <strong>{storeName}</strong> has been registered in the Prime Bazaar database under Merchant ID: <strong>{registeredSellerId}</strong>.
                </p>
              </div>

              <div className="max-w-md mx-auto p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-left space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Document Verification:</span>
                  <span className="font-bold text-emerald-600">KYC Verified ✓</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Marketplace Take Rate:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">12% Flat Commission</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Pickup Logistics:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">BlueDart / Delhivery Surface</span>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="px-6 py-3 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold flex items-center gap-2 shadow-lg hover:scale-102 transition-transform"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Launch My Seller Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Studio Ready */}
          {step === 5 && (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
                <Store className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-bold text-zinc-900 dark:text-white font-display">
                  Welcome to Prime Bazaar Merchant Studio!
                </h4>
                <p className="text-zinc-500 max-w-md mx-auto text-xs">
                  Your store is live. You can now upload your catalog products, view real-time orders, print shipping labels, and track bank settlements autonomously.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
                <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                  <span className="font-bold text-zinc-900 dark:text-white block mb-0.5">1. Add Catalog</span>
                  <span className="text-[11px] text-zinc-500">Upload single or bulk products with variants and GST.</span>
                </div>
                <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                  <span className="font-bold text-zinc-900 dark:text-white block mb-0.5">2. Dispatch Orders</span>
                  <span className="text-[11px] text-zinc-500">1-click pack, generate AWB shipping label & dispatch.</span>
                </div>
                <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                  <span className="font-bold text-zinc-900 dark:text-white block mb-0.5">3. Fast Payouts</span>
                  <span className="text-[11px] text-zinc-500">Automatic T+2 bank deposits and settlement ledger.</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLaunchDashboard}
                  className="px-8 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-xl shadow-rose-600/25 transition-all"
                >
                  Enter Store Dashboard Now →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Footer with Close */}
        <div className="shrink-0 flex items-center justify-end px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <button
            type="button"
            onClick={onClose}
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
