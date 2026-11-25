import crypto from 'crypto';
import { recordAuditLog } from './auditAndRbac.ts';
import { roundMoney } from './financeLedger.ts';

// =============================================================================
// PHASE 6D: LOYALTY, REWARDS, REFERRALS & TIERS
// =============================================================================

export interface MembershipTierConfigRecord {
  id: string;
  tierName: 'SILVER' | 'GOLD' | 'PLATINUM';
  minLifetimePts: number;
  earnMultiplier: number;
  perks: string[];
  updatedAt: string;
}

export interface RewardTransactionRecord {
  id: string;
  userId: string;
  type:
    | 'CHECK_IN'
    | 'SPIN_WIN'
    | 'SCRATCH_CARD'
    | 'REFERRAL_BONUS'
    | 'ORDER_REWARD'
    | 'REDEEM'
    | 'ADMIN_ADJUST'
    | 'EXPIRED';
  coinsDelta: number;
  description: string;
  referenceId?: string;
  expiresAt?: string;
  expiredProcessed: boolean;
  createdAt: string;
}

export interface LoyaltyAccountRecord {
  id: string;
  userId: string;
  coinsBalance: number;
  lifetimeCoins: number;
  tierName: 'SILVER' | 'GOLD' | 'PLATINUM';
  streakDays: number;
  lastCheckInDate?: string;
  lastSpinDate?: string;
  spinsToday: number;
  lastScratchDate?: string;
  referralCode: string;
  referredByUserId?: string;
  personalizationOn: boolean;
  updatedAt: string;
}

export interface ReferralInviteRecord {
  id: string;
  referrerUserId: string;
  referredUserId?: string;
  referralCode: string;
  status: 'PENDING' | 'COMPLETED';
  rewardCoins: number;
  orderId?: string;
  completedAt?: string;
  createdAt: string;
}

export const dbMembershipTiers: Map<string, MembershipTierConfigRecord> = new Map();
export const dbLoyaltyAccounts: Map<string, LoyaltyAccountRecord> = new Map();
export const dbRewardTransactions: RewardTransactionRecord[] = [];
export const dbReferralInvites: Map<string, ReferralInviteRecord> = new Map();

let loyaltySeeded = false;

