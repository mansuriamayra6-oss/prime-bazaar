import express from 'express';
import crypto from 'crypto';

// =============================================================================
// PRICE ALERT DATABASE ENTITY & BACKGROUND WORKER
// Mirrors Prisma model `PriceAlert` & `Notification`
// =============================================================================

export type PriceAlertStatus = 'ACTIVE' | 'TRIGGERED' | 'PAUSED' | 'CANCELLED';

export interface DBPriceAlert {
  id: string;
  userId: string;
  productId: string;
  productTitle: string;
  productImage?: string;
  initialPrice: number;
  targetPrice?: number;
  currentPrice: number;
  lowestPriceSeen: number;
  notifyOnAnyDrop: boolean;
  status: PriceAlertStatus;
  lastCheckedAt?: string;
  triggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBPriceDropNotification {
  id: string;
  alertId: string;
  userId: string;
  productId: string;
  productTitle: string;
  productImage?: string;
  oldPrice: number;
  newPrice: number;
  dropAmount: number;
  dropPercent: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DBTrackedProduct {
  id: string;
  title: string;
  price: number;
  originalPrice: number;
  image: string;
  updatedAt: string;
}

// Persistent In-Memory Entity Tables (mirrors `price_alerts` & `notifications` tables)
export const dbPriceAlerts = new Map<string, DBPriceAlert>();
export const dbPriceNotifications: DBPriceDropNotification[] = [];
export const dbTrackedProducts = new Map<string, DBTrackedProduct>();

// Worker Telemetry State
let workerTimer: NodeJS.Timeout | null = null;
const WORKER_INTERVAL_MS = 15000; // Runs background sweep every 15 seconds

export const workerState = {
  isRunning: false,
  intervalMs: WORKER_INTERVAL_MS,
  lastRunAt: null as string | null,
  totalChecksRun: 0,
  alertsTriggeredCount: 0,
};

function generateAlertId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
}

/**
 * Core background worker sweep: checks all ACTIVE price alerts against latest
 * tracked product catalog prices and creates notifications on price drops.
 */
export function runPriceCheckCycle(triggerSource: string = 'scheduled_worker'): {
  checkedCount: number;
  triggeredNotifications: DBPriceDropNotification[];
  checkedAt: string;
} {
  const now = new Date().toISOString();
  let checkedCount = 0;
  const triggeredNotifications: DBPriceDropNotification[] = [];

  for (const alert of dbPriceAlerts.values()) {
    if (alert.status !== 'ACTIVE') continue;

    checkedCount += 1;
    alert.lastCheckedAt = now;

    const tracked = dbTrackedProducts.get(alert.productId);
    if (!tracked) continue;

    const latestPrice = Number(tracked.price);
    if (!Number.isFinite(latestPrice) || latestPrice <= 0) continue;

    const baselinePrice = alert.currentPrice;
    const isTargetHit =
      typeof alert.targetPrice === 'number' && alert.targetPrice > 0
        ? latestPrice <= alert.targetPrice
        : false;
    const isAnyDropHit = alert.notifyOnAnyDrop && latestPrice < baselinePrice;

    if ((isTargetHit && latestPrice < baselinePrice) || isAnyDropHit) {
      const dropAmount = Math.max(1, Math.round(baselinePrice - latestPrice));
      const dropPercent = Math.max(1, Math.round((dropAmount / baselinePrice) * 100));

      alert.currentPrice = latestPrice;
      alert.lowestPriceSeen = Math.min(alert.lowestPriceSeen, latestPrice);
      alert.status = 'TRIGGERED';
      alert.triggeredAt = now;
      alert.updatedAt = now;

      const notification: DBPriceDropNotification = {
        id: generateAlertId('pdn'),
        alertId: alert.id,
        userId: alert.userId,
        productId: alert.productId,
        productTitle: tracked.title || alert.productTitle,
        productImage: tracked.image || alert.productImage,
        oldPrice: baselinePrice,
        newPrice: latestPrice,
        dropAmount,
        dropPercent,
        message: `Price Drop Alert! "${tracked.title || alert.productTitle}" dropped ${dropPercent}% from ₹${baselinePrice.toLocaleString('en-IN')} to ₹${latestPrice.toLocaleString('en-IN')}!`,
        isRead: false,
        createdAt: now,
      };

      dbPriceNotifications.unshift(notification);
      triggeredNotifications.push(notification);
      workerState.alertsTriggeredCount += 1;
    } else if (latestPrice !== alert.currentPrice) {
      // Price changed (e.g. increased), update tracked price snapshot
      alert.currentPrice = latestPrice;
      alert.lowestPriceSeen = Math.min(alert.lowestPriceSeen, latestPrice);
      alert.updatedAt = now;
    }
  }

  workerState.lastRunAt = now;
  workerState.totalChecksRun += 1;

  if (triggeredNotifications.length > 0) {
    console.log(
      `[PriceAlertWorker:${triggerSource}] Checked ${checkedCount} active alerts — triggered ${triggeredNotifications.length} price-drop notifications!`
    );
  }

  return {
    checkedCount,
    triggeredNotifications,
    checkedAt: now,
  };
}

/**
 * Starts the periodic background price-check worker.
 */
export function startPriceAlertWorker(): void {
  if (workerTimer) return;
  workerState.isRunning = true;
  console.log(`[PriceAlertWorker] Background price-drop monitor started (interval: ${WORKER_INTERVAL_MS / 1000}s)`);

  // Run an initial sweep shortly after startup
  setTimeout(() => runPriceCheckCycle('startup'), 2000);

  workerTimer = setInterval(() => {
    runPriceCheckCycle('scheduled_worker');
  }, WORKER_INTERVAL_MS);
}

export function stopPriceAlertWorker(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
  workerState.isRunning = false;
}

// =============================================================================
// EXPRESS ROUTER FOR PRICE ALERTS & WORKER CONTROLS
// =============================================================================

export const priceAlertRouter = express.Router();

function countActiveAlerts(): number {
  let count = 0;
  for (const alert of dbPriceAlerts.values()) {
    if (alert.status === 'ACTIVE') count += 1;
  }
  return count;
}

// GET /api/price-alerts?userId=...
priceAlertRouter.get('/', (req, res) => {
  const userId = String(req.query.userId || 'guest-user');
  const userAlerts = Array.from(dbPriceAlerts.values()).filter(a => a.userId === userId);
  const userNotifications = dbPriceNotifications.filter(n => n.userId === userId);

  res.json({
    success: true,
    alerts: userAlerts,
    notifications: userNotifications,
    unreadCount: userNotifications.filter(n => !n.isRead).length,
    workerStatus: {
      ...workerState,
      activeAlertsCount: countActiveAlerts(),
    },
  });
});

// POST /api/price-alerts — Subscribe or update alert for a wishlisted product
priceAlertRouter.post('/', (req, res) => {
  const {
    userId = 'guest-user',
    productId,
    productTitle,
    productImage,
    currentPrice,
    targetPrice,
    notifyOnAnyDrop = true,
  } = req.body;

  if (!productId || !currentPrice) {
    return res.status(400).json({ error: 'productId and currentPrice are required' });
  }

  const numericPrice = Number(currentPrice);
  const numericTarget = targetPrice ? Number(targetPrice) : undefined;
  const key = `${userId}:${productId}`;
  const now = new Date().toISOString();

  // Ensure product is tracked for background checks
  dbTrackedProducts.set(productId, {
    id: productId,
    title: productTitle || 'Wishlisted Product',
    price: numericPrice,
    originalPrice: numericPrice,
    image: productImage || '',
    updatedAt: now,
  });

  const existing = dbPriceAlerts.get(key);
  const alert: DBPriceAlert = existing
    ? {
        ...existing,
        productTitle: productTitle || existing.productTitle,
        productImage: productImage || existing.productImage,
        initialPrice: numericPrice,
        currentPrice: numericPrice,
        targetPrice: numericTarget,
        notifyOnAnyDrop,
        status: 'ACTIVE',
        updatedAt: now,
      }
    : {
        id: generateAlertId('pa'),
        userId,
        productId,
        productTitle: productTitle || 'Wishlisted Product',
        productImage,
        initialPrice: numericPrice,
        targetPrice: numericTarget,
        currentPrice: numericPrice,
        lowestPriceSeen: numericPrice,
        notifyOnAnyDrop,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      };

  dbPriceAlerts.set(key, alert);

  res.status(201).json({
    success: true,
    message: `Price drop alert activated for ${alert.productTitle}`,
    alert,
    workerStatus: {
      ...workerState,
      activeAlertsCount: countActiveAlerts(),
    },
  });
});

// DELETE /api/price-alerts/:productId?userId=...
priceAlertRouter.delete('/:productId', (req, res) => {
  const userId = String(req.query.userId || req.body?.userId || 'guest-user');
  const { productId } = req.params;
  const key = `${userId}:${productId}`;

  const existed = dbPriceAlerts.delete(key);
  res.json({
    success: true,
    removed: existed,
    message: existed ? 'Price drop alert removed.' : 'No active alert found.',
  });
});

// POST /api/price-alerts/sync-products — Sync frontend product catalog prices to backend tracker
priceAlertRouter.post('/sync-products', (req, res) => {
  const { products } = req.body;
  if (!Array.isArray(products)) {
    return res.status(400).json({ error: 'products array required' });
  }

  const now = new Date().toISOString();
  for (const p of products) {
    if (!p?.id || typeof p.price !== 'number') continue;
    dbTrackedProducts.set(p.id, {
      id: p.id,
      title: p.title || 'Product',
      price: Number(p.price),
      originalPrice: Number(p.originalPrice || p.price),
      image: p.image || (Array.isArray(p.images) ? p.images[0] : ''),
      updatedAt: now,
    });
  }

  const sweep = runPriceCheckCycle('catalog_sync');
  res.json({
    success: true,
    syncedCount: products.length,
    sweep,
  });
});

// PATCH /api/price-alerts/products/:productId/price — Update product price & immediately check alerts
priceAlertRouter.patch('/products/:productId/price', (req, res) => {
  const { productId } = req.params;
  const { newPrice, title, image } = req.body;
  const numericPrice = Number(newPrice);

  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({ error: 'Valid positive newPrice required' });
  }

  const existing = dbTrackedProducts.get(productId);
  dbTrackedProducts.set(productId, {
    id: productId,
    title: title || existing?.title || 'Product',
    price: numericPrice,
    originalPrice: existing?.originalPrice || numericPrice,
    image: image || existing?.image || '',
    updatedAt: new Date().toISOString(),
  });

  const sweep = runPriceCheckCycle('price_change');
  res.json({
    success: true,
    productId,
    newPrice: numericPrice,
    sweep,
  });
});

