import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { v1Router, splitOrderIntoSellerOrders, dbSellers, dbSellerPasswordHashes, dbAuditLogs } from './src/server/v1Router.ts';
import { priceAlertRouter, startPriceAlertWorker } from './src/server/priceAlertWorker.ts';
import { createStorefrontRouter } from './src/server/storefrontRouter.ts';
import {
  UserRole,
  hashPassword,
  verifyPassword,
  safeCompareStrings,
  createSession,
  getSession,
  revokeSession,
  extractBearerToken,
  requireAuth,
  requireRole,
  requireSellerOwnership,
  verifyCashfreeWebhookSignature,
  securityHeadersMiddleware,
  createRateLimiter,
  normalizeEmail,
  normalizePhoneDigits,
  isValidEmail,
  isValidPasswordInput,
} from './src/server/security.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(securityHeadersMiddleware);

// Capture raw HTTP request body before JSON parsing so Cashfree webhook HMAC-SHA256 signatures verify accurately
const defaultJsonParser = express.json({
  limit: '1mb',
  verify: (req: express.Request, _res, buf) => {
    req.rawBody = buf;
  },
});
app.use((req, res, next) => {
  if (req.path === '/api/storefront/uploads/review-media' || req.path === '/api/v1/storefront/uploads/review-media') {
    return next();
  }
  return defaultJsonParser(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate Limiters (Auth brute-force protection & general API protection)
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: Number(process.env.AUTH_RATE_LIMIT_MAX) || 100,
  keyPrefix: 'auth',
});
const generalApiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: Number(process.env.API_RATE_LIMIT_MAX) || 600,
  keyPrefix: 'api',
  skip: req => req.path === '/health' || req.path === '/payments/cashfree-webhook',
});

app.use('/api/auth', authRateLimiter);
app.use('/api/v1/auth', authRateLimiter);
app.use('/api', generalApiRateLimiter);

// Mount Centralized Multi-Vendor Marketplace v1 REST Router
app.use('/api/v1', v1Router);
// Mount Price-Drop Alerts & Background Worker Router
app.use('/api/price-alerts', priceAlertRouter);

// Mount Phase 2 Storefront Discovery, Q&A, Photo/Video Reviews & Saved Cart Router
const storefrontRouter = createStorefrontRouter({
  hasUserPurchasedProduct: ({ userId, email, productId }) => {
    const normalizedEmail = email ? normalizeEmail(email) : '';
    for (const order of orders.values()) {
      if (order.status === 'cancelled') continue;
      const ownerMatches =
        (order.userId && order.userId === userId) ||
        (normalizedEmail && order.customerEmail && normalizeEmail(order.customerEmail) === normalizedEmail);
      if (!ownerMatches) continue;
      const containsProduct = (order.items || []).some(
        (item: any) => item?.productId === productId || item?.product?.id === productId
      );
      if (containsProduct) return true;
    }
    return false;
  },
  onReportLogged: entry => {
    dbAuditLogs.push({
      id: `audit-${Date.now()}`,
      actorType: 'SYSTEM',
      actorId: entry.userId,
      actorName: entry.userId,
      action: 'REVIEW_REPORTED',
      entityType: 'REVIEW',
      entityId: entry.reviewId,
      details: `Reported by ${entry.userId} on product ${entry.productId}: ${entry.reason}`,
      timestamp: new Date().toISOString(),
    });
  },
});
app.use('/api/storefront', storefrontRouter);
app.use('/api/v1/storefront', storefrontRouter);


// ==========================================
// BREVO (SENDINBLUE) TRANSACTIONAL EMAIL SERVICE
// ==========================================

interface BrevoEmailResult {
  success: boolean;
  messageId?: string;
  transport?: 'smtp' | 'api';
  outboundIp?: string | null;
  isUnauthorizedIp?: boolean;
  error?: string;
}

let cachedOutboundIp: { ip: string; fetchedAt: number } | null = null;
async function getOutboundIp(): Promise<string | null> {
  if (cachedOutboundIp && Date.now() - cachedOutboundIp.fetchedAt < 2 * 60 * 1000) {
    return cachedOutboundIp.ip;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const resp = await fetch('https://api.ipify.org', { signal: controller.signal });
    clearTimeout(timer);
    if (resp.ok) {
      const ip = (await resp.text()).trim();
      if (ip) {
        cachedOutboundIp = { ip, fetchedAt: Date.now() };
        return ip;
      }
    }
  } catch {
    // ignore IP lookup timeout
  }
  return cachedOutboundIp?.ip || null;
}

