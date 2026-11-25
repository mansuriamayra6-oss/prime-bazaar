import crypto from 'crypto';
import { INITIAL_PRODUCTS } from '../data/mockData.ts';
import { dbProducts, dbSellers, dbSellerOrders } from './v1Router.ts';
import { recordAuditLog } from './auditAndRbac.ts';
import { roundMoney } from './financeLedger.ts';
import {
  warehouses,
  warehouseInventories,
  ensureWarehousesSeeded,
} from './warehouseAndShipping.ts';

function syncOfferToSellerWarehouse(offer: SellerOfferRecord): void {
  ensureWarehousesSeeded();
  const whId = warehouses.has(`wh-${offer.sellerId}`)
    ? `wh-${offer.sellerId}`
    : Array.from(warehouses.values()).find((w) => w.sellerId === offer.sellerId && w.isActive)?.id ||
      'wh-mum-central';
  const variantKey = `${offer.productId}-${offer.sellerId}`;
  const mapKey = `${whId}::${variantKey}`;
  const prod =
    dbProducts.get(offer.productId) || INITIAL_PRODUCTS.find((p) => p.id === offer.productId);
  const title = (prod as any)?.title || (prod as any)?.name || offer.productId;
  const now = new Date().toISOString();
  const existing = warehouseInventories.get(mapKey);
  if (existing) {
    existing.availableQty = Math.max(0, offer.stock);
    existing.sku = offer.sellerSku;
    existing.updatedAt = now;
  } else {
    warehouseInventories.set(mapKey, {
      id: `whinv_offer_${offer.id}`,
      warehouseId: whId,
      variantId: variantKey,
      sku: offer.sellerSku,
      productId: offer.productId,
      productTitle: title,
      availableQty: Math.max(0, offer.stock),
      reservedQty: 0,
      damagedQty: 0,
      lowStockThreshold: 5,
      updatedAt: now,
    });
  }
}

export type OfferConditionType = 'NEW' | 'REFURBISHED' | 'OPEN_BOX';

export interface OfferVariantDetail {
  size: string;
  color: string;
  stock: number;
  price?: number;
}

export interface SellerOfferRecord {
  id: string;
  productId: string;
  sellerId: string;
  sellerName: string;
  sellerRating: number;
  sellerCity: string;
  sellerSku: string;
  condition: OfferConditionType;
  price: number;
  mrp: number;
  stock: number;
  deliveryDays: number;
  shippingFee: number;
  codAvailable: boolean;
  variants: OfferVariantDetail[];
  isDefault: boolean;
  isActive: boolean;
  buyBoxScore: number;
  createdAt: string;
  updatedAt: string;
}

export const dbSellerOffers: Map<string, SellerOfferRecord> = new Map();

let offersSeeded = false;

