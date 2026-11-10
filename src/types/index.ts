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

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  sku: string;
  stock: number;
  price: number;
}

export interface ProductDimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface Product {
  id: string;
  title: string;
  brand: string;
  category: 'ethnic' | 'western' | 'streetwear' | 'footwear' | 'accessories' | 'beauty';
  subcategory?: string;
  sku?: string;
  barcode?: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  gstRate?: number; // 0, 5, 12, 18, 28
  weightGrams?: number;
  dimensions?: ProductDimensions;
  rating: number;
  reviewCount: number;
  inStock: number;
  images: string[];
  videoUrl?: string;
  colors: ProductColor[];
  sizes: ProductSize[];
  variants?: ProductVariant[];
  description: string;
  fabric?: string;
  fit?: string;
  sellerId: string;
  sellerName: string;
  sellerRating: number;
  codAvailable: boolean;
  returnPeriodDays: number;
  warrantyPolicy?: string;
  status?: 'approved' | 'pending_review' | 'rejected';
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
  paymentMethod: 'cod' | 'upi' | 'card' | 'netbanking' | 'cashfree';
  status: OrderStatus;
  trackingSteps: TrackingStep[];
  createdAt: string;
  estimatedDelivery: string;
  sellerId?: string;
  courierPartner?: 'BlueDart Express' | 'Delhivery Air' | 'Shiprocket Surface' | 'Ecom Express';
  trackingNumber?: string;
  pickupDate?: string;
  cancelReason?: string;
  shippingLabelGenerated?: boolean;
  invoiceNumber?: string;
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

export interface SellerBankAccount {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
}

export interface SellerPickupAddress {
  street: string;
  city: string;
  state: string;
  pinCode: string;
}

export interface SellerKycDocuments {
  panCardUrl?: string;
  panNumber?: string;
  gstinCertUrl?: string;
  cancelledChequeUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  submittedAt?: string;
  verifiedAt?: string;
}

export interface Seller {
  id: string;
  name: string;
  storeName?: string;
  businessName: string;
  email?: string;
  phone?: string;
  businessType?: 'Proprietorship' | 'Partnership' | 'Private Limited' | 'Individual Artisan';
  gstNumber: string;
  panNumber?: string;
  location: string;
  pickupAddress?: SellerPickupAddress;
  bankAccount?: SellerBankAccount;
  kycDocuments?: SellerKycDocuments;
  rating: number;
  totalOrders: number;
  totalRevenue: number;
  walletBalance: number;
  pendingSettlement?: number;
  commissionRate?: number; // e.g. 12
  verified: boolean;
  status: 'pending_approval' | 'active' | 'suspended' | 'rejected';
  joinedDate: string;
  bannerImage?: string;
  storeLogo?: string;
}

export interface SellerReturnRequest {
  id: string;
  orderId: string;
  productId: string;
  productTitle: string;
  productImage: string;
  customerName: string;
  customerPhone: string;
  sellerId: string;
  reason: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'replacement_dispatched' | 'refund_issued';
  refundAmount: number;
  actionNotes?: string;
}

export interface SellerPayout {
  id: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  grossSales: number;
  commissionDeducted: number;
  gstOnCommission: number;
  netPayout: number;
  accountNumber: string;
  bankName: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'processed' | 'rejected';
  bankRefNumber?: string;
}

export interface SellerCoupon {
  id: string;
  sellerId: string;
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  maxDiscount?: number;
  minOrderValue: number;
  validUntil: string;
  usageCount: number;
  status: 'active' | 'paused' | 'expired';
}

export interface SellerTicketMessage {
  id: string;
  sender: 'customer' | 'seller' | 'admin';
  senderName: string;
  text: string;
  timestamp: string;
}

export interface SellerSupportTicket {
  id: string;
  sellerId: string;
  customerName: string;
  orderId?: string;
  subject: string;
  category: 'Order Dispute' | 'Product Inquiry' | 'Delivery Delay' | 'Payout Query' | 'Return Support';
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  messages: SellerTicketMessage[];
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

export interface LiveSession {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar?: string;
  title: string;
  category: string;
  viewerCount: number;
  streamUrl?: string;
  thumbnail: string;
  status: 'live' | 'upcoming' | 'ended';
  pinnedProduct: Product;
  scheduledTime?: string;
  chatMessages: {
    id: string;
    userName: string;
    message: string;
    timestamp: string;
    badge?: string;
  }[];
}

export interface BuyerSellerChatMessage {
  id: string;
  conversationId: string;
  sellerId: string;
  sellerName: string;
  sender: 'buyer' | 'seller';
  senderName: string;
  text: string;
  timestamp: string;
  productContext?: {
    id: string;
    title: string;
    price: number;
    image: string;
  };
}

export interface LaunchCriterion {
  id: string;
  criterionNumber: number;
  title: string;
  specification: string;
  category: 'Buyer & Account' | 'Seller & KYC' | 'Orders & Splitting' | 'Finance & Payouts' | 'Compliance & Security';
  status: 'verified' | 'ready';
  endpoint?: string;
  verificationEvidence: string;
}

