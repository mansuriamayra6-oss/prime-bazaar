import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Product, 
  CartItem, 
  SavedCartItem,
  Order, 
  Reel, 
  Seller, 
  Coupon, 
  Address, 
  OrderStatus,
  UserProfile,
  SupportMessage,
  BlueprintFeature,
  SellerReturnRequest,
  SellerPayout,
  SellerCoupon,
  SellerSupportTicket,
  PriceAlert,
  PriceDropNotification,
  PriceWorkerStatus,
  CmsBannerItem,
  CheckoutQuote,
  CategoryDepartment,
  SellerOffer
} from '../types';
import { ALL_DEPARTMENTS, mapRawCategoryToDepartment } from '../data/categories';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_REELS, 
  INITIAL_COUPONS, 
  INITIAL_SELLERS, 
  DEFAULT_ADDRESSES,
  INITIAL_SELLER_COUPONS,
  INITIAL_SELLER_RETURNS,
  INITIAL_SELLER_PAYOUTS,
  INITIAL_SELLER_TICKETS
} from '../data/mockData';
import { BLUEPRINT_FEATURES } from '../data/blueprintFeatures';
import { api } from '../services/api';

export type SupportedLanguage = 'en' | 'hi' | 'mr' | 'ta';
export type SupportedCurrency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD';
export type CheckoutPaymentMethod = 'cashfree' | 'upi' | 'card' | 'netbanking' | 'cod' | 'WALLET_ONLY';

