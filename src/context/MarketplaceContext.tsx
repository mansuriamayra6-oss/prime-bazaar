import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Product, 
  CartItem, 
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
  SellerSupportTicket
} from '../types';
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
export type SupportedCurrency = 'INR' | 'USD' | 'EUR';

interface MarketplaceContextType {
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'rating' | 'reviewCount' | 'reviews'>) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  updateProductStock: (productId: string, newStock: number) => void;
  bulkUploadProducts: (sellerId: string, products: Partial<Product>[]) => void;
  cart: CartItem[];
  addToCart: (product: Product, size: string, color: string, quantity?: number) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartDiscount: number;
  wishlist: string[];
  toggleWishlist: (productId: string, productTitle?: string) => void;
  isWishlisted: (productId: string) => boolean;
  orders: Order[];
  placeOrder: (details: {
    address: Address;
    paymentMethod: 'cod' | 'upi' | 'card' | 'netbanking' | 'cashfree';
    couponCode?: string;
    coinsUsed: number;
  }) => Order;
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
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Multi-Language & Multi-Currency
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  currency: SupportedCurrency;
  setCurrency: (cur: SupportedCurrency) => void;
  formatPrice: (priceInInr: number) => string;

  // User Profile & Authentication
  user: UserProfile | null;
  loginUser: (name: string, phone: string, email?: string, token?: string) => void;
  logoutUser: () => void;
  isAuthOpen: boolean;
  setIsAuthOpen: (open: boolean) => void;
  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;
  profileActiveTab: 'details' | 'wishlist' | 'addresses' | 'preferences' | 'orders' | 'coupons' | 'referrals' | 'chats' | 'live';
  setProfileActiveTab: (tab: 'details' | 'wishlist' | 'addresses' | 'preferences' | 'orders' | 'coupons' | 'referrals' | 'chats' | 'live') => void;
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

  // Language & Currency
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('tb_lang');
    return (saved as SupportedLanguage) || 'en';
  });

  const [currency, setCurrency] = useState<SupportedCurrency>(() => {
    const saved = localStorage.getItem('tb_curr');
    return (saved as SupportedCurrency) || 'INR';
  });

  useEffect(() => {
    localStorage.setItem('tb_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('tb_curr', currency);
  }, [currency]);

  const formatPrice = (priceInInr: number) => {
    if (currency === 'USD') {
      const usdVal = Math.round(priceInInr * 0.012);
      return `$${usdVal.toLocaleString()}`;
    }
    if (currency === 'EUR') {
      const eurVal = Math.round(priceInInr * 0.011);
      return `€${eurVal.toLocaleString()}`;
    }
    return `₹${priceInInr.toLocaleString('en-IN')}`;
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

  // Cart
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

  useEffect(() => {
    localStorage.setItem('pb_cart', JSON.stringify(cart));
  }, [cart]);

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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isReelsOpen, setIsReelsOpen] = useState(false);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileActiveTab, setProfileActiveTab] = useState<'details' | 'wishlist' | 'addresses' | 'preferences' | 'orders' | 'coupons' | 'referrals' | 'chats' | 'live'>('details');

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

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

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
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updates } : p));
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

  const addToCart = (product: Product, size: string, color: string, quantity: number = 1) => {
    const cartItemId = `${product.id}-${size}-${color}`;
    setCart(prev => {
      const existing = prev.find(item => item.id === cartItemId);
      if (existing) {
        return prev.map(item =>
          item.id === cartItemId ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [
        ...prev,
        {
          id: cartItemId,
          productId: product.id,
          selectedColor: color,
          selectedSize: size,
          quantity,
          product
        }
      ];
    });
    notify(`Added ${product.title.slice(0, 24)}... to bag!`);
  };

  const updateCartQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart(prev => prev.map(item => (item.id === cartItemId ? { ...item, quantity } : item)));
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
    notify('Item removed from shopping bag.');
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
      joinedDate: 'Nov 2026'
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
        const awb = details?.trackingNumber || `AWB-BD-${Math.floor(100000000 + Math.random() * 900000000)}`;
        notify(`Order #${orderId} dispatched via ${partner} (AWB: ${awb})!`);
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
      status: 'pending'
    };

    setSellerPayouts(prev => [newPayout, ...prev]);
    setSellers(prev => prev.map(s => s.id === sellerId ? { ...s, walletBalance: s.walletBalance - amount } : s));
    api.sellers.requestPayout(sellerId, amount).catch(() => {});
    notify(`Payout request of ₹${amount.toLocaleString('en-IN')} submitted! (Net: ₹${newPayout.netPayout.toLocaleString('en-IN')})`);
  };

  const approveSellerPayout = (payoutId: string) => {
    setSellerPayouts(prev => prev.map(p => {
      if (p.id !== payoutId) return p;
      return {
        ...p,
        status: 'processed',
        bankRefNumber: `NEFT-${Math.floor(1000000000 + Math.random() * 9000000000)}`
      };
    }));
    notify(`Payout #${payoutId} approved and processed via NEFT!`);
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

  const placeOrder = (details: {
    address: Address;
    paymentMethod: 'cod' | 'upi' | 'card' | 'netbanking' | 'cashfree';
    couponCode?: string;
    coinsUsed: number;
  }): Order => {
    const subtotal = cartSubtotal;
    const discount = couponDiscount;
    const coinsDiscount = details.coinsUsed;
    const deliveryFee = subtotal > 999 ? 0 : 49;
    const finalAmt = Math.max(0, subtotal - discount - coinsDiscount + deliveryFee);

    const newOrder: Order = {
      id: `PB-${Math.floor(10000 + Math.random() * 90000)}`,
      items: [...cart],
      totalAmount: subtotal,
      discountAmount: discount + coinsDiscount,
      couponCode: details.couponCode,
      coinsUsed: details.coinsUsed,
      deliveryFee,
      finalAmount: finalAmt,
      shippingAddress: details.address,
      paymentMethod: details.paymentMethod,
      status: 'placed',
      trackingSteps: [
        { step: 'Order Placed & Payment Verified', timestamp: 'Just now', completed: true, current: true },
        { step: 'Seller Dispatching Package', timestamp: 'Estimated in 24 hours', completed: false },
        { step: 'In Transit with Express Logistics', timestamp: 'Pending', completed: false },
        { step: 'Out for Delivery to Your Doorstep', timestamp: 'Pending', completed: false },
        { step: 'Delivered', timestamp: 'Expected in 3-4 days', completed: false }
      ],
      createdAt: new Date().toISOString(),
      estimatedDelivery: 'In 3-4 business days'
    };

    setOrders(prev => [newOrder, ...prev]);
    if (details.coinsUsed > 0) {
      setCoins(prev => Math.max(0, prev - details.coinsUsed));
    }
    earnCoins(Math.round(finalAmt * 0.05), 'Order cash reward');
    clearCart();
    setActiveCoupon(null);
    notify(`Order #${newOrder.id} confirmed successfully! 🎉`);

    // Persist order to Express backend
    api.orders.create({
      items: cart,
      address: details.address,
      paymentMethod: details.paymentMethod,
      couponCode: details.couponCode,
      coinsUsed: details.coinsUsed,
      totalAmount: finalAmt,
      discountAmount: discount + coinsDiscount
    }).catch(err => console.warn('Backend order persist:', err));

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
    api.orders.cancel(orderId, 'Cancelled by customer').catch(() => {});
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
        addToCart,
        updateCartQuantity,
        removeFromCart,
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
        theme,
        toggleTheme,

        language,
        setLanguage,
        currency,
        setCurrency,
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
        setIsLaunchChecklistOpen
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
