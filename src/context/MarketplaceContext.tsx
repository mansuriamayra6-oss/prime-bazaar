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
  BlueprintFeature
} from '../types';
import { INITIAL_PRODUCTS, INITIAL_REELS, INITIAL_COUPONS, INITIAL_SELLERS, DEFAULT_ADDRESSES } from '../data/mockData';
import { BLUEPRINT_FEATURES } from '../data/blueprintFeatures';
import { api } from '../services/api';

export type SupportedLanguage = 'en' | 'hi' | 'mr' | 'ta';
export type SupportedCurrency = 'INR' | 'USD' | 'EUR';

interface MarketplaceContextType {
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'rating' | 'reviewCount' | 'reviews'>) => void;
  deleteProduct: (productId: string) => void;
  cart: CartItem[];
  addToCart: (product: Product, size: string, color: string, quantity?: number) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartDiscount: number;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  orders: Order[];
  placeOrder: (details: {
    address: Address;
    paymentMethod: 'cod' | 'upi' | 'card' | 'netbanking';
    couponCode?: string;
    coinsUsed: number;
  }) => Order;
  cancelOrder: (orderId: string) => void;
  returnOrder: (orderId: string, reason: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  reels: Reel[];
  toggleReelLike: (reelId: string) => void;
  sellers: Seller[];
  toggleSellerVerification: (sellerId: string) => void;
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

  // Sellers
  const [sellers, setSellers] = useState<Seller[]>(INITIAL_SELLERS);

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
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);
  const [tryOnProduct, setTryOnProduct] = useState<Product | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

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

  const toggleWishlist = (productId: string) => {
    setWishlist(prev => {
      const exists = prev.includes(productId);
      if (exists) {
        notify('Removed from your wishlist.');
        return prev.filter(id => id !== productId);
      } else {
        notify('Saved to your wishlist! ❤️');
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
    paymentMethod: 'cod' | 'upi' | 'card' | 'netbanking';
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
        deleteProduct,
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
        reels,
        toggleReelLike,
        sellers,
        toggleSellerVerification,
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
        setIsOnboardingOpen
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
