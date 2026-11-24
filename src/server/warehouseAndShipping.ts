import crypto from 'crypto';
import { hashPassword, verifyPassword } from './security.ts';
import { dbAuditLogs, dbProducts } from './v1Router.ts';
import { INITIAL_PRODUCTS } from '../data/mockData.ts';
import { recordAuditLog } from './auditAndRbac.ts';

// =============================================================================
// MULTI-WAREHOUSE INVENTORY, RESERVATIONS, SHIPPING PROVIDERS & DELIVERY OTP
// =============================================================================

export interface WarehouseRecord {
  id: string;
  sellerId?: string | null;
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactName?: string;
  contactPhone?: string;
  operatingHours: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseInventoryRecord {
  id: string;
  warehouseId: string;
  variantId: string;
  sku: string;
  productId: string;
  productTitle: string;
  availableQty: number;
  reservedQty: number;
  damagedQty: number;
  lowStockThreshold: number;
  updatedAt: string;
}

export type ReservationStatus = 'RESERVED' | 'COMMITTED' | 'RELEASED' | 'EXPIRED';

export interface InventoryReservationRecord {
  id: string;
  orderId: string;
  warehouseId: string;
  variantId: string;
  sku: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export type TransferStatus = 'REQUESTED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface WarehouseTransferRecord {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  variantId: string;
  sku: string;
  quantity: number;
  status: TransferStatus;
  initiatedBy: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface WarehouseMovementRecord {
  id: string;
  warehouseId: string;
  variantId: string;
  sku: string;
  movementType:
    | 'STOCK_IN'
    | 'STOCK_OUT'
    | 'ORDER_RESERVED'
    | 'ORDER_RELEASED'
    | 'ORDER_FULFILLED'
    | 'ORDER_CANCELLED'
    | 'RETURN_RECEIVED'
    | 'TRANSFER_OUT'
    | 'TRANSFER_IN'
    | 'PO_RECEIVED'
    | 'AUDIT_CORRECTION';
  quantity: number;
  referenceId: string;
  notes?: string;
  createdAt: string;
}

export const warehouses = new Map<string, WarehouseRecord>();
export const warehouseInventories = new Map<string, WarehouseInventoryRecord>(); // key `${warehouseId}:${variantId}`
export const inventoryReservations = new Map<string, InventoryReservationRecord>();
export const warehouseTransfers = new Map<string, WarehouseTransferRecord>();
export const warehouseMovements: WarehouseMovementRecord[] = [];
const warehouseLocks = new Map<string, Promise<void>>();

async function withWarehouseLock<T>(key: string, fn: () => T | Promise<T>): Promise<T> {
  const prev = warehouseLocks.get(key) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((r) => {
    release = r;
  });
  const chained = prev.then(() => current);
  warehouseLocks.set(key, chained);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (warehouseLocks.get(key) === chained) warehouseLocks.delete(key);
  }
}

function invKey(warehouseId: string, variantId: string) {
  return `${warehouseId}:${variantId}`;
}

let warehousesSeeded = false;

export function ensureWarehousesSeeded() {
  if (warehousesSeeded) return;
  warehousesSeeded = true;
  const now = new Date().toISOString();

  const defaults: WarehouseRecord[] = [
    {
      id: 'wh-mum-central',
      sellerId: null,
      code: 'WH-MUM-CENTRAL',
      name: 'Mumbai Bhiwandi Fulfillment Center',
      address: 'LogiPark Building 4, Bhiwandi-Kalyan Highway',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '421302',
      contactName: 'Vikram Sawant',
      contactPhone: '+91 98201 55410',
      operatingHours: '08:00-22:00',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'wh-seller-1',
      sellerId: 'seller-1',
      code: 'WH-SELLER-1',
      name: 'Varanasi Weavers Silk Hub',
      address: 'K-24, Silk Weavers Complex, Chowk Bazaar',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      pincode: '221001',
      contactName: 'Devendra Tripathi',
      contactPhone: '+91 98391 20492',
      operatingHours: '09:00-20:00',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'wh-seller-2',
      sellerId: 'seller-2',
      code: 'WH-SELLER-2',
      name: 'Metropolis Apparel Tirupur Hub',
      address: 'Plot 18, Textile Park, Rayapuram',
      city: 'Tirupur',
      state: 'Tamil Nadu',
      pincode: '641601',
      contactName: 'Sameer Merchant',
      contactPhone: '+91 94432 88129',
      operatingHours: '09:00-20:00',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'wh-seller-3',
      sellerId: 'seller-3',
      code: 'WH-SELLER-3',
      name: 'AeroStep Agra Hub',
      address: '7B, Leather Cluster Industrial Area, Nunhai',
      city: 'Agra',
      state: 'Uttar Pradesh',
      pincode: '282006',
      contactName: 'Pooja Agarwal',
      contactPhone: '+91 97190 44211',
      operatingHours: '09:00-20:00',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const wh of defaults) {
    warehouses.set(wh.id, wh);
  }

  // Seed warehouse stock from INITIAL_PRODUCTS & dbProducts
  for (const prod of INITIAL_PRODUCTS) {
    const whId = warehouses.has(`wh-${prod.sellerId}`) ? `wh-${prod.sellerId}` : 'wh-mum-central';
    const sizes = prod.sizes?.length ? prod.sizes : [{ size: 'M', available: true, stockCount: prod.inStock || 10 }];
    sizes.forEach((sz, idx) => {
      const variantId = `var-${prod.id.replace('prod-', '')}-${sz.size.toLowerCase().replace(/\s+/g, '')}`;
      const sku = prod.sku ? `${prod.sku}-${sz.size.replace(/\s+/g, '').toUpperCase()}` : `${prod.id.toUpperCase()}-${idx}`;
      const qty = Math.max(0, Number(sz.stockCount || prod.inStock || 10));
      warehouseInventories.set(invKey(whId, variantId), {
        id: `whinv_${prod.id}_${idx}`,
        warehouseId: whId,
        variantId,
        sku,
        productId: prod.id,
        productTitle: prod.title,
        availableQty: qty,
        reservedQty: 0,
        damagedQty: 0,
        lowStockThreshold: 5,
        updatedAt: now,
      });
    });

    // Also add generic default variant key for quick product-level checkout allocation
    warehouseInventories.set(invKey(whId, prod.id), {
      id: `whinv_base_${prod.id}`,
      warehouseId: whId,
      variantId: prod.id,
      sku: prod.sku || prod.id.toUpperCase(),
      productId: prod.id,
      productTitle: prod.title,
      availableQty: Math.max(5, Number(prod.inStock || 20)),
      reservedQty: 0,
      damagedQty: 0,
      lowStockThreshold: 5,
      updatedAt: now,
    });
  }

  for (const p of dbProducts.values()) {
    const whId = warehouses.has(`wh-${p.sellerId}`) ? `wh-${p.sellerId}` : 'wh-mum-central';
    for (const v of p.variants) {
      if (!warehouseInventories.has(invKey(whId, v.id))) {
        warehouseInventories.set(invKey(whId, v.id), {
          id: `whinv_${v.id}`,
          warehouseId: whId,
          variantId: v.id,
          sku: v.sku,
          productId: p.id,
          productTitle: p.name,
          availableQty: v.stock,
          reservedQty: 0,
          damagedQty: 0,
          lowStockThreshold: 5,
          updatedAt: now,
        });
      }
    }
  }
}

queueMicrotask(() => {
  try {
    ensureWarehousesSeeded();
  } catch {
    // Will seed lazily on first request if called during circular bootstrap
  }
});

export function listWarehouses(sellerIdFilter?: string) {
  ensureWarehousesSeeded();
  const list = Array.from(warehouses.values());
  if (sellerIdFilter) {
    return list.filter((w) => w.sellerId === sellerIdFilter);
  }
  return list;
}

export function createWarehouse(params: {
  sellerId?: string | null;
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactName?: string;
  contactPhone?: string;
  operatingHours?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
}): WarehouseRecord {
  ensureWarehousesSeeded();
  const cleanCode = params.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!cleanCode || !params.name.trim() || !params.city.trim() || !params.state.trim() || !params.pincode.trim()) {
    throw new Error('Warehouse code, name, city, state, and pincode are required.');
  }
  for (const existing of warehouses.values()) {
    if (existing.code === cleanCode) {
      throw new Error(`Warehouse code ${cleanCode} already exists.`);
    }
  }

  const now = new Date().toISOString();
  const wh: WarehouseRecord = {
    id: `wh_${crypto.randomBytes(5).toString('hex')}`,
    sellerId: params.sellerId || null,
    code: cleanCode,
    name: params.name.trim(),
    address: params.address.trim() || `${params.city}, ${params.state}`,
    city: params.city.trim(),
    state: params.state.trim(),
    pincode: params.pincode.trim(),
    contactName: params.contactName?.trim(),
    contactPhone: params.contactPhone?.trim(),
    operatingHours: params.operatingHours?.trim() || '09:00-20:00',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  warehouses.set(wh.id, wh);

  recordAuditLog({
    actorType: params.actorRole === 'SELLER' ? 'SELLER' : 'ADMIN',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: 'WAREHOUSE_CREATED',
    entityType: 'WAREHOUSE',
    entityId: wh.id,
    afterState: { code: wh.code, name: wh.name, city: wh.city, state: wh.state },
    details: `Created warehouse ${wh.code} (${wh.name}) in ${wh.city}, ${wh.state}.`,
    legacyAuditSink: dbAuditLogs,
  });

  return wh;
}

export function getWarehouseInventoryList(filters?: { warehouseId?: string; sellerId?: string; lowStockOnly?: boolean }) {
  ensureWarehousesSeeded();
  const allowedWarehouseIds = filters?.sellerId
    ? new Set(listWarehouses(filters.sellerId).map((w) => w.id))
    : null;

  const list = Array.from(warehouseInventories.values()).filter((inv) => {
    if (filters?.warehouseId && inv.warehouseId !== filters.warehouseId) return false;
    if (allowedWarehouseIds && !allowedWarehouseIds.has(inv.warehouseId)) return false;
    if (filters?.lowStockOnly && inv.availableQty > inv.lowStockThreshold) return false;
    return true;
  });
  return list.map((inv) => ({
    ...inv,
    warehouseName: warehouses.get(inv.warehouseId)?.name || inv.warehouseId,
    warehouseState: warehouses.get(inv.warehouseId)?.state || '',
    isLowStock: inv.availableQty <= inv.lowStockThreshold,
  }));
}

export async function upsertWarehouseStock(params: {
  warehouseId: string;
  variantId: string;
  sku?: string;
  productId: string;
  productTitle: string;
  quantityDelta?: number;
  absoluteAvailableQty?: number;
  damagedDelta?: number;
  lowStockThreshold?: number;
  movementType: WarehouseMovementRecord['movementType'];
  referenceId: string;
  notes?: string;
}) {
  ensureWarehousesSeeded();
  const wh = warehouses.get(params.warehouseId);
  if (!wh || !wh.isActive) {
    throw new Error('Target warehouse not found or inactive.');
  }

  return withWarehouseLock(invKey(params.warehouseId, params.variantId), () => {
    const key = invKey(params.warehouseId, params.variantId);
    const now = new Date().toISOString();
    let record = warehouseInventories.get(key);
    if (!record) {
      record = {
        id: `whinv_${crypto.randomBytes(5).toString('hex')}`,
        warehouseId: params.warehouseId,
        variantId: params.variantId,
        sku: params.sku || params.variantId.toUpperCase(),
        productId: params.productId,
        productTitle: params.productTitle,
        availableQty: 0,
        reservedQty: 0,
        damagedQty: 0,
        lowStockThreshold: params.lowStockThreshold ?? 5,
        updatedAt: now,
      };
      warehouseInventories.set(key, record);
    }

    const oldQty = record.availableQty;
    if (typeof params.absoluteAvailableQty === 'number') {
      record.availableQty = Math.max(0, Math.floor(params.absoluteAvailableQty));
    } else if (typeof params.quantityDelta === 'number') {
      const next = record.availableQty + Math.floor(params.quantityDelta);
      if (next < 0) {
        throw new Error(
          `Insufficient stock in warehouse ${wh.code} for ${record.sku}. Available: ${record.availableQty}`
        );
      }
      record.availableQty = next;
    }

    if (typeof params.damagedDelta === 'number') {
      record.damagedQty = Math.max(0, record.damagedQty + Math.floor(params.damagedDelta));
    }
    if (typeof params.lowStockThreshold === 'number') {
      record.lowStockThreshold = Math.max(0, Math.floor(params.lowStockThreshold));
    }
    record.updatedAt = now;

    warehouseMovements.push({
      id: `wmov_${crypto.randomBytes(5).toString('hex')}`,
      warehouseId: params.warehouseId,
      variantId: params.variantId,
      sku: record.sku,
      movementType: params.movementType,
      quantity: record.availableQty - oldQty,
      referenceId: params.referenceId,
      notes: params.notes,
      createdAt: now,
    });

    return record;
  });
}

// =============================================================================
// SPLIT-WAREHOUSE ALLOCATION & ATOMIC ORDER RESERVATION
// =============================================================================

function scoreWarehouseProximity(wh: WarehouseRecord, destinationState?: string, destinationPincode?: string): number {
  let score = 0;
  if (destinationPincode && wh.pincode.slice(0, 3) === destinationPincode.slice(0, 3)) score += 100;
  else if (destinationState && wh.state.toLowerCase() === destinationState.toLowerCase()) score += 50;
  return score;
}

export async function reserveStockForOrder(params: {
  orderId: string;
  items: Array<{
    productId: string;
    variantId?: string;
    sku?: string;
    title: string;
    sellerId?: string;
    quantity: number;
  }>;
  destinationState?: string;
  destinationPincode?: string;
  ttlMinutes?: number;
}): Promise<{
  reservations: InventoryReservationRecord[];
  splitWarehousePlan: Array<{
    warehouseId: string;
    warehouseName: string;
    warehouseState: string;
    items: Array<{ productId: string; variantId: string; sku: string; quantity: number }>;
  }>;
}> {
  ensureWarehousesSeeded();
  const ttlMs = (params.ttlMinutes || 30) * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const createdReservations: InventoryReservationRecord[] = [];
  const planMap = new Map<string, { warehouseId: string; warehouseName: string; warehouseState: string; items: any[] }>();

  try {
    for (const item of params.items) {
      let remainingNeeded = Math.max(1, Math.floor(item.quantity));
      const candidateKeys = [item.variantId, item.productId].filter(Boolean) as string[];

      // Find matching warehouse inventories sorted by proximity then highest available stock
      const candidates = Array.from(warehouseInventories.values())
        .filter((inv) => {
          const wh = warehouses.get(inv.warehouseId);
          if (!wh || !wh.isActive) return false;
          if (item.sellerId && wh.sellerId && wh.sellerId !== item.sellerId) return false;
          return (
            candidateKeys.includes(inv.variantId) ||
            inv.productId === item.productId
          ) && inv.availableQty > 0;
        })
        .sort((a, b) => {
          const whA = warehouses.get(a.warehouseId)!;
          const whB = warehouses.get(b.warehouseId)!;
          const scoreDiff =
            scoreWarehouseProximity(whB, params.destinationState, params.destinationPincode) -
            scoreWarehouseProximity(whA, params.destinationState, params.destinationPincode);
          if (scoreDiff !== 0) return scoreDiff;
          return b.availableQty - a.availableQty;
        });

      const totalAvailableAcrossWarehouses = candidates.reduce((s, c) => s + c.availableQty, 0);
      if (totalAvailableAcrossWarehouses < remainingNeeded) {
        // Check if catalog fallback product has stock seeded dynamically
        throw new Error(
          `Insufficient inventory for "${item.title}" (requested ${remainingNeeded}, available ${totalAvailableAcrossWarehouses}).`
        );
      }

      // Allocate across warehouses (supports split-warehouse fulfillment when 1 warehouse lacks full qty)
      for (const cand of candidates) {
        if (remainingNeeded <= 0) break;
        const allocQty = Math.min(remainingNeeded, cand.availableQty);
        if (allocQty <= 0) continue;

        await withWarehouseLock(invKey(cand.warehouseId, cand.variantId), () => {
          if (cand.availableQty < allocQty) {
            throw new Error(`Concurrent stock depletion for ${cand.sku}.`);
          }
          cand.availableQty -= allocQty;
          cand.reservedQty += allocQty;
          cand.updatedAt = new Date().toISOString();

          const resRec: InventoryReservationRecord = {
            id: `res_${crypto.randomBytes(5).toString('hex')}`,
            orderId: params.orderId,
            warehouseId: cand.warehouseId,
            variantId: cand.variantId,
            sku: cand.sku,
            quantity: allocQty,
            status: 'RESERVED',
            expiresAt,
            createdAt: cand.updatedAt,
            updatedAt: cand.updatedAt,
          };
          inventoryReservations.set(resRec.id, resRec);
          createdReservations.push(resRec);

          warehouseMovements.push({
            id: `wmov_${crypto.randomBytes(5).toString('hex')}`,
            warehouseId: cand.warehouseId,
            variantId: cand.variantId,
            sku: cand.sku,
            movementType: 'ORDER_RESERVED',
            quantity: -allocQty,
            referenceId: params.orderId,
            notes: `Reserved ${allocQty} units for order ${params.orderId}`,
            createdAt: cand.updatedAt,
          });

          const wh = warehouses.get(cand.warehouseId)!;
          if (!planMap.has(wh.id)) {
            planMap.set(wh.id, {
              warehouseId: wh.id,
              warehouseName: wh.name,
              warehouseState: wh.state,
              items: [],
            });
          }
          planMap.get(wh.id)!.items.push({
            productId: cand.productId,
            variantId: cand.variantId,
            sku: cand.sku,
            quantity: allocQty,
          });
        });

        remainingNeeded -= allocQty;
      }
    }

    return {
      reservations: createdReservations,
      splitWarehousePlan: Array.from(planMap.values()),
    };
  } catch (err) {
    // Rollback partial reservations if any line failed
    await releaseOrderReservations(params.orderId, 'ORDER_RESERVATION_ROLLBACK');
    throw err;
  }
}

export async function commitOrderReservations(orderId: string) {
  const now = new Date().toISOString();
  for (const resRec of inventoryReservations.values()) {
    if (resRec.orderId !== orderId || resRec.status !== 'RESERVED') continue;
    await withWarehouseLock(invKey(resRec.warehouseId, resRec.variantId), () => {
      const inv = warehouseInventories.get(invKey(resRec.warehouseId, resRec.variantId));
      if (inv) {
        inv.reservedQty = Math.max(0, inv.reservedQty - resRec.quantity);
        inv.updatedAt = now;
      }
      resRec.status = 'COMMITTED';
      resRec.updatedAt = now;
      warehouseMovements.push({
        id: `wmov_${crypto.randomBytes(5).toString('hex')}`,
        warehouseId: resRec.warehouseId,
        variantId: resRec.variantId,
        sku: resRec.sku,
        movementType: 'ORDER_FULFILLED',
        quantity: 0,
        referenceId: orderId,
        notes: `Committed ${resRec.quantity} reserved units for paid/confirmed order ${orderId}`,
        createdAt: now,
      });
    });
  }
}

export async function releaseOrderReservations(orderId: string, reason: string = 'ORDER_CANCELLED') {
  const now = new Date().toISOString();
  for (const resRec of inventoryReservations.values()) {
    if (resRec.orderId !== orderId || resRec.status === 'RELEASED' || resRec.status === 'EXPIRED') continue;
    await withWarehouseLock(invKey(resRec.warehouseId, resRec.variantId), () => {
      const inv = warehouseInventories.get(invKey(resRec.warehouseId, resRec.variantId));
      if (inv) {
        if (resRec.status === 'RESERVED') {
          inv.reservedQty = Math.max(0, inv.reservedQty - resRec.quantity);
        }
        inv.availableQty += resRec.quantity;
        inv.updatedAt = now;
      }
      resRec.status = 'RELEASED';
      resRec.updatedAt = now;
      warehouseMovements.push({
        id: `wmov_${crypto.randomBytes(5).toString('hex')}`,
        warehouseId: resRec.warehouseId,
        variantId: resRec.variantId,
        sku: resRec.sku,
        movementType: 'ORDER_RELEASED',
        quantity: resRec.quantity,
        referenceId: orderId,
        notes: `Released ${resRec.quantity} units (${reason})`,
        createdAt: now,
      });
    });
  }
}

// =============================================================================
// WAREHOUSE TRANSFERS
// =============================================================================

export async function createWarehouseTransfer(params: {
  fromWarehouseId: string;
  toWarehouseId: string;
  variantId: string;
  quantity: number;
  initiatedBy: string;
  notes?: string;
}): Promise<WarehouseTransferRecord> {
  if (params.fromWarehouseId === params.toWarehouseId) {
    throw new Error('Source and destination warehouses must be different.');
  }
  const qty = Math.floor(Number(params.quantity));
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Transfer quantity must be positive.');
  }
  ensureWarehousesSeeded();
  const fromWh = warehouses.get(params.fromWarehouseId);
  const toWh = warehouses.get(params.toWarehouseId);
  if (!fromWh || !toWh) throw new Error('Invalid source or destination warehouse.');

  const sourceInv = warehouseInventories.get(invKey(params.fromWarehouseId, params.variantId));
  if (!sourceInv || sourceInv.availableQty < qty) {
    throw new Error(`Insufficient stock in source warehouse ${fromWh.code}.`);
  }

  await upsertWarehouseStock({
    warehouseId: params.fromWarehouseId,
    variantId: params.variantId,
    sku: sourceInv.sku,
    productId: sourceInv.productId,
    productTitle: sourceInv.productTitle,
    quantityDelta: -qty,
    movementType: 'TRANSFER_OUT',
    referenceId: `XFER_${fromWh.code}_TO_${toWh.code}`,
    notes: params.notes || `Stock dispatched to ${toWh.code}`,
  });

  const transfer: WarehouseTransferRecord = {
    id: `xfer_${crypto.randomBytes(5).toString('hex')}`,
    fromWarehouseId: params.fromWarehouseId,
    toWarehouseId: params.toWarehouseId,
    variantId: params.variantId,
    sku: sourceInv.sku,
    quantity: qty,
    status: 'IN_TRANSIT',
    initiatedBy: params.initiatedBy,
    notes: params.notes,
    createdAt: new Date().toISOString(),
  };
  warehouseTransfers.set(transfer.id, transfer);
  return transfer;
}

export async function completeWarehouseTransfer(params: {
  transferId: string;
  actorId: string;
}): Promise<WarehouseTransferRecord> {
  const xfer = warehouseTransfers.get(params.transferId);
  if (!xfer) throw new Error('Warehouse transfer not found.');
  if (xfer.status === 'COMPLETED') return xfer;
  if (xfer.status === 'CANCELLED') throw new Error('Cancelled transfer cannot be completed.');

  const sourceInv = warehouseInventories.get(invKey(xfer.fromWarehouseId, xfer.variantId));
  await upsertWarehouseStock({
    warehouseId: xfer.toWarehouseId,
    variantId: xfer.variantId,
    sku: xfer.sku,
    productId: sourceInv?.productId || xfer.variantId,
    productTitle: sourceInv?.productTitle || xfer.sku,
    quantityDelta: xfer.quantity,
    movementType: 'TRANSFER_IN',
    referenceId: xfer.id,
    notes: `Completed transfer from ${xfer.fromWarehouseId}`,
  });

  xfer.status = 'COMPLETED';
  xfer.completedAt = new Date().toISOString();
  return xfer;
}

// =============================================================================
// PROVIDER-INDEPENDENT SHIPPING ADAPTER + SHIPROCKET + DELIVERY OTP
// =============================================================================

export type ShipmentLifecycleStatus =
  | 'MANIFESTED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RTO_INITIATED'
  | 'RTO_DELIVERED';

export interface ShipmentRecord {
  id: string;
  orderId: string;
  sellerOrderId?: string;
  sellerId: string;
  warehouseId?: string;
  providerName: string;
  providerShipmentId?: string;
  providerOrderId?: string;
  courier: string;
  trackingNumber: string;
  labelUrl?: string;
  shippingCost: number;
  status: ShipmentLifecycleStatus;
  failedAttempts: number;
  rtoReason?: string;
  deliveredAt?: string;
  events: Array<{ id: string; event: string; location: string; eventDate: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryOtpRecord {
  id: string;
  orderId: string;
  shipmentId: string;
  otpHash: string;
  channel: 'EMAIL' | 'SMS';
  expiresAt: string;
  attemptCount: number;
  maxAttempts: number;
  lockedUntil?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  overrideReason?: string | null;
  overrideBy?: string | null;
  isInvalidated: boolean;
  createdAt: string;
}

export interface ShippingProviderCreateRequest {
  orderId: string;
  suborderNumber: string;
  pickupWarehouse: WarehouseRecord;
  destination: { fullName: string; phone: string; street: string; city: string; state: string; pinCode: string };
  items: Array<{ title: string; sku: string; quantity: number; unitPrice: number }>;
  weightGrams: number;
  paymentMethod: string;
  orderTotal: number;
}

export interface ShippingProviderCreateResult {
  providerName: string;
  providerShipmentId: string;
  providerOrderId: string;
  courier: string;
  trackingNumber: string;
  labelUrl?: string;
  shippingCost: number;
}

export interface ShippingProviderTrackResult {
  status: ShipmentLifecycleStatus;
  events: Array<{ event: string; location: string; eventDate: string }>;
}

export interface ShippingProvider {
  readonly name: string;
  isConfigured(): boolean;
  createShipment(req: ShippingProviderCreateRequest): Promise<ShippingProviderCreateResult>;
  trackShipment(trackingNumber: string): Promise<ShippingProviderTrackResult>;
}

class ShiprocketShippingProvider implements ShippingProvider {
  readonly name = 'SHIPROCKET';
  private cachedToken: { token: string; expiresAt: number } | null = null;

  isConfigured(): boolean {
    return Boolean((process.env.SHIPROCKET_EMAIL || '').trim() && (process.env.SHIPROCKET_PASSWORD || '').trim());
  }

  private async authenticate(): Promise<string> {
    const email = (process.env.SHIPROCKET_EMAIL || '').trim();
    const password = (process.env.SHIPROCKET_PASSWORD || '').trim();
    if (!email || !password) {
      throw new Error('Shipping carrier is not configured (missing SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD).');
    }
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token;
    }

    const resp = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await resp.json();
    if (!resp.ok || !data?.token) {
      throw new Error(data?.message || `Shiprocket auth failed (${resp.status}).`);
    }
    this.cachedToken = { token: data.token, expiresAt: Date.now() + 8 * 24 * 60 * 60 * 1000 };
    return data.token;
  }

  async createShipment(req: ShippingProviderCreateRequest): Promise<ShippingProviderCreateResult> {
    const token = await this.authenticate();
    const payload = {
      order_id: req.suborderNumber,
      order_date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      pickup_location: req.pickupWarehouse.code,
      billing_customer_name: req.destination.fullName,
      billing_last_name: '',
      billing_address: req.destination.street,
      billing_city: req.destination.city,
      billing_pincode: req.destination.pinCode,
      billing_state: req.destination.state,
      billing_country: 'India',
      billing_phone: req.destination.phone.replace(/\D/g, '').slice(-10),
      shipping_is_billing: true,
      order_items: req.items.map((it) => ({
        name: it.title,
        sku: it.sku,
        units: it.quantity,
        selling_price: it.unitPrice,
      })),
      payment_method: req.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
      sub_total: req.orderTotal,
      length: 30,
      breadth: 22,
      height: 6,
      weight: Math.max(0.2, Number((req.weightGrams / 1000).toFixed(2))),
    };

    const resp = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (!resp.ok || !data?.shipment_id) {
      throw new Error(data?.message || `Shiprocket create shipment failed (${resp.status}).`);
    }

    const awbResp = await fetch('https://apiv2.shiprocket.in/v1/external/courier/assign/awb', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shipment_id: data.shipment_id }),
    });
    const awbData = await awbResp.json();
    const assigned = awbData?.response?.data;
    if (!awbResp.ok || !assigned?.awb_code) {
      throw new Error(awbData?.message || 'Shiprocket did not issue a carrier AWB number.');
    }