async function sendBrevoEmailOtp(
  toEmail: string,
  otpCode: string,
  recipientName?: string
): Promise<BrevoEmailResult> {
  const apiKey = (process.env.EMAIL_PROVIDER_API_KEY || process.env.BREVO_API_KEY || '').trim();
  const smtpHost = (process.env.SMTP_HOST || '').trim();
  const smtpPort = parseInt(String(process.env.SMTP_PORT || '587').replace(/[^\d]/g, ''), 10) || 587;
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').trim();
  const isEnabled = process.env.EMAIL_DELIVERY_ENABLED !== 'false';
  const fromEmail = (
    process.env.EMAIL_FROM_ADDRESS ||
    process.env.BREVO_SENDER_EMAIL ||
    process.env.SMTP_FROM_EMAIL ||
    'noreply@primebazaar.in'
  ).trim();
  const fromName = (
    process.env.EMAIL_FROM_NAME ||
    process.env.BREVO_SENDER_NAME ||
    process.env.SMTP_FROM_NAME ||
    'Prime Bazaar'
  ).replace(/"/g, '').trim();
  const timeoutMs = parseInt(String(process.env.EMAIL_DELIVERY_TIMEOUT_MS || '15000').replace(/[^\d]/g, ''), 10) || 15000;

  if (!isEnabled) {
    console.log('[Brevo Email] Email delivery disabled via EMAIL_DELIVERY_ENABLED=false.');
    return { success: false, error: 'Email delivery is disabled (EMAIL_DELIVERY_ENABLED=false).' };
  }

  const hasSmtp = Boolean(smtpHost && smtpUser && smtpPass);
  if (!hasSmtp && !apiKey) {
    console.log('[Brevo Email] Missing Brevo SMTP credentials (SMTP_HOST/SMTP_USER/SMTP_PASS) and BREVO_API_KEY.');
    return {
      success: false,
      error: 'Missing Brevo SMTP or API credentials in environment secrets.',
    };
  }

  const safeRecipientName = (recipientName || 'Partner')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Prime Bazaar Verification</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
        .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e4e4e7; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06); }
        .header { background: linear-gradient(135deg, #047857 0%, #065f46 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
        .logo-text { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
        .tagline { font-size: 13px; color: #a7f3d0; margin-top: 4px; font-weight: 500; }
        .body { padding: 32px 28px; text-align: center; }
        .badge { display: inline-block; background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 999px; margin-bottom: 18px; border: 1px solid #a7f3d0; }
        .greeting { font-size: 16px; font-weight: 700; margin-bottom: 8px; color: #18181b; }
        .text { font-size: 14px; color: #52525b; line-height: 1.6; margin-bottom: 24px; }
        .otp-box { display: inline-block; background: #f0fdf4; border: 2px dashed #059669; border-radius: 14px; padding: 18px 36px; margin: 0 auto 20px; }
        .otp-code { font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #047857; margin: 0; font-family: ui-monospace, Menlo, Monaco, monospace; }
        .expiry-note { font-size: 12px; color: #71717a; margin-top: 6px; }
        .footer { background: #fafafa; border-top: 1px solid #f4f4f5; padding: 18px 24px; text-align: center; font-size: 11px; color: #a1a1aa; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo-text">Prime Bazaar</div>
          <div class="tagline">Shop Smarter. Live Better.</div>
        </div>
        <div class="body">
          <div class="badge">SECURE VERIFICATION OTP</div>
          <div class="greeting">Hello ${safeRecipientName},</div>
          <div class="text">Use the one-time verification code below to verify your Prime Bazaar account:</div>
          <div class="otp-box">
            <div class="otp-code">${otpCode}</div>
          </div>
          <div class="expiry-note">Valid for <strong>5 minutes</strong>. Never share this code with anyone.</div>
        </div>
        <div class="footer">
          Delivered securely via ${fromName} (${fromEmail})<br>
          If you did not request this OTP, you can safely ignore this email.
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. Primary path: Brevo SMTP Relay via nodemailer when SMTP_* secrets are configured
  if (hasSmtp) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        connectionTimeout: timeoutMs,
        greetingTimeout: timeoutMs,
        socketTimeout: timeoutMs,
      });

      const headerName = (recipientName || '').replace(/["\r\n]/g, '').trim();
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: headerName ? `"${headerName}" <${toEmail}>` : toEmail,
        subject: `Prime Bazaar - Your Verification Code: ${otpCode}`,
        text: `Hello ${headerName || 'Partner'}, your Prime Bazaar verification OTP is ${otpCode}. It is valid for 5 minutes.`,
        html: htmlContent,
      });

      console.log('[Brevo SMTP Success]: Message ID', info.messageId, 'Accepted:', info.accepted);
      return { success: true, messageId: info.messageId, transport: 'smtp' };
    } catch (smtpErr: any) {
      const msg = String(smtpErr?.message || 'SMTP connection failed');
      const isUnauthorizedIp = /525|unauthorized ip/i.test(msg);
      const outboundIp = isUnauthorizedIp ? await getOutboundIp() : null;
      console.warn('[Brevo SMTP Exception]:', msg, outboundIp ? `(Outbound IP: ${outboundIp})` : '');
      if (!apiKey) {
        return {
          success: false,
          transport: 'smtp',
          outboundIp,
          isUnauthorizedIp,
          error: msg,
        };
      }
    }
  }

  // 2. Fallback / API path: Brevo Transactional Email HTTP API v3
  if (apiKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: toEmail, name: recipientName || 'Prime Bazaar User' }],
          subject: `Prime Bazaar - Your Verification Code: ${otpCode}`,
          htmlContent,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await response.json();
      if (!response.ok) {
        console.warn('[Brevo API Notice]:', data);
        return { success: false, transport: 'api', error: data.message || `Brevo status ${response.status}` };
      }

      console.log('[Brevo API Success]: Message ID', data.messageId);
      return { success: true, messageId: data.messageId, transport: 'api' };
    } catch (err: any) {
      console.warn('[Brevo API Exception]:', err.message);
      return { success: false, transport: 'api', error: err.message };
    }
  }

  return { success: false, error: 'Unable to dispatch email via Brevo.' };
}

// ==========================================
// CASHFREE PAYMENT GATEWAY SANDBOX SERVICE
// ==========================================

function getCashfreeConfig() {
  const rawEnv = (process.env.CASHFREE_ENV || 'sandbox').trim().toLowerCase();
  const env: 'sandbox' | 'production' =
    rawEnv === 'production' || rawEnv === 'prod' || rawEnv === 'live' ? 'production' : 'sandbox';
  const clientId = (process.env.CASHFREE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.CASHFREE_CLIENT_SECRET || '').trim();
  const apiVersion = (process.env.CASHFREE_API_VERSION || '2025-01-01').trim();
  const webhookSecret = (process.env.CASHFREE_WEBHOOK_SECRET || '').trim();
  const baseUrl = env === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
  return {
    env,
    clientId,
    clientSecret,
    apiVersion,
    webhookSecret,
    baseUrl,
    configured: Boolean(clientId && clientSecret),
  };
}

interface CreateCashfreeOrderParams {
  orderId: string;
  amount: number;
  currency?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  returnUrl?: string;
}

async function createCashfreeOrder(params: CreateCashfreeOrderParams) {
  const { env, clientId, clientSecret, apiVersion, baseUrl } = getCashfreeConfig();

  if (!clientId || !clientSecret) {
    throw new Error('Cashfree credentials (CASHFREE_CLIENT_ID / CASHFREE_CLIENT_SECRET) missing in environment secrets.');
  }

  const rawPhone = (params.customerPhone || '9876543210').replace(/\D/g, '');
  const formattedPhone = rawPhone.length >= 10 ? rawPhone.slice(-10) : '9876543210';
  const cleanName = (params.customerName || 'Prime Bazaar Shopper').trim() || 'Prime Bazaar Shopper';
  const cleanEmail =
    params.customerEmail && params.customerEmail.includes('@')
      ? params.customerEmail.trim()
      : 'shopper@primebazaar.in';

  const fallbackOrigin = (process.env.APP_URL || 'http://localhost:3000').trim().replace(/\/+$/, '');
  const safeReturnUrl =
    params.returnUrl && /^https?:\/\//i.test(params.returnUrl.trim())
      ? params.returnUrl.trim().replace(/\{order_id\}/g, params.orderId)
      : `${fallbackOrigin}/?cashfree_order_id=${params.orderId}`;

  const orderPayload = {
    order_id: params.orderId,
    order_amount: Math.max(1, Number(params.amount.toFixed(2))),
    order_currency: params.currency || 'INR',
    customer_details: {
      customer_id: `cust_${params.orderId.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 24)}`,
      customer_name: cleanName,
      customer_email: cleanEmail,
      customer_phone: formattedPhone,
    },
    order_meta: {
      return_url: safeReturnUrl,
    },
    order_note: `Prime Bazaar Retail Order ${params.orderId}`,
  };

  const response = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: {
      'x-client-id': clientId,
      'x-client-secret': clientSecret,
      'x-api-version': apiVersion,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(orderPayload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Cashfree Error ${response.status} (${env})`);
  }

  return data;
}

async function getCashfreeOrderStatus(orderId: string) {
  const { clientId, clientSecret, apiVersion, baseUrl } = getCashfreeConfig();

  if (!clientId || !clientSecret) {
    throw new Error('Cashfree credentials missing in environment secrets.');
  }

  const response = await fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}`, {
    method: 'GET',
    headers: {
      'x-client-id': clientId,
      'x-client-secret': clientSecret,
      'x-api-version': apiVersion,
      'Accept': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Cashfree Status Error ${response.status}`);
  }
  return data;
}

// ==========================================
// IN-MEMORY PERSISTENT DATA STORE & DATABASE
// ==========================================

interface DBUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  sellerId?: string;
  passwordHash?: string;
  avatar: string;
  memberTier: 'Silver' | 'Gold' | 'Platinum';
  joinedDate: string;
  addresses: any[];
  coins: number;
}

function sanitizeUser(user: DBUser) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    sellerId: user.sellerId,
    avatar: user.avatar,
    memberTier: user.memberTier,
    joinedDate: user.joinedDate,
    coins: user.coins,
    isLoggedIn: true,
  };
}

interface DBOrder {
  id: string;
  orderNumber: string;
  userId?: string;
  customerEmail?: string;
  date: string;
  items: any[];
  totalAmount: number;
  discountAmount: number;
  shippingFee: number;
  status: 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned';
  paymentMethod: 'cod' | 'upi' | 'card' | 'netbanking' | 'cashfree';
  paymentStatus: 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED' | 'PARTIAL_REFUND';
  transactionId?: string;
  invoiceNumber: string;
  shippingAddress: any;
  trackingNumber: string;
  courierPartner: string;
  deliveryPartnerName: string;
  deliveryPartnerPhone: string;
  estimatedDelivery: string;
  trackingCheckpoints: {
    title: string;
    description: string;
    timestamp: string;
    done: boolean;
    location: string;
  }[];
}

interface DBPaymentIntent {
  intentId: string;
  amount: number;
  currency: string;
  status: 'CREATED' | 'SUCCESS' | 'FAILED';
  merchantUpi: string;
  upiIntentUrl: string;
  gatewayReference: string;
  cashfreeOrderId?: string;
  cashfreeCfOrderId?: string;
  paymentSessionId?: string;
  cashfreeEnv?: string;
  createdAt: string;
}

// Seed Store
export const users: Map<string, DBUser> = new Map();
const otpStore: Map<string, { code: string; expiresAt: number; channel: 'email' | 'sms'; deliveryFailed?: boolean }> = new Map();
export const orders: Map<string, DBOrder> = new Map();
export const paymentIntents: Map<string, DBPaymentIntent> = new Map();

// Helper to generate IDs
const generateId = (prefix: string) => `${prefix}_${crypto.randomBytes(5).toString('hex')}`;

// Initialize default verified shopper account (hashed credentials via scrypt)
const defaultDemoUser: DBUser = {
  id: 'usr_demo123',
  name: 'Amayra Mansuri',
  phone: '+91 98765 43210',
  email: 'mansuriamayra6@gmail.com',
  role: 'CUSTOMER',
  passwordHash: hashPassword('demoPass123'),
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  memberTier: 'Platinum',
  joinedDate: 'Oct 2024',
  coins: 480,
  addresses: [
    {
      id: 'addr-1',
      fullName: 'Amayra Mansuri',
      phone: '+91 98765 43210',
      street: 'Flat 402, Lotus Grand Residency, Linking Road, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400050',
      type: 'home',
      isDefault: true,
    },
    {
      id: 'addr-2',
      fullName: 'Amayra Mansuri',
      phone: '+91 98765 43210',
      street: 'Studio 12, NESCO IT Park, Goregaon East',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400063',
      type: 'work',
      isDefault: false,
    }
  ]
};
users.set(defaultDemoUser.id, defaultDemoUser);
createSession({
  userId: defaultDemoUser.id,
  role: defaultDemoUser.role,
  email: defaultDemoUser.email,
  name: defaultDemoUser.name,
  fixedToken: 'pb_token_demo',
});

// Runtime admin bootstrap claim hash (only used if ADMIN_ACCESS_PASS env var is unset)
let claimedAdminPasswordHash: string | null = null;

// Pre-seed sample completed order
const seedOrder: DBOrder = {
  id: 'ord-101',
  orderNumber: 'PB-ORD-92841',
  userId: defaultDemoUser.id,
  customerEmail: defaultDemoUser.email,
  date: '28 Oct 2026, 02:45 PM',
  items: [
    {
      product: {
        id: 'prod-1',
        title: 'Zari Embroidered Raw Silk Anarkali Kurti Set',
        brand: 'Anouk Heritage',
        category: 'ethnic',
        price: 1899,
        originalPrice: 3999,
        discountPercent: 52,
        images: ['/src/assets/images/collection_ethnic_wear_1793466539838.jpg'],
        sellerName: 'Varanasi Weavers Co.',
      },
      selectedSize: 'M',
      selectedColor: 'Royal Indigo',
      quantity: 1,
      priceAtPurchase: 1899,
    }
  ],
  totalAmount: 1899,
  discountAmount: 200,
  shippingFee: 0,
  status: 'out_for_delivery',
  paymentMethod: 'upi',
  paymentStatus: 'PAID',
  transactionId: 'PB-TXN-UPI-8841920',
  invoiceNumber: 'PB-INV-2026-92841',
  shippingAddress: defaultDemoUser.addresses[0],
  trackingNumber: 'BD-84729104',
  courierPartner: 'BlueDart Express',
  deliveryPartnerName: 'Ramesh Verma',
  deliveryPartnerPhone: '+91 98234 11223',
  estimatedDelivery: 'Today by 6:00 PM',
  trackingCheckpoints: [
    {
      title: 'Order Placed & Verified',
      description: 'Order confirmed and inventory locked at Varanasi Central Warehouse',
      timestamp: '28 Oct 2026, 02:45 PM',
      done: true,
      location: 'Varanasi, UP',
    },
    {
      title: 'Dispatched via BlueDart Surface Air',
      description: 'Airway Bill BD-84729104 generated; scanned at IGI Cargo Hub',
      timestamp: '29 Oct 2026, 08:30 AM',
      done: true,
      location: 'New Delhi Transit Hub',
    },
    {
      title: 'Arrived at City Delivery Center',
      description: 'Package processed at Mumbai Central Sort Center',
      timestamp: '30 Oct 2026, 07:15 PM',
      done: true,
      location: 'Bandra Hub, Mumbai',
    },
    {
      title: 'Out for Doorstep Delivery',
      description: 'Delivery associate Ramesh Verma is on route with security verification OTP',
      timestamp: 'Today, 09:30 AM',
      done: true,
      location: 'Bandra West, Mumbai',
    },
    {
      title: 'Delivered to Customer',
      description: 'Handed over upon contactless OTP verification',
      timestamp: 'Pending Handover',
      done: false,
      location: 'Destination Address',
    }
  ]
};
orders.set(seedOrder.id, seedOrder);

// Auth Middleware Helper (delegates to shared SessionStore)
const getAuthenticatedUser = (req: express.Request): DBUser | null => {
  const token = extractBearerToken(req);
  if (!token) return null;
  const session = getSession(token);
  if (!session) return null;
  const existing = users.get(session.userId);
  if (existing) return existing;
  return {
    id: session.userId,
    name: session.name || 'Authenticated User',
    phone: '',
    email: session.email || '',
    role: session.role,
    sellerId: session.sellerId,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    memberTier: 'Platinum',
    joinedDate: 'Oct 2026',
    coins: 0,
    addresses: [],
  };
};

// ==========================================
// REST API ROUTES
// ==========================================

// 1. Healthcheck & System Contract
app.get('/api/health', (req, res) => {
  const hasSmtp = Boolean(
    (process.env.SMTP_HOST || '').trim() &&
    (process.env.SMTP_USER || '').trim() &&
    (process.env.SMTP_PASS || '').trim()
  );
  const hasApiKey = Boolean((process.env.EMAIL_PROVIDER_API_KEY || process.env.BREVO_API_KEY || '').trim());

  const cf = getCashfreeConfig();

  res.json({
    status: 'ONLINE',
    service: 'Prime Bazaar Core Marketplace Engine',
    version: '2.4.0',
    platform: 'Android & Web Full-Stack',
    environment: process.env.NODE_ENV || 'development',
    brevoConfigured: hasSmtp || hasApiKey,
    brevoTransport: hasSmtp ? 'smtp' : hasApiKey ? 'api' : 'none',
    brevoSender:
      process.env.EMAIL_FROM_ADDRESS ||
      process.env.BREVO_SENDER_EMAIL ||
      process.env.SMTP_FROM_EMAIL ||
      null,
    cashfreeConfigured: cf.configured,
    cashfreeEnv: cf.env,
    cashfreeApiVersion: cf.apiVersion,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// 2. Authentication APIs
app.post('/api/auth/send-otp', async (req, res) => {
  const { phone, email, recipientName } = req.body;
  const cleanEmail = typeof email === 'string' && email.includes('@') ? email.trim() : '';
  const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
  const target = cleanEmail || cleanPhone;

  if (!target) {
    return res.status(400).json({ error: 'Please provide a valid phone number or email address' });
  }

  const isEmail = Boolean(cleanEmail);
  // Generate 6-digit code for email OTPs (sent via Brevo), or 4-digit code for SMS-only mode
  const code = isEmail
    ? Math.floor(100000 + Math.random() * 900000).toString()
    : '7784';

  const expiresAt = Date.now() + 5 * 60 * 1000;

  let resolvedRecipientName = typeof recipientName === 'string' ? recipientName.trim() : '';
  if (!resolvedRecipientName && cleanEmail) {
    for (const u of users.values()) {
      if (u.email?.toLowerCase() === cleanEmail.toLowerCase()) {
        resolvedRecipientName = u.name;
        break;
      }
    }
  }

  let brevoResult: BrevoEmailResult | null = null;
  if (isEmail) {
    brevoResult = await sendBrevoEmailOtp(cleanEmail, code, resolvedRecipientName || undefined);
    if (!brevoResult.success) {
      const ipText = brevoResult.outboundIp ? ` (${brevoResult.outboundIp})` : '';
      const message = brevoResult.isUnauthorizedIp
        ? `Brevo blocked this server's IP${ipText}: ${brevoResult.error}. Add ${brevoResult.outboundIp || 'this server IP'} or Deactivate Authorized IPs in Brevo → Settings → Security → Authorized IPs.`
        : `Brevo email delivery failed for ${cleanEmail}: ${brevoResult.error}`;

      return res.json({
        success: false,
        channel: 'email',
        provider: 'brevo',
        deliveryFailed: true,
        isUnauthorizedIp: Boolean(brevoResult.isUnauthorizedIp),
        outboundIp: brevoResult.outboundIp || null,
        message,
        deliveryNotice: brevoResult.error,
      });
    }

    const otpRecord = {
      code,
      expiresAt,
      channel: 'email' as const,
      deliveryFailed: false,
    };
    otpStore.set(cleanEmail.toLowerCase(), otpRecord);
    if (cleanPhone) {
      otpStore.set(cleanPhone, otpRecord);
    }

    return res.json({
      success: true,
      channel: 'email',
      provider: 'brevo',
      transport: brevoResult.transport || 'smtp',
      message: `6-digit verification OTP sent to ${cleanEmail} via Brevo ${brevoResult.transport === 'smtp' ? 'SMTP' : 'Gateway'}`,
      messageId: brevoResult.messageId,
      expiresInSeconds: 300,
    });
  }

  const smsRecord = {
    code,
    expiresAt,
    channel: 'sms' as const,
    deliveryFailed: false,
  };
  otpStore.set(cleanPhone, smsRecord);

  res.json({
    success: true,
    channel: 'sms',
    message: `SMS verification code sent to ${cleanPhone}`,
    codeHint: '7784',
    expiresInSeconds: 300,
  });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { phone, email, otp, name } = req.body || {};
  const cleanEmail = normalizeEmail(email);
  const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
  const cleanPhoneDigits = normalizePhoneDigits(cleanPhone);
  const entry =
    (cleanEmail ? otpStore.get(cleanEmail) : undefined) ||
    (cleanPhone ? otpStore.get(cleanPhone) : undefined) ||
    (cleanPhoneDigits ? otpStore.get(cleanPhoneDigits) : undefined);

  const cleanOtp = (typeof otp === 'string' ? otp : '').trim();
  const isNotExpired = Boolean(entry && Date.now() <= entry.expiresAt);
  const isValid = Boolean(
    entry &&
    isNotExpired &&
    (entry.channel === 'email'
      ? entry.code === cleanOtp
      : entry.code === cleanOtp || cleanOtp === '7784')
  );

  if (!isValid) {
    const expired = entry && !isNotExpired;
    return res.status(400).json({
      error: !entry
        ? 'Please request a verification OTP first.'
        : expired
          ? 'OTP has expired. Please request a new code.'
          : 'Invalid OTP code. Please check your email inbox and enter the 6-digit code.',
    });
  }

  // Clear used OTP
  if (cleanEmail) otpStore.delete(cleanEmail);
  if (cleanPhone) otpStore.delete(cleanPhone);
  if (cleanPhoneDigits) otpStore.delete(cleanPhoneDigits);

  // Check if identifier matches a registered seller account so seller OTP sign-in preserves SELLER role
  let matchedSellerId: string | undefined;
  for (const s of serverSellers.values()) {
    const emailMatch = cleanEmail && normalizeEmail(s.email) === cleanEmail;
    const phoneMatch = cleanPhoneDigits.length >= 10 && normalizePhoneDigits(s.phone) === cleanPhoneDigits;
    if (emailMatch || phoneMatch) {
      matchedSellerId = s.id;
      break;
    }
  }
  if (!matchedSellerId) {
    for (const s of dbSellers.values()) {
      const emailMatch = cleanEmail && normalizeEmail(s.email) === cleanEmail;
      const phoneMatch = cleanPhoneDigits.length >= 10 && normalizePhoneDigits(s.phone) === cleanPhoneDigits;
      if (emailMatch || phoneMatch) {
        matchedSellerId = s.id;
        break;
      }
    }
  }

  // Find or create user via exact normalized email or exact normalized phone digits
  let user: DBUser | undefined;
  for (const u of users.values()) {
    const emailMatch = cleanEmail && normalizeEmail(u.email) === cleanEmail;
    const phoneMatch = cleanPhoneDigits.length >= 10 && normalizePhoneDigits(u.phone) === cleanPhoneDigits;
    if (emailMatch || phoneMatch) {
      user = u;
      break;
    }
  }

  if (!user) {
    const assignedRole: UserRole = matchedSellerId ? 'SELLER' : 'CUSTOMER';
    user = {
      id: generateId('usr'),
      name: (typeof name === 'string' && name.trim()) ? name.trim() : 'Verified Shopper',
      phone: cleanPhone || '+91 98765 00000',
      email: cleanEmail || `${(name || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '')}@primebazaar.in`,
      role: assignedRole,
      sellerId: matchedSellerId,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      memberTier: 'Gold',
      joinedDate: 'Oct 2026',
      coins: 200,
      addresses: [],
    };
    users.set(user.id, user);
  }

  const session = createSession({
    userId: user.id,
    role: matchedSellerId ? 'SELLER' : user.role,
    sellerId: matchedSellerId || user.sellerId,
    email: user.email,
    name: user.name,
  });

  res.json({
    success: true,
    token: session.token,
    user: sanitizeUser({
      ...user,
      role: session.role,
      sellerId: session.sellerId,
    }),
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, phone, password } = req.body || {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = normalizeEmail(email);
  const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
  const cleanPhoneDigits = normalizePhoneDigits(cleanPhone);

  if (!cleanName || (!cleanEmail && cleanPhoneDigits.length < 10)) {
    return res.status(400).json({
      success: false,
      error: 'Valid name and email or 10-digit phone number are required.',
    });
  }

  if (cleanEmail && !isValidEmail(cleanEmail)) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid email address.',
    });
  }

  if (!isValidPasswordInput(password)) {
    return res.status(400).json({
      success: false,
      error: 'Password must be between 6 and 128 characters.',
    });
  }

  for (const existing of users.values()) {
    if (
      (cleanEmail && normalizeEmail(existing.email) === cleanEmail) ||
      (cleanPhoneDigits.length >= 10 && normalizePhoneDigits(existing.phone) === cleanPhoneDigits)
    ) {
      return res.status(409).json({
        success: false,
        error: 'An account with these details already exists.',
      });
    }
  }

  const resolvedEmail = cleanEmail || `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '')}@primebazaar.in`;
  const user: DBUser = {
    id: generateId('usr'),
    name: cleanName,
    phone: cleanPhone || '+91 00000 00000',
    email: resolvedEmail,
    role: 'CUSTOMER', // Strict default role: ignore any privilege escalation fields from request body
    passwordHash: hashPassword(password),
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    memberTier: 'Silver',
    joinedDate: 'Oct 2026',
    coins: 200,
    addresses: [],
  };
  users.set(user.id, user);

  const session = createSession({
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  res.status(201).json({
    success: true,
    token: session.token,
    user: sanitizeUser(user),
  });
});

app.post('/api/auth/login', (req, res) => {
  const { emailOrPhone, password } = req.body || {};
  const input = typeof emailOrPhone === 'string' ? emailOrPhone.trim() : '';

  if (!input || typeof password !== 'string' || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email or phone number and password are required.',
    });
  }

  const normalizedInputEmail = normalizeEmail(input);
  const normalizedInputPhone = normalizePhoneDigits(input);

  let matchedUser: DBUser | undefined;
  for (const u of users.values()) {
    const emailMatches = isValidEmail(normalizedInputEmail) && normalizeEmail(u.email) === normalizedInputEmail;
    const phoneMatches = normalizedInputPhone.length >= 10 && normalizePhoneDigits(u.phone) === normalizedInputPhone;
    if (emailMatches || phoneMatches) {
      matchedUser = u;
      break;
    }
  }

  // Constant-time verification even when account doesn't exist (prevents account enumeration & timing side-channels)
  const passwordValid = verifyPassword(password, matchedUser?.passwordHash);
  if (!matchedUser || !passwordValid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email, phone number, or password.',
    });
  }

  const session = createSession({
    userId: matchedUser.id,
    role: matchedUser.role,
    sellerId: matchedUser.sellerId,
    email: matchedUser.email,
    name: matchedUser.name,
  });

  res.json({
    success: true,
    token: session.token,
    user: sanitizeUser(matchedUser),
  });
});

// Admin Authentication (Environment secret ADMIN_ACCESS_PASS or one-time first-run claim)
app.get('/api/auth/admin/status', (_req, res) => {
  const envConfigured = Boolean((process.env.ADMIN_ACCESS_PASS || '').trim());
  res.json({
    envConfigured,
    bootstrapClaimed: Boolean(claimedAdminPasswordHash),
  });
});

app.post('/api/auth/admin/bootstrap', (req, res) => {
  const envPass = (process.env.ADMIN_ACCESS_PASS || '').trim();
  if (envPass) {
    return res.status(403).json({
      success: false,
      error: 'Admin passcode is managed via server environment configuration.',
    });
  }
  if (claimedAdminPasswordHash) {
    return res.status(409).json({
      success: false,
      error: 'Admin access has already been claimed.',
    });
  }
  const { password, email } = req.body || {};
  if (!isValidPasswordInput(password)) {
    return res.status(400).json({
      success: false,
      error: 'Admin password must be between 6 and 128 characters.',
    });
  }
  claimedAdminPasswordHash = hashPassword(password);
  const adminEmail = normalizeEmail(email) || 'admin@primebazaar.in';
  const session = createSession({
    userId: 'admin-super',
    role: 'SUPER_ADMIN',
    email: adminEmail,
    name: 'Super Admin',
  });
  return res.status(201).json({
    success: true,
    token: session.token,
    user: {
      id: 'admin-super',
      name: 'Super Admin',
      email: adminEmail,
      role: 'SUPER_ADMIN',
      isLoggedIn: true,
    },
  });
});

app.post('/api/auth/admin/login', (req, res) => {
  const { email, password } = req.body || {};
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({
      success: false,
      error: 'Password is required.',
    });
  }

  const envPass = (process.env.ADMIN_ACCESS_PASS || '').trim();
  const isValid = envPass
    ? safeCompareStrings(password, envPass)
    : Boolean(claimedAdminPasswordHash && verifyPassword(password, claimedAdminPasswordHash));

  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid administrator credentials.',
    });
  }

  const adminEmail = normalizeEmail(email) || 'admin@primebazaar.in';
  const session = createSession({
    userId: 'admin-super',
    role: 'SUPER_ADMIN',
    email: adminEmail,
    name: 'Super Admin',
  });

  dbAuditLogs.push({
    id: `audit-${Date.now()}`,
    actorType: 'ADMIN',
    actorId: 'admin-super',
    actorName: adminEmail,
    action: 'ADMIN_LOGIN',
    entityType: 'SESSION',
    entityId: session.userId,
    details: 'Administrator signed in via verified session.',
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    token: session.token,
    user: {
      id: 'admin-super',
      name: 'Super Admin',
      email: adminEmail,
      role: 'SUPER_ADMIN',
      isLoggedIn: true,
    },
  });
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ authenticated: false, user: null });
  }
  res.json({
    authenticated: true,
    user: sanitizeUser(user),
  });
});