export function ensureSellerOffersSeeded(): void {
  if (offersSeeded && dbSellerOffers.size > 0) return;

  const now = new Date().toISOString();
  const seenKey = new Set<string>();

  for (const prod of INITIAL_PRODUCTS) {
    const seller = dbSellers.get(prod.sellerId);
    const key = `${prod.id}::${prod.sellerId}::NEW`;
    if (!seenKey.has(key)) {
      seenKey.add(key);
      const offerId = `offer-${prod.id}-${prod.sellerId}`;
      dbSellerOffers.set(offerId, {
        id: offerId,
        productId: prod.id,
        sellerId: prod.sellerId,
        sellerName: seller?.businessName || prod.sellerName,
        sellerRating: Number(seller?.rating || prod.sellerRating || 4.7),
        sellerCity: seller?.pickupAddress?.city || seller?.location || 'Mumbai',
        sellerSku: prod.sku || prod.id.toUpperCase(),
        condition: 'NEW',
        price: prod.price,
        mrp: prod.originalPrice,
        stock: Math.max(0, Number(prod.inStock || 20)),
        deliveryDays: 3,
        shippingFee: prod.price >= 999 ? 0 : 49,
        codAvailable: Boolean(prod.codAvailable),
        variants: (prod.sizes || []).map((s) => ({
          size: s.size,
          color: prod.colors?.[0]?.name || 'Default',
          stock: s.stockCount,
          price: prod.price,
        })),
        isDefault: true,
        isActive: true,
        buyBoxScore: 95,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  for (const prod of dbProducts.values()) {
    const key = `${prod.id}::${prod.sellerId}::NEW`;
    if (!seenKey.has(key)) {
      seenKey.add(key);
      const seller = dbSellers.get(prod.sellerId);
      const basePrice = prod.variants?.[0]?.price || 999;
      const baseMrp = prod.variants?.[0]?.mrp || Math.round(basePrice * 1.35);
      const totalStock = prod.variants?.reduce((sum, v) => sum + Number(v.stock || 0), 0) || 15;
      const offerId = `offer-${prod.id}-${prod.sellerId}`;
      dbSellerOffers.set(offerId, {
        id: offerId,
        productId: prod.id,
        sellerId: prod.sellerId,
        sellerName: seller?.businessName || prod.sellerName,
        sellerRating: Number(seller?.rating || 4.8),
        sellerCity: seller?.pickupAddress?.city || seller?.location || 'Varanasi',
        sellerSku: prod.variants?.[0]?.sku || prod.id.toUpperCase(),
        condition: 'NEW',
        price: basePrice,
        mrp: baseMrp,
        stock: totalStock,
        deliveryDays: 3,
        shippingFee: basePrice >= 999 ? 0 : 49,
        codAvailable: true,
        variants: (prod.variants || []).map((v) => ({
          size: v.size,
          color: v.color,
          stock: v.stock,
          price: v.price,
        })),
        isDefault: true,
        isActive: true,
        buyBoxScore: 92,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Competing marketplace seller offers on flagship catalogue items
  const competingOffers: Array<Omit<SellerOfferRecord, 'sellerName' | 'sellerRating' | 'sellerCity' | 'isDefault' | 'buyBoxScore' | 'createdAt' | 'updatedAt'>> = [
    {
      id: 'offer-prod-1-seller-2',
      productId: 'prod-1',
      sellerId: 'seller-2',
      sellerSku: 'MSS-KUR-101',
      condition: 'NEW',
      price: 1949,
      mrp: 3999,
      stock: 18,
      deliveryDays: 2,
      shippingFee: 0,
      codAvailable: true,
      variants: [
        { size: 'S', color: 'Crimson Rose', stock: 5, price: 1949 },
        { size: 'M', color: 'Crimson Rose', stock: 8, price: 1949 },
        { size: 'L', color: 'Crimson Rose', stock: 5, price: 1949 },
      ],
      isActive: true,
    },
    {
      id: 'offer-prod-1-seller-3',
      productId: 'prod-1',
      sellerId: 'seller-3',
      sellerSku: 'JLC-KUR-108',
      condition: 'OPEN_BOX',
      price: 1799,
      mrp: 3999,
      stock: 6,
      deliveryDays: 4,
      shippingFee: 49,
      codAvailable: true,
      variants: [
        { size: 'M', color: 'Royal Indigo', stock: 4, price: 1799 },
        { size: 'L', color: 'Royal Indigo', stock: 2, price: 1799 },
      ],
      isActive: true,
    },
    {
      id: 'offer-prod-2-seller-1',
      productId: 'prod-2',
      sellerId: 'seller-1',
      sellerSku: 'VWC-HD-202',
      condition: 'NEW',
      price: 1549,
      mrp: 2999,
      stock: 14,
      deliveryDays: 3,
      shippingFee: 0,
      codAvailable: true,
      variants: [
        { size: 'M', color: 'Obsidian Black', stock: 7, price: 1549 },
        { size: 'L', color: 'Obsidian Black', stock: 7, price: 1549 },
      ],
      isActive: true,
    },
    {
      id: 'offer-prod-3-seller-2',
      productId: 'prod-3',
      sellerId: 'seller-2',
      sellerSku: 'MSS-SNK-305',
      condition: 'NEW',
      price: 2599,
      mrp: 5499,
      stock: 12,
      deliveryDays: 2,
      shippingFee: 0,
      codAvailable: true,
      variants: [
        { size: 'UK 8', color: 'Cloud White', stock: 6, price: 2599 },
        { size: 'UK 9', color: 'Cloud White', stock: 6, price: 2599 },
      ],
      isActive: true,
    },
  ];

  for (const co of competingOffers) {
    const key = `${co.productId}::${co.sellerId}::${co.condition}`;
    if (seenKey.has(key)) continue;
    seenKey.add(key);
    const seller = dbSellers.get(co.sellerId);
    dbSellerOffers.set(co.id, {
      ...co,
      sellerName: seller?.businessName || 'Prime Verified Merchant',
      sellerRating: Number(seller?.rating || 4.7),
      sellerCity: seller?.pickupAddress?.city || seller?.location || 'Jaipur',
      isDefault: false,
      buyBoxScore: 80,
      createdAt: now,
      updatedAt: now,
    });
  }

  offersSeeded = true;
  for (const offer of dbSellerOffers.values()) {
    // Only synthesize dedicated offer-scoped warehouse rows for competing sellers (non-primary product owners)
    const prod = dbProducts.get(offer.productId) || INITIAL_PRODUCTS.find((p) => p.id === offer.productId);
    if (prod && prod.sellerId !== offer.sellerId) {
      syncOfferToSellerWarehouse(offer);
    }
  }
  for (const prodId of ['prod-1', 'prod-2', 'prod-3']) {
    recomputeBuyBoxForProduct(prodId);
  }
}

export function recomputeBuyBoxForProduct(productId: string): SellerOfferRecord[] {
  const offers = Array.from(dbSellerOffers.values()).filter((o) => o.productId === productId);
  if (offers.length === 0) return [];

  const activeInStock = offers.filter((o) => o.isActive && o.stock > 0);
  const minPrice = activeInStock.length > 0 ? Math.min(...activeInStock.map((o) => o.price + o.shippingFee)) : 1;

  for (const o of offers) {
    o.isDefault = false;
    if (!o.isActive || o.stock <= 0) {
      o.buyBoxScore = 0;
      continue;
    }
    const effectivePrice = Math.max(1, o.price + o.shippingFee);
    const priceScore = Math.min(45, (minPrice / effectivePrice) * 45);
    const ratingScore = Math.min(30, (Math.min(5, o.sellerRating) / 5) * 30);
    const speedScore = Math.max(3, 15 - (Math.max(1, o.deliveryDays) - 1) * 2.5);
    const stockScore = Math.min(10, o.stock >= 10 ? 10 : o.stock);
    const conditionBonus = o.condition === 'NEW' ? 5 : 0;
    o.buyBoxScore = roundMoney(priceScore + ratingScore + speedScore + stockScore + conditionBonus);
  }

  const sorted = offers
    .slice()
    .sort((a, b) => {
      if (b.buyBoxScore !== a.buyBoxScore) return b.buyBoxScore - a.buyBoxScore;
      return a.price - b.price;
    });

  const winner = sorted.find((o) => o.isActive && o.stock > 0);
  if (winner) {
    winner.isDefault = true;
  }

  return sorted;
}

export function getOffersForProduct(productId: string): SellerOfferRecord[] {
  ensureSellerOffersSeeded();
  const sorted = recomputeBuyBoxForProduct(productId);
  // Refresh seller metadata in case seller rating changed
  return sorted.map((o) => {
    const seller = dbSellers.get(o.sellerId);
    return {
      ...o,
      sellerName: seller?.businessName || o.sellerName,
      sellerRating: Number(seller?.rating || o.sellerRating),
      sellerCity: seller?.pickupAddress?.city || seller?.location || o.sellerCity,
    };
  });
}

export function getSellerOffersBySeller(sellerId: string): SellerOfferRecord[] {
  ensureSellerOffersSeeded();
  return Array.from(dbSellerOffers.values())
    .filter((o) => o.sellerId === sellerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createOrUpdateSellerOffer(params: {
  offerId?: string;
  productId: string;
  sellerId: string;
  sellerSku: string;
  condition?: OfferConditionType;
  price: number;
  mrp?: number;
  stock: number;
  deliveryDays?: number;
  shippingFee?: number;
  codAvailable?: boolean;
  variants?: OfferVariantDetail[];
  isActive?: boolean;
  actorId: string;
  actorName: string;
  actorRole: string;
}): SellerOfferRecord {
  ensureSellerOffersSeeded();

  const productExists =
    dbProducts.has(params.productId) || INITIAL_PRODUCTS.some((p) => p.id === params.productId);
  if (!productExists) {
    throw new Error(`Catalogue product "${params.productId}" does not exist.`);
  }

  const seller = dbSellers.get(params.sellerId);
  if (!seller) {
    throw new Error(`Seller profile "${params.sellerId}" not found.`);
  }
  if (seller.approvalStatus === 'SUSPENDED' || seller.approvalStatus === 'REJECTED') {
    throw new Error('Suspended or rejected sellers cannot publish active catalogue offers.');
  }

  const price = roundMoney(Number(params.price));
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Offer price must be greater than zero.');
  }
  const mrp = roundMoney(Number(params.mrp || price));
  if (mrp < price) {
    throw new Error('MRP cannot be lower than offer selling price.');
  }
  const stock = Math.max(0, Math.floor(Number(params.stock)));
  const deliveryDays = Math.min(21, Math.max(1, Math.floor(Number(params.deliveryDays || 3))));
  const shippingFee = Math.max(0, roundMoney(Number(params.shippingFee ?? (price >= 999 ? 0 : 49))));
  const condition: OfferConditionType =
    params.condition === 'REFURBISHED' || params.condition === 'OPEN_BOX' ? params.condition : 'NEW';

  const now = new Date().toISOString();

  if (params.offerId) {
    const existing = dbSellerOffers.get(params.offerId);
    if (!existing) {
      throw new Error('Offer not found.');
    }
    if (existing.sellerId !== params.sellerId && params.actorRole !== 'ADMIN' && params.actorRole !== 'SUPER_ADMIN') {
      const err: any = new Error('Forbidden: Cannot modify another seller offer.');
      err.statusCode = 403;
      throw err;
    }
    existing.sellerSku = params.sellerSku?.trim() || existing.sellerSku;
    existing.condition = condition;
    existing.price = price;
    existing.mrp = mrp;
    existing.stock = stock;
    existing.deliveryDays = deliveryDays;
    existing.shippingFee = shippingFee;
    if (typeof params.codAvailable === 'boolean') existing.codAvailable = params.codAvailable;
    if (Array.isArray(params.variants)) existing.variants = params.variants;
    if (typeof params.isActive === 'boolean') existing.isActive = params.isActive;
    existing.updatedAt = now;

    syncOfferToSellerWarehouse(existing);
    recomputeBuyBoxForProduct(existing.productId);
    recordAuditLog({
      actorType: params.actorRole === 'ADMIN' || params.actorRole === 'SUPER_ADMIN' ? 'ADMIN' : 'SELLER',
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      action: 'SELLER_OFFER_UPDATED',
      entityType: 'SELLER_OFFER',
      entityId: existing.id,
      details: `Updated offer on ${existing.productId}: ₹${price}, stock=${stock}`,
    });
    return existing;
  }

  // Upsert by unique [productId, sellerId, condition]
  const duplicate = Array.from(dbSellerOffers.values()).find(
    (o) => o.productId === params.productId && o.sellerId === params.sellerId && o.condition === condition
  );
  if (duplicate) {
    return createOrUpdateSellerOffer({
      ...params,
      offerId: duplicate.id,
    });
  }

  const offerId = `offer-${crypto.randomBytes(5).toString('hex')}`;
  const created: SellerOfferRecord = {
    id: offerId,
    productId: params.productId,
    sellerId: params.sellerId,
    sellerName: seller.businessName,
    sellerRating: Number(seller.rating || 4.8),
    sellerCity: seller.pickupAddress?.city || seller.location || 'India',
    sellerSku: params.sellerSku?.trim() || `OFF-${params.sellerId.slice(-3)}-${Date.now().toString().slice(-4)}`,
    condition,
    price,
    mrp,
    stock,
    deliveryDays,
    shippingFee,
    codAvailable: typeof params.codAvailable === 'boolean' ? params.codAvailable : true,
    variants: Array.isArray(params.variants) ? params.variants : [],
    isDefault: false,
    isActive: params.isActive !== false,
    buyBoxScore: 0,
    createdAt: now,
    updatedAt: now,
  };

  dbSellerOffers.set(offerId, created);
  syncOfferToSellerWarehouse(created);
  recomputeBuyBoxForProduct(params.productId);

  recordAuditLog({
    actorType: params.actorRole === 'ADMIN' || params.actorRole === 'SUPER_ADMIN' ? 'ADMIN' : 'SELLER',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: 'SELLER_OFFER_CREATED',
    entityType: 'SELLER_OFFER',
    entityId: offerId,
    details: `Seller ${seller.businessName} listed offer ${created.sellerSku} on ${params.productId} at ₹${price}`,
  });

  return created;
}

export function deleteSellerOffer(params: {
  offerId: string;
  sellerId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
}): SellerOfferRecord {
  ensureSellerOffersSeeded();
  const offer = dbSellerOffers.get(params.offerId);
  if (!offer) {
    const err: any = new Error('Offer not found.');
    err.statusCode = 404;
    throw err;
  }
  if (offer.sellerId !== params.sellerId && params.actorRole !== 'ADMIN' && params.actorRole !== 'SUPER_ADMIN') {
    const err: any = new Error('Forbidden: Cannot delete another seller offer.');
    err.statusCode = 403;
    throw err;
  }
  offer.isActive = false;
  offer.stock = 0;
  offer.isDefault = false;
  offer.updatedAt = new Date().toISOString();
  recomputeBuyBoxForProduct(offer.productId);

  recordAuditLog({
    actorType: params.actorRole === 'ADMIN' || params.actorRole === 'SUPER_ADMIN' ? 'ADMIN' : 'SELLER',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: 'SELLER_OFFER_DEACTIVATED',
    entityType: 'SELLER_OFFER',
    entityId: offer.id,
    details: `Deactivated seller offer ${offer.sellerSku} on ${offer.productId}`,
  });
  return offer;
}

export function adjustOfferInventory(offerId: string, quantityDelta: number): void {
  ensureSellerOffersSeeded();
  const offer = dbSellerOffers.get(offerId);
  if (!offer) return;
  const nextStock = offer.stock + quantityDelta;
  if (nextStock < 0) {
    throw new Error(`Insufficient stock on seller offer ${offer.sellerSku} (${offer.stock} left).`);
  }
  offer.stock = nextStock;
  offer.updatedAt = new Date().toISOString();
  recomputeBuyBoxForProduct(offer.productId);
}

export function getSellerSubordersForParentOrder(orderId: string) {
  return Array.from(dbSellerOrders.values()).filter((so) => so.orderId === orderId);
}