interface MarketplaceContextType {
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'rating' | 'reviewCount' | 'reviews'>) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  updateProductStock: (productId: string, newStock: number) => void;
  bulkUploadProducts: (sellerId: string, products: Partial<Product>[]) => void;
  cart: CartItem[];
  savedForLater: SavedCartItem[];
  addToCart: (product: Product, size: string, color: string, quantity?: number, offer?: SellerOffer) => void;
  buyProductNow: (
    product: Product,
    size: string,
    color: string,
    paymentMethod?: CheckoutPaymentMethod,
    quantity?: number,
    offer?: SellerOffer
  ) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  saveForLater: (cartItemId: string) => void;
  moveSavedToCart: (savedItemId: string) => void;
  removeSavedItem: (savedItemId: string) => void;
  getVariantStock: (product: Product, size: string) => number;
  clearCart: () => void;
  cartTotal: number;
  cartDiscount: number;
  wishlist: string[];
  toggleWishlist: (productId: string, productTitle?: string) => void;
  isWishlisted: (productId: string) => boolean;
  orders: Order[];
  placeOrder: (details: {
    address: Address;
    paymentMethod: CheckoutPaymentMethod;
    couponCode?: string;
    giftCardCode?: string;
    useStoreCredit?: boolean;
    requestedStoreCreditAmount?: number;
    coinsUsed: number;
    idempotencyKey?: string;
    intentId?: string;
    cashfreeOrderId?: string;
    buyerGstin?: string;
    quote?: CheckoutQuote | null;
  }) => Promise<Order>;
  cancelOrder: (orderId: string) => void;
  returnOrder: (orderId: string, reason: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  fulfillSellerOrder: (
    orderId: string, 
    action: 'accept' | 'pack' | 'dispatch' | 'cancel', 
    details?: { courierPartner?: any; trackingNumber?: string; cancelReason?: string }
  ) => void;
  reels: Reel[];
  toggleReelLike: (reelId: string) => void;
  sellers: Seller[];
  currentSellerId: string;
  setCurrentSellerId: (id: string) => void;
  currentSeller: Seller;
  registerSeller: (details: {
    name: string;
    storeName: string;
    businessName: string;
    phone: string;
    email?: string;
    businessType?: any;
    gstNumber?: string;
    panNumber?: string;
    pickupAddress?: any;
    bankAccount?: any;
    kycDocuments?: any;
  }) => Seller;
  updateSeller: (sellerId: string, updates: Partial<Seller>) => void;
  updateSellerStatus: (sellerId: string, status: Seller['status']) => void;
  toggleSellerVerification: (sellerId: string) => void;
  sellerReturns: SellerReturnRequest[];
  handleSellerReturn: (
    requestId: string, 
    action: 'approved' | 'rejected' | 'replacement_dispatched' | 'refund_issued', 
    notes?: string
  ) => void;
  sellerPayouts: SellerPayout[];
  requestSellerPayout: (sellerId: string, amount: number) => void;
  approveSellerPayout: (payoutId: string) => void;
  sellerCoupons: SellerCoupon[];
  createSellerCoupon: (coupon: Omit<SellerCoupon, 'id' | 'usageCount'>) => void;
  toggleSellerCoupon: (couponId: string) => void;
  sellerTickets: SellerSupportTicket[];
  replyToSellerTicket: (ticketId: string, replyText: string, senderRole?: 'seller' | 'admin') => void;
  addresses: Address[];
  addAddress: (address: Omit<Address, 'id'>) => void;
  availableCoupons: Coupon[];
  activeCoupon: Coupon | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  coins: number;
  earnCoins: (amount: number, reason: string) => void;
  activePortal: 'customer' | 'seller' | 'admin';
  setActivePortal: (portal: 'customer' | 'seller' | 'admin') => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isReelsOpen: boolean;
  setIsReelsOpen: (open: boolean) => void;
  activeReelIndex: number;
  setActiveReelIndex: (idx: number) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  preferredPaymentMethod: CheckoutPaymentMethod;
  setPreferredPaymentMethod: (method: CheckoutPaymentMethod) => void;
  skipAddressOnCheckoutOpen: boolean;
  setSkipAddressOnCheckoutOpen: (skip: boolean) => void;
  isOrdersOpen: boolean;
  setIsOrdersOpen: (open: boolean) => void;
  isVisualSearchOpen: boolean;
  setIsVisualSearchOpen: (open: boolean) => void;
  isRewardsOpen: boolean;
  setIsRewardsOpen: (open: boolean) => void;
  notification: string | null;
  notify: (msg: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedSubcategory: string | null;
  setSelectedSubcategory: (sub: string | null) => void;
  navigateCategory: (cat: string, sub?: string | null) => void;
  recentlyViewed: string[];
  recentlyViewedProducts: Product[];
  isCatalogLoading: boolean;
  catalogError: string | null;
  retryCatalogSync: () => Promise<void>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Multi-Language, Country & Multi-Currency
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  currency: SupportedCurrency;
  setCurrency: (cur: SupportedCurrency) => void;
  countryCode: string;
  setCountryCode: (code: string) => void;
  intlCountries: any[];
  intlRates: any[];
  setCoins: React.Dispatch<React.SetStateAction<number>>;
  formatPrice: (priceInInr: number) => string;

  // User Profile & Authentication
  user: UserProfile | null;
  loginUser: (name: string, phone: string, email?: string, token?: string) => void;
  logoutUser: () => void;
  isAuthOpen: boolean;
  setIsAuthOpen: (open: boolean) => void;
  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;
  profileActiveTab: 'details' | 'wishlist' | 'addresses' | 'preferences' | 'orders' | 'coupons' | 'referrals' | 'chats' | 'live' | 'payments' | 'security';
  setProfileActiveTab: (tab: 'details' | 'wishlist' | 'addresses' | 'preferences' | 'orders' | 'coupons' | 'referrals' | 'chats' | 'live' | 'payments' | 'security') => void;
  openWishlist: () => void;

  // Comparison Tool
  compareList: string[];
  toggleCompare: (productId: string) => void;
  isCompared: (productId: string) => boolean;
  clearCompare: () => void;
  isCompareOpen: boolean;
  setIsCompareOpen: (open: boolean) => void;

  // Virtual Try-On
  isTryOnOpen: boolean;
  setIsTryOnOpen: (open: boolean) => void;
  tryOnProduct: Product | null;
  openTryOn: (product: Product) => void;

  // Customer Support Live Chat
  isSupportOpen: boolean;
  setIsSupportOpen: (open: boolean) => void;
  supportMessages: SupportMessage[];
  sendSupportMessage: (text: string) => void;

  // Master Blueprint Progress Hub (Part 12 SRS Checklist)
  isBlueprintOpen: boolean;
  setIsBlueprintOpen: (open: boolean) => void;
  blueprintFeatures: BlueprintFeature[];

  // Architecture & Database ERD Viewer
  isArchitectureOpen: boolean;
  setIsArchitectureOpen: (open: boolean) => void;

  // Onboarding Screen
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;

  // Public Seller Storefront
  isSellerStoreOpen: boolean;
  activeSellerStoreId: string | null;
  openSellerStore: (sellerId: string) => void;
  closeSellerStore: () => void;

  // Live Shopping
  isLiveShoppingOpen: boolean;
  setIsLiveShoppingOpen: (open: boolean) => void;

  // Buyer-Seller Chat
  isBuyerSellerChatOpen: boolean;
  setIsBuyerSellerChatOpen: (open: boolean) => void;
  activeChatSellerId: string | null;
  chatProductContext: Product | null;
  chatWithSeller: (sellerId: string, productContext?: Product) => void;

  // Launch Readiness Checklist (Section 12 20/20)
  isLaunchChecklistOpen: boolean;
  setIsLaunchChecklistOpen: (open: boolean) => void;

  // Merchant Partner Authentication (Login & Signup)
  isMerchantAuthOpen: boolean;
  setIsMerchantAuthOpen: (open: boolean) => void;
  merchantAuthMode: 'login' | 'signup';
  setMerchantAuthMode: (mode: 'login' | 'signup') => void;
  openMerchantAuth: (mode?: 'login' | 'signup') => void;

  // APK / Android WebAPK App Installer Modal
  isApkModalOpen: boolean;
  setIsApkModalOpen: (open: boolean) => void;

  // Price-Drop Alerts & Background Worker
  priceAlerts: PriceAlert[];
  priceDropNotifications: PriceDropNotification[];
  unreadPriceDropCount: number;
  priceWorkerStatus: PriceWorkerStatus | null;
  hasPriceAlert: (productId: string) => boolean;
  togglePriceAlert: (product: Product, targetPrice?: number) => Promise<void>;
  runPriceDropWorkerCheck: (simulateDropProductId?: string, dropPercent?: number) => Promise<void>;
  markPriceDropRead: (notificationId: string) => Promise<void>;
  markAllPriceDropsRead: () => Promise<void>;

  // Phase 4, 5 & 6 Wallet, CMS & Dynamic Categories
  storeCreditBalance: number;
  refreshStoreCredit: () => Promise<void>;
  cmsBanners: CmsBannerItem[];
  categories: CategoryDepartment[];
  fashionDepartments: CategoryDepartment[];
  moreDepartments: CategoryDepartment[];
  refreshCategories: () => Promise<void>;
  refreshCmsData: () => Promise<void>;
}


const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('tb_theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('tb_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Language, Country & Currency
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('tb_lang');
    return (saved as SupportedLanguage) || 'en';
  });

  const [currency, setCurrency] = useState<SupportedCurrency>(() => {
    const saved = localStorage.getItem('tb_curr');
    return (saved as SupportedCurrency) || 'INR';
  });

  const [countryCode, setCountryCode] = useState<string>(() => {
    return localStorage.getItem('tb_country') || 'IN';
  });

  const [intlCountries, setIntlCountries] = useState<any[]>([]);
  const [intlRates, setIntlRates] = useState<any[]>([
    { currencyCode: 'INR', rateFromInr: 1.0, symbol: '₹' },
    { currencyCode: 'USD', rateFromInr: 0.012, symbol: '$' },
    { currencyCode: 'EUR', rateFromInr: 0.011, symbol: '€' },
    { currencyCode: 'GBP', rateFromInr: 0.0095, symbol: '£' },
    { currencyCode: 'AED', rateFromInr: 0.044, symbol: 'AED ' },
    { currencyCode: 'SGD', rateFromInr: 0.016, symbol: 'S$' },
  ]);

  useEffect(() => {
    api.intl
      .getConfig()
      .then((res) => {
        if (Array.isArray(res?.countries)) setIntlCountries(res.countries);
        if (Array.isArray(res?.exchangeRates)) setIntlRates(res.exchangeRates);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem('tb_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('tb_curr', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('tb_country', countryCode);
  }, [countryCode]);

  const formatPrice = (priceInInr: number) => {
    const fx = intlRates.find((r) => r.currencyCode === currency);
    if (!fx || currency === 'INR') {
      return `₹${Math.round(priceInInr).toLocaleString('en-IN')}`;
    }
    const val = Number((priceInInr * fx.rateFromInr).toFixed(2));
    return `${fx.symbol}${val.toLocaleString()}`;
  };

  // User Profile & Real Authentication State (Starts unauthenticated by default)
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('pb_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isLoggedIn) return parsed;
      } catch {
        // fallback
      }
    }
    return null; // Clean guest state - not pre-filled with demo credentials
  });

  // Check backend session validity on load
  useEffect(() => {
    const token = localStorage.getItem('pb_auth_token');
    if (token) {
      api.auth.getMe()
        .then(res => {
          if (res?.authenticated && res.user) {
            setUser(res.user);
            localStorage.setItem('pb_user', JSON.stringify(res.user));
          }
        })
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem('pb_auth_token');
          localStorage.removeItem('pb_user');
          setUser(null);
        });
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('pb_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('pb_user');
    }
  }, [user]);

  const loginUser = (name: string, phone: string, email: string = '', token?: string) => {
    const newUser: UserProfile = {
      name: name.trim() || 'Verified Shopper',
      phone: phone.trim() || '+91 98765 00000',
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      isLoggedIn: true,
      memberTier: 'Gold',
      joinedDate: 'Today',
      token: token || 'pb_token_local',
    };
    setUser(newUser);
    localStorage.setItem('pb_user', JSON.stringify(newUser));
    if (token) {
      localStorage.setItem('pb_auth_token', token);
    }
    notify(`Welcome back, ${newUser.name}!`);
  };

  const logoutUser = async () => {
    try {
      await api.auth.logout();
    } catch {}
    setUser(null);
    localStorage.removeItem('pb_user');
    localStorage.removeItem('pb_auth_token');
    notify('Logged out from account. Browsing as Guest.');
  };

  // Products
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('pb_products');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_PRODUCTS;
      }
    }
    return INITIAL_PRODUCTS;
  });

  useEffect(() => {
    localStorage.setItem('pb_products', JSON.stringify(products));
  }, [products]);

  // Cart & Saved For Later & Recently Viewed
  const [storefrontSessionId] = useState<string>(() => {
    const existing = localStorage.getItem('pb_storefront_session');
    if (existing && existing.length >= 8) return existing;
    const generated = `pb_sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('pb_storefront_session', generated);
    return generated;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('pb_cart');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [savedForLater, setSavedForLater] = useState<SavedCartItem[]>(() => {
    const saved = localStorage.getItem('pb_saved_for_later');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    const saved = localStorage.getItem('pb_recently_viewed');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('pb_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('pb_saved_for_later', JSON.stringify(savedForLater));
  }, [savedForLater]);

  useEffect(() => {
    localStorage.setItem('pb_recently_viewed', JSON.stringify(recentlyViewed));
  }, [recentlyViewed]);

  // Hydrate storefront state from backend when signed in or session exists, then keep synced
  const cartStateHydratedRef = React.useRef(false);
  useEffect(() => {
    api.storefront
      .getCartState(storefrontSessionId)
      .then(res => {
        if (res?.success) {
          if (Array.isArray(res.cart) && res.cart.length > 0) {
            setCart(prev => (prev.length === 0 ? res.cart : prev));
          }
          if (Array.isArray(res.savedForLater) && res.savedForLater.length > 0) {
            setSavedForLater(prev => (prev.length === 0 ? res.savedForLater : prev));
          }
          if (Array.isArray(res.recentlyViewed) && res.recentlyViewed.length > 0) {
            setRecentlyViewed(prev => (prev.length === 0 ? res.recentlyViewed : prev));
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        cartStateHydratedRef.current = true;
      });
  }, [storefrontSessionId, user?.id]);

  useEffect(() => {
    if (!cartStateHydratedRef.current) return;
    const timer = setTimeout(() => {
      api.storefront
        .saveCartState(storefrontSessionId, { cart, savedForLater, recentlyViewed })
        .catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [cart, savedForLater, recentlyViewed, storefrontSessionId]);

  // Wishlist
  const [wishlist, setWishlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('pb_wishlist');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return ['prod-1', 'prod-3'];
      }
    }
    return ['prod-1', 'prod-3'];
  });

  useEffect(() => {
    localStorage.setItem('pb_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Product Comparison list
  const [compareList, setCompareList] = useState<string[]>(['prod-1', 'prod-4']);

  const toggleCompare = (productId: string) => {
    setCompareList(prev => {
      if (prev.includes(productId)) {
        notify('Removed from product comparison.');
        return prev.filter(id => id !== productId);
      }
      if (prev.length >= 4) {
        notify('You can compare maximum 4 items side-by-side.');
        return prev;
      }
      notify('Added to product comparison! ⚖️');
      return [...prev, productId];
    });
  };

  const isCompared = (productId: string) => compareList.includes(productId);
  const clearCompare = () => setCompareList([]);

  // Orders
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('pb_orders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [
      {
        id: 'PB-88492',
        items: [
          {
            id: 'demo-item-1',
            productId: 'prod-1',
            selectedColor: 'Royal Indigo',
            selectedSize: 'M',
            quantity: 1,
            product: INITIAL_PRODUCTS[0]
          }
        ],
        totalAmount: 1899,
        discountAmount: 200,
        couponCode: 'FESTIVE100',
        coinsUsed: 50,
        deliveryFee: 0,
        finalAmount: 1649,
        shippingAddress: DEFAULT_ADDRESSES[0],
        paymentMethod: 'upi',
        status: 'shipped',
        trackingSteps: [
          { step: 'Order Confirmed', timestamp: 'Yesterday, 10:30 AM', completed: true },
          { step: 'Packed & Dispatched from Varanasi Hub', timestamp: 'Yesterday, 04:15 PM', completed: true },
          { step: 'In Transit via BlueDart Express', timestamp: 'Today, 08:00 AM', completed: true, current: true },
          { step: 'Out for Delivery', timestamp: 'Pending', completed: false },
          { step: 'Delivered', timestamp: 'Expected Tomorrow', completed: false }
        ],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        estimatedDelivery: 'Tomorrow, 5:00 PM'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('pb_orders', JSON.stringify(orders));
  }, [orders]);

  // Reels
  const [reels, setReels] = useState<Reel[]>(INITIAL_REELS);

  // Sellers State
  const [sellers, setSellers] = useState<Seller[]>(() => {
    const saved = localStorage.getItem('pb_sellers');
    return saved ? JSON.parse(saved) : INITIAL_SELLERS;
  });

  useEffect(() => {
    localStorage.setItem('pb_sellers', JSON.stringify(sellers));
  }, [sellers]);

  const [currentSellerId, setCurrentSellerId] = useState<string>(() => {
    return localStorage.getItem('pb_current_seller_id') || 'seller-1';
  });

  useEffect(() => {
    localStorage.setItem('pb_current_seller_id', currentSellerId);
  }, [currentSellerId]);

  const currentSeller: Seller = sellers.find(s => s.id === currentSellerId) || sellers[0] || {
    id: 'seller-1',
    name: 'Devendra Tripathi',
    businessName: 'Varanasi Weavers Co.',
    gstNumber: '09AAECV1234M1Z2',
    location: 'Varanasi, Uttar Pradesh',
    rating: 4.9,
    totalOrders: 0,
    totalRevenue: 0,
    walletBalance: 0,
    verified: true,
    status: 'active',
    joinedDate: 'Jan 2024'
  };

  // Seller Returns
  const [sellerReturns, setSellerReturns] = useState<SellerReturnRequest[]>(() => {
    const saved = localStorage.getItem('pb_seller_returns');
    return saved ? JSON.parse(saved) : INITIAL_SELLER_RETURNS;
  });

  useEffect(() => {
    localStorage.setItem('pb_seller_returns', JSON.stringify(sellerReturns));
  }, [sellerReturns]);

  // Seller Payouts
  const [sellerPayouts, setSellerPayouts] = useState<SellerPayout[]>(() => {
    const saved = localStorage.getItem('pb_seller_payouts');
    return saved ? JSON.parse(saved) : INITIAL_SELLER_PAYOUTS;
  });

  useEffect(() => {
    localStorage.setItem('pb_seller_payouts', JSON.stringify(sellerPayouts));
  }, [sellerPayouts]);

  // Seller Coupons
  const [sellerCoupons, setSellerCoupons] = useState<SellerCoupon[]>(() => {
    const saved = localStorage.getItem('pb_seller_coupons');
    return saved ? JSON.parse(saved) : INITIAL_SELLER_COUPONS;
  });

  useEffect(() => {
    localStorage.setItem('pb_seller_coupons', JSON.stringify(sellerCoupons));
  }, [sellerCoupons]);

  // Seller Support Tickets
  const [sellerTickets, setSellerTickets] = useState<SellerSupportTicket[]>(() => {
    const saved = localStorage.getItem('pb_seller_tickets');
    return saved ? JSON.parse(saved) : INITIAL_SELLER_TICKETS;
  });

  useEffect(() => {
    localStorage.setItem('pb_seller_tickets', JSON.stringify(sellerTickets));
  }, [sellerTickets]);

  // Addresses
  const [addresses, setAddresses] = useState<Address[]>(DEFAULT_ADDRESSES);

  // Coins balance
  const [coins, setCoins] = useState<number>(() => {
    const saved = localStorage.getItem('pb_coins');
    return saved ? parseInt(saved, 10) : 340;
  });

  useEffect(() => {
    localStorage.setItem('pb_coins', coins.toString());
  }, [coins]);

  // Coupons
  const [availableCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [activeCoupon, setActiveCoupon] = useState<Coupon | null>(null);

  // Modals & Panels
  const [activePortal, setActivePortal] = useState<'customer' | 'seller' | 'admin'>('customer');
  const [selectedProduct, setSelectedProductState] = useState<Product | null>(null);
  const setSelectedProduct = (product: Product | null) => {
    setSelectedProductState(product);
    if (product?.id) {
      setRecentlyViewed(prev => [product.id, ...prev.filter(id => id !== product.id)].slice(0, 12));
    }
  };
  const recentlyViewedProducts = React.useMemo(
    () =>
      recentlyViewed
        .map(id => products.find(p => p.id === id))
        .filter((p): p is Product => Boolean(p)),
    [recentlyViewed, products]
  );
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isReelsOpen, setIsReelsOpen] = useState(false);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<CheckoutPaymentMethod>('cashfree');
  const [skipAddressOnCheckoutOpen, setSkipAddressOnCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileActiveTab, setProfileActiveTab] = useState<'details' | 'wishlist' | 'addresses' | 'preferences' | 'orders' | 'coupons' | 'referrals' | 'chats' | 'live' | 'payments' | 'security'>('details');

  const openWishlist = () => {
    setProfileActiveTab('wishlist');
    setIsProfileOpen(true);
  };
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);
  const [tryOnProduct, setTryOnProduct] = useState<Product | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Public Seller Storefront
  const [isSellerStoreOpen, setIsSellerStoreOpen] = useState(false);
  const [activeSellerStoreId, setActiveSellerStoreId] = useState<string | null>('seller-1');
  const openSellerStore = (sellerId: string) => {
    setActiveSellerStoreId(sellerId);
    setIsSellerStoreOpen(true);
  };
  const closeSellerStore = () => setIsSellerStoreOpen(false);

  // Live Shopping
  const [isLiveShoppingOpen, setIsLiveShoppingOpen] = useState(false);

  // Buyer-Seller Chat
  const [isBuyerSellerChatOpen, setIsBuyerSellerChatOpen] = useState(false);
  const [activeChatSellerId, setActiveChatSellerId] = useState<string | null>('seller-1');
  const [chatProductContext, setChatProductContext] = useState<Product | null>(null);
  const chatWithSeller = (sellerId: string, productContext?: Product) => {
    setActiveChatSellerId(sellerId);
    if (productContext) {
      setChatProductContext(productContext);
    }
    setIsBuyerSellerChatOpen(true);
  };

  // Launch Readiness Checklist
  const [isLaunchChecklistOpen, setIsLaunchChecklistOpen] = useState(false);

  // Merchant Partner Authentication (Login & Signup)
  const [isMerchantAuthOpen, setIsMerchantAuthOpen] = useState(false);
  const [merchantAuthMode, setMerchantAuthMode] = useState<'login' | 'signup'>('login');
  const openMerchantAuth = (mode: 'login' | 'signup' = 'login') => {
    setMerchantAuthMode(mode);
    setIsMerchantAuthOpen(true);
  };

  // Download Apps / Android WebAPK Installer Modal
  const [isApkModalOpen, setIsApkModalOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('install') === '1') {
      params.delete('install');
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
      return true;
    }
    return false;
  });

  // Price-Drop Alerts & Background Worker State
  const activeAlertUserId = user?.id || user?.email || user?.phone || 'guest-user';
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() => {
    try {
      const saved = localStorage.getItem('pb_price_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [priceDropNotifications, setPriceDropNotifications] = useState<PriceDropNotification[]>([]);
  const [priceWorkerStatus, setPriceWorkerStatus] = useState<PriceWorkerStatus | null>(null);
  const lastToastedDropIdsRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('pb_price_alerts', JSON.stringify(priceAlerts));
  }, [priceAlerts]);

  // Sync catalog products to backend tracker & fetch latest alerts/notifications periodically
  const refreshPriceAlerts = async (showNewToast: boolean = true) => {
    try {
      const res = await api.priceAlerts.getAll(activeAlertUserId);
      if (res.alerts) {
        setPriceAlerts(res.alerts);
      }
      if (res.notifications) {
        setPriceDropNotifications(res.notifications);
        if (showNewToast) {
          const unread = (res.notifications as PriceDropNotification[]).filter(
            n => !n.isRead && !lastToastedDropIdsRef.current.has(n.id)
          );
          if (unread.length > 0) {
            const latest = unread[0];
            lastToastedDropIdsRef.current.add(latest.id);
            notify(`🔔 Price Drop! ${latest.productTitle.slice(0, 22)}... now ₹${latest.newPrice.toLocaleString('en-IN')} (${latest.dropPercent}% OFF)`);
          }
        }
      }
      if (res.workerStatus) {
        setPriceWorkerStatus(res.workerStatus);
      }
    } catch {
      // Offline / graceful fallback
    }
  };

  useEffect(() => {
    // Sync initial products & poll background worker every 15 seconds
    api.priceAlerts
      .syncProducts(
        products.map(p => ({
          id: p.id,
          title: p.title,
          price: p.price,
          originalPrice: p.originalPrice,
          image: p.images?.[0] || '',
        }))
      )
      .then(() => refreshPriceAlerts(false))
      .catch(() => {});

    const interval = setInterval(() => {
      refreshPriceAlerts(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [activeAlertUserId]);

  const hasPriceAlert = (productId: string) =>
    priceAlerts.some(a => a.productId === productId && a.status === 'ACTIVE');

  const togglePriceAlert = async (product: Product, targetPrice?: number) => {
    const currentlyActive = hasPriceAlert(product.id);
    if (currentlyActive) {
      setPriceAlerts(prev => prev.filter(a => a.productId !== product.id));
      notify(`Price drop alert cancelled for "${product.title.slice(0, 24)}..."`);
      try {
        await api.priceAlerts.unsubscribe(product.id, activeAlertUserId);
      } catch {
        // Fallback already updated local state
      }
      return;
    }

    // Ensure item is also in wishlist for convenience
    if (!wishlist.includes(product.id)) {
      setWishlist(prev => [...prev, product.id]);
    }

    const optimisticAlert: PriceAlert = {
      id: `pa-${Date.now()}`,
      userId: activeAlertUserId,
      productId: product.id,
      productTitle: product.title,
      productImage: product.images?.[0],
      initialPrice: product.price,
      targetPrice,
      currentPrice: product.price,
      lowestPriceSeen: product.price,
      notifyOnAnyDrop: true,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPriceAlerts(prev => [optimisticAlert, ...prev.filter(a => a.productId !== product.id)]);
    notify(`🔔 Price-Drop Alert activated! Background monitor watching "${product.title.slice(0, 22)}..."`);

    try {
      const res = await api.priceAlerts.subscribe({
        userId: activeAlertUserId,
        productId: product.id,
        productTitle: product.title,
        productImage: product.images?.[0],
        currentPrice: product.price,
        targetPrice,
        notifyOnAnyDrop: true,
      });
      if (res.alert) {
        setPriceAlerts(prev => [res.alert, ...prev.filter(a => a.productId !== product.id)]);
      }
      if (res.workerStatus) {
        setPriceWorkerStatus(res.workerStatus);
      }
    } catch {
      // Keep optimistic state if offline
    }
  };

  const runPriceDropWorkerCheck = async (simulateDropProductId?: string, dropPercent: number = 15) => {
    try {
      const res = await api.priceAlerts.runWorker(simulateDropProductId, dropPercent);
      if (res.simulatedProduct) {
        const updatedPrice = Number(res.simulatedProduct.price);
        setProducts(prev =>
          prev.map(p => {
            if (p.id !== res.simulatedProduct.id) return p;
            const disc = p.originalPrice > updatedPrice
              ? Math.round(((p.originalPrice - updatedPrice) / p.originalPrice) * 100)
              : p.discountPercent;
            return { ...p, price: updatedPrice, discountPercent: disc };
          })
        );
      }
      await refreshPriceAlerts(false);
      const triggered = res.sweep?.triggeredNotifications || [];
      if (triggered.length > 0) {
        const first = triggered[0];
        lastToastedDropIdsRef.current.add(first.id);
        notify(`🔔 Price-Drop Triggered! "${first.productTitle.slice(0, 22)}..." dropped ${first.dropPercent}% to ₹${first.newPrice.toLocaleString('en-IN')}`);
      } else {
        notify(`Background worker checked ${res.sweep?.checkedCount || 0} active alerts — all prices verified.`);
      }
    } catch {
      notify('Price check worker sweep completed.');
    }
  };

  const markPriceDropRead = async (notificationId: string) => {
    setPriceDropNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    try {
      await api.priceAlerts.markRead(notificationId);
    } catch {
      // ignored
    }
  };

  const markAllPriceDropsRead = async () => {
    setPriceDropNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await api.priceAlerts.markAllRead(activeAlertUserId);
    } catch {
      // ignored
    }
  };

  const unreadPriceDropCount = priceDropNotifications.filter(n => !n.isRead).length;


  // Blueprint features list
  const [blueprintFeatures] = useState<BlueprintFeature[]>(BLUEPRINT_FEATURES);

  // Customer Support Live Chat State
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([
    {
      id: 'msg-1',
      sender: 'bot',
      text: 'Namaste! Welcome to Prime Bazaar Customer Care. How can I assist your shopping today?',
      timestamp: 'Just now',
      quickActions: [
        { label: 'Track My Recent Order', action: 'track_order' },
        { label: 'Return / Replacement Policy', action: 'return_policy' },
        { label: 'Best Available Coupons', action: 'show_coupons' },
        { label: 'How to Earn Coins', action: 'earn_coins' }
      ]
    }
  ]);

  const sendSupportMessage = (text: string) => {
    const userMsg: SupportMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Just now'
    };
    setSupportMessages(prev => [...prev, userMsg]);

    setTimeout(() => {
      let reply = 'Thank you for reaching out! Our dedicated customer success team is here for you 24/7.';
      const lower = text.toLowerCase();
      if (lower.includes('track') || lower.includes('order')) {
        reply = 'You have 1 active shipment (#PB-88492) currently In Transit via BlueDart Express. Estimated delivery is Tomorrow by 5:00 PM!';
      } else if (lower.includes('return') || lower.includes('exchange')) {
        reply = 'Prime Bazaar offers a 7-day hassle-free return window with complimentary doorstep pickup. You can initiate a return anytime from your Orders tab.';
      } else if (lower.includes('coupon') || lower.includes('discount')) {
        reply = 'Use code MEESHO20 for 20% off your bag, or code MYNTRA500 for flat ₹500 off on orders above ₹1,499!';
      } else if (lower.includes('coin') || lower.includes('wallet')) {
        reply = 'You currently have 340 Bazaar Coins! 1 coin = ₹1 instant discount. You can redeem them directly at checkout.';
      }

      setSupportMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: 'bot',
          text: reply,
          timestamp: 'Just now'
        }
      ]);
    }, 700);
  };

  const openTryOn = (prod: Product) => {
    setTryOnProduct(prod);
    setIsTryOnOpen(true);
  };

  // Filters, Hierarchy Navigation & Catalog Sync State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategoryState] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const setSelectedCategory = (cat: string) => {
    setSelectedCategoryState(cat);
    setSelectedSubcategory(null);
  };

  const navigateCategory = (cat: string, sub: string | null = null) => {
    setSelectedCategoryState(cat);
    setSelectedSubcategory(sub);
    setActivePortal('customer');
  };

  const retryCatalogSync = async () => {
    setIsCatalogLoading(true);
    setCatalogError(null);
    try {
      const res = await api.payments.getHealth();
      if (!res) {
        throw new Error('Catalog health check did not respond.');
      }
      await refreshPriceAlerts(false);
    } catch (err: any) {
      setCatalogError(err?.message || 'Unable to sync latest marketplace updates right now.');
    } finally {
      setIsCatalogLoading(false);
    }
  };

  // Store Credit Balance, CMS Banners & Dynamic 34 Categories (Phase 4, 5 & 6)
  const [storeCreditBalance, setStoreCreditBalance] = useState<number>(0);
  const [cmsBanners, setCmsBanners] = useState<CmsBannerItem[]>([]);
  const [categories, setCategories] = useState<CategoryDepartment[]>(ALL_DEPARTMENTS);

  const fashionDepartments = React.useMemo(
    () => categories.filter(c => c.isActive !== false && c.group === 'fashion'),
    [categories]
  );

  const moreDepartments = React.useMemo(
    () => categories.filter(c => c.isActive !== false && c.group !== 'fashion'),
    [categories]
  );

  const refreshCategories = async () => {
    try {
      const res = await api.cms.getCategories();
      if (Array.isArray(res?.categories) && res.categories.length > 0) {
        const mapped = res.categories
          .map((c: any) => mapRawCategoryToDepartment(c))
          .sort((a: CategoryDepartment, b: CategoryDepartment) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
        setCategories(mapped);
      }
    } catch {
      // Keep fallback 34 categories when offline
    }
  };

  const refreshStoreCredit = async () => {
    const token = localStorage.getItem('pb_auth_token');
    if (!token) {
      setStoreCreditBalance(0);
      return;
    }
    try {
      const res = await api.checkout.getMyStoreCredit();
      setStoreCreditBalance(Number(res?.balance || 0));
    } catch {
      // Keep existing balance when offline
    }
  };

  const refreshCmsData = async () => {
    try {
      const [bannerRes] = await Promise.all([
        api.cms.getBanners('HERO'),
        refreshCategories(),
      ]);
      if (Array.isArray(bannerRes?.banners)) {
        setCmsBanners(bannerRes.banners);
      }
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    refreshStoreCredit();
  }, [user?.id, user?.email]);

  useEffect(() => {
    refreshCmsData();
  }, []);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(prev => (prev === msg ? null : prev));
    }, 3200);
  };

  const addProduct = (newProd: Omit<Product, 'id' | 'rating' | 'reviewCount' | 'reviews'>) => {
    const product: Product = {
      ...newProd,
      id: `prod-${Date.now()}`,
      rating: 4.8,
      reviewCount: 1,
      reviews: [
        {
          id: `rev-${Date.now()}`,
          userName: 'Verified Buyer',
          rating: 5,
          date: 'Just now',
          comment: 'New collection launch from authorized boutique seller.',
          verifiedPurchase: true,
          helpfulCount: 0
        }
      ]
    };
    setProducts(prev => [product, ...prev]);
    notify(`Product "${product.title}" published to marketplace catalog!`);
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    notify('Product removed from catalog.');
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    const existing = products.find(p => p.id === productId);
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updates } : p));
    if (typeof updates.price === 'number' && existing && updates.price !== existing.price) {
      api.priceAlerts
        .updateProductPrice(productId, updates.price, updates.title || existing.title, existing.images?.[0])
        .then(() => refreshPriceAlerts(true))
        .catch(() => {});
    }
    notify('Product listing updated successfully.');
  };

  const updateProductStock = (productId: string, newStock: number) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, inStock: Math.max(0, newStock) } : p));
    notify(`Inventory stock adjusted to ${newStock} units.`);
  };

  const bulkUploadProducts = (sellerId: string, newProducts: Partial<Product>[]) => {
    const seller = sellers.find(s => s.id === sellerId) || currentSeller;
    const created: Product[] = newProducts.map((p, idx) => ({
      id: `prod-${Date.now()}-${idx}`,
      title: p.title || `Product #${idx + 1}`,
      brand: p.brand || seller.businessName,
      category: p.category || 'ethnic',
      subcategory: p.subcategory || 'General',
      sku: p.sku || `SKU-${Date.now().toString(36)}-${idx}`,
      barcode: p.barcode || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      price: Number(p.price) || 999,
      originalPrice: Number(p.originalPrice) || (Number(p.price) || 999) * 2,
      discountPercent: p.discountPercent || 50,
      gstRate: p.gstRate || 12,
      weightGrams: p.weightGrams || 500,
      dimensions: p.dimensions || { lengthCm: 25, widthCm: 20, heightCm: 5 },
      rating: 4.8,
      reviewCount: 0,
      inStock: Number(p.inStock) || 25,
      images: p.images && p.images.length ? p.images : ['/src/assets/images/collection_ethnic_wear_1793466539838.jpg'],
      colors: p.colors || [{ name: 'Standard', hex: '#18181B' }],
      sizes: p.sizes || [{ size: 'Free Size', available: true, stockCount: Number(p.inStock) || 25 }],
      description: p.description || 'Quality product sourced and delivered via Prime Bazaar.',
      sellerId: seller.id,
      sellerName: seller.businessName,
      sellerRating: seller.rating,
      codAvailable: true,
      returnPeriodDays: 7,
      status: 'approved',
      warrantyPolicy: '7-day replacement warranty',
      reviews: []
    }));

    setProducts(prev => [...created, ...prev]);
    notify(`Bulk Upload Success: ${created.length} products imported into catalog!`);
    api.sellers.bulkUpload(seller.id, created).catch(() => {});
  };

  const getVariantStock = (product: Product, size: string): number => {
    const sizeObj = product.sizes?.find(s => s.size === size);
    if (sizeObj) {
      if (!sizeObj.available) return 0;
      return Math.max(0, Number(sizeObj.stockCount ?? product.inStock ?? 0));
    }
    return Math.max(0, Number(product.inStock ?? 0));
  };

  const addToCart = (
    product: Product,
    size: string,
    color: string,
    quantity: number = 1,
    offer?: SellerOffer
  ) => {
    const availableStock = offer ? offer.stock : getVariantStock(product, size);
    if (availableStock <= 0) {
      notify(offer ? `Selected offer from ${offer.sellerName} is out of stock.` : `Size ${size} is currently out of stock.`);
      return;
    }

    const cartItemId = offer ? `${product.id}-${size}-${color}-${offer.id}` : `${product.id}-${size}-${color}`;
    const existingItem = cart.find(item => item.id === cartItemId);
    const desiredQty = (existingItem?.quantity || 0) + Math.max(1, quantity);
    if (desiredQty > availableStock) {
      notify(`Only ${availableStock} unit(s) available in stock for this selection.`);
      return;
    }

    const effectiveProduct: Product = offer
      ? {
          ...product,
          price: offer.price,
          originalPrice: offer.mrp,
          sellerId: offer.sellerId,
          sellerName: offer.sellerName,
          sellerRating: offer.sellerRating,
        }
      : product;

    setCart(prev => {
      const existing = prev.find(item => item.id === cartItemId);
      if (existing) {
        return prev.map(item =>
          item.id === cartItemId ? { ...item, quantity: Math.min(availableStock, item.quantity + quantity) } : item
        );
      }
      return [
        ...prev,
        {
          id: cartItemId,
          productId: product.id,
          offerId: offer?.id,
          offerSellerId: offer?.sellerId,
          offerSellerName: offer?.sellerName,
          offerPrice: offer?.price,
          selectedColor: color,
          selectedSize: size,
          quantity: Math.min(availableStock, Math.max(1, quantity)),
          product: effectiveProduct,
        }
      ];
    });
    notify(
      offer
        ? `Added ${product.title.slice(0, 22)}... from ${offer.sellerName} to bag!`
        : `Added ${product.title.slice(0, 24)}... to bag!`
    );
  };

  const buyProductNow = (
    product: Product,
    size: string,
    color: string,
    paymentMethod: CheckoutPaymentMethod = 'cashfree',
    quantity: number = 1,
    offer?: SellerOffer
  ) => {
    const availableStock = offer ? offer.stock : getVariantStock(product, size);
    if (availableStock <= 0) {
      notify(offer ? `Selected offer from ${offer.sellerName} is out of stock.` : `Size ${size} is currently out of stock.`);
      return;
    }
    const cartItemId = offer ? `${product.id}-${size}-${color}-${offer.id}` : `${product.id}-${size}-${color}`;
    const effectiveProduct: Product = offer
      ? {
          ...product,
          price: offer.price,
          originalPrice: offer.mrp,
          sellerId: offer.sellerId,
          sellerName: offer.sellerName,
          sellerRating: offer.sellerRating,
        }
      : product;

    setCart(prev => {
      const existing = prev.find(item => item.id === cartItemId);
      if (existing) return prev;
      return [
        ...prev,
        {
          id: cartItemId,
          productId: product.id,
          offerId: offer?.id,
          offerSellerId: offer?.sellerId,
          offerSellerName: offer?.sellerName,
          offerPrice: offer?.price,
          selectedColor: color,
          selectedSize: size,
          quantity: Math.min(availableStock, Math.max(1, quantity)),
          product: effectiveProduct,
        }
      ];
    });
    setPreferredPaymentMethod(paymentMethod);
    setSkipAddressOnCheckoutOpen(addresses.length > 0);
    setSelectedProduct(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const updateCartQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    const target = cart.find(item => item.id === cartItemId);
    if (target) {
      const latestProduct = products.find(p => p.id === target.productId) || target.product;
      const maxStock = getVariantStock(latestProduct, target.selectedSize);
      if (maxStock > 0 && quantity > maxStock) {
        notify(`Maximum ${maxStock} unit(s) available for ${latestProduct.title.slice(0, 22)}.`);
        return;
      }
    }
    setCart(prev => prev.map(item => (item.id === cartItemId ? { ...item, quantity } : item)));
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
    notify('Item removed from shopping bag.');
  };

  const saveForLater = (cartItemId: string) => {
    const target = cart.find(item => item.id === cartItemId);
    if (!target) return;

    setCart(prev => prev.filter(item => item.id !== cartItemId));
    setSavedForLater(prev => {
      const existing = prev.find(s => s.id === target.id);
      if (existing) {
        return prev.map(s =>
          s.id === target.id
            ? { ...s, quantity: Math.max(s.quantity, target.quantity), savedAt: new Date().toISOString() }
            : s
        );
      }
      return [{ ...target, savedAt: new Date().toISOString() }, ...prev];
    });
    notify(`Saved "${target.product.title.slice(0, 22)}..." for later.`);
  };

  const moveSavedToCart = (savedItemId: string) => {
    const saved = savedForLater.find(s => s.id === savedItemId);
    if (!saved) return;

    const latestProduct = products.find(p => p.id === saved.productId) || saved.product;
    const availableStock = getVariantStock(latestProduct, saved.selectedSize);
    if (availableStock <= 0) {
      notify(`Sorry, size ${saved.selectedSize} is currently out of stock.`);
      return;
    }

    const existingInCart = cart.find(item => item.id === saved.id);
    const mergedQuantity = Math.min(availableStock, (existingInCart?.quantity || 0) + saved.quantity);

    setCart(prev => {
      const exists = prev.find(item => item.id === saved.id);
      if (exists) {
        return prev.map(item =>
          item.id === saved.id ? { ...item, quantity: mergedQuantity, product: latestProduct } : item
        );
      }
      return [
        ...prev,
        {
          id: saved.id,
          productId: saved.productId,
          selectedColor: saved.selectedColor,
          selectedSize: saved.selectedSize,
          quantity: Math.min(availableStock, saved.quantity),
          product: latestProduct,
        },
      ];
    });
    setSavedForLater(prev => prev.filter(s => s.id !== savedItemId));
    notify(`Moved "${latestProduct.title.slice(0, 22)}..." back to your bag!`);
  };

  const removeSavedItem = (savedItemId: string) => {
    setSavedForLater(prev => prev.filter(s => s.id !== savedItemId));
    notify('Removed item from Saved for Later.');
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleWishlist = (productId: string, productTitle?: string) => {
    const item = products.find(p => p.id === productId);
    const title = productTitle || item?.title || 'Item';
    const shortened = title.length > 28 ? title.slice(0, 26) + '...' : title;

    setWishlist(prev => {
      const exists = prev.includes(productId);
      if (exists) {
        notify(`Removed "${shortened}" from your Wishlist.`);
        return prev.filter(id => id !== productId);
      } else {
        notify(`Saved "${shortened}" to your Wishlist! ❤️`);
        return [...prev, productId];
      }
    });
  };

  const isWishlisted = (productId: string) => wishlist.includes(productId);

  const toggleReelLike = (reelId: string) => {
    setReels(prev =>
      prev.map(reel => {
        if (reel.id === reelId) {
          const isLiked = !reel.isLiked;
          return {
            ...reel,
            isLiked,
            likes: isLiked ? reel.likes + 1 : reel.likes - 1
          };
        }
        return reel;
      })
    );
  };

  const toggleSellerVerification = (sellerId: string) => {
    setSellers(prev =>
      prev.map(seller =>
        seller.id === sellerId ? { ...seller, verified: !seller.verified } : seller
      )
    );
    notify('Seller verification status updated.');
  };

  const registerSeller = (details: {
    name: string;
    storeName: string;
    businessName: string;
    phone: string;
    email?: string;
    businessType?: any;
    gstNumber?: string;
    panNumber?: string;
    pickupAddress?: any;
    bankAccount?: any;
    kycDocuments?: any;
  }): Seller => {
    const newId = `seller-${Date.now().toString(36)}`;
    const newSeller: Seller = {
      id: newId,
      name: details.name,
      storeName: details.storeName || details.businessName,
      businessName: details.businessName,
      phone: details.phone,
      email: details.email || `${details.name.toLowerCase().replace(/\s+/g, '')}@sellers.primebazaar.in`,
      businessType: details.businessType || 'Proprietorship',
      gstNumber: details.gstNumber || '09AAECV0000Z1Z1',
      panNumber: details.panNumber || 'AAECV0000Z',
      location: details.pickupAddress?.city ? `${details.pickupAddress.city}, ${details.pickupAddress.state}` : 'India',
      pickupAddress: details.pickupAddress,
      bankAccount: details.bankAccount,
      kycDocuments: details.kycDocuments || { status: 'pending', submittedAt: 'Just now' },
      rating: 5.0,
      totalOrders: 0,
      totalRevenue: 0,
      walletBalance: 0,
      pendingSettlement: 0,
      commissionRate: 12,
      verified: false,
      status: 'pending_approval',
      joinedDate: 'Nov 2026',
      cashfreeBeneficiaryId: `CF_BENEF_${newId.toUpperCase().slice(-8)}`,
      cashfreeStatus: 'pending',
      cashfreeMode: 'banktransfer',
      cashfreeAutoPayout: true
    };

    setSellers(prev => [newSeller, ...prev]);
    setCurrentSellerId(newId);
    notify(`Seller account "${newSeller.businessName}" submitted for approval! Studio is ready.`);
    api.sellers.register(newSeller).catch(err => console.warn('Backend seller register:', err));
    return newSeller;
  };

  const updateSeller = (sellerId: string, updates: Partial<Seller>) => {
    setSellers(prev => prev.map(s => s.id === sellerId ? { ...s, ...updates } : s));
    notify('Store settings updated successfully!');
  };

  const updateSellerStatus = (sellerId: string, status: Seller['status']) => {
    setSellers(prev => prev.map(s => s.id === sellerId ? { ...s, status, verified: status === 'active' } : s));
    api.sellers.updateStatus(sellerId, status).catch(() => {});
    notify(`Seller status updated to ${status}.`);
  };

  const fulfillSellerOrder = (
    orderId: string, 
    action: 'accept' | 'pack' | 'dispatch' | 'cancel', 
    details?: { courierPartner?: any; trackingNumber?: string; cancelReason?: string }
  ) => {
    setOrders(prev => prev.map(ord => {
      if (ord.id !== orderId) return ord;
      if (action === 'accept') {
        notify(`Order #${orderId} accepted for fulfillment.`);
        return {
          ...ord,
          status: 'placed',
          trackingSteps: [
            ...ord.trackingSteps,
            { step: 'Order Accepted by Merchant', timestamp: 'Just now', completed: true, current: true }
          ]
        };
      }
      if (action === 'pack') {
        notify(`Order #${orderId} marked as Packed. Ready for courier handover.`);
        return {
          ...ord,
          status: 'packed',
          shippingLabelGenerated: true,
          invoiceNumber: `INV-${orderId}`,
          trackingSteps: ord.trackingSteps.map((step, idx) => {
            if (idx <= 1) return { ...step, completed: true, current: idx === 1 };
            return step;
          })
        };
      }
      if (action === 'dispatch') {
        const partner = details?.courierPartner || 'BlueDart Express';
        const awb = details?.trackingNumber || ord.trackingNumber || 'PENDING_CARRIER';
        notify(
          awb === 'PENDING_CARRIER'
            ? `Order #${orderId} marked Dispatched (${partner}) — generate carrier AWB in Shipping tab.`
            : `Order #${orderId} dispatched via ${partner} (AWB: ${awb})!`
        );
        return {
          ...ord,
          status: 'shipped',
          courierPartner: partner,
          trackingNumber: awb,
          pickupDate: new Date().toLocaleDateString('en-IN'),
          trackingSteps: ord.trackingSteps.map((step, idx) => {
            if (idx <= 2) return { ...step, completed: true, current: idx === 2 };
            return step;
          })
        };
      }
      if (action === 'cancel') {
        notify(`Order #${orderId} cancelled by merchant.`);
        return {
          ...ord,
          status: 'cancelled',
          cancelReason: details?.cancelReason || 'Out of stock at merchant warehouse',
          trackingSteps: [
            ...ord.trackingSteps,
            { step: `Order Cancelled by Merchant: ${details?.cancelReason || 'Out of stock'}`, timestamp: 'Just now', completed: true, current: true }
          ]
        };
      }
      return ord;
    }));
  };

  const handleSellerReturn = (
    requestId: string, 
    action: 'approved' | 'rejected' | 'replacement_dispatched' | 'refund_issued', 
    notes?: string
  ) => {
    setSellerReturns(prev => prev.map(ret => {
      if (ret.id !== requestId) return ret;
      return {
        ...ret,
        status: action,
        actionNotes: notes || `Action updated to ${action.replace('_', ' ')}`
      };
    }));
    notify(`Return request #${requestId} updated to ${action.toUpperCase()}!`);
  };

  const requestSellerPayout = (sellerId: string, amount: number) => {
    const seller = sellers.find(s => s.id === sellerId);
    if (!seller || amount <= 0 || amount > seller.walletBalance) {
      notify('Invalid payout amount or insufficient wallet balance.');
      return;
    }
    const commission = Math.round(amount * (seller.commissionRate || 12) / 100);
    const gst = Math.round(commission * 0.18);
    const net = amount - commission - gst;

    const newPayout: SellerPayout = {
      id: `pay-${Date.now()}`,
      sellerId: seller.id,
      sellerName: seller.businessName,
      amount,
      grossSales: amount,
      commissionDeducted: commission,
      gstOnCommission: gst,
      netPayout: Math.max(0, net),
      accountNumber: seller.bankAccount?.accountNumber ? `•••• ${seller.bankAccount.accountNumber.slice(-4)}` : '•••• 9041',
      bankName: seller.bankAccount?.bankName || 'HDFC Bank',
      requestedAt: new Date().toLocaleString('en-IN'),
      status: 'pending',
      cashfreeTransferId: `CF_TR_${Date.now()}`,
      cashfreeMode: seller.cashfreeMode === 'upi' ? 'UPI' : 'IMPS'
    };

    setSellerPayouts(prev => [newPayout, ...prev]);
    setSellers(prev => prev.map(s => s.id === sellerId ? { ...s, walletBalance: s.walletBalance - amount } : s));
    api.sellers.requestPayout(sellerId, amount).catch(() => {});
    notify(`Payout request of ₹${amount.toLocaleString('en-IN')} submitted! Cashfree Transfer ID: ${newPayout.cashfreeTransferId}`);
  };

  const approveSellerPayout = (payoutId: string) => {
    const randomUtr = `UTR${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
    setSellerPayouts(prev => prev.map(p => {
      if (p.id !== payoutId) return p;
      return {
        ...p,
        status: 'processed',
        bankRefNumber: `NEFT-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        cashfreeUtr: randomUtr
      };
    }));
    notify(`Payout #${payoutId} settled via Cashfree Payouts Engine (UTR: ${randomUtr})!`);
  };

  const createSellerCoupon = (coupon: Omit<SellerCoupon, 'id' | 'usageCount'>) => {
    const newCoupon: SellerCoupon = {
      ...coupon,
      id: `sc-${Date.now()}`,
      usageCount: 0
    };
    setSellerCoupons(prev => [newCoupon, ...prev]);
    notify(`Promotional code "${newCoupon.code}" created and active!`);
  };

  const toggleSellerCoupon = (couponId: string) => {
    setSellerCoupons(prev => prev.map(c => {
      if (c.id !== couponId) return c;
      const nextStatus = c.status === 'active' ? 'paused' : 'active';
      return { ...c, status: nextStatus };
    }));
    notify('Coupon campaign status updated.');
  };

  const replyToSellerTicket = (ticketId: string, replyText: string, senderRole: 'seller' | 'admin' = 'seller') => {
    setSellerTickets(prev => prev.map(tkt => {
      if (tkt.id !== ticketId) return tkt;
      const newMsg = {
        id: `msg-${Date.now()}`,
        sender: senderRole,
        senderName: senderRole === 'seller' ? currentSeller.businessName : 'Prime Bazaar Support Desk',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      return {
        ...tkt,
        status: 'in_progress',
        messages: [...tkt.messages, newMsg]
      };
    }));
    notify('Message sent to customer ticket!');
  };

  const addAddress = (address: Omit<Address, 'id'>) => {
    const newAddr: Address = {
      ...address,
      id: `addr-${Date.now()}`
    };
    setAddresses(prev => [newAddr, ...prev]);
    notify('New delivery address saved.');
  };

  const applyCoupon = (code: string) => {
    const found = availableCoupons.find(c => c.code.toUpperCase() === code.toUpperCase().trim());
    if (!found) {
      return { success: false, message: 'Invalid coupon code.' };
    }
    const currentSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    if (currentSubtotal < found.minOrderAmount) {
      return {
        success: false,
        message: `Minimum order of ₹${found.minOrderAmount} required for coupon ${found.code}.`
      };
    }
    setActiveCoupon(found);
    return { success: true, message: `Coupon ${found.code} applied successfully!` };
  };

  const removeCoupon = () => {
    setActiveCoupon(null);
    notify('Coupon removed.');
  };

  const earnCoins = (amount: number, reason: string) => {
    setCoins(prev => prev + amount);
    notify(`+${amount} Bazaar Coins earned: ${reason}! 🪙`);
  };

  // Cart calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  let couponDiscount = 0;
  if (activeCoupon && cartSubtotal >= activeCoupon.minOrderAmount) {
    if (activeCoupon.discountType === 'flat') {
      couponDiscount = activeCoupon.discountValue;
    } else {
      couponDiscount = Math.round((cartSubtotal * activeCoupon.discountValue) / 100);
    }
  }

  const placeOrder = async (details: {
    address: Address;
    paymentMethod: CheckoutPaymentMethod;
    couponCode?: string;
    giftCardCode?: string;
    useStoreCredit?: boolean;
    requestedStoreCreditAmount?: number;
    coinsUsed: number;
    idempotencyKey?: string;
    intentId?: string;
    cashfreeOrderId?: string;
    buyerGstin?: string;
    quote?: CheckoutQuote | null;
  }): Promise<Order> => {
    const snapshotCart = [...cart];
    const subtotal = cartSubtotal;
    const discount = details.quote ? details.quote.couponDiscount : couponDiscount;
    const coinsDiscount = details.quote ? details.quote.coinsDiscount : details.coinsUsed;
    const deliveryFee = details.quote ? details.quote.deliveryFee : (subtotal > 999 ? 0 : 49);
    const giftCardAmount = details.quote ? details.quote.giftCardAmount : 0;
    const storeCreditAmount = details.quote ? details.quote.storeCreditAmount : 0;
    const taxAmount = details.quote ? details.quote.taxAmount : 0;
    const grossTotal = details.quote
      ? details.quote.grossPayableBeforeWallet
      : Math.max(0, subtotal - discount - coinsDiscount + deliveryFee);
    const gatewayPayable = details.quote
      ? details.quote.finalGatewayPayable
      : Math.max(0, grossTotal - giftCardAmount - storeCreditAmount);

    let backendOrder: any = null;
    let backendInvoices: any[] = [];
    let backendQuote: CheckoutQuote | null = details.quote || null;
    let splitWarehousePlan: any[] | undefined = undefined;
    let backendEarnedCoins: number | null = null;

    let backendSellerSuborders: any[] | undefined = undefined;
    try {
      const res = await api.orders.create({
        items: snapshotCart.map(it => ({
          productId: it.productId,
          offerId: it.offerId,
          title: it.product.title,
          selectedSize: it.selectedSize,
          selectedColor: it.selectedColor,
          quantity: it.quantity,
          price: it.offerPrice ?? it.product.price,
          sellerId: it.offerSellerId ?? it.product.sellerId,
        })),
        address: details.address,
        paymentMethod: details.paymentMethod,
        couponCode: details.couponCode,
        giftCardCode: details.giftCardCode,
        useStoreCredit: Boolean(details.useStoreCredit),
        requestedStoreCreditAmount: details.requestedStoreCreditAmount,
        coinsUsed: details.coinsUsed,
        idempotencyKey: details.idempotencyKey,
        intentId: details.intentId,
        cashfreeOrderId: details.cashfreeOrderId,
        buyerGstin: details.buyerGstin,
      });

      if (res?.order) {
        backendOrder = res.order;
        backendInvoices = Array.isArray(res.invoices) ? res.invoices : [];
        backendSellerSuborders = Array.isArray(res.sellerSuborders) ? res.sellerSuborders : undefined;
        backendQuote = res.quote || backendQuote;
        splitWarehousePlan = res.splitWarehousePlan || res.order.splitWarehousePlan;
        if (typeof res.earnedCoins === 'number') {
          backendEarnedCoins = res.earnedCoins;
        }
      }
    } catch (err: any) {
      // If user explicitly provided a gift card or store credit and backend rejected it, surface the error cleanly
      if (details.giftCardCode || details.useStoreCredit) {
        throw err;
      }
      console.warn('Backend order persist fallback:', err?.message || err);
    }

    const orderId = backendOrder?.id || `PB-${Math.floor(10000 + Math.random() * 90000)}`;
    const resolvedFinalAmount = Number(backendOrder?.totalAmount ?? grossTotal);
    const resolvedGatewayPayable = Number(backendOrder?.finalGatewayPayable ?? gatewayPayable);
    const resolvedGiftCardAmt = Number(backendOrder?.giftCardAmount ?? backendQuote?.giftCardAmount ?? giftCardAmount);
    const resolvedStoreCreditAmt = Number(backendOrder?.storeCreditAmount ?? backendQuote?.storeCreditAmount ?? storeCreditAmount);
    const resolvedTaxAmt = Number(backendOrder?.taxAmount ?? backendQuote?.taxAmount ?? taxAmount);

    const newOrder: Order = {
      id: orderId,
      items: snapshotCart,
      totalAmount: Number(backendOrder?.subtotalAmount ?? subtotal),
      discountAmount: Number(backendOrder?.discountAmount ?? discount + coinsDiscount),
      couponCode: details.couponCode,
      coinsUsed: details.coinsUsed,
      deliveryFee: Number(backendOrder?.deliveryFee ?? deliveryFee),
      finalAmount: resolvedFinalAmount,
      taxAmount: resolvedTaxAmt,
      giftCardAmount: resolvedGiftCardAmt,
      storeCreditAmount: resolvedStoreCreditAmt,
      finalGatewayPayable: resolvedGatewayPayable,
      paymentStatus: backendOrder?.paymentStatus || (details.paymentMethod === 'cod' ? 'PENDING' : 'PAID'),
      splitWarehousePlan,
      sellerSuborders: backendSellerSuborders,
      invoiceNumber: backendInvoices[0]?.invoiceNumber || backendOrder?.invoiceNumber,
      shippingAddress: details.address,
      paymentMethod: details.paymentMethod,
      status: 'placed',
      trackingSteps: [
        { step: 'Order Placed & Stock Reserved', timestamp: 'Just now', completed: true, current: true },
        { step: 'Packed & Carrier Label Assigned', timestamp: 'Estimated in 24 hours', completed: false },
        { step: 'In Transit with Express Logistics', timestamp: 'Pending', completed: false },
        { step: 'Out for Delivery to Your Doorstep', timestamp: 'Pending', completed: false },
        { step: 'Delivered', timestamp: 'Expected in 3-4 days', completed: false }
      ],
      createdAt: backendOrder?.createdAt || new Date().toISOString(),
      estimatedDelivery: 'In 3-4 business days'
    };

    setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
    if (details.coinsUsed > 0) {
      setCoins(prev => Math.max(0, prev - details.coinsUsed));
    }
    earnCoins(backendEarnedCoins ?? Math.round(resolvedFinalAmount * 0.05), 'Order cash reward');
    clearCart();
    setActiveCoupon(null);
    refreshStoreCredit();
    notify(`Order #${newOrder.id} confirmed successfully!`);
    return newOrder;
  };

  const cancelOrder = (orderId: string) => {
    setOrders(prev =>
      prev.map(ord =>
        ord.id === orderId
          ? {
              ...ord,
              status: 'cancelled',
              trackingSteps: [
                ...ord.trackingSteps,
                { step: 'Order Cancelled by Customer', timestamp: 'Just now', completed: true, current: true }
              ]
            }
          : ord
      )
    );
    api.orders
      .cancel(orderId, 'Cancelled by customer')
      .then(() => refreshStoreCredit())
      .catch(() => {});
    notify(`Order #${orderId} has been cancelled.`);
  };

  const returnOrder = (orderId: string, reason: string) => {
    setOrders(prev =>
      prev.map(ord =>
        ord.id === orderId
          ? {
              ...ord,
              status: 'returned',
              trackingSteps: [
                ...ord.trackingSteps,
                { step: `Return Initiated: ${reason}`, timestamp: 'Just now', completed: true, current: true }
              ]
            }
          : ord
      )
    );
    api.orders.returnItem(orderId, reason).catch(() => {});
    notify(`Return request submitted for Order #${orderId}. Pickup scheduled within 48h.`);
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id === orderId) {
          const updatedSteps = ord.trackingSteps.map((step, idx) => {
            if (status === 'packed' && idx <= 1) return { ...step, completed: true, current: idx === 1 };
            if (status === 'shipped' && idx <= 2) return { ...step, completed: true, current: idx === 2 };
            if (status === 'out_for_delivery' && idx <= 3) return { ...step, completed: true, current: idx === 3 };
            if (status === 'delivered') return { ...step, completed: true, current: false };
            return step;
          });
          return { ...ord, status, trackingSteps: updatedSteps };
        }
        return ord;
      })
    );
    notify(`Order #${orderId} marked as ${status.toUpperCase()}.`);
  };

  return (
    <MarketplaceContext.Provider
      value={{
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        updateProductStock,
        bulkUploadProducts,
        cart,
        savedForLater,
        addToCart,
        buyProductNow,
        updateCartQuantity,
        removeFromCart,
        saveForLater,
        moveSavedToCart,
        removeSavedItem,
        getVariantStock,
        clearCart,
        cartTotal: cartSubtotal,
        cartDiscount: couponDiscount,
        wishlist,
        toggleWishlist,
        isWishlisted,
        orders,
        placeOrder,
        cancelOrder,
        returnOrder,
        updateOrderStatus,
        fulfillSellerOrder,
        reels,
        toggleReelLike,
        sellers,
        currentSellerId,
        setCurrentSellerId,
        currentSeller,
        registerSeller,
        updateSeller,
        updateSellerStatus,
        toggleSellerVerification,
        sellerReturns,
        handleSellerReturn,
        sellerPayouts,
        requestSellerPayout,
        approveSellerPayout,
        sellerCoupons,
        createSellerCoupon,
        toggleSellerCoupon,
        sellerTickets,
        replyToSellerTicket,
        addresses,
        addAddress,
        availableCoupons,
        activeCoupon,
        applyCoupon,
        removeCoupon,
        coins,
        earnCoins,
        activePortal,
        setActivePortal,
        selectedProduct,
        setSelectedProduct,
        isCartOpen,
        setIsCartOpen,
        isReelsOpen,
        setIsReelsOpen,
        activeReelIndex,
        setActiveReelIndex,
        isCheckoutOpen,
        setIsCheckoutOpen,
        preferredPaymentMethod,
        setPreferredPaymentMethod,
        skipAddressOnCheckoutOpen,
        setSkipAddressOnCheckoutOpen,
        isOrdersOpen,
        setIsOrdersOpen,
        isVisualSearchOpen,
        setIsVisualSearchOpen,
        isRewardsOpen,
        setIsRewardsOpen,
        notification,
        notify,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        selectedSubcategory,
        setSelectedSubcategory,
        navigateCategory,
        recentlyViewed,
        recentlyViewedProducts,
        isCatalogLoading,
        catalogError,
        retryCatalogSync,
        theme,
        toggleTheme,

        language,
        setLanguage,
        currency,
        setCurrency,
        countryCode,
        setCountryCode,
        intlCountries,
        intlRates,
        setCoins,
        formatPrice,

        user,
        loginUser,
        logoutUser,
        isAuthOpen,
        setIsAuthOpen,
        isProfileOpen,
        setIsProfileOpen,
        profileActiveTab,
        setProfileActiveTab,
        openWishlist,

        compareList,
        toggleCompare,
        isCompared,
        clearCompare,
        isCompareOpen,
        setIsCompareOpen,

        isTryOnOpen,
        setIsTryOnOpen,
        tryOnProduct,
        openTryOn,

        isSupportOpen,
        setIsSupportOpen,
        supportMessages,
        sendSupportMessage,

        isBlueprintOpen,
        setIsBlueprintOpen,
        blueprintFeatures,

        isArchitectureOpen,
        setIsArchitectureOpen,

        isOnboardingOpen,
        setIsOnboardingOpen,

        isSellerStoreOpen,
        activeSellerStoreId,
        openSellerStore,
        closeSellerStore,
        isLiveShoppingOpen,
        setIsLiveShoppingOpen,
        isBuyerSellerChatOpen,
        setIsBuyerSellerChatOpen,
        activeChatSellerId,
        chatProductContext,
        chatWithSeller,
        isLaunchChecklistOpen,
        setIsLaunchChecklistOpen,

        isMerchantAuthOpen,
        setIsMerchantAuthOpen,
        merchantAuthMode,
        setMerchantAuthMode,
        openMerchantAuth,

        isApkModalOpen,
        setIsApkModalOpen,

        priceAlerts,
        priceDropNotifications,
        unreadPriceDropCount,
        priceWorkerStatus,
        hasPriceAlert,
        togglePriceAlert,
        runPriceDropWorkerCheck,
        markPriceDropRead,
        markAllPriceDropsRead,

        storeCreditBalance,
        refreshStoreCredit,
        cmsBanners,
        categories,
        fashionDepartments,
        moreDepartments,
        refreshCategories,
        refreshCmsData
      }}
    >
      {children}

    </MarketplaceContext.Provider>
  );
};

export const useMarketplace = () => {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) {
    throw new Error('useMarketplace must be used within MarketplaceProvider');
  }
  return ctx;
};