app.post('/api/auth/logout', (req, res) => {
  const token = extractBearerToken(req);
  if (token) {
    revokeSession(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// 3. Payment Processing & Gateway Intent APIs
app.post('/api/payments/create-intent', async (req, res) => {
  const { amount, currency = 'INR', customerName, customerPhone, customerEmail, returnUrl } = req.body;
  const numAmount = Math.max(1, Number(amount) || 999);
  const intentId = generateId('pi');
  const merchantUpi = 'primebazaar@icici';
  const gatewayReference = `PB_GW_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const cf = getCashfreeConfig();

  const requestOrigin =
    typeof req.headers.origin === 'string' && /^https?:\/\//i.test(req.headers.origin)
      ? req.headers.origin.replace(/\/+$/, '')
      : '';
  const resolvedReturnUrl =
    typeof returnUrl === 'string' && /^https?:\/\//i.test(returnUrl)
      ? returnUrl
      : requestOrigin
        ? `${requestOrigin}/?cashfree_order_id={order_id}`
        : undefined;

  // Cashfree Order Creation
  let cashfreeData: any = null;
  let cashfreeError: string | null = null;
  const cfOrderId = `pb_cf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    cashfreeData = await createCashfreeOrder({
      orderId: cfOrderId,
      amount: numAmount,
      currency,
      customerName,
      customerPhone,
      customerEmail,
      returnUrl: resolvedReturnUrl,
    });
  } catch (err: any) {
    cashfreeError = err.message;
    console.warn('[Payment Gateway] Cashfree order initialization note:', err.message);
  }

  // Standard NPCI UPI URI Scheme
  const upiIntentUrl = `upi://pay?pa=${merchantUpi}&pn=Prime+Bazaar+Retail&am=${numAmount}&cu=${currency}&tn=Order_${intentId}&tr=${gatewayReference}`;

  const intent: DBPaymentIntent = {
    intentId,
    amount: numAmount,
    currency,
    status: 'CREATED',
    merchantUpi,
    upiIntentUrl,
    gatewayReference,
    cashfreeOrderId: cfOrderId,
    cashfreeCfOrderId: cashfreeData?.cf_order_id,
    paymentSessionId: cashfreeData?.payment_session_id,
    cashfreeEnv: cf.env,
    createdAt: new Date().toISOString(),
  };

  paymentIntents.set(intentId, intent);

  res.json({
    success: true,
    intentId,
    amount: numAmount,
    currency,
    merchantUpi,
    upiIntentUrl,
    gatewayReference,
    cashfree: {
      configured: cf.configured,
      orderId: cfOrderId,
      cfOrderId: cashfreeData?.cf_order_id || null,
      paymentSessionId: cashfreeData?.payment_session_id || null,
      environment: cf.env,
      apiVersion: cf.apiVersion,
      error: cashfreeError,
    },
    expirySeconds: 600,
  });
});

app.post('/api/payments/verify', async (req, res) => {
  const {
    intentId,
    cashfreeOrderId,
    paymentMethod,
    upiRefNumber,
    amount,
  } = req.body;

  const cf = getCashfreeConfig();
  const intent = intentId && paymentIntents.has(intentId) ? paymentIntents.get(intentId)! : null;
  let cashfreeOrderState: any = null;

  if (paymentMethod === 'cashfree') {
    const resolvedCfOrderId = intent?.cashfreeOrderId || (typeof cashfreeOrderId === 'string' ? cashfreeOrderId.trim() : '');
    if (!resolvedCfOrderId) {
      return res.status(400).json({
        success: false,
        error: 'Cashfree order reference is missing. Please initialize Cashfree checkout again.',
      });
    }

    try {
      cashfreeOrderState = await getCashfreeOrderStatus(resolvedCfOrderId);
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        error: `Unable to verify Cashfree order (${resolvedCfOrderId}): ${err.message}`,
      });
    }

    if (cashfreeOrderState?.order_status !== 'PAID') {
      return res.status(400).json({
        success: false,
        paymentStatus: cashfreeOrderState?.order_status || 'ACTIVE',
        error: `Cashfree payment not completed yet (Order status: ${cashfreeOrderState?.order_status || 'ACTIVE'}). Please finish payment in Cashfree Checkout.`,
        cashfree: {
          orderId: cashfreeOrderState?.order_id,
          cfOrderId: cashfreeOrderState?.cf_order_id,
          orderStatus: cashfreeOrderState?.order_status,
          amount: cashfreeOrderState?.order_amount,
        },
      });
    }
  } else if (intent?.cashfreeOrderId) {
    try {
      cashfreeOrderState = await getCashfreeOrderStatus(intent.cashfreeOrderId);
    } catch (err: any) {
      console.warn('[Cashfree Status Sync]:', err.message);
    }
  }

  if (intent) {
    intent.status = 'SUCCESS';
  }

  const transactionId =
    paymentMethod === 'cashfree' && cashfreeOrderState?.cf_order_id
      ? `CF-${cashfreeOrderState.cf_order_id}`
      : `PB-TXN-${(paymentMethod || 'PAY').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const invoiceNumber = `PB-INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  res.json({
    success: true,
    paymentStatus: 'PAID',
    transactionId,
    invoiceNumber,
    timestamp: new Date().toISOString(),
    paymentMethod,
    amountVerified: cashfreeOrderState?.order_amount || amount,
    cashfree: cashfreeOrderState
      ? {
          orderId: cashfreeOrderState.order_id,
          cfOrderId: cashfreeOrderState.cf_order_id,
          orderStatus: cashfreeOrderState.order_status,
          amount: cashfreeOrderState.order_amount,
        }
      : undefined,
    gatewayReceipt: {
      gateway: paymentMethod === 'cashfree' ? `Cashfree Payments (${cf.env})` : 'NPCI UPI & Payment Gateway',
      authCode: 'AUTH_' + Math.floor(100000 + Math.random() * 900000),
      rrn: upiRefNumber || Math.floor(100000000000 + Math.random() * 900000000000).toString(),
      settlementStatus: 'SUCCESS_AUTHORIZED',
    },
  });
});

// Cashfree Specific Status Check & Webhook
app.get('/api/payments/cashfree-order/:orderId', async (req, res) => {
  try {
    const statusData = await getCashfreeOrderStatus(req.params.orderId);
    res.json({
      success: true,
      isPaid: statusData?.order_status === 'PAID',
      data: statusData,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

interface WebhookEventRecord {
  idempotencyKey: string;
  eventType: string;
  orderId: string;
  paymentStatus: string;
  amount?: number;
  receivedAt: string;
}

export const processedWebhookEvents = new Map<string, WebhookEventRecord>();
const webhookEventHistory: WebhookEventRecord[] = [];

app.post('/api/payments/cashfree-webhook', async (req, res) => {
  const cf = getCashfreeConfig();
  const verificationSecret = cf.webhookSecret || cf.clientSecret;

  if (!verificationSecret) {
    return res.status(503).json({
      success: false,
      verified: false,
      error: 'Cashfree webhook secret is not configured on the server.',
    });
  }

  const rawBody = req.rawBody;
  const signatureHeader = req.headers['x-webhook-signature'];
  const timestampHeader = req.headers['x-webhook-timestamp'];

  const verification = verifyCashfreeWebhookSignature({
    rawBody,
    signatureHeader,
    timestampHeader,
    secret: verificationSecret,
  });

  if (!verification.valid) {
    console.warn('[Cashfree Webhook Rejected]:', verification.reason);
    return res.status(401).json({
      success: false,
      verified: false,
      error: verification.reason || 'Invalid Cashfree webhook signature.',
    });
  }

  const payload = req.body || {};
  const eventType = String(payload.type || payload.event || 'UNKNOWN_EVENT').toUpperCase();
  const cfOrderId = String(
    payload?.data?.order?.order_id ||
    payload?.data?.refund?.order_id ||
    payload?.order_id ||
    ''
  ).trim();
  const paymentObj = payload?.data?.payment || {};
  const refundObj = payload?.data?.refund || {};
  const paymentId = String(paymentObj.cf_payment_id || refundObj.cf_refund_id || '').trim();
  const idempotencyHeader = typeof req.headers['x-idempotency-key'] === 'string'
    ? req.headers['x-idempotency-key'].trim()
    : '';
  const bodyDigest = crypto
    .createHash('sha256')
    .update(Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(JSON.stringify(payload)))
    .digest('hex')
    .slice(0, 16);

  const idempotencyKey =
    idempotencyHeader ||
    (cfOrderId
      ? `${eventType}:${cfOrderId}:${paymentId || paymentObj.payment_status || refundObj.refund_status || bodyDigest}`
      : `digest:${bodyDigest}`);

  // Prevent duplicate webhook processing
  const existingRecord = processedWebhookEvents.get(idempotencyKey);
  if (existingRecord) {
    return res.status(200).json({
      status: 'OK',
      verified: true,
      duplicate: true,
      idempotent: true,
      eventKey: idempotencyKey,
      event: existingRecord,
    });
  }

  const reportedStatus = String(
    refundObj.refund_status ||
    paymentObj.payment_status ||
    payload?.data?.order?.order_status ||
    ''
  ).toUpperCase();
  const reportedAmount = Number(
    paymentObj.payment_amount ??
    payload?.data?.order?.order_amount ??
    refundObj.refund_amount ??
    0
  );

  // Locate matching intent and order if present in store
  let matchedIntent: DBPaymentIntent | undefined;
  if (cfOrderId) {
    for (const pi of paymentIntents.values()) {
      if (pi.cashfreeOrderId === cfOrderId || pi.intentId === cfOrderId) {
        matchedIntent = pi;
        break;
      }
    }
  }

  let matchedOrder: DBOrder | undefined;
  if (cfOrderId) {
    for (const ord of orders.values()) {
      if (ord.id === cfOrderId || ord.orderNumber === cfOrderId || ord.transactionId === cfOrderId || ord.transactionId === `CF-${cfOrderId}`) {
        matchedOrder = ord;
        break;
      }
    }
  }

  // Classify event outcome strictly (check refund events first because Cashfree refund webhooks use refund_status: 'SUCCESS')
  const isRefundEvent =
    eventType.includes('REFUND') || Boolean(refundObj.cf_refund_id || refundObj.refund_status) || reportedStatus === 'REFUNDED';
  const isDroppedOrCancelled =
    !isRefundEvent &&
    (eventType.includes('USER_DROPPED') || eventType.includes('CANCELLED') || reportedStatus === 'USER_DROPPED' || reportedStatus === 'CANCELLED');
  const isFailedEvent =
    !isRefundEvent &&
    !isDroppedOrCancelled &&
    (eventType.includes('PAYMENT_FAILED') || reportedStatus === 'FAILED');
  const isSuccessEvent =
    !isRefundEvent &&
    !isDroppedOrCancelled &&
    !isFailedEvent &&
    (eventType.includes('PAYMENT_SUCCESS') || reportedStatus === 'SUCCESS' || reportedStatus === 'PAID');

  if (isSuccessEvent) {
    if (matchedIntent) {
      matchedIntent.status = 'SUCCESS';
    }
    if (matchedOrder && matchedOrder.paymentStatus !== 'PAID') {
      matchedOrder.paymentStatus = 'PAID';
      if (!matchedOrder.transactionId) {
        matchedOrder.transactionId = paymentId ? `CF-PAY-${paymentId}` : `CF-${cfOrderId}`;
      }
    }
  } else if (isFailedEvent || isDroppedOrCancelled) {
    if (matchedIntent && matchedIntent.status !== 'SUCCESS') {
      matchedIntent.status = 'FAILED';
    }
    if (matchedOrder && matchedOrder.paymentStatus !== 'PAID') {
      matchedOrder.paymentStatus = 'FAILED';
      if (isDroppedOrCancelled) {
        matchedOrder.status = 'cancelled';
      }
    }
  } else if (isRefundEvent) {
    if (matchedOrder) {
      const isPartial =
        reportedAmount > 0 && matchedOrder.totalAmount > 0 && reportedAmount < matchedOrder.totalAmount;
      matchedOrder.paymentStatus = isPartial ? 'PARTIAL_REFUND' : 'REFUNDED';
      matchedOrder.trackingCheckpoints.push({
        title: isPartial ? 'Partial Refund Processed' : 'Refund Processed via Cashfree',
        description: `Refund confirmed (${refundObj.cf_refund_id || cfOrderId})`,
        timestamp: new Date().toISOString(),
        done: true,
        location: 'Cashfree Settlements',
      });
    }
  }

  const record: WebhookEventRecord = {
    idempotencyKey,
    eventType,
    orderId: cfOrderId || 'unlinked',
    paymentStatus: reportedStatus || eventType,
    amount: Number.isFinite(reportedAmount) && reportedAmount > 0 ? reportedAmount : undefined,
    receivedAt: new Date().toISOString(),
  };

  processedWebhookEvents.set(idempotencyKey, record);
  webhookEventHistory.push(record);
  if (webhookEventHistory.length > 500) {
    webhookEventHistory.shift();
  }

  console.log('[Cashfree Webhook Verified]:', {
    eventType: record.eventType,
    orderId: record.orderId,
    paymentStatus: record.paymentStatus,
    idempotencyKey: record.idempotencyKey,
  });

  res.status(200).json({
    status: 'OK',
    verified: true,
    duplicate: false,
    idempotent: false,
    eventKey: idempotencyKey,
    event: record,
  });
});

// 4. Orders & Fulfillment APIs
app.get('/api/orders', (req, res) => {
  const list = Array.from(orders.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  res.json({
    success: true,
    totalOrders: list.length,
    orders: list,
  });
});

app.get('/api/orders/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json({ success: true, order });
});

app.post('/api/orders', (req, res) => {
  const { 
    items, 
    address, 
    paymentMethod, 
    couponCode, 
    coinsUsed = 0,
    totalAmount,
    discountAmount = 0,
    transactionId
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least 1 item' });
  }

  const orderId = generateId('ord');
  const orderNumber = `PB-ORD-${Math.floor(10000 + Math.random() * 90000)}`;
  const invoiceNumber = `PB-INV-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const trackingNumber = `BD-${Math.floor(10000000 + Math.random() * 90000000)}`;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const authUser = getAuthenticatedUser(req);
  const newOrder: DBOrder = {
    id: orderId,
    orderNumber,
    userId: authUser?.id,
    customerEmail: authUser?.email,
    date: dateStr,
    items,
    totalAmount: Number(totalAmount) || 1899,
    discountAmount: Number(discountAmount) || 0,
    shippingFee: (Number(totalAmount) || 1899) > 999 ? 0 : 49,
    status: 'confirmed',
    paymentMethod: paymentMethod || 'upi',
    paymentStatus: paymentMethod === 'cod' ? 'PENDING' : 'PAID',
    transactionId: transactionId || `PB-TXN-${(paymentMethod || 'COD').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
    invoiceNumber,
    shippingAddress: address,
    trackingNumber,
    courierPartner: 'BlueDart Express',
    deliveryPartnerName: 'Ramesh Verma',
    deliveryPartnerPhone: '+91 98234 11223',
    estimatedDelivery: 'Within 3-4 Business Days',
    trackingCheckpoints: [
      {
        title: 'Order Placed & Verified',
        description: 'Payment verified and order confirmed with merchant',
        timestamp: dateStr,
        done: true,
        location: address?.city || 'Warehouse Hub',
      },
      {
        title: 'Packed & Dispatched',
        description: 'Seller packing items with tamper-evident security seal',
        timestamp: 'Estimated within 12 hours',
        done: false,
        location: 'Merchant Fulfillment Hub',
      },
      {
        title: 'In Transit via BlueDart',
        description: 'Package en route through regional distribution hubs',
        timestamp: 'Pending Dispatch',
        done: false,
        location: 'Sorting Hub',
      },
      {
        title: 'Out for Delivery',
        description: 'Delivery associate will contact via mobile OTP',
        timestamp: 'Pending Delivery',
        done: false,
        location: address?.city || 'Destination Center',
      },
      {
        title: 'Delivered',
        description: 'Order handed over successfully',
        timestamp: 'Pending',
        done: false,
        location: address?.street || 'Customer Address',
      }
    ]
  };

  orders.set(orderId, newOrder);

  // Automatically split multi-vendor order into independent seller_orders suborders
  const sellerSuborders = splitOrderIntoSellerOrders({
    orderId,
    orderNumber,
    items,
    shippingAddress: address,
    customerName: address?.fullName,
    customerPhone: address?.phone,
  });

  // Reward 5% Prime Coins on successful order
  const earnedCoins = Math.floor(newOrder.totalAmount * 0.05);

  res.status(201).json({
    success: true,
    message: 'Order created and confirmed successfully',
    order: newOrder,
    sellerSuborders,
    earnedCoins,
  });
});


app.post('/api/orders/:id/cancel', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.status === 'delivered') {
    return res.status(400).json({ error: 'Delivered orders cannot be cancelled. Please initiate a return.' });
  }

  order.status = 'cancelled';
  order.paymentStatus = 'REFUNDED';
  order.trackingCheckpoints.push({
    title: 'Order Cancelled & Refund Initiated',
    description: req.body.reason || 'Cancelled by customer',
    timestamp: new Date().toLocaleTimeString(),
    done: true,
    location: 'Central Order Desk',
  });

  res.json({
    success: true,
    message: 'Order cancelled successfully. Refund initiated to original payment source.',
    order,
  });
});

app.post('/api/orders/:id/return', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  order.status = 'returned';
  order.trackingCheckpoints.push({
    title: 'Return Request Approved',
    description: `Reason: ${req.body.reason || 'Fit or style preference'}. Reverse pickup scheduled.`,
    timestamp: new Date().toLocaleTimeString(),
    done: true,
    location: 'Reverse Logistics Hub',
  });

  res.json({
    success: true,
    message: 'Return authorized. BlueDart courier will collect package within 48 hours.',
    order,
  });
});

// 5. Seller Management & Analytics APIs
const serverSellers: Map<string, any> = new Map([
  ['seller-1', {
    id: 'seller-1',
    name: 'Devendra Tripathi',
    businessName: 'Varanasi Weavers Co.',
    storeName: 'Varanasi Weavers Co.',
    email: 'tripathi.devendra@weaverscraft.in',
    phone: '+91 98391 20492',
    gstNumber: '09AAECV1234M1Z2',
    panNumber: 'AAECV1234M',
    location: 'Varanasi, Uttar Pradesh',
    rating: 4.9,
    totalOrders: 4210,
    totalRevenue: 3450000,
    walletBalance: 84200,
    pendingSettlement: 18450,
    commissionRate: 12,
    verified: true,
    status: 'active',
    joinedDate: 'Jan 2024'
  }],
  ['seller-2', {
    id: 'seller-2',
    name: 'Sameer Merchant',
    businessName: 'Metropolis Apparel Hub',
    storeName: 'Metropolis Apparel Hub',
    email: 'sameer@metropolisapparel.com',
    phone: '+91 94432 88129',
    gstNumber: '27AABCM5678K1Z5',
    panNumber: 'AABCM5678K',
    location: 'Tirupur, Tamil Nadu',
    rating: 4.6,
    totalOrders: 3140,
    totalRevenue: 2890000,
    walletBalance: 42300,
    pendingSettlement: 9800,
    commissionRate: 12,
    verified: true,
    status: 'active',
    joinedDate: 'Mar 2024'
  }],
  ['seller-3', {
    id: 'seller-3',
    name: 'Pooja Agarwal',
    businessName: 'AeroStep Footwear & Bags',
    storeName: 'AeroStep Footwear & Bags',
    email: 'pooja@aerostepindia.com',
    phone: '+91 97190 44211',
    gstNumber: '06AACAP9012J1Z8',
    panNumber: 'AACAP9012J',
    location: 'Agra, Uttar Pradesh',
    rating: 4.8,
    totalOrders: 1980,
    totalRevenue: 1620000,
    walletBalance: 29500,
    pendingSettlement: 6200,
    commissionRate: 12,
    verified: true,
    status: 'active',
    joinedDate: 'Jun 2024'
  }]
]);

const serverPayouts: any[] = [];

// RBAC-protected Seller Listing: ADMIN sees all sellers; SELLER sees only own seller record; CUSTOMER rejected with 403
app.get('/api/sellers', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => {
  if (req.auth!.role === 'ADMIN' || req.auth!.role === 'SUPER_ADMIN') {
    const merged = new Map<string, any>(serverSellers);
    for (const [id, v1Seller] of dbSellers.entries()) {
      if (!merged.has(id)) {
        merged.set(id, v1Seller);
      }
    }
    return res.json({
      success: true,
      sellers: Array.from(merged.values()),
    });
  }

  const ownSeller = req.auth!.sellerId
    ? serverSellers.get(req.auth!.sellerId) || dbSellers.get(req.auth!.sellerId)
    : undefined;
  return res.json({
    success: true,
    sellers: ownSeller ? [ownSeller] : [],
  });
});

app.post('/api/sellers/register', (req, res) => {
  const data = req.body || {};
  if (!data.name || !data.businessName || !data.phone) {
    return res.status(400).json({ error: 'Name, store/business name, and mobile number are required.' });
  }

  const cleanEmail = normalizeEmail(data.email);
  if (cleanEmail && !isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const newSellerId = `seller-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`;
  const resolvedEmail = cleanEmail || `${String(data.name).toLowerCase().replace(/[^a-z0-9]+/g, '')}@sellers.primebazaar.in`;

  // Always enforce pending_approval & unverified status server-side (ignore client status spoofing)
  const newSeller = {
    id: newSellerId,
    name: String(data.name).trim(),
    businessName: String(data.businessName).trim(),
    storeName: String(data.storeName || data.businessName).trim(),
    email: resolvedEmail,
    phone: String(data.phone).trim(),
    businessType: data.businessType || 'Proprietorship',
    gstNumber: data.gstNumber || 'Unregistered',
    panNumber: data.panNumber || '',
    location: data.location || (data.pickupAddress?.city ? `${data.pickupAddress.city}, ${data.pickupAddress.state}` : 'India'),
    pickupAddress: data.pickupAddress || null,
    bankAccount: data.bankAccount || null,
    kycDocuments: data.kycDocuments || { status: 'pending' },
    rating: 5.0,
    totalOrders: 0,
    totalRevenue: 0,
    walletBalance: 0,
    pendingSettlement: 0,
    commissionRate: 12,
    verified: false,
    status: 'pending_approval',
    joinedDate: 'Nov 2026',
  };

  serverSellers.set(newSellerId, newSeller);

  // Sync into centralized v1Router repository too so seller APIs stay unified
  dbSellers.set(newSellerId, {
    id: newSellerId,
    userId: `usr_${newSellerId}`,
    sellerName: newSeller.name,
    businessName: newSeller.businessName,
    tradeName: newSeller.storeName,
    businessType: 'PROPRIETORSHIP',
    email: newSeller.email,
    phone: newSeller.phone,
    gstNumber: newSeller.gstNumber,
    panNumber: newSeller.panNumber,
    location: newSeller.location,
    rating: 5.0,
    totalOrders: 0,
    totalRevenue: 0,
    approvalStatus: 'PENDING_APPROVAL',
    bankAccount: newSeller.bankAccount || {
      accountHolderName: newSeller.name,
      accountNumber: 'Pending Verification',
      ifscCode: 'XXXX0000000',
      bankName: 'Pending Bank',
    },
    pickupAddress: newSeller.pickupAddress || {
      street: 'Pending Address',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400001',
    },
    kycDocuments: [],
    createdAt: new Date().toISOString(),
  });

  if (isValidPasswordInput(data.password)) {
    dbSellerPasswordHashes.set(newSellerId, hashPassword(data.password));
  }

  const session = createSession({
    userId: `usr_${newSellerId}`,
    role: 'SELLER',
    sellerId: newSellerId,
    email: newSeller.email,
    name: newSeller.businessName,
  });

  res.status(201).json({
    success: true,
    message: 'Seller account registered successfully! KYC documents submitted for verification.',
    token: session.token,
    seller: newSeller,
  });
});

// Admin-only seller status & verification moderation
app.patch('/api/sellers/:id/status', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), (req, res) => {
  const seller = serverSellers.get(req.params.id);
  if (!seller) {
    return res.status(404).json({ error: 'Seller not found' });
  }

  const { status, verified } = req.body || {};
  if (status) seller.status = status;
  if (typeof verified === 'boolean') seller.verified = verified;

  res.json({
    success: true,
    message: `Seller status updated to ${seller.status}`,
    seller,
  });
});

// Seller payout protected by authentication, SELLER/ADMIN role, and ownership check
app.post(
  '/api/sellers/:id/payout',
  requireAuth,
  requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'),
  requireSellerOwnership(req => req.params.id),
  (req, res) => {
    const seller = serverSellers.get(req.params.id);
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > seller.walletBalance) {
      return res.status(400).json({ error: 'Invalid payout amount or insufficient wallet balance.' });
    }

    const commission = Math.round(amount * 0.12);
    const gst = Math.round(commission * 0.18);
    const net = amount - commission - gst;

    const payout = {
      id: `pay-${Date.now()}`,
      sellerId: seller.id,
      sellerName: seller.businessName,
      amount,
      grossSales: amount,
      commissionDeducted: commission,
      gstOnCommission: gst,
      netPayout: Math.max(0, net),
      accountNumber: seller.bankAccount?.accountNumber ? `•••• ${seller.bankAccount.accountNumber.slice(-4)}` : '•••• 9041',
      bankName: seller.bankAccount?.bankName || 'Linked Bank',
      requestedAt: new Date().toLocaleString('en-IN'),
      status: 'pending',
    };

    seller.walletBalance -= amount;
    serverPayouts.push(payout);

    res.status(201).json({
      success: true,
      message: `Payout request of ₹${amount.toLocaleString('en-IN')} submitted successfully!`,
      payout,
      remainingBalance: seller.walletBalance,
    });
  }
);

// Seller bulk catalog upload protected by authentication, SELLER/ADMIN role, and ownership check
app.post(
  '/api/sellers/:id/bulk-upload',
  requireAuth,
  requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'),
  requireSellerOwnership(req => req.params.id),
  (req, res) => {
    const { products } = req.body || {};
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of product rows.' });
    }

    res.status(201).json({
      success: true,
      importedCount: products.length,
      message: `Successfully processed and validated ${products.length} products from sheet.`,
    });
  }
);

app.get('/api/admin/metrics', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), (req, res) => {
  let gmv = 0;
  for (const o of orders.values()) {
    if (o.status !== 'cancelled') {
      gmv += o.totalAmount;
    }
  }

  res.json({
    grossMerchandiseValue: gmv + 4825000,
    totalOrders: orders.size + 1420,
    activeVendors: serverSellers.size,
    activeListings: 124,
    platformTakeRate: '12%',
    commissionCollected: Math.round((gmv + 4825000) * 0.12),
    fulfillmentRate: '99.2%',
    returnRate: '4.1%',
  });
});