function getTodayDateStr(): string {
  // IST YYYY-MM-DD
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

export function ensureLoyaltySeeded(): void {
  if (loyaltySeeded && dbMembershipTiers.size > 0) return;
  const now = new Date().toISOString();

  dbMembershipTiers.set('SILVER', {
    id: 'tier-silver',
    tierName: 'SILVER',
    minLifetimePts: 0,
    earnMultiplier: 1.0,
    perks: ['1 Coin = ₹1 at Checkout', '7-Day Check-In Streak', 'Birthday Bonus'],
    updatedAt: now,
  });
  dbMembershipTiers.set('GOLD', {
    id: 'tier-gold',
    tierName: 'GOLD',
    minLifetimePts: 500,
    earnMultiplier: 1.5,
    perks: ['1.5x Coin Earning Multiplier', 'Priority Support', 'Early Flash Sale Access'],
    updatedAt: now,
  });
  dbMembershipTiers.set('PLATINUM', {
    id: 'tier-platinum',
    tierName: 'PLATINUM',
    minLifetimePts: 2000,
    earnMultiplier: 2.0,
    perks: ['2.0x Coin Earning Multiplier', 'Free Express Shipping', 'Dedicated Concierge'],
    updatedAt: now,
  });

  if (!dbLoyaltyAccounts.has('cust-1')) {
    dbLoyaltyAccounts.set('cust-1', {
      id: 'loy-cust-1',
      userId: 'cust-1',
      coinsBalance: 340,
      lifetimeCoins: 340,
      tierName: 'SILVER',
      streakDays: 1,
      lastCheckInDate: undefined,
      spinsToday: 0,
      referralCode: 'BAZAAR-AMAYRA77',
      personalizationOn: true,
      updatedAt: now,
    });
    dbRewardTransactions.push({
      id: 'rtx-seed-1',
      userId: 'cust-1',
      type: 'CHECK_IN',
      coinsDelta: 340,
      description: 'Welcome & Loyalty Balance Migration',
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      expiredProcessed: false,
      createdAt: now,
    });
  }

  loyaltySeeded = true;
}

function recomputeTierForAccount(acct: LoyaltyAccountRecord): void {
  ensureLoyaltySeeded();
  const tiers = Array.from(dbMembershipTiers.values()).sort(
    (a, b) => b.minLifetimePts - a.minLifetimePts
  );
  for (const t of tiers) {
    if (acct.lifetimeCoins >= t.minLifetimePts) {
      acct.tierName = t.tierName;
      return;
    }
  }
  acct.tierName = 'SILVER';
}

export function getOrCreateLoyaltyAccount(userId: string, displayName?: string): LoyaltyAccountRecord {
  ensureLoyaltySeeded();
  const cleanId = (userId || '').trim() || 'guest-user';
  const existing = dbLoyaltyAccounts.get(cleanId);
  if (existing) return existing;

  const prefix = (displayName || cleanId)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'SHOP';
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const created: LoyaltyAccountRecord = {
    id: `loy-${crypto.randomBytes(4).toString('hex')}`,
    userId: cleanId,
    coinsBalance: 100,
    lifetimeCoins: 100,
    tierName: 'SILVER',
    streakDays: 0,
    spinsToday: 0,
    referralCode: `BAZAAR-${prefix}${suffix}`,
    personalizationOn: true,
    updatedAt: new Date().toISOString(),
  };
  dbLoyaltyAccounts.set(cleanId, created);
  return created;
}

function appendCoinLedger(params: {
  acct: LoyaltyAccountRecord;
  type: RewardTransactionRecord['type'];
  coinsDelta: number;
  description: string;
  referenceId?: string;
  ttlDays?: number;
}): RewardTransactionRecord {
  const { acct, type, coinsDelta, description, referenceId, ttlDays = 90 } = params;
  const now = new Date();
  acct.coinsBalance = Math.max(0, acct.coinsBalance + coinsDelta);
  if (coinsDelta > 0) {
    acct.lifetimeCoins += coinsDelta;
  }
  recomputeTierForAccount(acct);
  acct.updatedAt = now.toISOString();

  const tx: RewardTransactionRecord = {
    id: `rtx-${crypto.randomBytes(5).toString('hex')}`,
    userId: acct.userId,
    type,
    coinsDelta,
    description,
    referenceId,
    expiresAt: coinsDelta > 0 ? new Date(now.getTime() + ttlDays * 86400000).toISOString() : undefined,
    expiredProcessed: false,
    createdAt: now.toISOString(),
  };
  dbRewardTransactions.unshift(tx);
  return tx;
}

export function getLoyaltySummary(userId: string, displayName?: string) {
  const acct = getOrCreateLoyaltyAccount(userId, displayName);
  const tierConfig = dbMembershipTiers.get(acct.tierName) || dbMembershipTiers.get('SILVER')!;
  const allTiers = Array.from(dbMembershipTiers.values()).sort(
    (a, b) => a.minLifetimePts - b.minLifetimePts
  );
  const nextTier = allTiers.find((t) => t.minLifetimePts > acct.lifetimeCoins) || null;
  const today = getTodayDateStr();
  const txns = dbRewardTransactions.filter((t) => t.userId === acct.userId).slice(0, 40);
  const referrals = Array.from(dbReferralInvites.values()).filter(
    (r) => r.referrerUserId === acct.userId
  );

  return {
    account: {
      ...acct,
      canCheckInToday: acct.lastCheckInDate !== today,
      spinsRemainingToday: acct.lastSpinDate === today ? Math.max(0, 3 - acct.spinsToday) : 3,
      canScratchToday: acct.lastScratchDate !== today,
    },
    tierConfig,
    allTiers,
    nextTier,
    coinsToNextTier: nextTier ? Math.max(0, nextTier.minLifetimePts - acct.lifetimeCoins) : 0,
    transactions: txns,
    referrals,
  };
}

const CHECKIN_LADDER = [10, 20, 30, 50, 70, 100, 200];

export function claimDailyCheckIn(userId: string) {
  const acct = getOrCreateLoyaltyAccount(userId);
  const today = getTodayDateStr();

  if (acct.lastCheckInDate === today) {
    return {
      alreadyClaimed: true,
      awardedCoins: 0,
      account: acct,
      message: `Daily check-in already claimed for ${today}. Come back tomorrow!`,
    };
  }

  const tierCfg = dbMembershipTiers.get(acct.tierName);
  const mult = Number(tierCfg?.earnMultiplier || 1);
  acct.streakDays = acct.streakDays >= 7 ? 1 : acct.streakDays + 1;
  acct.lastCheckInDate = today;

  const baseCoins = CHECKIN_LADDER[(acct.streakDays - 1) % CHECKIN_LADDER.length];
  const awardedCoins = Math.round(baseCoins * mult);
  const tx = appendCoinLedger({
    acct,
    type: 'CHECK_IN',
    coinsDelta: awardedCoins,
    description: `Day ${acct.streakDays} Check-In Streak (${mult}x ${acct.tierName})`,
    referenceId: `checkin_${acct.userId}_${today}`,
  });

  return {
    alreadyClaimed: false,
    awardedCoins,
    streakDays: acct.streakDays,
    transaction: tx,
    account: acct,
    message: `Day ${acct.streakDays} streak reward: +${awardedCoins} Bazaar Coins credited!`,
  };
}

const SPIN_REWARDS = [
  { label: '50 Coins', coins: 50, couponCode: null },
  { label: '20 Coins', coins: 20, couponCode: null },
  { label: '100 Coins', coins: 100, couponCode: null },
  { label: '₹150 OFF Voucher', coins: 0, couponCode: 'SPIN150' },
  { label: 'Free Shipping', coins: 0, couponCode: 'FREESHIP' },
  { label: '75 Mystery Coins', coins: 75, couponCode: null },
];

export function playSpinWheel(userId: string) {
  const acct = getOrCreateLoyaltyAccount(userId);
  const today = getTodayDateStr();

  if (acct.lastSpinDate !== today) {
    acct.lastSpinDate = today;
    acct.spinsToday = 0;
  }

  if (acct.spinsToday >= 3) {
    throw new Error('Daily spin limit (3 spins) reached. Check back tomorrow!');
  }

  const idx = crypto.randomInt(0, SPIN_REWARDS.length);
  const reward = SPIN_REWARDS[idx];
  acct.spinsToday += 1;
  acct.updatedAt = new Date().toISOString();

  let tx: RewardTransactionRecord | null = null;
  if (reward.coins > 0) {
    tx = appendCoinLedger({
      acct,
      type: 'SPIN_WIN',
      coinsDelta: reward.coins,
      description: `Spin & Win Reward: ${reward.label}`,
      referenceId: `spin_${today}_${acct.spinsToday}`,
    });
  }

  return {
    segmentIndex: idx,
    prizeLabel: reward.label,
    coinsAwarded: reward.coins,
    couponCode: reward.couponCode,
    spinsRemainingToday: Math.max(0, 3 - acct.spinsToday),
    transaction: tx,
    account: acct,
  };
}

export function playScratchCard(userId: string) {
  const acct = getOrCreateLoyaltyAccount(userId);
  const today = getTodayDateStr();
  if (acct.lastScratchDate === today) {
    return {
      alreadyClaimed: true,
      coinsAwarded: 0,
      account: acct,
      message: 'Today’s golden scratch card has already been revealed.',
    };
  }

  const possibleCoins = [40, 60, 75, 100];
  const coinsAwarded = possibleCoins[crypto.randomInt(0, possibleCoins.length)];
  acct.lastScratchDate = today;
  const tx = appendCoinLedger({
    acct,
    type: 'SCRATCH_CARD',
    coinsDelta: coinsAwarded,
    description: `Golden Scratch Card Bonus (+${coinsAwarded} Coins)`,
    referenceId: `scratch_${acct.userId}_${today}`,
  });

  return {
    alreadyClaimed: false,
    coinsAwarded,
    voucherCode: 'WELCOME250',
    transaction: tx,
    account: acct,
    message: `You won +${coinsAwarded} Bazaar Coins!`,
  };
}

export function applyReferralCode(referredUserId: string, referralCode: string) {
  ensureLoyaltySeeded();
  const normalizedCode = (referralCode || '').trim().toUpperCase();
  if (!normalizedCode) {
    throw new Error('Referral code is required.');
  }

  const refereeAcct = getOrCreateLoyaltyAccount(referredUserId);
  if (refereeAcct.referredByUserId) {
    throw new Error('A referral code has already been applied to this account.');
  }

  const referrerAcct = Array.from(dbLoyaltyAccounts.values()).find(
    (a) => a.referralCode.toUpperCase() === normalizedCode
  );
  if (!referrerAcct) {
    throw new Error(`Referral code "${normalizedCode}" was not found.`);
  }
  if (referrerAcct.userId === refereeAcct.userId) {
    throw new Error('Self-referral is not allowed.');
  }

  refereeAcct.referredByUserId = referrerAcct.userId;
  refereeAcct.updatedAt = new Date().toISOString();

  const invite: ReferralInviteRecord = {
    id: `ref-${crypto.randomBytes(5).toString('hex')}`,
    referrerUserId: referrerAcct.userId,
    referredUserId: refereeAcct.userId,
    referralCode: normalizedCode,
    status: 'PENDING',
    rewardCoins: 150,
    createdAt: new Date().toISOString(),
  };
  dbReferralInvites.set(invite.id, invite);

  return {
    invite,
    message: 'Referral code linked! Both accounts earn bonus coins once the first order is placed.',
  };
}

export function completeReferralOnOrder(referredUserId: string, orderId: string) {
  ensureLoyaltySeeded();
  const pendingInvite = Array.from(dbReferralInvites.values()).find(
    (inv) => inv.referredUserId === referredUserId && inv.status === 'PENDING'
  );
  if (!pendingInvite) return null;

  pendingInvite.status = 'COMPLETED';
  pendingInvite.orderId = orderId;
  pendingInvite.completedAt = new Date().toISOString();

  const referrerAcct = getOrCreateLoyaltyAccount(pendingInvite.referrerUserId);
  const refereeAcct = getOrCreateLoyaltyAccount(referredUserId);

  appendCoinLedger({
    acct: referrerAcct,
    type: 'REFERRAL_BONUS',
    coinsDelta: pendingInvite.rewardCoins,
    description: `Referral Completed (Friend first order ${orderId})`,
    referenceId: `ref_referrer_${pendingInvite.id}`,
  });

  appendCoinLedger({
    acct: refereeAcct,
    type: 'REFERRAL_BONUS',
    coinsDelta: 100,
    description: `Welcome Referral Bonus (${pendingInvite.referralCode})`,
    referenceId: `ref_referee_${pendingInvite.id}`,
  });

  return pendingInvite;
}

export function runCoinExpirySweep(nowMs: number = Date.now()) {
  ensureLoyaltySeeded();
  let expiredEntries = 0;
  let totalCoinsExpired = 0;

  for (const tx of [...dbRewardTransactions]) {
    if (
      !tx.expiredProcessed &&
      tx.coinsDelta > 0 &&
      tx.expiresAt &&
      Date.parse(tx.expiresAt) < nowMs
    ) {
      tx.expiredProcessed = true;
      const acct = dbLoyaltyAccounts.get(tx.userId);
      if (acct && acct.coinsBalance > 0) {
        const deduct = Math.min(acct.coinsBalance, tx.coinsDelta);
        if (deduct > 0) {
          acct.coinsBalance -= deduct;
          acct.updatedAt = new Date().toISOString();
          dbRewardTransactions.unshift({
            id: `rtx-exp-${crypto.randomBytes(4).toString('hex')}`,
            userId: acct.userId,
            type: 'EXPIRED',
            coinsDelta: -deduct,
            description: `Expired promotional reward coins (${tx.id})`,
            referenceId: tx.id,
            expiredProcessed: true,
            createdAt: new Date().toISOString(),
          });
          expiredEntries += 1;
          totalCoinsExpired += deduct;
        }
      }
    }
  }

  return { expiredEntries, totalCoinsExpired, checkedAt: new Date(nowMs).toISOString() };
}

export function setPersonalizationPreference(userId: string, enabled: boolean) {
  const acct = getOrCreateLoyaltyAccount(userId);
  acct.personalizationOn = Boolean(enabled);
  acct.updatedAt = new Date().toISOString();
  return { userId: acct.userId, personalizationOn: acct.personalizationOn };
}

export function getPersonalizationPreference(userId?: string): boolean {
  if (!userId) return true;
  ensureLoyaltySeeded();
  const acct = dbLoyaltyAccounts.get(userId);
  return acct ? acct.personalizationOn : true;
}

export function adminAdjustLoyaltyCoins(params: {
  targetUserId: string;
  coinsDelta: number;
  reason: string;
  actorId: string;
  actorName: string;
  actorRole: string;
}) {
  const acct = getOrCreateLoyaltyAccount(params.targetUserId);
  const delta = Math.round(Number(params.coinsDelta));
  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error('coinsDelta must be a non-zero integer.');
  }
  const tx = appendCoinLedger({
    acct,
    type: 'ADMIN_ADJUST',
    coinsDelta: delta,
    description: `Admin adjustment: ${params.reason || 'Manual reward adjustment'}`,
  });

  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: 'LOYALTY_COINS_ADJUSTED',
    entityType: 'LOYALTY_ACCOUNT',
    entityId: acct.id,
    details: `Adjusted coins for ${acct.userId} by ${delta} (${params.reason})`,
  });

  return { account: acct, transaction: tx };
}

