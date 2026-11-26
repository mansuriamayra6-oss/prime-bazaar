import React, { useState, useEffect } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { api } from '../services/api';
import { 
  X, 
  Coins, 
  Gift, 
  Share2, 
  Sparkles, 
  Check, 
  Copy, 
  Flame, 
  Clock, 
  Tag, 
  Award, 
  Zap, 
  Users, 
  Trophy, 
  CheckCircle2,
  Ticket,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

type DealsTab = 'games' | 'checkin' | 'scratch' | 'flash' | 'coupons' | 'referrals';

export const RewardsModal: React.FC = () => {
  const { isRewardsOpen, setIsRewardsOpen, coins, setCoins, earnCoins, notify, applyCoupon, user } = useMarketplace();
  const [activeTab, setActiveTab] = useState<DealsTab>('games');
  const [copied, setCopied] = useState(false);

  // Server Loyalty summary state
  const [tierName, setTierName] = useState<'SILVER' | 'GOLD' | 'PLATINUM'>('SILVER');
  const [coinsToNextTier, setCoinsToNextTier] = useState<number>(160);
  const [serverReferralCode, setServerReferralCode] = useState<string>('BAZAAR-AMAYRA77');
  const [applyReferralInput, setApplyReferralInput] = useState('');
  const [loyaltyTxns, setLoyaltyTxns] = useState<any[]>([]);

  // Spin the wheel state
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinPrize, setSpinPrize] = useState<string | null>(null);
  const [spinsLeft, setSpinsLeft] = useState(3);

  // Scratch card state
  const [isScratched, setIsScratched] = useState(false);
  const [scratchRewardClaimed, setScratchRewardClaimed] = useState(false);
  const [scratchWonCoins, setScratchWonCoins] = useState(60);

  // 7-day daily check-in state
  const [claimedDays, setClaimedDays] = useState<number[]>([]);
  const [currentDayStreak, setCurrentDayStreak] = useState(1);

  // Flash sale countdown timer
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 45 });

  const syncServerLoyalty = () => {
    if (!user?.isLoggedIn) return;
    api.loyalty
      .getMe()
      .then((res) => {
        if (res?.account) {
          setCoins(res.account.coinsBalance);
          setTierName(res.account.tierName || 'SILVER');
          setCoinsToNextTier(Number(res.coinsToNextTier || 0));
          setServerReferralCode(res.account.referralCode || 'BAZAAR-AMAYRA77');
          setSpinsLeft(res.account.spinsRemainingToday ?? 3);
          const streak = Number(res.account.streakDays || 0);
          setCurrentDayStreak(Math.max(1, streak + (res.account.canCheckInToday ? 1 : 0)));
          setClaimedDays(Array.from({ length: streak }, (_, i) => i + 1));
          if (!res.account.canScratchToday) {
            setIsScratched(true);
            setScratchRewardClaimed(true);
          }
        }
        if (Array.isArray(res?.transactions)) {
          setLoyaltyTxns(res.transactions);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isRewardsOpen) {
      syncServerLoyalty();
    }
  }, [isRewardsOpen, user?.isLoggedIn]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 5, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isRewardsOpen) return null;

  const referralCode = serverReferralCode;

  const handleCopy = () => {
    navigator.clipboard?.writeText?.(referralCode);
    setCopied(true);
    notify('Referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyReferralInput.trim()) return;
    if (!user?.isLoggedIn) {
      notify('Please sign in first to link a referral code.');
      return;
    }
    try {
      const res = await api.loyalty.applyReferral(applyReferralInput.trim());
      notify(res.message || 'Referral code applied!');
      setApplyReferralInput('');
      syncServerLoyalty();
    } catch (err: any) {
      notify(err?.message || 'Unable to apply referral code.');
    }
  };

  const wheelSegments = [
    { label: '50 Coins', coins: 50, color: 'from-amber-500 to-yellow-400' },
    { label: '20 Coins', coins: 20, color: 'from-emerald-500 to-teal-400' },
    { label: '100 Coins', coins: 100, color: 'from-purple-500 to-violet-400' },
    { label: '₹150 OFF', coupon: 'SPIN150', color: 'from-rose-500 to-pink-500' },
    { label: 'Free Ship', coupon: 'FREESHIP', color: 'from-sky-500 to-indigo-500' },
    { label: '75 Coins', coins: 75, color: 'from-orange-500 to-amber-400' }
  ];

  const handleSpinWheel = async () => {
    if (isSpinning || spinsLeft <= 0) {
      if (spinsLeft <= 0) notify('No spins left today! Come back tomorrow.');
      return;
    }
    setIsSpinning(true);
    setSpinPrize(null);

    let serverResult: any = null;
    if (user?.isLoggedIn) {
      try {
        serverResult = await api.loyalty.spin();
      } catch (err: any) {
        setIsSpinning(false);
        notify(err?.message || 'Daily spin limit reached.');
        return;
      }
    }

    const winningIdx =
      typeof serverResult?.segmentIndex === 'number'
        ? serverResult.segmentIndex % wheelSegments.length
        : Math.floor(Math.random() * wheelSegments.length);
    const degreesPerSegment = 360 / wheelSegments.length;
    const extraSpins = 5 * 360;
    const targetDeg = wheelRotation + extraSpins + winningIdx * degreesPerSegment + 15;
    setWheelRotation(targetDeg);

    setTimeout(() => {
      setIsSpinning(false);
      if (serverResult) {
        setSpinsLeft(serverResult.spinsRemainingToday ?? Math.max(0, spinsLeft - 1));
        setSpinPrize(serverResult.prizeLabel);
        if (serverResult.account) setCoins(serverResult.account.coinsBalance);
        if (serverResult.couponCode) {
          applyCoupon(serverResult.couponCode);
        }
        notify(`You won ${serverResult.prizeLabel}!`);
        syncServerLoyalty();
      } else {
        setSpinsLeft(prev => Math.max(0, prev - 1));
        const prize = wheelSegments[winningIdx];
        setSpinPrize(prize.label);
        if (prize.coins) {
          earnCoins(prize.coins, `Spin & Win: ${prize.label}`);
        } else if (prize.coupon) {
          applyCoupon(prize.coupon);
          notify(`You won coupon ${prize.coupon}!`);
        }
      }
    }, 3500);
  };

  const handleClaimDailyCheckIn = async (day: number, amount: number) => {
    if (claimedDays.includes(day)) return;
    if (user?.isLoggedIn) {
      try {
        const res = await api.loyalty.checkIn();
        if (res.alreadyClaimed) {
          notify(res.message);
          return;
        }
        if (res.account) setCoins(res.account.coinsBalance);
        setClaimedDays(prev => [...prev, res.streakDays || day]);
        setCurrentDayStreak(res.streakDays || day);
        notify(res.message || `+${res.awardedCoins} Bazaar Coins credited!`);
        syncServerLoyalty();
        return;
      } catch (err: any) {
        notify(err?.message || 'Unable to claim check-in.');
        return;
      }
    }
    setClaimedDays(prev => [...prev, day]);
    earnCoins(amount, `Day ${day} Check-in Streak`);
    notify(`Day ${day} check-in reward: +${amount} Bazaar Coins credited!`);
  };

  const handleScratch = async () => {
    if (isScratched || scratchRewardClaimed) return;
    setIsScratched(true);
    if (user?.isLoggedIn) {
      try {
        const res = await api.loyalty.scratch();
        setScratchRewardClaimed(true);
        if (res.alreadyClaimed) {
          notify(res.message);
          return;
        }
        setScratchWonCoins(res.coinsAwarded || 60);
        if (res.account) setCoins(res.account.coinsBalance);
        notify(res.message || `You scratched & won +${res.coinsAwarded} Bazaar Coins!`);
        syncServerLoyalty();
        return;
      } catch (err: any) {
        notify(err?.message || 'Unable to claim scratch card.');
        return;
      }
    }
    setTimeout(() => {
      setScratchRewardClaimed(true);
      earnCoins(60, 'Scratch Card Winner');
      notify('You scratched & won +60 Bazaar Coins + ₹100 Extra Voucher!');
    }, 400);
  };

  const claimableCoupons = [
    { code: 'WELCOME250', disc: '₹250 Flat OFF', min: '₹999', desc: 'Valid on first order across any vendor', tag: 'New User' },
    { code: 'FESTIVE20', disc: '20% Instant OFF', min: '₹1,499', desc: 'Valid on Ethnic, Silk & Jewellery items', tag: 'Festive Season' },
    { code: 'FREESHIP', disc: '100% Free Shipping', min: '₹499', desc: 'Express Doorstep Delivery Across India', tag: 'Limited Time' },
    { code: 'GROUP60', disc: '60% Group Deal', min: '₹1,999', desc: 'Unlock with 1 shopping friend team-up', tag: 'Group Buying' }
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
      onClick={() => setIsRewardsOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Deals, Games & Rewards Hub"
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Balance & Tabs */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold font-display text-zinc-900 dark:text-white">
                  Deals, Games & Rewards Hub
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                  {tierName} Tier
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs flex-wrap">
                <span className="text-zinc-500">Balance:</span>
                <span className="font-extrabold font-mono text-amber-600 dark:text-amber-400 text-sm">
                  {coins} Coins
                </span>
                <span className="text-[10px] text-zinc-400">
                  (= ₹{coins} off{coinsToNextTier > 0 ? ` · ${coinsToNextTier} pts to next tier` : ''})
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsRewardsOpen(false)}
            aria-label="Close rewards modal"
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto no-scrollbar shrink-0 text-xs font-semibold">
          {[
            { id: 'games', label: 'Spin to Win', icon: Sparkles },
            { id: 'scratch', label: 'Scratch & Win', icon: Award },
            { id: 'checkin', label: '7-Day Check-in', icon: Trophy },
            { id: 'flash', label: 'Flash Sale (4h)', icon: Zap },
            { id: 'coupons', label: 'Coupon Centre', icon: Tag },
            { id: 'referrals', label: 'Refer & Earn', icon: Share2 }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DealsTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all shrink-0 ${
                  isActive 
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs font-bold' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Viewport */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* ============================================================== */}
          {/* TAB 1: SPIN THE WHEEL */}
          {/* ============================================================== */}
          {activeTab === 'games' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
                  Daily Lucky Roulette
                </span>
                <h3 className="text-xl font-bold font-display text-zinc-900 dark:text-white mt-1.5">
                  Spin the Wheel & Win Guaranteed Prizes
                </h3>
                <p className="text-xs text-zinc-500">
                  You have <span className="font-bold text-rose-600">{spinsLeft} free spins</span> remaining today.
                </p>
              </div>

              {/* Roulette Wheel Simulator */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-2 flex items-center justify-center">
                {/* Pointer Arrow */}
                <div className="absolute -top-3 z-20 w-0 h-0 border-x-8 border-x-transparent border-t-[18px] border-t-rose-600 drop-shadow-md animate-bounce" />

                {/* Rotating Circle Wheel */}
                <div 
                  className="w-full h-full rounded-full border-8 border-amber-400 shadow-2xl relative overflow-hidden transition-transform ease-out duration-[3500ms]"
                  style={{ transform: `rotate(${wheelRotation}deg)` }}
                >
                  {wheelSegments.map((segment, idx) => {
                    const angle = (360 / wheelSegments.length) * idx;
                    return (
                      <div
                        key={idx}
                        className={`absolute inset-0 bg-gradient-to-tr ${segment.color} flex items-start justify-center pt-4 font-bold text-white text-xs shadow-inner`}
                        style={{
                          clipPath: 'polygon(50% 50%, 0% 0%, 100% 0%)',
                          transform: `rotate(${angle}deg)`
                        }}
                      >
                        <span className="rotate-90 origin-bottom mt-2 font-mono drop-shadow-md">
                          {segment.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Center Spin Button Hub */}
                <button
                  onClick={handleSpinWheel}
                  disabled={isSpinning || spinsLeft <= 0}
                  className={`absolute z-10 w-20 h-20 rounded-full font-bold text-xs uppercase shadow-xl flex flex-col items-center justify-center border-4 border-white transition-transform active:scale-90 ${
                    isSpinning 
                      ? 'bg-zinc-400 text-white cursor-not-allowed'
                      : spinsLeft <= 0 
                        ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed'
                        : 'bg-gradient-to-tr from-rose-600 to-amber-500 text-white hover:scale-105'
                  }`}
                >
                  <Sparkles className="w-4 h-4 mb-0.5" />
                  <span>{isSpinning ? 'SPINNING...' : 'SPIN'}</span>
                </button>
              </div>

              {spinPrize && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-bounce">
                  🎉 Winner! You unlocked: {spinPrize}! Check your rewards balance.
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: SCRATCH & WIN */}
          {/* ============================================================== */}
          {activeTab === 'scratch' && (
            <div className="space-y-4 text-center">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                  Temu Gold Ticket
                </span>
                <h3 className="text-xl font-bold font-display text-zinc-900 dark:text-white mt-1.5">
                  Interactive Golden Scratch Card
                </h3>
                <p className="text-xs text-zinc-500">
                  Tap or click to rub away the gold foil and reveal your secret VIP bonus!
                </p>
              </div>

              {/* Scratchable surface */}
              <div 
                onClick={handleScratch}
                className={`w-full max-w-sm mx-auto h-48 rounded-3xl p-6 relative overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all shadow-xl ${
                  isScratched
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white scale-102'
                    : 'bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-600 text-amber-950 hover:brightness-105 active:scale-98'
                }`}
              >
                {!isScratched ? (
                  <div className="flex flex-col items-center gap-2">
                    <Award className="w-12 h-12 text-amber-950/60 animate-pulse" />
                    <span className="font-extrabold text-sm uppercase tracking-wider">
                      ✨ TAP TO SCRATCH CARD ✨
                    </span>
                    <span className="text-[11px] text-amber-950/70 font-medium">
                      Guaranteed voucher worth up to ₹500
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 animate-scale-up">
                    <div className="w-12 h-12 rounded-full bg-white text-emerald-600 flex items-center justify-center font-black shadow-lg">
                      +60
                    </div>
                    <span className="text-lg font-black tracking-tight">
                      YOU WON 60 COINS!
                    </span>
                    <span className="text-xs text-emerald-100 bg-white/20 px-3 py-1 rounded-full font-mono">
                      + ₹100 Flat Voucher (AUTO-CLAIMED)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: 7-DAY CHECK-IN STREAK */}
          {/* ============================================================== */}
          {activeTab === 'checkin' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold font-display text-zinc-900 dark:text-white">
                    7-Day Daily Check-In Streak
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Check in every day to claim compounding coin bonuses and day-7 mystery loot box!
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-xs font-mono">
                  🔥 Streak: {currentDayStreak} Days
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {[
                  { day: 1, coins: 10, bonus: null },
                  { day: 2, coins: 20, bonus: null },
                  { day: 3, coins: 30, bonus: null },
                  { day: 4, coins: 50, bonus: '₹50 Coupon' },
                  { day: 5, coins: 70, bonus: null },
                  { day: 6, coins: 100, bonus: null },
                  { day: 7, coins: 200, bonus: '🎁 Mystery Box' }
                ].map(item => {
                  const isClaimed = claimedDays.includes(item.day);
                  const isCurrent = item.day === currentDayStreak;
                  return (
                    <div
                      key={item.day}
                      className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-between gap-1.5 transition-all ${
                        isClaimed
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                          : isCurrent
                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 ring-2 ring-amber-400/30'
                            : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase text-zinc-500">
                        Day {item.day}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                        {isClaimed ? <Check className="w-4 h-4 text-emerald-600" /> : `+${item.coins}`}
                      </div>
                      {item.bonus && (
                        <span className="text-[9px] font-bold text-rose-500 px-1 py-0.5 rounded bg-rose-50 dark:bg-rose-950">
                          {item.bonus}
                        </span>
                      )}
                      <button
                        onClick={() => handleClaimDailyCheckIn(item.day, item.coins)}
                        disabled={isClaimed}
                        className={`w-full py-1 rounded-lg text-[10px] font-bold transition-all ${
                          isClaimed
                            ? 'bg-emerald-600 text-white cursor-default'
                            : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-rose-600 active:scale-95'
                        }`}
                      >
                        {isClaimed ? 'Claimed' : 'Check In'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: FLASH SALE & GROUP BUYING */}
          {/* ============================================================== */}
          {activeTab === 'flash' && (
            <div className="space-y-4">
              {/* Countdown Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold">
                    <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base">
                      Lightning Flash Sale – Ends Soon!
                    </h4>
                    <p className="text-[11px] text-white/80">
                      Up to 70% direct factory clearance with priority 24h dispatch
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs font-black">
                  <span className="p-1.5 rounded-lg bg-black/40 min-w-[28px] text-center">
                    {String(timeLeft.hours).padStart(2, '0')}h
                  </span>
                  <span>:</span>
                  <span className="p-1.5 rounded-lg bg-black/40 min-w-[28px] text-center">
                    {String(timeLeft.minutes).padStart(2, '0')}m
                  </span>
                  <span>:</span>
                  <span className="p-1.5 rounded-lg bg-black/40 min-w-[28px] text-center">
                    {String(timeLeft.seconds).padStart(2, '0')}s
                  </span>
                </div>
              </div>

              {/* Group Buying Promo (Temu style) */}
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-indigo-600 shrink-0" />
                  <div>
                    <h5 className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                      Group Buying (Team Up & Save 60%)
                    </h5>
                    <p className="text-[11px] text-zinc-500">
                      Invite 1 friend on WhatsApp to purchase together and both get factory wholesale pricing.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCopy}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 flex items-center gap-1 shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Invite Buddy</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: COUPON CENTRE */}
          {/* ============================================================== */}
          {activeTab === 'coupons' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Available Platform & Seller Vouchers
                </h4>
                <span className="text-[11px] text-zinc-400">1-click apply to checkout</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {claimableCoupons.map(c => (
                  <div
                    key={c.code}
                    className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                          {c.code}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                          {c.tag}
                        </span>
                      </div>
                      <span className="block font-bold text-sm text-zinc-900 dark:text-white mt-1">
                        {c.disc}
                      </span>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{c.desc}</p>
                      <span className="text-[10px] text-zinc-400 block mt-1 font-mono">
                        Min. Order: {c.min}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        applyCoupon(c.code);
                        notify(`Coupon ${c.code} copied & applied to your cart! 🎉`);
                      }}
                      className="w-full py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs hover:bg-rose-600 dark:hover:bg-rose-600 dark:hover:text-white transition-colors"
                    >
                      Claim & Apply Voucher
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: REFERRALS */}
          {/* ============================================================== */}
          {activeTab === 'referrals' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-white">
                    <Share2 className="w-4 h-4 text-rose-600" />
                    <span>Your Unique Reseller / Referral Code</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      Tier: {tierName} {coinsToNextTier > 0 ? `(${coinsToNextTier} to next)` : '(Top Tier)'}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">Earn 100 Coins / Friend</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200 text-center tracking-wider">
                    {referralCode}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold flex items-center gap-1.5 hover:bg-zinc-800 transition-colors shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  When a friend signs up with your code and places their first order, you both get 100 Bazaar Coins credited automatically.
                </p>

                <form onSubmit={handleApplyReferral} className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex gap-2">
                  <input
                    type="text"
                    placeholder="Have a friend's referral code? Enter here"
                    value={applyReferralInput}
                    onChange={e => setApplyReferralInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold whitespace-nowrap"
                  >
                    Apply Code
                  </button>
                </form>
              </div>

              {loyaltyTxns.length > 0 && (
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                  <span className="font-bold text-zinc-900 dark:text-white block">Recent Reward Ledger</span>
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-700/60 max-h-40 overflow-y-auto">
                    {loyaltyTxns.slice(0, 8).map((tx: any) => (
                      <div key={tx.id} className="py-1.5 flex items-center justify-between gap-2 tabular-nums">
                        <span className="text-zinc-700 dark:text-zinc-300 truncate">{tx.description}</span>
                        <span className={`font-mono font-bold ${tx.coinsDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.coinsDelta >= 0 ? `+${tx.coinsDelta}` : tx.coinsDelta} Coins
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

