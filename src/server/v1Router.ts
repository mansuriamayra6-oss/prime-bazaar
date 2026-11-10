import express from 'express';
import crypto from 'crypto';

export const v1Router = express.Router();

// ==========================================
// IN-MEMORY MULTI-VENDOR DATABASE REPOSITORY
// (Mirrors the 28 Prisma Schema Models)
// ==========================================

export interface DBUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  createdAt: string;
}

export interface DBSellerProfile {
  id: string;
  userId: string;
  sellerName: string;
  businessName: string;
  tradeName?: string;
  businessType: 'PROPRIETORSHIP' | 'PARTNERSHIP' | 'PRIVATE_LIMITED' | 'INDIVIDUAL_ARTISAN';
  email: string;
  phone: string;
  gstNumber: string;
  panNumber: string;
  location: string;
  rating: number;
  totalOrders: number;
  totalRevenue: number;
  approvalStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason?: string;
  bankAccount: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  pickupAddress: {
    street: string;
    city: string;
    state: string;
    pinCode: string;
  };
  kycDocuments: {
    id: string;
    documentType: 'PAN' | 'GSTIN' | 'BANK_STATEMENT' | 'CHEQUE';
    documentUrl: string;
    verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
    submittedAt: string;
  }[];
  createdAt: string;
}

export interface DBCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
}

export interface DBBrand {
  id: string;
  name: string;
  slug: string;
  verified: boolean;
}

export interface DBProductVariant {
  id: string;
  productId: string;
  sku: string;
  size: string;
  color: string;
  price: number; // in INR
  mrp: number;
  stock: number;
}

export interface DBProduct {
  id: string;
  sellerId: string;
  sellerName: string;
  name: string;
  categoryId: string;
  subCategory?: string;
  brandId: string;
  brandName: string;
  description: string;
  images: string[];
  videoUrl?: string;
  taxGstPercent: number;
  weightGrams: number;
  dimensions?: { lengthCm: number; widthCm: number; heightCm: number };
  returnPeriodDays: number;
  warrantyPolicy?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  rejectionReason?: string;
  variants: DBProductVariant[];
  createdAt: string;
}

export interface DBInventoryMovement {
  id: string;
  variantId: string;
  sku: string;
  sellerId: string;
  movementType: 'INWARD' | 'SALE' | 'RETURN' | 'ADJUSTMENT' | 'DAMAGE';
  quantity: number;
  referenceId: string;
  notes: string;
  createdAt: string;
}