// POST /api/price-alerts/worker/run — Trigger immediate check (or simulate a drop on a wishlisted product)
priceAlertRouter.post('/worker/run', (req, res) => {
  const { simulateDropProductId, dropPercent = 15 } = req.body || {};
  let simulatedProduct: DBTrackedProduct | null = null;

  if (simulateDropProductId) {
    const tracked = dbTrackedProducts.get(simulateDropProductId);
    if (tracked) {
      const reducedPrice = Math.max(99, Math.round(tracked.price * (1 - dropPercent / 100)));
      tracked.price = reducedPrice;
      tracked.updatedAt = new Date().toISOString();
      dbTrackedProducts.set(simulateDropProductId, tracked);
      simulatedProduct = { ...tracked };
    }
  }

  const sweep = runPriceCheckCycle(simulateDropProductId ? 'simulated_price_drop' : 'manual_trigger');
  res.json({
    success: true,
    simulatedProduct,
    sweep,
    workerStatus: {
      ...workerState,
      activeAlertsCount: countActiveAlerts(),
    },
  });
});

// POST /api/price-alerts/notifications/:id/read
priceAlertRouter.post('/notifications/:id/read', (req, res) => {
  const notif = dbPriceNotifications.find(n => n.id === req.params.id);
  if (notif) {
    notif.isRead = true;
  }
  res.json({ success: true });
});

// POST /api/price-alerts/notifications/read-all
priceAlertRouter.post('/notifications/read-all', (req, res) => {
  const userId = String(req.body?.userId || 'guest-user');
  for (const n of dbPriceNotifications) {
    if (n.userId === userId) {
      n.isRead = true;
    }
  }
  res.json({ success: true });
});