export function updateTierConfig(params: {
  tierName: 'SILVER' | 'GOLD' | 'PLATINUM';
  minLifetimePts?: number;
  earnMultiplier?: number;
  perks?: string[];
  actorId: string;
  actorName: string;
  actorRole: string;
}) {
  ensureLoyaltySeeded();
  const tier = dbMembershipTiers.get(params.tierName);
  if (!tier) throw new Error(`Unknown tier "${params.tierName}".`);
  if (typeof params.minLifetimePts === 'number') {
    tier.minLifetimePts = Math.max(0, Math.round(params.minLifetimePts));
  }
  if (typeof params.earnMultiplier === 'number') {
    tier.earnMultiplier = Math.max(1, Number(params.earnMultiplier.toFixed(2)));
  }
  if (Array.isArray(params.perks)) {
    tier.perks = params.perks.map(String);
  }
  tier.updatedAt = new Date().toISOString();

  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: 'MEMBERSHIP_TIER_UPDATED',
    entityType: 'MEMBERSHIP_TIER',
    entityId: tier.id,
    details: `Updated ${tier.tierName}: min=${tier.minLifetimePts}, multiplier=${tier.earnMultiplier}x`,
  });

  return tier;
}

// =============================================================================
// PHASE 6F: INTERNATIONAL MARKETPLACE, FX & LANDED COST
// =============================================================================