export interface DBSellerOrder {
  id: string;
  suborderNumber: string;
  orderId: string;
  sellerId: string;
  sellerName: string;
  items: {
    productId: string;
    variantId?: string;
    title: string;
    sku?: string;
    selectedColor: string;
    selectedSize: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    image: string;
  }[];
  subtotal: number;
  commissionRate: number; // e.g. 10 or 12%
  commissionAmount: number;
  gstOnCommission: number;
  sellerPayout: number;
  fulfillmentStatus: 'NEW' | 'ACCEPTED' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  settlementStatus: 'HOLD' | 'READY' | 'SETTLED';
  shippingAddress: any;
  customerName: string;
  customerPhone: string;
  trackingNumber: string;
  courierPartner: string;
  shippingLabelGenerated: boolean;
  invoiceNumber: string;
  pickupDate?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBSellerWallet {
  sellerId: string;
  balance: number; // available for withdrawal
  pendingSettlement: number; // withheld until delivery + 7 day return window
  lifetimeEarnings: number;
  totalWithdrawn: number;
  currency: string;
}

export interface DBSellerTransaction {
  id: string;
  sellerId: string;
  type: 'CREDIT' | 'DEBIT' | 'COMMISSION' | 'SETTLEMENT';
  amount: number;
  balanceAfter: number;
  referenceId: string;
  description: string;
  createdAt: string;
}

export interface DBSettlement {
  id: string;
  sellerId: string;
  sellerName: string;
  grossAmount: number;
  commissionDeducted: number;
  gstOnCommission: number;
  netPayout: number;
  bankAccount: string;
  bankName: string;
  status: 'PENDING' | 'APPROVED' | 'TRANSFERRED' | 'REJECTED';
  utrNumber?: string;
  requestedAt: string;
  processedAt?: string;
}

export interface DBSellerReturn {
  id: string;
  suborderId: string;
  sellerId: string;
  customerName: string;
  productTitle: string;
  reason: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PICKED_UP' | 'RECEIVED' | 'REFUNDED';
  refundAmount: number;
  rejectionReason?: string;
  createdAt: string;
}

export interface DBCommissionRule {
  id: string;
  categorySlug: string;
  categoryName: string;
  commissionPercent: number;
  minCommissionAmount: number;
  updatedAt: string;
}

export interface DBAuditLog {
  id: string;
  actorType: 'ADMIN' | 'SELLER' | 'SYSTEM';
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}

// ==========================================
// SEEDED STATE STORES
// ==========================================

export const dbSellers = new Map<string, DBSellerProfile>();
export const dbProducts = new Map<string, DBProduct>();
export const dbInventoryMovements: DBInventoryMovement[] = [];
export const dbSellerOrders = new Map<string, DBSellerOrder>();
export const dbSellerWallets = new Map<string, DBSellerWallet>();
export const dbSellerTransactions: DBSellerTransaction[] = [];
export const dbSettlements: DBSettlement[] = [];
export const dbSellerReturns = new Map<string, DBSellerReturn>();
export const dbAuditLogs: DBAuditLog[] = [];
export const dbCategories: DBCategory[] = [
  { id: 'cat-ethnic', name: 'Ethnic Wear', slug: 'ethnic' },
  { id: 'cat-western', name: 'Western Wear', slug: 'western' },
  { id: 'cat-streetwear', name: 'Streetwear & Denim', slug: 'streetwear' },
  { id: 'cat-footwear', name: 'Footwear & Sneakers', slug: 'footwear' },
  { id: 'cat-accessories', name: 'Handbags & Accessories', slug: 'accessories' },
  { id: 'cat-beauty', name: 'Beauty & Fragrances', slug: 'beauty' }
];
export const dbBrands: DBBrand[] = [
  { id: 'br-1', name: 'Anouk Heritage', slug: 'anouk-heritage', verified: true },
  { id: 'br-2', name: 'Metropolis Core', slug: 'metropolis-core', verified: true },
  { id: 'br-3', name: 'AeroStep India', slug: 'aerostep-india', verified: true },
  { id: 'br-4', name: 'Khadi Artisans', slug: 'khadi-artisans', verified: true },
  { id: 'br-5', name: 'Prime Bazaar Essentials', slug: 'prime-bazaar-essentials', verified: true }
];
export const dbCommissionRules = new Map<string, DBCommissionRule>([
  ['ethnic', { id: 'cr-1', categorySlug: 'ethnic', categoryName: 'Ethnic Wear', commissionPercent: 10, minCommissionAmount: 50, updatedAt: '2026-10-01' }],
  ['western', { id: 'cr-2', categorySlug: 'western', categoryName: 'Western Wear', commissionPercent: 12, minCommissionAmount: 60, updatedAt: '2026-10-01' }],
  ['streetwear', { id: 'cr-3', categorySlug: 'streetwear', categoryName: 'Streetwear & Denim', commissionPercent: 12, minCommissionAmount: 60, updatedAt: '2026-10-01' }],
  ['footwear', { id: 'cr-4', categorySlug: 'footwear', categoryName: 'Footwear & Sneakers', commissionPercent: 14, minCommissionAmount: 80, updatedAt: '2026-10-01' }],
  ['accessories', { id: 'cr-5', categorySlug: 'accessories', categoryName: 'Handbags & Accessories', commissionPercent: 12, minCommissionAmount: 50, updatedAt: '2026-10-01' }],
  ['beauty', { id: 'cr-6', categorySlug: 'beauty', categoryName: 'Beauty & Fragrances', commissionPercent: 8, minCommissionAmount: 30, updatedAt: '2026-10-01' }]
]);

// Initialize Seeds
const initSeedData = () => {
  // Seller 1
  const s1: DBSellerProfile = {
    id: 'seller-1',
    userId: 'usr_seller_1',
    sellerName: 'Devendra Tripathi',
    businessName: 'Varanasi Weavers Co.',
    tradeName: 'Varanasi Weavers Co.',
    businessType: 'PROPRIETORSHIP',
    email: 'tripathi.devendra@weaverscraft.in',
    phone: '+91 98391 20492',
    gstNumber: '09AAECV1234M1Z2',
    panNumber: 'AAECV1234M',
    location: 'Varanasi, Uttar Pradesh',
    rating: 4.9,
    totalOrders: 4210,
    totalRevenue: 3450000,
    approvalStatus: 'APPROVED',
    bankAccount: {
      accountHolderName: 'Devendra Tripathi',
      accountNumber: '489201948201',
      ifscCode: 'SBIN0001248',
      bankName: 'State Bank of India',
    },
    pickupAddress: {
      street: 'Plot 14, Industrial Silk Area, Chowk',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      pinCode: '221001',
    },
    kycDocuments: [
      { id: 'doc-1', documentType: 'PAN', documentUrl: '/docs/seller1_pan.pdf', verificationStatus: 'VERIFIED', submittedAt: '2024-01-15' },
      { id: 'doc-2', documentType: 'GSTIN', documentUrl: '/docs/seller1_gst.pdf', verificationStatus: 'VERIFIED', submittedAt: '2024-01-15' }
    ],
    createdAt: '2024-01-10T10:00:00Z',
  };
  dbSellers.set(s1.id, s1);
  dbSellerWallets.set(s1.id, {
    sellerId: s1.id,
    balance: 84200,
    pendingSettlement: 18450,
    lifetimeEarnings: 3036000,
    totalWithdrawn: 2933350,
    currency: 'INR',
  });

  // Seller 2
  const s2: DBSellerProfile = {
    id: 'seller-2',
    userId: 'usr_seller_2',
    sellerName: 'Sameer Merchant',
    businessName: 'Metropolis Apparel Hub',
    tradeName: 'Metropolis Apparel Hub',
    businessType: 'PRIVATE_LIMITED',
    email: 'sameer@metropolisapparel.com',
    phone: '+91 94432 88129',
    gstNumber: '27AABCM5678K1Z5',
    panNumber: 'AABCM5678K',
    location: 'Tirupur, Tamil Nadu',
    rating: 4.6,
    totalOrders: 3140,
    totalRevenue: 2890000,
    approvalStatus: 'APPROVED',
    bankAccount: {
      accountHolderName: 'Metropolis Apparel Pvt Ltd',
      accountNumber: '920194820192',
      ifscCode: 'HDFC0000492',
      bankName: 'HDFC Bank',
    },
    pickupAddress: {
      street: 'Avinashi Road, Export Apparel Zone',
      city: 'Tirupur',
      state: 'Tamil Nadu',
      pinCode: '641602',
    },
    kycDocuments: [
      { id: 'doc-3', documentType: 'GSTIN', documentUrl: '/docs/seller2_gst.pdf', verificationStatus: 'VERIFIED', submittedAt: '2024-03-12' }
    ],
    createdAt: '2024-03-01T10:00:00Z',
  };
  dbSellers.set(s2.id, s2);
  dbSellerWallets.set(s2.id, {
    sellerId: s2.id,
    balance: 42300,
    pendingSettlement: 9800,
    lifetimeEarnings: 2543200,
    totalWithdrawn: 2491100,
    currency: 'INR',
  });

  // Seller 3
  const s3: DBSellerProfile = {
    id: 'seller-3',
    userId: 'usr_seller_3',
    sellerName: 'Pooja Agarwal',
    businessName: 'AeroStep Footwear & Bags',
    tradeName: 'AeroStep Footwear & Bags',
    businessType: 'PARTNERSHIP',
    email: 'pooja@aerostepindia.com',
    phone: '+91 97190 44211',
    gstNumber: '06AACAP9012J1Z8',
    panNumber: 'AACAP9012J',
    location: 'Agra, Uttar Pradesh',
    rating: 4.8,
    totalOrders: 1980,
    totalRevenue: 1620000,
    approvalStatus: 'APPROVED',
    bankAccount: {
      accountHolderName: 'AeroStep Enterprises',
      accountNumber: '110294829104',
      ifscCode: 'ICIC0001048',
      bankName: 'ICICI Bank',
    },
    pickupAddress: {
      street: 'Sanjay Place Commercial Complex',
      city: 'Agra',
      state: 'Uttar Pradesh',
      pinCode: '282002',
    },
    kycDocuments: [
      { id: 'doc-4', documentType: 'PAN', documentUrl: '/docs/seller3_pan.pdf', verificationStatus: 'VERIFIED', submittedAt: '2024-06-05' }
    ],
    createdAt: '2024-06-01T10:00:00Z',
  };
  dbSellers.set(s3.id, s3);
  dbSellerWallets.set(s3.id, {
    sellerId: s3.id,
    balance: 29500,
    pendingSettlement: 6200,
    lifetimeEarnings: 1425600,
    totalWithdrawn: 1389900,
    currency: 'INR',
  });

  // Pre-seed product 1 for Seller 1
  const p1: DBProduct = {
    id: 'prod-1',
    sellerId: 'seller-1',
    sellerName: 'Varanasi Weavers Co.',
    name: 'Zari Embroidered Raw Silk Anarkali Kurti Set',
    categoryId: 'cat-ethnic',
    subCategory: 'Anarkali Sets',
    brandId: 'br-1',
    brandName: 'Anouk Heritage',
    description: 'Masterfully handwoven raw silk Anarkali featuring authentic metallic Zari tilla embroidery with dupatta and churidar.',
    images: ['/src/assets/images/collection_ethnic_wear_1793466539838.jpg'],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-showing-traditional-dress-41139-large.mp4',
    taxGstPercent: 12,
    weightGrams: 650,
    dimensions: { lengthCm: 32, widthCm: 24, heightCm: 4 },
    returnPeriodDays: 7,
    warrantyPolicy: '6-Month Fabric Weave Guarantee',
    status: 'APPROVED',
    variants: [
      { id: 'var-1-s', productId: 'prod-1', sku: 'ANOUK-ANARKALI-INDIGO-S', size: 'S', color: 'Royal Indigo', price: 1899, mrp: 3999, stock: 14 },
      { id: 'var-1-m', productId: 'prod-1', sku: 'ANOUK-ANARKALI-INDIGO-M', size: 'M', color: 'Royal Indigo', price: 1899, mrp: 3999, stock: 22 },
      { id: 'var-1-l', productId: 'prod-1', sku: 'ANOUK-ANARKALI-INDIGO-L', size: 'L', color: 'Royal Indigo', price: 1899, mrp: 3999, stock: 9 },
      { id: 'var-1-xl', productId: 'prod-1', sku: 'ANOUK-ANARKALI-INDIGO-XL', size: 'XL', color: 'Royal Indigo', price: 1899, mrp: 3999, stock: 4 }
    ],
    createdAt: '2024-01-20T12:00:00Z',
  };
  dbProducts.set(p1.id, p1);

  // Pre-seed product 2 for Seller 2
  const p2: DBProduct = {
    id: 'prod-2',
    sellerId: 'seller-2',
    sellerName: 'Metropolis Apparel Hub',
    name: 'Oversized Japanese Denim Trucker Jacket',
    categoryId: 'cat-streetwear',
    subCategory: 'Jackets & Outerwear',
    brandId: 'br-2',
    brandName: 'Metropolis Core',
    description: '14oz heavyweight washed selvedge cotton denim with drop shoulders and matte gunmetal hardware.',
    images: ['/src/assets/images/collection_streetwear_1793466539838.jpg'],
    taxGstPercent: 12,
    weightGrams: 850,
    dimensions: { lengthCm: 38, widthCm: 30, heightCm: 6 },
    returnPeriodDays: 7,
    warrantyPolicy: '1-Year Hardware Guarantee',
    status: 'APPROVED',
    variants: [
      { id: 'var-2-m', productId: 'prod-2', sku: 'METRO-DENIM-BLK-M', size: 'M', color: 'Washed Black', price: 2499, mrp: 4999, stock: 18 },
      { id: 'var-2-l', productId: 'prod-2', sku: 'METRO-DENIM-BLK-L', size: 'L', color: 'Washed Black', price: 2499, mrp: 4999, stock: 12 }
    ],
    createdAt: '2024-03-15T12:00:00Z',
  };
  dbProducts.set(p2.id, p2);

  // Pre-seed Suborder 1 for Seller 1 (Splitting Demonstration)
  const so1: DBSellerOrder = {
    id: 'so-101-a',
    suborderNumber: 'PB-SO-92841-A',
    orderId: 'ord-101',
    sellerId: 'seller-1',
    sellerName: 'Varanasi Weavers Co.',
    items: [
      {
        productId: 'prod-1',
        variantId: 'var-1-m',
        title: 'Zari Embroidered Raw Silk Anarkali Kurti Set',
        sku: 'ANOUK-ANARKALI-INDIGO-M',
        selectedColor: 'Royal Indigo',
        selectedSize: 'M',
        quantity: 1,
        unitPrice: 1899,
        taxRate: 12,
        image: '/src/assets/images/collection_ethnic_wear_1793466539838.jpg',
      }
    ],
    subtotal: 1899,
    commissionRate: 10,
    commissionAmount: 190,
    gstOnCommission: 34,
    sellerPayout: 1675,
    fulfillmentStatus: 'DISPATCHED',
    settlementStatus: 'HOLD',
    shippingAddress: {
      fullName: 'Amayra Mansuri',
      phone: '+91 98765 43210',
      street: 'Flat 402, Lotus Grand Residency, Linking Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400050',
    },
    customerName: 'Amayra Mansuri',
    customerPhone: '+91 98765 43210',
    trackingNumber: 'BD-84729104',
    courierPartner: 'BlueDart Express',
    shippingLabelGenerated: true,
    invoiceNumber: 'PB-INV-2026-92841-A',
    pickupDate: '29 Oct 2026',
    createdAt: '2026-10-28T09:15:00Z',
    updatedAt: '2026-10-29T03:00:00Z',
  };
  dbSellerOrders.set(so1.id, so1);

  // Pre-seed Audit Log
  dbAuditLogs.push({
    id: 'audit-1',
    actorType: 'ADMIN',
    actorId: 'admin-1',
    actorName: 'Super Admin Desk',
    action: 'SELLER_VERIFICATION_APPROVED',
    entityType: 'SELLER',
    entityId: 'seller-1',
    details: 'Verified GSTIN 09AAECV1234M1Z2 and bank account SBIN0001248.',
    timestamp: '2024-01-15T14:30:00Z',
  });
};

initSeedData();

// ==========================================
// SUBORDER SPLITTING LOGIC (CORE ENGINE)
// ==========================================

export function splitOrderIntoSellerOrders(orderPayload: {
  orderId: string;
  orderNumber: string;
  items: any[];
  shippingAddress: any;
  customerName?: string;
  customerPhone?: string;
}) {
  const { orderId, orderNumber, items, shippingAddress, customerName, customerPhone } = orderPayload;
  
  // Group items by sellerId
  const groupedBySeller: Record<string, any[]> = {};
  for (const item of items) {
    const sId = item.product?.sellerId || item.sellerId || 'seller-1';
    if (!groupedBySeller[sId]) {
      groupedBySeller[sId] = [];
    }
    groupedBySeller[sId].push(item);
  }

  const createdSuborders: DBSellerOrder[] = [];
  let suffixIndex = 0;
  const suffixLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

  for (const [sellerId, sellerItems] of Object.entries(groupedBySeller)) {
    const seller = dbSellers.get(sellerId) || {
      id: sellerId,
      businessName: sellerItems[0]?.product?.sellerName || 'Prime Marketplace Vendor',
    };

    let subtotal = 0;
    const formattedItems = sellerItems.map((si: any) => {
      const price = Number(si.priceAtPurchase || si.product?.price || si.price || 0);
      const qty = Number(si.quantity || 1);
      subtotal += price * qty;
      return {
        productId: si.product?.id || si.productId || 'prod-custom',
        variantId: si.variantId,
        title: si.product?.title || si.product?.name || si.title || 'Product Item',
        sku: si.product?.sku || `SKU-${sellerId.slice(-3)}-${Math.floor(1000 + Math.random() * 9000)}`,
        selectedColor: si.selectedColor || 'Default',
        selectedSize: si.selectedSize || 'Standard',
        quantity: qty,
        unitPrice: price,
        taxRate: si.product?.gstRate || 12,
        image: si.product?.images?.[0] || si.image || '',
      };
    });

    // Commission lookup (10% default for ethnic, 12% standard, or seller rate)
    const commissionPercent = 12;
    const commissionAmount = Math.round((subtotal * commissionPercent) / 100);
    const gstOnCommission = Math.round(commissionAmount * 0.18);
    const sellerPayout = Math.max(0, subtotal - commissionAmount - gstOnCommission);

    const subSuffix = suffixLetters[suffixIndex % suffixLetters.length];
    suffixIndex++;

    const suborderId = `so-${orderId.replace(/^ord-?/, '')}-${subSuffix.toLowerCase()}`;
    const suborderNumber = `${orderNumber}-${subSuffix}`;
    const trackingNumber = `BD-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const invoiceNumber = `PB-INV-2026-${orderNumber.replace(/[^\d]/g, '')}-${subSuffix}`;

    const newSuborder: DBSellerOrder = {
      id: suborderId,
      suborderNumber,
      orderId,
      sellerId,
      sellerName: seller.businessName,
      items: formattedItems,
      subtotal,
      commissionRate: commissionPercent,
      commissionAmount,
      gstOnCommission,
      sellerPayout,
      fulfillmentStatus: 'NEW',
      settlementStatus: 'HOLD',
      shippingAddress,
      customerName: customerName || shippingAddress?.fullName || 'Verified Shopper',
      customerPhone: customerPhone || shippingAddress?.phone || '+91 98765 43210',
      trackingNumber,
      courierPartner: 'BlueDart Express',
      shippingLabelGenerated: false,
      invoiceNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbSellerOrders.set(suborderId, newSuborder);
    createdSuborders.push(newSuborder);

    // Update wallet pending settlement
    const wallet = dbSellerWallets.get(sellerId);
    if (wallet) {
      wallet.pendingSettlement += sellerPayout;
    }

    // Log inventory movements
    for (const fi of formattedItems) {
      dbInventoryMovements.push({
        id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        variantId: fi.variantId || 'var-default',
        sku: fi.sku || 'SKU-UNKNOWN',
        sellerId,
        movementType: 'SALE',
        quantity: -fi.quantity,
        referenceId: suborderNumber,
        notes: `Reserved for multi-seller suborder ${suborderNumber}`,
        createdAt: new Date().toISOString(),
      });
    }

    // System audit log
    dbAuditLogs.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      actorType: 'SYSTEM',
      actorId: 'sys-order-splitter',
      actorName: 'Multi-Seller Order Dispatcher',
      action: 'SUBORDER_CREATED',
      entityType: 'SELLER_ORDER',
      entityId: suborderId,
      details: `Split suborder ${suborderNumber} for seller ${seller.businessName}. Subtotal: ₹${subtotal}, Net Payout: ₹${sellerPayout} (held in escrow).`,
      timestamp: new Date().toISOString(),
    });
  }

  return createdSuborders;
}

// ==========================================
// 1. SELLER AUTHENTICATION & KYC (/api/v1/auth)
// ==========================================

v1Router.post('/auth/seller/register', (req, res) => {
  const { 
    sellerName, 
    businessName, 
    tradeName, 
    email, 
    phone, 
    businessType = 'PROPRIETORSHIP', 
    gstNumber = 'Unregistered', 
    panNumber = '', 
    bankAccount, 
    pickupAddress 
  } = req.body;

  if (!businessName || !phone) {
    return res.status(400).json({ error: 'Business name and mobile number are required.' });
  }

  const sellerId = `seller-${Date.now().toString(36)}`;
  const userId = `usr_${sellerId}`;

  const newSeller: DBSellerProfile = {
    id: sellerId,
    userId,
    sellerName: sellerName || businessName,
    businessName,
    tradeName: tradeName || businessName,
    businessType,
    email: email || `${businessName.toLowerCase().replace(/\s+/g, '')}@sellers.primebazaar.in`,
    phone,
    gstNumber,
    panNumber,
    location: pickupAddress?.city ? `${pickupAddress.city}, ${pickupAddress.state}` : 'India',
    rating: 5.0,
    totalOrders: 0,
    totalRevenue: 0,
    approvalStatus: 'PENDING_APPROVAL',
    bankAccount: bankAccount || {
      accountHolderName: sellerName || businessName,
      accountNumber: 'Pending Verification',
      ifscCode: 'XXXX0000000',
      bankName: 'Pending Bank',
    },
    pickupAddress: pickupAddress || {
      street: 'Pending Address',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400001',
    },
    kycDocuments: [],
    createdAt: new Date().toISOString(),
  };

  dbSellers.set(sellerId, newSeller);

  // Initialize wallet
  dbSellerWallets.set(sellerId, {
    sellerId,
    balance: 0,
    pendingSettlement: 0,
    lifetimeEarnings: 0,
    totalWithdrawn: 0,
    currency: 'INR',
  });

  const token = `pb_seller_token_${crypto.randomBytes(16).toString('hex')}`;

  dbAuditLogs.push({
    id: `audit-${Date.now()}`,
    actorType: 'SELLER',
    actorId: sellerId,
    actorName: businessName,
    action: 'SELLER_REGISTRATION_SUBMITTED',
    entityType: 'SELLER',
    entityId: sellerId,
    details: `Seller registered with GST: ${gstNumber}, PAN: ${panNumber}. Awaiting admin approval.`,
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({
    success: true,
    message: 'Seller registration submitted successfully. Please upload KYC documents for review.',
    token,
    seller: newSeller,
  });
});

v1Router.post('/auth/seller/login', (req, res) => {
  const { emailOrPhone } = req.body;
  const input = (emailOrPhone || '').trim().toLowerCase();

  let matchedSeller: DBSellerProfile | undefined;
  for (const s of dbSellers.values()) {
    if (s.email.toLowerCase() === input || s.phone.includes(input) || s.businessName.toLowerCase().includes(input)) {
      matchedSeller = s;
      break;
    }
  }

  // Fallback to seller-1 if testing with arbitrary credentials
  if (!matchedSeller) {
    matchedSeller = dbSellers.get('seller-1')!;
  }

  const token = `pb_seller_token_${crypto.randomBytes(16).toString('hex')}`;

  res.json({
    success: true,
    token,
    seller: matchedSeller,
  });
});

v1Router.post('/auth/verify-otp', (req, res) => {
  const { otp = '7784' } = req.body;
  const token = `pb_token_${crypto.randomBytes(16).toString('hex')}`;
  res.json({
    success: true,
    token,
    message: 'OTP verified successfully',
  });
});

v1Router.post('/auth/refresh', (req, res) => {
  const newToken = `pb_token_${crypto.randomBytes(16).toString('hex')}`;
  res.json({
    success: true,
    token: newToken,
    expiresIn: 86400,
  });
});

v1Router.post('/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Seller session invalidated successfully.' });
});

// Profile & Verification
v1Router.get('/seller/profile', (req, res) => {
  const sellerId = (req.query.sellerId as string) || 'seller-1';
  const seller = dbSellers.get(sellerId);
  if (!seller) {
    return res.status(404).json({ error: 'Seller not found' });
  }
  const wallet = dbSellerWallets.get(sellerId);
  res.json({ success: true, profile: seller, wallet });
});

v1Router.put('/seller/profile', (req, res) => {
  const sellerId = (req.body.sellerId as string) || 'seller-1';
  const seller = dbSellers.get(sellerId);
  if (!seller) {
    return res.status(404).json({ error: 'Seller not found' });
  }

  if (req.body.businessName) seller.businessName = req.body.businessName;
  if (req.body.pickupAddress) seller.pickupAddress = req.body.pickupAddress;
  if (req.body.bankAccount) seller.bankAccount = req.body.bankAccount;

  res.json({ success: true, message: 'Seller profile updated successfully', profile: seller });
});

v1Router.post('/seller/documents', (req, res) => {
  const { sellerId = 'seller-1', documentType, documentUrl } = req.body;
  const seller = dbSellers.get(sellerId);
  if (!seller) {
    return res.status(404).json({ error: 'Seller not found' });
  }

  const docId = `doc-${Date.now()}`;
  const newDoc = {
    id: docId,
    documentType: documentType || 'PAN',
    documentUrl: documentUrl || '/uploads/kyc_document.pdf',
    verificationStatus: 'PENDING' as const,
    submittedAt: new Date().toISOString(),
  };

  seller.kycDocuments.push(newDoc);

  dbAuditLogs.push({
    id: `audit-${Date.now()}`,
    actorType: 'SELLER',
    actorId: sellerId,
    actorName: seller.businessName,
    action: 'KYC_DOCUMENT_UPLOADED',
    entityType: 'DOCUMENT',
    entityId: docId,
    details: `Uploaded ${documentType} for compliance verification.`,
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({ success: true, message: 'Document uploaded for verification', document: newDoc });
});

v1Router.get('/seller/verification', (req, res) => {
  const sellerId = (req.query.sellerId as string) || 'seller-1';
  const seller = dbSellers.get(sellerId);
  if (!seller) {
    return res.status(404).json({ error: 'Seller not found' });
  }
  res.json({
    success: true,
    approvalStatus: seller.approvalStatus,
    documents: seller.kycDocuments,
  });
});

// ==========================================
// 2. SELLER PRODUCTS & CATALOG (/api/v1/seller/products)
// ==========================================

v1Router.get('/seller/products', (req, res) => {
  const sellerId = req.query.sellerId as string;
  let list = Array.from(dbProducts.values());

  if (sellerId) {
    list = list.filter(p => p.sellerId === sellerId);
  }

  res.json({
    success: true,
    count: list.length,
    products: list,
  });
});

v1Router.get('/seller/products/:id', (req, res) => {
  const prod = dbProducts.get(req.params.id);
  if (!prod) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json({ success: true, product: prod });
});

v1Router.post('/seller/products', (req, res) => {
  const {
    name,
    categoryId = 'cat-ethnic',
    subCategory,
    brandId = 'br-1',
    brandName,
    description,
    images = [],
    videoUrl,
    taxGstPercent = 12,
    weightGrams = 500,
    dimensions,
    returnPeriodDays = 7,
    warrantyPolicy,
    variants = [],
    sellerId = 'seller-1',
    sellingPrice = 999,
    mrp = 1999,
    stock = 20,
    sku,
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Product name is required.' });
  }

  const seller = dbSellers.get(sellerId);
  const prodId = `prod-${Date.now().toString(36)}`;

  // Build variants if none supplied
  const resolvedVariants: DBProductVariant[] = variants.length > 0 
    ? variants.map((v: any, idx: number) => ({
        id: `var-${prodId}-${idx}`,
        productId: prodId,
        sku: v.sku || `${name.slice(0, 3).toUpperCase()}-${v.size || 'STD'}-${idx}`,
        size: v.size || 'M',
        color: v.color || 'Standard',
        price: Number(v.price) || sellingPrice,
        mrp: Number(v.mrp) || mrp,
        stock: Number(v.stock) || stock,
      }))
    : [
        {
          id: `var-${prodId}-std`,
          productId: prodId,
          sku: sku || `${name.slice(0, 3).toUpperCase()}-STD-${Math.floor(1000 + Math.random() * 9000)}`,
          size: 'M',
          color: 'Standard',
          price: Number(sellingPrice),
          mrp: Number(mrp),
          stock: Number(stock),
        }
      ];

  const newProduct: DBProduct = {
    id: prodId,
    sellerId,
    sellerName: seller?.businessName || 'Varanasi Weavers Co.',
    name,
    categoryId,
    subCategory,
    brandId,
    brandName: brandName || 'Prime Heritage',
    description: description || 'Premium marketplace product handcrafted with high-grade materials.',
    images: images.length > 0 ? images : ['/src/assets/images/collection_ethnic_wear_1793466539838.jpg'],
    videoUrl,
    taxGstPercent: Number(taxGstPercent),
    weightGrams: Number(weightGrams),
    dimensions: dimensions || { lengthCm: 30, widthCm: 20, heightCm: 5 },
    returnPeriodDays: Number(returnPeriodDays),
    warrantyPolicy,
    status: 'APPROVED', // Autonomous publishing with post-moderation
    variants: resolvedVariants,
    createdAt: new Date().toISOString(),
  };

  dbProducts.set(prodId, newProduct);

  // Inward inventory movements
  for (const v of resolvedVariants) {
    dbInventoryMovements.push({
      id: `mov-${Date.now()}-${v.id}`,
      variantId: v.id,
      sku: v.sku,
      sellerId,
      movementType: 'INWARD',
      quantity: v.stock,
      referenceId: 'INITIAL_STOCK',
      notes: `Initial stock added for ${newProduct.name}`,
      createdAt: new Date().toISOString(),
    });
  }

  res.status(201).json({
    success: true,
    message: 'Product published successfully to marketplace catalog!',
    product: newProduct,
  });
});

v1Router.put('/seller/products/:id', (req, res) => {
  const prod = dbProducts.get(req.params.id);
  if (!prod) {
    return res.status(404).json({ error: 'Product not found' });
  }

  Object.assign(prod, req.body);
  res.json({ success: true, message: 'Product updated successfully', product: prod });
});

v1Router.delete('/seller/products/:id', (req, res) => {
  const prod = dbProducts.get(req.params.id);
  if (!prod) {
    return res.status(404).json({ error: 'Product not found' });
  }

  prod.status = 'ARCHIVED';
  res.json({ success: true, message: 'Product archived successfully' });
});

v1Router.post('/seller/products/:id/images', (req, res) => {
  const prod = dbProducts.get(req.params.id);
  if (!prod) {
    return res.status(404).json({ error: 'Product not found' });
  }
  if (req.body.imageUrl) {
    prod.images.push(req.body.imageUrl);
  }
  res.json({ success: true, images: prod.images });
});

v1Router.post('/seller/products/bulk-upload', (req, res) => {
  const { products, sellerId = 'seller-1' } = req.body;
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of product rows.' });
  }

  let imported = 0;
  for (const item of products) {
    const prodId = `prod-bulk-${Date.now().toString(36)}-${imported}`;
    const p: DBProduct = {
      id: prodId,
      sellerId,
      sellerName: 'Varanasi Weavers Co.',
      name: item.title || item.name || 'Catalog Item',
      categoryId: item.category || 'cat-ethnic',
      brandId: 'br-1',
      brandName: item.brand || 'Prime Brand',
      description: item.description || 'Uploaded via bulk spreadsheet',
      images: [item.image || '/src/assets/images/collection_ethnic_wear_1793466539838.jpg'],
      taxGstPercent: 12,
      weightGrams: 500,
      returnPeriodDays: 7,
      status: 'APPROVED',
      variants: [
        {
          id: `var-${prodId}-1`,
          productId: prodId,
          sku: item.sku || `SKU-BULK-${imported}`,
          size: item.size || 'Free Size',
          color: item.color || 'Standard',
          price: Number(item.price) || 999,
          mrp: Number(item.mrp || item.originalPrice) || 1999,
          stock: Number(item.stock || item.inStock) || 25,
        }
      ],
      createdAt: new Date().toISOString(),
    };
    dbProducts.set(prodId, p);
    imported++;
  }

  res.status(201).json({
    success: true,
    message: `Batch validation and catalog ingestion complete. Imported ${imported} products.`,
    importedCount: imported,
  });
});

v1Router.get('/seller/categories', (req, res) => {
  res.json({ success: true, categories: dbCategories });
});

v1Router.get('/seller/brands', (req, res) => {
  res.json({ success: true, brands: dbBrands });
});

// ==========================================
// 3. SELLER INVENTORY MANAGEMENT (/api/v1/seller/inventory)
// ==========================================

v1Router.get('/seller/inventory', (req, res) => {
  const sellerId = (req.query.sellerId as string) || 'seller-1';
  const inventoryItems: any[] = [];

  for (const p of dbProducts.values()) {
    if (p.sellerId === sellerId) {
      for (const v of p.variants) {
        inventoryItems.push({
          variantId: v.id,
          productId: p.id,
          productTitle: p.name,
          sku: v.sku,
          size: v.size,
          color: v.color,
          price: v.price,
          stock: v.stock,
          reservedQty: 0,
          isLowStock: v.stock <= 5,
        });
      }
    }
  }

  res.json({ success: true, inventory: inventoryItems });
});

v1Router.put('/seller/inventory/:variantId', (req, res) => {
  const { variantId } = req.params;
  const { stock, quantityDelta, notes = 'Stock adjustment' } = req.body;

  let foundVariant: DBProductVariant | null = null;
  let targetProduct: DBProduct | null = null;

  for (const p of dbProducts.values()) {
    const v = p.variants.find(x => x.id === variantId);
    if (v) {
      foundVariant = v;
      targetProduct = p;
      break;
    }
  }

  if (!foundVariant || !targetProduct) {
    return res.status(404).json({ error: 'Variant not found in inventory.' });
  }

  const oldStock = foundVariant.stock;
  const newStock = typeof stock === 'number' ? stock : oldStock + (Number(quantityDelta) || 0);
  foundVariant.stock = Math.max(0, newStock);

  dbInventoryMovements.push({
    id: `mov-${Date.now()}`,
    variantId,
    sku: foundVariant.sku,
    sellerId: targetProduct.sellerId,
    movementType: 'ADJUSTMENT',
    quantity: foundVariant.stock - oldStock,
    referenceId: 'MANUAL_UPDATE',
    notes,
    createdAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: `Stock updated for SKU ${foundVariant.sku} from ${oldStock} to ${foundVariant.stock}`,
    variant: foundVariant,
  });
});

v1Router.get('/seller/inventory/low-stock', (req, res) => {
  const sellerId = (req.query.sellerId as string) || 'seller-1';
  const lowStock: any[] = [];

  for (const p of dbProducts.values()) {
    if (p.sellerId === sellerId) {
      for (const v of p.variants) {
        if (v.stock <= 5) {
          lowStock.push({
            variantId: v.id,
            productId: p.id,
            productTitle: p.name,
            sku: v.sku,
            size: v.size,
            color: v.color,
            stock: v.stock,
            threshold: 5,
          });
        }
      }
    }
  }

  res.json({ success: true, lowStock });
});

v1Router.get('/seller/inventory/movements', (req, res) => {
  const sellerId = req.query.sellerId as string;
  let list = dbInventoryMovements;
  if (sellerId) {
    list = list.filter(m => m.sellerId === sellerId);
  }
  res.json({ success: true, count: list.length, movements: list.slice(-50).reverse() });
});

// ==========================================
// 4. SELLER ORDERS & SUBORDER FULFILLMENT (/api/v1/seller/orders)
// ==========================================

v1Router.get('/seller/orders', (req, res) => {
  const sellerId = (req.query.sellerId as string) || 'seller-1';
  const status = req.query.status as string;

  let orders = Array.from(dbSellerOrders.values()).filter(so => so.sellerId === sellerId);
  if (status) {
    orders = orders.filter(so => so.fulfillmentStatus.toLowerCase() === status.toLowerCase());
  }

  res.json({
    success: true,
    count: orders.length,
    orders: orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  });
});

v1Router.get('/seller/orders/:id', (req, res) => {
  const suborder = dbSellerOrders.get(req.params.id);
  if (!suborder) {
    return res.status(404).json({ error: 'Suborder not found' });
  }
  res.json({ success: true, order: suborder });
});

v1Router.post('/seller/orders/:id/accept', (req, res) => {
  const so = dbSellerOrders.get(req.params.id);
  if (!so) return res.status(404).json({ error: 'Suborder not found' });

  so.fulfillmentStatus = 'ACCEPTED';
  so.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: `Suborder ${so.suborderNumber} accepted. Ready for packing.`,
    order: so,
  });
});

v1Router.post('/seller/orders/:id/reject', (req, res) => {
  const so = dbSellerOrders.get(req.params.id);
  if (!so) return res.status(404).json({ error: 'Suborder not found' });

  so.fulfillmentStatus = 'CANCELLED';
  so.cancellationReason = req.body.reason || 'Rejected by merchant due to stock discrepancy';
  so.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: `Suborder ${so.suborderNumber} rejected. Inventory released back.`,
    order: so,
  });
});

v1Router.post('/seller/orders/:id/pack', (req, res) => {
  const so = dbSellerOrders.get(req.params.id);
  if (!so) return res.status(404).json({ error: 'Suborder not found' });

  so.fulfillmentStatus = 'PACKED';
  so.shippingLabelGenerated = true;
  so.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: `Suborder ${so.suborderNumber} packed. Thermal shipping label generated.`,
    order: so,
    shippingLabel: {
      suborderNumber: so.suborderNumber,
      awb: so.trackingNumber,
      courier: so.courierPartner,
      destinationHub: so.shippingAddress?.city,
    }
  });
});

v1Router.post('/seller/orders/:id/dispatch', (req, res) => {
  const so = dbSellerOrders.get(req.params.id);
  if (!so) return res.status(404).json({ error: 'Suborder not found' });

  so.fulfillmentStatus = 'DISPATCHED';
  so.pickupDate = new Date().toLocaleDateString('en-IN');
  so.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: `Suborder ${so.suborderNumber} handed over to ${so.courierPartner}. Airway Bill active.`,
    order: so,
    trackingNumber: so.trackingNumber,
  });
});

v1Router.post('/seller/orders/:id/cancel', (req, res) => {
  const so = dbSellerOrders.get(req.params.id);
  if (!so) return res.status(404).json({ error: 'Suborder not found' });

  so.fulfillmentStatus = 'CANCELLED';
  so.cancellationReason = req.body.reason || 'Merchant cancelled order';
  so.updatedAt = new Date().toISOString();

  res.json({ success: true, message: `Suborder ${so.suborderNumber} cancelled.`, order: so });
});

v1Router.get('/seller/orders/:id/invoice', (req, res) => {
  const so = dbSellerOrders.get(req.params.id);
  if (!so) return res.status(404).json({ error: 'Suborder not found' });

  const taxableValue = Math.round(so.subtotal / 1.12);
  const totalTax = so.subtotal - taxableValue;
  const cgst = Math.round(totalTax / 2);
  const sgst = totalTax - cgst;

  res.json({
    success: true,
    invoice: {
      invoiceNumber: so.invoiceNumber,
      date: so.createdAt,
      suborderNumber: so.suborderNumber,
      sellerName: so.sellerName,
      customerName: so.customerName,
      shippingAddress: so.shippingAddress,
      items: so.items,
      taxableValue,
      cgst,
      sgst,
      totalAmount: so.subtotal,
      currency: 'INR',
    }
  });
});

// ==========================================
// 5. SELLER SHIPPING & RETURNS
// ==========================================

v1Router.post('/seller/shipments', (req, res) => {
  const { suborderId, courierPartner = 'BlueDart Express' } = req.body;
  const so = dbSellerOrders.get(suborderId);
  if (!so) return res.status(404).json({ error: 'Suborder not found' });

  so.courierPartner = courierPartner;
  so.shippingLabelGenerated = true;

  res.status(201).json({
    success: true,
    awb: so.trackingNumber,
    courier: so.courierPartner,
    pickupSlot: 'Tomorrow between 10:00 AM - 01:00 PM',
    message: 'Manifest created and pickup booked with carrier.',
  });
});

v1Router.get('/seller/shipments', (req, res) => {
  const sellerId = (req.query.sellerId as string) || 'seller-1';
  const shipments = Array.from(dbSellerOrders.values())
    .filter(so => so.sellerId === sellerId && so.shippingLabelGenerated)
    .map(so => ({
      suborderNumber: so.suborderNumber,
      awb: so.trackingNumber,
      courier: so.courierPartner,
      customer: so.customerName,
      destination: `${so.shippingAddress?.city}, ${so.shippingAddress?.state}`,
      status: so.fulfillmentStatus,
      pickupDate: so.pickupDate || 'Scheduled',
    }));

  res.json({ success: true, shipments });
});

v1Router.get('/seller/shipments/:id/track', (req, res) => {
  res.json({
    success: true,
    awb: req.params.id,
    courier: 'BlueDart Express Air',
    checkpoints: [
      { step: 'Pickup Manifest Created', time: 'Yesterday 04:00 PM', location: 'Merchant Hub', done: true },
      { step: 'Picked Up by Courier', time: 'Today 10:30 AM', location: 'Regional Hub', done: true },
      { step: 'In Transit', time: 'Today 02:45 PM', location: 'Airport Sort Facility', done: true },
      { step: 'Out for Delivery', time: 'Estimated Tomorrow', location: 'Destination Hub', done: false },
    ]
  });
});

v1Router.get('/seller/returns', (req, res) => {
  const sellerId = (req.query.sellerId as string) || 'seller-1';
  const returns = Array.from(dbSellerReturns.values()).filter(r => r.sellerId === sellerId);
  res.json({ success: true, returns });
});

v1Router.post('/seller/returns/:id/approve', (req, res) => {
  const ret = dbSellerReturns.get(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return request not found' });

  ret.status = 'APPROVED';
  res.json({ success: true, message: 'Return authorized. Courier reverse pickup scheduled.', return: ret });
});

v1Router.post('/seller/returns/:id/reject', (req, res) => {
  const ret = dbSellerReturns.get(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return request not found' });

  ret.status = 'REJECTED';
  ret.rejectionReason = req.body.reason || 'Does not qualify under return policy terms';
  res.json({ success: true, message: 'Return request rejected.', return: ret });
});

// ==========================================
// 6. SELLER WALLET, SETTLEMENTS & REPORTS
// ==========================================

v1Router.get('/seller/wallet', (req, res) => {
  const sellerId = (req.query.sellerId as string) || 'seller-1';
  let wallet = dbSellerWallets.get(sellerId);
  if (!wallet) {
    wallet = {
      sellerId,
      balance: 84200,
      pendingSettlement: 18450,
      lifetimeEarnings: 3036000,
      totalWithdrawn: 2933350,
      currency: 'INR',
    };
    dbSellerWallets.set(sellerId, wallet);
  }
  res.json({ success: true, wallet });
});

v1Router.get('/seller/transactions', (req, res) => {
  const sellerId = (req.query.sellerId as string) || 'seller-1';
  const txs = dbSellerTransactions.filter(t => t.sellerId === sellerId);
  res.json({ success: true, count: txs.length, transactions: txs });
});

v1Router.get('/seller/settlements', (req, res) => {
  const sellerId = (req.query.sellerId as string) || 'seller-1';
  const sets = dbSettlements.filter(s => s.sellerId === sellerId);
  res.json({ success: true, settlements: sets });
});

v1Router.get('/seller/reports/sales', (req, res) => {
  const sellerId = (req.query.sellerId as string) || 'seller-1';
  const seller = dbSellers.get(sellerId);
  res.json({
    success: true,
    summary: {
      totalRevenue: seller?.totalRevenue || 3450000,
      totalOrders: seller?.totalOrders || 4210,
      averageOrderValue: 820,
      returnRate: '3.8%',
      fulfillmentRate: '99.4%',
    },
    monthlyTrend: [
      { month: 'Jun', sales: 480000, orders: 580 },
      { month: 'Jul', sales: 520000, orders: 630 },
      { month: 'Aug', sales: 610000, orders: 740 },
      { month: 'Sep', sales: 590000, orders: 710 },
      { month: 'Oct', sales: 680000, orders: 820 },
      { month: 'Nov', sales: 570000, orders: 730 },
    ]
  });
});

v1Router.get('/seller/reports/earnings', (req, res) => {
  const sellerId = (req.query.sellerId as string) || 'seller-1';
  const wallet = dbSellerWallets.get(sellerId);
  res.json({
    success: true,
    earnings: {
      availableForWithdrawal: wallet?.balance || 84200,
      pendingEscrow: wallet?.pendingSettlement || 18450,
      totalPlatformCommissionPaid: 414000,
      gstPaidOnCommission: 74520,
      netDisbursed: wallet?.totalWithdrawn || 2933350,
    }
  });
});

// ==========================================
// 7. SUPER ADMIN CONTROL APIS (/api/v1/admin)
// ==========================================

v1Router.get('/admin/sellers', (req, res) => {
  res.json({
    success: true,
    totalSellers: dbSellers.size,
    sellers: Array.from(dbSellers.values()),
  });
});

v1Router.get('/admin/sellers/:id', (req, res) => {
  const seller = dbSellers.get(req.params.id);
  if (!seller) return res.status(404).json({ error: 'Seller not found' });
  const wallet = dbSellerWallets.get(seller.id);
  res.json({ success: true, seller, wallet });
});

v1Router.post('/admin/sellers/:id/approve', (req, res) => {
  const seller = dbSellers.get(req.params.id);
  if (!seller) return res.status(404).json({ error: 'Seller not found' });

  seller.approvalStatus = 'APPROVED';
  for (const doc of seller.kycDocuments) {
    doc.verificationStatus = 'VERIFIED';
  }

  dbAuditLogs.push({
    id: `audit-${Date.now()}`,
    actorType: 'ADMIN',
    actorId: 'admin-super',
    actorName: 'Super Admin',
    action: 'SELLER_APPROVED',
    entityType: 'SELLER',
    entityId: seller.id,
    details: `Approved seller ${seller.businessName} and verified all compliance dossiers.`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, message: `Seller ${seller.businessName} approved and authorized for catalog publishing.`, seller });
});

v1Router.post('/admin/sellers/:id/reject', (req, res) => {
  const seller = dbSellers.get(req.params.id);
  if (!seller) return res.status(404).json({ error: 'Seller not found' });

  seller.approvalStatus = 'REJECTED';
  seller.rejectionReason = req.body.reason || 'KYC documentation failed verification criteria';

  dbAuditLogs.push({
    id: `audit-${Date.now()}`,
    actorType: 'ADMIN',
    actorId: 'admin-super',
    actorName: 'Super Admin',
    action: 'SELLER_REJECTED',
    entityType: 'SELLER',
    entityId: seller.id,
    details: `Rejected seller ${seller.businessName}: ${seller.rejectionReason}`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, message: `Seller ${seller.businessName} registration rejected.`, seller });
});

v1Router.post('/admin/sellers/:id/suspend', (req, res) => {
  const seller = dbSellers.get(req.params.id);
  if (!seller) return res.status(404).json({ error: 'Seller not found' });

  seller.approvalStatus = 'SUSPENDED';

  dbAuditLogs.push({
    id: `audit-${Date.now()}`,
    actorType: 'ADMIN',
    actorId: 'admin-super',
    actorName: 'Super Admin',
    action: 'SELLER_SUSPENDED',
    entityType: 'SELLER',
    entityId: seller.id,
    details: `Suspended seller ${seller.businessName}. Orders paused.`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, message: `Seller ${seller.businessName} suspended.`, seller });
});

v1Router.post('/admin/sellers/:id/activate', (req, res) => {
  const seller = dbSellers.get(req.params.id);
  if (!seller) return res.status(404).json({ error: 'Seller not found' });

  seller.approvalStatus = 'APPROVED';

  dbAuditLogs.push({
    id: `audit-${Date.now()}`,
    actorType: 'ADMIN',
    actorId: 'admin-super',
    actorName: 'Super Admin',
    action: 'SELLER_ACTIVATED',
    entityType: 'SELLER',
    entityId: seller.id,
    details: `Re-activated seller ${seller.businessName}.`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, message: `Seller ${seller.businessName} activated.`, seller });
});

v1Router.get('/admin/products/pending', (req, res) => {
  const pending = Array.from(dbProducts.values()).filter(p => p.status === 'PENDING_APPROVAL');
  res.json({ success: true, pendingProducts: pending });
});

v1Router.post('/admin/products/:id/approve', (req, res) => {
  const prod = dbProducts.get(req.params.id);
  if (!prod) return res.status(404).json({ error: 'Product not found' });

  prod.status = 'APPROVED';
  res.json({ success: true, message: `Product ${prod.name} approved for marketplace browse.`, product: prod });
});

v1Router.post('/admin/products/:id/reject', (req, res) => {
  const prod = dbProducts.get(req.params.id);
  if (!prod) return res.status(404).json({ error: 'Product not found' });

  prod.status = 'REJECTED';
  prod.rejectionReason = req.body.reason || 'Catalog policy violation';
  res.json({ success: true, message: `Product ${prod.name} rejected.`, product: prod });
});

v1Router.get('/admin/orders', (req, res) => {
  const allSuborders = Array.from(dbSellerOrders.values());
  res.json({ success: true, count: allSuborders.length, suborders: allSuborders });
});

v1Router.get('/admin/commissions', (req, res) => {
  res.json({ success: true, commissionRules: Array.from(dbCommissionRules.values()) });
});

v1Router.put('/admin/commissions/:id', (req, res) => {
  const rule = Array.from(dbCommissionRules.values()).find(r => r.id === req.params.id || r.categorySlug === req.params.id);
  if (!rule) return res.status(404).json({ error: 'Commission rule not found' });

  if (typeof req.body.commissionPercent === 'number') {
    rule.commissionPercent = req.body.commissionPercent;
  }
  rule.updatedAt = new Date().toISOString();

  res.json({ success: true, message: 'Commission rule updated', rule });
});

v1Router.get('/admin/settlements', (req, res) => {
  res.json({ success: true, count: dbSettlements.length, settlements: dbSettlements });
});

v1Router.post('/admin/settlements/:id/approve', (req, res) => {
  const set = dbSettlements.find(s => s.id === req.params.id);
  if (!set) return res.status(404).json({ error: 'Settlement record not found' });

  set.status = 'APPROVED';
  set.utrNumber = `CMS_IMPS_${Date.now()}`;
  set.processedAt = new Date().toISOString();

  res.json({
    success: true,
    message: `Settlement ₹${set.netPayout.toLocaleString('en-IN')} approved and queued for bank payout.`,
    settlement: set,
  });
});

v1Router.get('/admin/reports/overview', (req, res) => {
  let gmv = 0;
  let commission = 0;
  for (const so of dbSellerOrders.values()) {
    gmv += so.subtotal;
    commission += so.commissionAmount;
  }

  res.json({
    grossMerchandiseValue: gmv + 4825000,
    totalSuborders: dbSellerOrders.size + 1420,
    activeSellers: Array.from(dbSellers.values()).filter(s => s.approvalStatus === 'APPROVED').length,
    pendingKYCSellers: Array.from(dbSellers.values()).filter(s => s.approvalStatus === 'PENDING_APPROVAL').length,
    commissionRevenue: commission + 579000,
    platformTakeRate: '12%',
    disbursedToVendors: 4246000,
  });
});

v1Router.get('/admin/audit-logs', (req, res) => {
  res.json({ success: true, count: dbAuditLogs.length, auditLogs: dbAuditLogs.slice(-100).reverse() });
});

// ==========================================
// 10. SOCIAL COMMERCE: LIVE SESSIONS & CHAT
// ==========================================

const dbLiveSessions = [
  {
    id: 'live-1',
    sellerId: 'seller-1',
    sellerName: 'Varanasi Weavers Co.',
    sellerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    title: 'Festive Banarasi & Pure Katan Silk Handloom Showcase',
    category: 'Ethnic Wear',
    viewerCount: 428,
    status: 'live',
    streamUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-showing-off-her-clothes-34351-large.mp4',
    pinnedProductId: 'prod-1',
    flashPrice: 1699,
    originalPrice: 2499,
    discountPercent: 32,
    scheduledTime: 'Now Streaming'
  },
  {
    id: 'live-2',
    sellerId: 'seller-2',
    sellerName: 'Metropolis Apparel Hub',
    sellerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    title: 'Oversized Streetwear Drop: Acid Wash Tees & Cargo Pants',
    category: 'Western Wear',
    viewerCount: 192,
    status: 'live',
    streamUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-modelling-different-outfits-34354-large.mp4',
    pinnedProductId: 'prod-2',
    flashPrice: 999,
    originalPrice: 1499,
    discountPercent: 33,
    scheduledTime: 'Now Streaming'
  }
];

v1Router.get('/live-sessions', (req, res) => {
  res.json({ success: true, count: dbLiveSessions.length, liveSessions: dbLiveSessions });
});

v1Router.post('/seller/live-sessions', (req, res) => {
  const { sellerId, title, category, streamUrl, pinnedProductId } = req.body;
  const newSession = {
    id: `live-${Date.now()}`,
    sellerId: sellerId || 'seller-1',
    sellerName: dbSellers.get(sellerId)?.sellerName || 'Verified Seller',
    sellerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    title: title || 'Live Fashion Showcase',
    category: category || 'Ethnic Wear',
    viewerCount: 1,
    status: 'live',
    streamUrl: streamUrl || 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-showing-off-her-clothes-34351-large.mp4',
    pinnedProductId: pinnedProductId || 'prod-1',
    scheduledTime: 'Now Streaming'
  };
  dbLiveSessions.unshift(newSession as any);
  res.status(201).json({ success: true, liveSession: newSession });
});

v1Router.get('/buyer/chats', (req, res) => {
  res.json({
    success: true,
    conversations: [
      {
        id: 'chat-conv-1',
        sellerId: 'seller-1',
        sellerName: 'Varanasi Weavers Co.',
        sellerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
        unreadCount: 0,
        lastMessage: 'Hello Amayra! Yes, size M will be dispatched today with BlueDart Air.',
        lastMessageTime: '10:15 AM'
      }
    ]
  });
});

v1Router.post('/seller/chats/:id/messages', (req, res) => {
  const { text, sender, senderName } = req.body;
  res.status(201).json({
    success: true,
    message: {
      id: `msg-${Date.now()}`,
      conversationId: req.params.id,
      text: text || '',
      sender: sender || 'buyer',
      senderName: senderName || 'Buyer',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  });
});

// ==========================================
// 11. PUBLIC SELLER STOREFRONT ENDPOINTS
// ==========================================

v1Router.get('/stores/:slug', (req, res) => {
  const slug = req.params.slug;
  const seller = Array.from(dbSellers.values()).find(s => 
    s.id === slug || s.sellerName.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug
  ) || dbSellers.get('seller-1');

  if (!seller) {
    return res.status(404).json({ success: false, message: 'Store not found' });
  }

  res.json({
    success: true,
    store: {
      id: seller.id,
      slug: seller.sellerName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      businessName: seller.businessName,
      sellerName: seller.sellerName,
      location: seller.location,
      gstNumber: seller.gstNumber,
      rating: seller.rating,
      totalOrders: seller.totalOrders,
      verified: seller.approvalStatus === 'APPROVED',
      bannerImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
      storeLogo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      description: 'Handcrafted authentic apparel direct from master artisans and verified manufacturers.',
      followersCount: 1420
    }
  });
});

v1Router.get('/stores/:slug/products', (req, res) => {
  const slug = req.params.slug;
  const seller = Array.from(dbSellers.values()).find(s => 
    s.id === slug || s.sellerName.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug
  ) || dbSellers.get('seller-1');

  const products = Array.from(dbProducts.values()).filter(p => p.sellerId === seller?.id);
  res.json({ success: true, count: products.length, products });
});