    return {
      providerName: 'SHIPROCKET',
      providerShipmentId: String(data.shipment_id),
      providerOrderId: String(data.order_id || req.suborderNumber),
      courier: String(assigned.courier_name || 'Shiprocket Carrier'),
      trackingNumber: String(assigned.awb_code),
      labelUrl: assigned.label_url || undefined,
      shippingCost: Number(assigned.freight_charges || 0),
    };
  }

  async trackShipment(trackingNumber: string): Promise<ShippingProviderTrackResult> {
    const token = await this.authenticate();
    const resp = await fetch(
      `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${encodeURIComponent(trackingNumber)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data?.message || `Shiprocket tracking lookup failed (${resp.status}).`);
    }
    const trackingData = data?.tracking_data;
    const rawActivities = Array.isArray(trackingData?.shipment_track_activities)
      ? trackingData.shipment_track_activities
      : [];

    const currentStatusRaw = String(trackingData?.shipment_track?.[0]?.current_status || '').toUpperCase();
    let status: ShipmentLifecycleStatus = 'IN_TRANSIT';
    if (currentStatusRaw.includes('DELIVERED') && !currentStatusRaw.includes('RTO')) status = 'DELIVERED';
    else if (currentStatusRaw.includes('OUT FOR DELIVERY')) status = 'OUT_FOR_DELIVERY';
    else if (currentStatusRaw.includes('RTO')) status = 'RTO_INITIATED';
    else if (currentStatusRaw.includes('PICKED')) status = 'PICKED_UP';

    return {
      status,
      events: rawActivities.map((act: any) => ({
        event: String(act.activity || act['sr-status-label'] || 'Scan update'),
        location: String(act.location || 'Transit Hub'),
        eventDate: String(act.date || new Date().toISOString()),
      })),
    };
  }
}

const defaultShiprocketProvider = new ShiprocketShippingProvider();
let overrideShippingProviderForTest: ShippingProvider | null = null;

export function setShippingProviderForTesting(provider: ShippingProvider | null) {
  overrideShippingProviderForTest = provider;
}

export function getActiveShippingProvider(): ShippingProvider {
  return overrideShippingProviderForTest || defaultShiprocketProvider;
}

export const shipments = new Map<string, ShipmentRecord>();
export const deliveryOtps = new Map<string, DeliveryOtpRecord>(); // key shipmentId

export async function createCarrierShipment(params: {
  orderId: string;
  sellerOrderId?: string;
  sellerId: string;
  warehouseId: string;
  suborderNumber: string;
  destination: { fullName: string; phone: string; street: string; city: string; state: string; pinCode: string };
  items: Array<{ title: string; sku: string; quantity: number; unitPrice: number }>;
  weightGrams: number;
  paymentMethod: string;
  orderTotal: number;
}): Promise<ShipmentRecord> {
  ensureWarehousesSeeded();
  const wh = warehouses.get(params.warehouseId);
  if (!wh) throw new Error('Pickup warehouse not found.');

  const provider = getActiveShippingProvider();
  if (!provider.isConfigured()) {
    throw new Error(
      `Cannot generate shipping label or AWB: ${provider.name} carrier credentials are not configured.`
    );
  }

  const carrierRes = await provider.createShipment({
    orderId: params.orderId,
    suborderNumber: params.suborderNumber,
    pickupWarehouse: wh,
    destination: params.destination,
    items: params.items,
    weightGrams: params.weightGrams,
    paymentMethod: params.paymentMethod,
    orderTotal: params.orderTotal,
  });

  if (!carrierRes.trackingNumber) {
    throw new Error('Shipping carrier returned an empty tracking number.');
  }

  const now = new Date().toISOString();
  const shipment: ShipmentRecord = {
    id: `shp_${crypto.randomBytes(5).toString('hex')}`,
    orderId: params.orderId,
    sellerOrderId: params.sellerOrderId,
    sellerId: params.sellerId,
    warehouseId: wh.id,
    providerName: carrierRes.providerName,
    providerShipmentId: carrierRes.providerShipmentId,
    providerOrderId: carrierRes.providerOrderId,
    courier: carrierRes.courier,
    trackingNumber: carrierRes.trackingNumber,
    labelUrl: carrierRes.labelUrl,
    shippingCost: carrierRes.shippingCost,
    status: 'MANIFESTED',
    failedAttempts: 0,
    events: [
      {
        id: `shpev_${crypto.randomBytes(4).toString('hex')}`,
        event: `Manifested via ${carrierRes.courier} (AWB: ${carrierRes.trackingNumber})`,
        location: `${wh.city}, ${wh.state}`,
        eventDate: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  shipments.set(shipment.id, shipment);
  return shipment;
}

export async function syncShipmentTracking(shipmentId: string): Promise<ShipmentRecord> {
  const shp = shipments.get(shipmentId);
  if (!shp) throw new Error('Shipment not found.');

  const provider = getActiveShippingProvider();
  if (!provider.isConfigured()) {
    throw new Error(`Shipping carrier ${provider.name} is not configured.`);
  }

  const track = await provider.trackShipment(shp.trackingNumber);
  shp.status = track.status;
  if (track.status === 'DELIVERED' && !shp.deliveredAt) {
    shp.deliveredAt = new Date().toISOString();
  }
  if (track.events.length > 0) {
    shp.events = track.events.map((ev) => ({
      id: `shpev_${crypto.randomBytes(4).toString('hex')}`,
      ...ev,
    }));
  }
  shp.updatedAt = new Date().toISOString();
  return shp;
}

export function markShipmentFailedOrRto(params: {
  shipmentId: string;
  action: 'FAILED_ATTEMPT' | 'RTO_INITIATED' | 'RTO_DELIVERED';
  reason: string;
  actorId: string;
}): ShipmentRecord {
  const shp = shipments.get(params.shipmentId);
  if (!shp) throw new Error('Shipment not found.');

  const now = new Date().toISOString();
  if (params.action === 'FAILED_ATTEMPT') {
    shp.failedAttempts += 1;
    shp.status = shp.failedAttempts >= 3 ? 'RTO_INITIATED' : 'FAILED';
    if (shp.status === 'RTO_INITIATED') shp.rtoReason = params.reason || 'Max delivery attempts exceeded';
  } else {
    shp.status = params.action;
    shp.rtoReason = params.reason;
  }

  shp.events.push({
    id: `shpev_${crypto.randomBytes(4).toString('hex')}`,
    event: `${shp.status}: ${params.reason}`,
    location: 'Destination Logistics Hub',
    eventDate: now,
  });
  shp.updatedAt = now;
  return shp;
}

// =============================================================================
// CRYPTOGRAPHIC DELIVERY OTP (SCRYPT HASHED, EXPIRY, MAX ATTEMPTS, LOCKOUT)
// =============================================================================

export type DeliveryOtpDispatcher = (payload: {
  orderId: string;
  shipmentId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  otpPlain: string;
  expiresAt: string;
}) => Promise<{ delivered: boolean; channel: 'EMAIL' | 'SMS'; error?: string }>;

let deliveryOtpDispatcherHook: DeliveryOtpDispatcher | null = null;
export function setDeliveryOtpDispatcher(fn: DeliveryOtpDispatcher | null) {
  deliveryOtpDispatcherHook = fn;
}

export async function generateAndDispatchDeliveryOtp(params: {
  shipmentId: string;
  orderId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  actorId: string;
}): Promise<{ otpRecord: Omit<DeliveryOtpRecord, 'otpHash'>; dispatched: boolean; channel: 'EMAIL' | 'SMS' }> {
  const shp = shipments.get(params.shipmentId);
  if (!shp) throw new Error('Shipment not found.');

  // Invalidate any previous OTPs for this shipment
  const prev = deliveryOtps.get(params.shipmentId);
  if (prev) {
    prev.isInvalidated = true;
  }

  const otpPlain = String(crypto.randomInt(100000, 1000000));
  const ttlMinutes = Math.max(5, Number(process.env.DELIVERY_OTP_TTL_MINUTES) || 60);
  const maxAttempts = Math.max(3, Number(process.env.DELIVERY_OTP_MAX_ATTEMPTS) || 5);
  const now = Date.now();
  const expiresAt = new Date(now + ttlMinutes * 60 * 1000).toISOString();
  const channel: 'EMAIL' | 'SMS' = params.recipientEmail ? 'EMAIL' : 'SMS';

  const record: DeliveryOtpRecord = {
    id: `dotp_${crypto.randomBytes(5).toString('hex')}`,
    orderId: params.orderId,
    shipmentId: params.shipmentId,
    otpHash: hashPassword(otpPlain),
    channel,
    expiresAt,
    attemptCount: 0,
    maxAttempts,
    lockedUntil: null,
    verifiedAt: null,
    verifiedBy: null,
    isInvalidated: false,
    createdAt: new Date(now).toISOString(),
  };

  deliveryOtps.set(params.shipmentId, record);
  shp.status = 'OUT_FOR_DELIVERY';
  shp.events.push({
    id: `shpev_${crypto.randomBytes(4).toString('hex')}`,
    event: 'Out for delivery — cryptographic verification OTP dispatched',
    location: 'Last-Mile Hub',
    eventDate: new Date(now).toISOString(),
  });

  let dispatched = false;
  if (deliveryOtpDispatcherHook) {
    const res = await deliveryOtpDispatcherHook({
      orderId: params.orderId,
      shipmentId: params.shipmentId,
      recipientEmail: params.recipientEmail,
      recipientPhone: params.recipientPhone,
      otpPlain,
      expiresAt,
    });
    dispatched = res.delivered;
  }

  const { otpHash: _ignoredHash, ...safeOtp } = record;
  return { otpRecord: safeOtp, dispatched, channel };
}

export function verifyDeliveryOtp(params: {
  shipmentId: string;
  otp: string;
  verifiedBy: string;
}): { verified: boolean; shipment: ShipmentRecord; otpStatus: Omit<DeliveryOtpRecord, 'otpHash'> } {
  const shp = shipments.get(params.shipmentId);
  if (!shp) throw new Error('Shipment not found.');

  const record = deliveryOtps.get(params.shipmentId);
  if (!record || record.isInvalidated) {
    throw new Error('No active delivery OTP exists for this shipment. Please regenerate.');
  }
  if (record.verifiedAt) {
    throw new Error('Delivery OTP has already been verified and consumed.');
  }
  if (record.lockedUntil && Date.now() < new Date(record.lockedUntil).getTime()) {
    throw new Error('Delivery OTP verification is temporarily locked due to too many failed attempts.');
  }
  if (Date.now() > new Date(record.expiresAt).getTime()) {
    throw new Error('Delivery OTP has expired. Please generate a new delivery OTP.');
  }

  const cleanOtp = String(params.otp || '').trim();
  const matches = verifyPassword(cleanOtp, record.otpHash);

  if (!matches) {
    record.attemptCount += 1;
    if (record.attemptCount >= record.maxAttempts) {
      const lockMinutes = Math.max(5, Number(process.env.DELIVERY_OTP_LOCKOUT_MINUTES) || 15);
      record.lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000).toISOString();
    }
    throw new Error(
      record.lockedUntil
        ? 'Maximum OTP attempts exceeded. Verification locked.'
        : `Invalid delivery OTP (${record.attemptCount}/${record.maxAttempts} attempts used).`
    );
  }

  const now = new Date().toISOString();
  record.verifiedAt = now;
  record.verifiedBy = params.verifiedBy;
  record.isInvalidated = true;

  shp.status = 'DELIVERED';
  shp.deliveredAt = now;
  shp.updatedAt = now;
  shp.events.push({
    id: `shpev_${crypto.randomBytes(4).toString('hex')}`,
    event: 'Delivered — verified via Delivery OTP',
    location: 'Customer Doorstep',
    eventDate: now,
  });

  const { otpHash: _h, ...safeOtp } = record;
  return { verified: true, shipment: shp, otpStatus: safeOtp };
}

export function adminOverrideDeliveryOtp(params: {
  shipmentId: string;
  reason: string;
  adminId: string;
  adminName: string;
}) {
  if (!params.reason || params.reason.trim().length < 5) {
    throw new Error('Mandatory audit reason (at least 5 characters) is required for delivery OTP override.');
  }
  const shp = shipments.get(params.shipmentId);
  if (!shp) throw new Error('Shipment not found.');

  const now = new Date().toISOString();
  const record = deliveryOtps.get(params.shipmentId);
  if (record) {
    record.verifiedAt = now;
    record.verifiedBy = params.adminId;
    record.overrideBy = params.adminId;
    record.overrideReason = params.reason.trim();
    record.isInvalidated = true;
  }

  const prevStatus = shp.status;
  shp.status = 'DELIVERED';
  shp.deliveredAt = now;
  shp.updatedAt = now;
  shp.events.push({
    id: `shpev_${crypto.randomBytes(4).toString('hex')}`,
    event: `Delivered via Audited Admin Override (${params.adminName})`,
    location: 'Admin Fulfillment Desk',
    eventDate: now,
  });

  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.adminId,
    actorName: params.adminName,
    actorRole: 'ADMIN',
    action: 'DELIVERY_OTP_OVERRIDDEN',
    entityType: 'SHIPMENT',
    entityId: shp.id,
    beforeState: { status: prevStatus },
    afterState: { status: 'DELIVERED', overrideBy: params.adminId },
    reason: params.reason.trim(),
    details: `Overrode delivery OTP for shipment ${shp.trackingNumber}: ${params.reason.trim()}`,
    legacyAuditSink: dbAuditLogs,
  });

  return shp;
}