export interface CountryConfigRecord {
  id: string;
  countryCode: string;
  countryName: string;
  currencyCode: string;
  isActive: boolean;
  shippingFeeInr: number;
  freeShippingThresholdInr: number;
  customsDutyPercent: number;
  taxPercent: number;
  codAllowed: boolean;
  cashfreeAllowed: boolean;
  postalPattern: string;
  phoneHint: string;
  updatedAt: string;
}

export interface ExchangeRateRecord {
  id: string;
  currencyCode: string;
  rateFromInr: number;
  symbol: string;
  sourceLabel: string;
  updatedAt: string;
}

export const dbCountryConfigs: Map<string, CountryConfigRecord> = new Map();
export const dbExchangeRates: Map<string, ExchangeRateRecord> = new Map();

let intlSeeded = false;

export function ensureIntlSeeded(): void {
  if (intlSeeded && dbCountryConfigs.size > 0 && dbExchangeRates.size > 0) return;
  const now = new Date().toISOString();

  const countries: CountryConfigRecord[] = [
    {
      id: 'ctry-in',
      countryCode: 'IN',
      countryName: 'India',
      currencyCode: 'INR',
      isActive: true,
      shippingFeeInr: 49,
      freeShippingThresholdInr: 999,
      customsDutyPercent: 0,
      taxPercent: 12,
      codAllowed: true,
      cashfreeAllowed: true,
      postalPattern: '^\\d{6}$',
      phoneHint: '+91 10-digit mobile',
      updatedAt: now,
    },
    {
      id: 'ctry-us',
      countryCode: 'US',
      countryName: 'United States',
      currencyCode: 'USD',
      isActive: true,
      shippingFeeInr: 1499,
      freeShippingThresholdInr: 15000,
      customsDutyPercent: 8,
      taxPercent: 8.5,
      codAllowed: false,
      cashfreeAllowed: true,
      postalPattern: '^\\d{5}(-\\d{4})?$',
      phoneHint: '+1 10-digit US number',
      updatedAt: now,
    },
    {
      id: 'ctry-gb',
      countryCode: 'GB',
      countryName: 'United Kingdom',
      currencyCode: 'GBP',
      isActive: true,
      shippingFeeInr: 1399,
      freeShippingThresholdInr: 14000,
      customsDutyPercent: 10,
      taxPercent: 20,
      codAllowed: false,
      cashfreeAllowed: true,
      postalPattern: '^[A-Z]{1,2}\\d[A-Z\\d]?\\s?\\d[A-Z]{2}$',
      phoneHint: '+44 UK phone number',
      updatedAt: now,
    },
    {
      id: 'ctry-ae',
      countryCode: 'AE',
      countryName: 'United Arab Emirates',
      currencyCode: 'AED',
      isActive: true,
      shippingFeeInr: 999,
      freeShippingThresholdInr: 10000,
      customsDutyPercent: 5,
      taxPercent: 5,
      codAllowed: false,
      cashfreeAllowed: true,
      postalPattern: '^.{2,12}$',
      phoneHint: '+971 UAE phone number',
      updatedAt: now,
    },
    {
      id: 'ctry-sg',
      countryCode: 'SG',
      countryName: 'Singapore',
      currencyCode: 'SGD',
      isActive: true,
      shippingFeeInr: 899,
      freeShippingThresholdInr: 10000,
      customsDutyPercent: 0,
      taxPercent: 9,
      codAllowed: false,
      cashfreeAllowed: true,
      postalPattern: '^\\d{6}$',
      phoneHint: '+65 Singapore number',
      updatedAt: now,
    },
    {
      id: 'ctry-eu',
      countryCode: 'EU',
      countryName: 'European Union (DE/FR/NL)',
      currencyCode: 'EUR',
      isActive: true,
      shippingFeeInr: 1499,
      freeShippingThresholdInr: 15000,
      customsDutyPercent: 12,
      taxPercent: 19,
      codAllowed: false,
      cashfreeAllowed: true,
      postalPattern: '^[A-Z0-9\\- ]{4,10}$',
      phoneHint: '+49 / +33 EU number',
      updatedAt: now,
    },
  ];

  for (const c of countries) {
    dbCountryConfigs.set(c.countryCode, c);
  }

  const rates: ExchangeRateRecord[] = [
    { id: 'fx-inr', currencyCode: 'INR', rateFromInr: 1.0, symbol: '₹', sourceLabel: 'Base Marketplace Currency (INR)', updatedAt: now },
    { id: 'fx-usd', currencyCode: 'USD', rateFromInr: 0.012, symbol: '$', sourceLabel: 'Configured FX Reference Rate', updatedAt: now },
    { id: 'fx-eur', currencyCode: 'EUR', rateFromInr: 0.011, symbol: '€', sourceLabel: 'Configured FX Reference Rate', updatedAt: now },
    { id: 'fx-gbp', currencyCode: 'GBP', rateFromInr: 0.0095, symbol: '£', sourceLabel: 'Configured FX Reference Rate', updatedAt: now },
    { id: 'fx-aed', currencyCode: 'AED', rateFromInr: 0.044, symbol: 'AED ', sourceLabel: 'Configured FX Reference Rate', updatedAt: now },
    { id: 'fx-sgd', currencyCode: 'SGD', rateFromInr: 0.016, symbol: 'S$', sourceLabel: 'Configured FX Reference Rate', updatedAt: now },
  ];

  for (const r of rates) {
    dbExchangeRates.set(r.currencyCode, r);
  }

  intlSeeded = true;
}