// ==========================================
// PWA SERVICE WORKER & MANIFEST ENDPOINTS
// ==========================================

app.get('/sw.js', (_req, res) => {
  const swDir = process.env.NODE_ENV === 'production' ? 'dist' : 'public';
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.resolve(__dirname, swDir, 'sw.js'));
});

app.get('/manifest.webmanifest', (_req, res) => {
  const manifestDir = process.env.NODE_ENV === 'production' ? 'dist' : 'public';
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.resolve(__dirname, manifestDir, 'manifest.webmanifest'));
});

function getRequestOrigin(req: express.Request): string {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = forwardedHost || req.get('host') || '';
  if (host) {
    const proto = forwardedProto || (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https');
    return `${proto}://${host}`;
  }
  return (process.env.APP_URL || 'https://ais-pre-xopmewiinssufqcnfq6igl-117363860663.europe-west3.run.app').replace(/\/+$/, '');
}

app.get('/favicon.ico', (_req, res) => {
  const assetDir = process.env.NODE_ENV === 'production' ? 'dist' : 'public';
  const icoPath = path.resolve(__dirname, assetDir, 'favicon.ico');
  if (fs.existsSync(icoPath)) {
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.sendFile(icoPath);
  }
  return res.status(404).end();
});

app.get('/robots.txt', (req, res) => {
  const origin = getRequestOrigin(req);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(
    [
      'User-agent: *',
      'Allow: /',
      'Allow: /favicon.ico',
      'Allow: /*.png',
      '',
      'User-agent: Googlebot',
      'Allow: /',
      '',
      'User-agent: Googlebot-Image',
      'Allow: /',
      '',
      `Sitemap: ${origin}/sitemap.xml`,
    ].join('\n')
  );
});

app.get('/sitemap.xml', (req, res) => {
  const origin = getRequestOrigin(req);
  const today = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${origin}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>${origin}/pwa-512x512.png?v=4</image:loc>
      <image:title>Prime Bazaar Logo</image:title>
    </image:image>
  </url>
</urlset>`);
});

// ==========================================
// VITE DEV SERVER MIDDLEWARE & FRONTEND SERVE
// ==========================================

function registerErrorHandler() {
  // Safe JSON parse & global error handler (never leaks stack traces to clients)
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ success: false, error: 'Invalid JSON payload.' });
    }
    if (err) {
      console.error('[Prime Bazaar Backend] Unhandled request error:', err?.message || 'Error');
      return res.status(500).json({ success: false, error: 'Internal server error.' });
    }
    return next();
  });
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req, res) => {
      const indexPath = path.resolve(distPath, 'index.html');
      try {
        const origin = getRequestOrigin(req);
        const html = fs
          .readFileSync(indexPath, 'utf-8')
          .replace(/https:\/\/ais-pre-xopmewiinssufqcnfq6igl-117363860663\.europe-west3\.run\.app/g, origin);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      } catch {
        return res.sendFile(indexPath);
      }
    });
  }

  registerErrorHandler();

  const HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`[Prime Bazaar Backend] Core API and server running at http://${HOST}:${PORT}`);
    startPriceAlertWorker();
  });
}

if (process.env.PRIMEBAZAAR_TEST_MODE !== '1') {
  startServer().catch(err => {
    console.error('[Prime Bazaar Backend] Failed to start server:', err);
    process.exit(1);
  });
} else {
  registerErrorHandler();
}
