export interface Review {
  id: string;
  userName: string;
  rating: number;
  date: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
}

export interface ProductColor {
  name: string;
  hex: string;
  imageIndex?: number;
}

export interface ProductSize {
  size: string;
  available: boolean;
  stockCount: number;
}

export interface Product {
  id: string;
  title: string;
  brand: string;
  category: 'ethnic' | 'western' | 'streetwear' | 'footwear' | 'accessories' | 'beauty';
  price: number;
  originalPrice: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  inStock: number;
  images: string[];
  videoUrl?: string;
  colors: ProductColor[];
  sizes: ProductSize[];
  description: string;
  fabric?: string;
  fit?: string;
  sellerId: string;
  sellerName: string;
  sellerRating: number;
  codAvailable: boolean;
  returnPeriodDays: number;
  isTrending?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  reviews: Review[];
}

export interface CartItem {
  id: string; // unique item id = productId-color-size
  productId: string;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  product: Product;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pinCode: string;
  type: 'home' | 'work';
  isDefault: boolean;
}

export type OrderStatus = 'placed' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned';

export interface TrackingStep {
  step: string;
  timestamp: string;
  completed: boolean;
  current?: boolean;
}

export interface Order {
  id: string;
  items: CartItem[];
  totalAmount: number;
  discountAmount: number;
  couponCode?: string;
  coinsUsed: number;
  deliveryFee: number;
  finalAmount: number;
  shippingAddress: Address;
  paymentMethod: 'cod' | 'upi' | 'card' | 'netbanking';
  status: OrderStatus;
  trackingSteps: TrackingStep[];
  createdAt: string;
  estimatedDelivery: string;
}

export interface Reel {
  id: string;
  creatorName: string;
  creatorHandle: string;
  creatorAvatar: string;
  videoUrl: string;
  thumbnail: string;
  title: string;
  caption: string;
  likes: number;
  isLiked?: boolean;
  productId: string;
  audioTitle: string;
}

export interface Seller {
  id: string;
  name: string;
  businessName: string;
  gstNumber: string;
  location: string;
  rating: number;
  totalOrders: number;
  totalRevenue: number;
  walletBalance: number;
  verified: boolean;
  joinedDate: string;
}

export interface Coupon {
  code: string;
  description: string;
  discountType: 'flat' | 'percentage';
  discountValue: number;
  minOrderAmount: number;
}

export interface UserProfile {
  id?: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  isLoggedIn: boolean;
  memberTier: 'Silver' | 'Gold' | 'Platinum';
  joinedDate: string;
  token?: string;
}

export interface SupportMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  quickActions?: { label: string; action: string }[];
}

export interface BlueprintFeature {
  id: string;
  section: 'Customer App' | 'Seller Panel' | 'Super Admin' | 'Backend & System' | 'Advanced Features';
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'planned';
}