export function getIntlConfigSnapshot() {
  ensureIntlSeeded();
  return {
    countries: Array.from(dbCountryConfigs.values()),
    exchangeRates: Array.from(dbExchangeRates.values()),
  };
}

export function validateInternationalAddress(params: {
  countryCode: string;
  postalCode?: string;
  phone?: string;
}) {
  ensureIntlSeeded();
  const code = (params.countryCode || 'IN').trim().toUpperCase();
  const cfg = dbCountryConfigs.get(code);
  if (!cfg || !cfg.isActive) {
    return { valid: false, error: `Shipping to country "${code}" is currently unavailable.` };
  }
  const postal = (params.postalCode || '').trim().toUpperCase();
  if (postal && cfg.postalPattern) {
    const regex = new RegExp(cfg.postalPattern, 'i');
    if (!regex.test(postal)) {
      return {
        valid: false,
        error: `Postal / PIN code "${postal}" is invalid for ${cfg.countryName}.`,
      };
    }
  }
  return { valid: true, country: cfg };
}

export function calculateInternationalLandedQuote(params: {
  countryCode?: string;
  targetCurrency?: string;
  subtotalInr: number;
  paymentMethod?: string;
}) {
  ensureIntlSeeded();
  const code = (params.countryCode || 'IN').trim().toUpperCase();
  const country = dbCountryConfigs.get(code);
  if (!country || !country.isActive) {
    throw new Error(`Shipping to country "${code}" is not active.`);
  }

  const normalizedPm = (params.paymentMethod || '').toLowerCase();
  if (normalizedPm === 'cod' && !country.codAllowed) {
    throw new Error(`Cash on Delivery (COD) is not available for international destination ${country.countryName}. Please pay online.`);
  }

  const subtotalInr = roundMoney(Math.max(0, Number(params.subtotalInr || 0)));
  const shippingFeeInr =
    subtotalInr >= country.freeShippingThresholdInr ? 0 : roundMoney(country.shippingFeeInr);
  const customsDutyInr = roundMoney((subtotalInr * country.customsDutyPercent) / 100);
  const taxInr = roundMoney(((subtotalInr + customsDutyInr) * country.taxPercent) / 100);
  const totalInr = roundMoney(subtotalInr + shippingFeeInr + customsDutyInr + taxInr);

  const curCode = (params.targetCurrency || country.currencyCode || 'INR').trim().toUpperCase();
  const fx = dbExchangeRates.get(curCode) || dbExchangeRates.get('INR')!;

  return {
    countryCode: country.countryCode,
    countryName: country.countryName,
    currencyCode: fx.currencyCode,
    currencySymbol: fx.symbol,
    rateFromInr: fx.rateFromInr,
    sourceLabel: fx.sourceLabel,
    subtotalInr,
    shippingFeeInr,
    customsDutyInr,
    taxInr,
    totalInr,
    convertedSubtotal: roundMoney(subtotalInr * fx.rateFromInr),
    convertedShipping: roundMoney(shippingFeeInr * fx.rateFromInr),
    convertedCustomsDuty: roundMoney(customsDutyInr * fx.rateFromInr),
    convertedTax: roundMoney(taxInr * fx.rateFromInr),
    convertedTotal: roundMoney(totalInr * fx.rateFromInr),
    codAllowed: country.codAllowed,
    cashfreeAllowed: country.cashfreeAllowed,
  };
}

export function adminUpsertCountryConfig(params: {
  countryCode: string;
  countryName?: string;
  currencyCode?: string;
  isActive?: boolean;
  shippingFeeInr?: number;
  freeShippingThresholdInr?: number;
  customsDutyPercent?: number;
  taxPercent?: number;
  codAllowed?: boolean;
  actorId: string;
  actorName: string;
  actorRole: string;
}) {
  ensureIntlSeeded();
  const code = params.countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    throw new Error('Country code must be a 2-letter ISO code (e.g. IN, US, GB).');
  }
  const existing = dbCountryConfigs.get(code);
  const now = new Date().toISOString();

  const updated: CountryConfigRecord = existing
    ? {
        ...existing,
        countryName: params.countryName?.trim() || existing.countryName,
        currencyCode: params.currencyCode?.trim().toUpperCase() || existing.currencyCode,
        isActive: typeof params.isActive === 'boolean' ? params.isActive : existing.isActive,
        shippingFeeInr:
          typeof params.shippingFeeInr === 'number'
            ? roundMoney(Math.max(0, params.shippingFeeInr))
            : existing.shippingFeeInr,
        freeShippingThresholdInr:
          typeof params.freeShippingThresholdInr === 'number'
            ? roundMoney(Math.max(0, params.freeShippingThresholdInr))
            : existing.freeShippingThresholdInr,
        customsDutyPercent:
          typeof params.customsDutyPercent === 'number'
            ? Math.max(0, Math.min(60, params.customsDutyPercent))
            : existing.customsDutyPercent,
        taxPercent:
          typeof params.taxPercent === 'number'
            ? Math.max(0, Math.min(40, params.taxPercent))
            : existing.taxPercent,
        codAllowed: typeof params.codAllowed === 'boolean' ? params.codAllowed : existing.codAllowed,
        updatedAt: now,
      }
    : {
        id: `ctry-${code.toLowerCase()}`,
        countryCode: code,
        countryName: params.countryName?.trim() || code,
        currencyCode: params.currencyCode?.trim().toUpperCase() || 'USD',
        isActive: params.isActive !== false,
        shippingFeeInr: roundMoney(Math.max(0, Number(params.shippingFeeInr ?? 1299))),
        freeShippingThresholdInr: roundMoney(Math.max(0, Number(params.freeShippingThresholdInr ?? 12000))),
        customsDutyPercent: Math.max(0, Number(params.customsDutyPercent ?? 5)),
        taxPercent: Math.max(0, Number(params.taxPercent ?? 10)),
        codAllowed: Boolean(params.codAllowed),
        cashfreeAllowed: true,
        postalPattern: '^[A-Z0-9\\- ]{3,10}$',
        phoneHint: 'International phone number',
        updatedAt: now,
      };

  dbCountryConfigs.set(code, updated);
  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: 'COUNTRY_CONFIG_UPDATED',
    entityType: 'COUNTRY_CONFIG',
    entityId: updated.id,
    details: `Configured ${code} (${updated.currencyCode}): shipping=₹${updated.shippingFeeInr}, duty=${updated.customsDutyPercent}%, tax=${updated.taxPercent}%, cod=${updated.codAllowed}`,
  });

  return updated;
}

export function adminUpsertExchangeRate(params: {
  currencyCode: string;
  rateFromInr: number;
  symbol?: string;
  sourceLabel?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
}) {
  ensureIntlSeeded();
  const code = params.currencyCode.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new Error('Currency code must be a 3-letter ISO code.');
  }
  const rate = Number(params.rateFromInr);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('FX rate must be positive.');
  }
  const existing = dbExchangeRates.get(code);
  const now = new Date().toISOString();

  const updated: ExchangeRateRecord = {
    id: existing?.id || `fx-${code.toLowerCase()}`,
    currencyCode: code,
    rateFromInr: Number(rate.toFixed(6)),
    symbol: params.symbol?.trim() || existing?.symbol || code,
    sourceLabel: params.sourceLabel?.trim() || existing?.sourceLabel || 'Configured FX Reference Rate',
    updatedAt: now,
  };

  dbExchangeRates.set(code, updated);
  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: 'EXCHANGE_RATE_UPDATED',
    entityType: 'EXCHANGE_RATE',
    entityId: updated.id,
    details: `Updated FX rate 1 INR = ${updated.rateFromInr} ${code}`,
  });

  return updated;
}
