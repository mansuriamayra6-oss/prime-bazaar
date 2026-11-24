import crypto from 'crypto';
import type express from 'express';

// =============================================================================
// PRIME BAZAAR SERVER SECURITY, CRYPTOGRAPHY, SESSIONS & RBAC MODULE
// =============================================================================

export type UserRole = 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'SUPER_ADMIN';

export interface AuthSession {
  token: string;
  userId: string;
  role: UserRole;
  sellerId?: string;
  email?: string;
  name?: string;
  createdAt: number;
  expiresAt: number;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthSession;
      rawBody?: Buffer;
    }
  }
}

// =============================================================================
// 1. PASSWORD HASHING (OWASP scrypt + timing-safe comparison)
// =============================================================================

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const DUMMY_SALT = '00112233445566778899aabbccddeeff';
const DUMMY_HASH = crypto
  .scryptSync('primebazaar-timing-guard', DUMMY_SALT, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
  .toString('hex');

export function hashPassword(plainPassword: string): string {
  if (typeof plainPassword !== 'string' || plainPassword.length < 1) {
    throw new Error('Password must be a non-empty string.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plainPassword, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export function verifyPassword(plainPassword: string, storedHash?: string): boolean {
  if (typeof plainPassword !== 'string' || !plainPassword) {
    return false;
  }

  if (!storedHash || typeof storedHash !== 'string' || !storedHash.startsWith('scrypt$')) {
    // Perform dummy derivation to preserve constant-time behavior and prevent user enumeration
    crypto.scryptSync(plainPassword, DUMMY_SALT, SCRYPT_KEYLEN, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    });
    void DUMMY_HASH;
    return false;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 3) {
    return false;
  }

  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) {
    return false;
  }

  try {
    const derived = crypto.scryptSync(plainPassword, salt, SCRYPT_KEYLEN, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    });
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(derived, expectedBuf);
  } catch {
    return false;
  }
}

export function safeCompareStrings(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

// =============================================================================
// 2. INPUT VALIDATION & SANITIZATION HELPERS
// =============================================================================

export function normalizeEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function normalizePhoneDigits(phone: unknown): string {
  if (typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) {
    return digits.slice(-10);
  }
  return digits;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

export function isValidPasswordInput(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 6 && password.length <= 128;
}

// =============================================================================
// 3. CENTRAL SESSION STORE & RBAC MIDDLEWARES
// =============================================================================

const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const sessionRegistry = new Map<string, AuthSession>();

export function createSession(params: {
  userId: string;
  role: UserRole;
  sellerId?: string;
  email?: string;
  name?: string;
  fixedToken?: string;
  ttlMs?: number;
}): AuthSession {
  const prefix =
    params.role === 'SELLER'
      ? 'pb_seller_token_'
      : params.role === 'ADMIN' || params.role === 'SUPER_ADMIN'
        ? 'pb_admin_token_'
        : 'pb_token_';

  const token = params.fixedToken || `${prefix}${crypto.randomBytes(24).toString('hex')}`;
  const now = Date.now();
  const session: AuthSession = {
    token,
    userId: params.userId,
    role: params.role,
    sellerId: params.sellerId,
    email: params.email,
    name: params.name,
    createdAt: now,
    expiresAt: now + (params.ttlMs || DEFAULT_SESSION_TTL_MS),
  };
  sessionRegistry.set(token, session);
  return session;
}

export function getSession(token: string): AuthSession | null {
  if (!token) return null;
  const session = sessionRegistry.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessionRegistry.delete(token);
    return null;
  }
  return session;
}

export function revokeSession(token: string): boolean {
  return sessionRegistry.delete(token);
}

export function extractBearerToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return match?.[1]?.trim() || null;
}

export function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in and provide a valid Bearer token.',
    });
  }

  const session = getSession(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication session.',
    });
  }

  req.auth = session;
  return next();
}

export function hasRolePermission(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  if (allowedRoles.includes(userRole)) return true;
  // SUPER_ADMIN inherits all ADMIN permissions
  if (userRole === 'SUPER_ADMIN' && allowedRoles.includes('ADMIN')) return true;
  return false;
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    if (!hasRolePermission(req.auth.role, allowedRoles)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: ${req.auth.role} role is not authorized to access this resource.`,
      });
    }

    return next();
  };
}

export function requireSellerOwnership(
  resolveTargetSellerId: (req: express.Request) => string | undefined | null
) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    if (req.auth.role === 'ADMIN' || req.auth.role === 'SUPER_ADMIN') {
      return next();
    }

    if (req.auth.role !== 'SELLER' || !req.auth.sellerId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only authenticated sellers or administrators can access seller resources.',
      });
    }

    const targetSellerId = resolveTargetSellerId(req);
    if (targetSellerId && targetSellerId !== req.auth.sellerId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to access or modify another seller’s resource.',
      });
    }

    return next();
  };
}

// =============================================================================
// 4. CASHFREE WEBHOOK HMAC-SHA256 VERIFICATION & IDEMPOTENCY
// =============================================================================

export interface WebhookVerificationParams {
  rawBody: string | Buffer | undefined;
  signatureHeader: string | string[] | undefined;
  timestampHeader: string | string[] | undefined;
  secret: string;
  maxReplayWindowMs?: number;
  nowMs?: number;
}

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
  timestampMs?: number;
}

export function computeCashfreeWebhookSignature(
  timestamp: string,
  rawBody: string | Buffer,
  secret: string
): string {
  const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
  const payloadToSign = `${timestamp}${bodyString}`;
  return crypto.createHmac('sha256', secret).update(payloadToSign, 'utf8').digest('base64');
}

export function verifyCashfreeWebhookSignature(
  params: WebhookVerificationParams
): WebhookVerificationResult {
  const {
    rawBody,
    signatureHeader,
    timestampHeader,
    secret,
    maxReplayWindowMs = 5 * 60 * 1000,
    nowMs = Date.now(),
  } = params;

  if (!secret || !secret.trim()) {
    return { valid: false, reason: 'Cashfree webhook verification secret is not configured.' };
  }

  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  const timestamp = Array.isArray(timestampHeader) ? timestampHeader[0] : timestampHeader;

  if (!signature || typeof signature !== 'string' || !signature.trim()) {
    return { valid: false, reason: 'Missing x-webhook-signature header.' };
  }
  if (!timestamp || typeof timestamp !== 'string' || !timestamp.trim()) {
    return { valid: false, reason: 'Missing x-webhook-timestamp header.' };
  }

  const parsedTs = Number(timestamp.trim());
  if (!Number.isFinite(parsedTs) || parsedTs <= 0) {
    return { valid: false, reason: 'Invalid x-webhook-timestamp header.' };
  }

  // Cashfree uses epoch ms (13 digits), gracefully normalize 10-digit epoch seconds if provided
  const timestampMs = parsedTs < 1e12 ? parsedTs * 1000 : parsedTs;
  if (Math.abs(nowMs - timestampMs) > maxReplayWindowMs) {
    return { valid: false, reason: 'Webhook timestamp is outside allowed replay window.' };
  }

  if (rawBody === undefined || rawBody === null) {
    return { valid: false, reason: 'Original raw request body is unavailable for signature verification.' };
  }

  const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  const expectedSig = computeCashfreeWebhookSignature(timestamp.trim(), bodyStr, secret.trim());

  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  const providedBuf = Buffer.from(signature.trim(), 'utf8');

  if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return { valid: false, reason: 'Invalid x-webhook-signature.' };
  }

  return { valid: true, timestampMs };
}

// =============================================================================
// 5. SECURITY HEADERS & SLIDING-WINDOW RATE LIMITING
// =============================================================================

export function securityHeadersMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');

  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || '');
  if (proto.includes('https')) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

interface RateBucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  skip?: (req: express.Request) => boolean;
}) {
  const buckets = new Map<string, RateBucket>();

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (options.skip && options.skip(req)) {
      return next();
    }

    const clientIp =
      String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';

    const key = `${options.keyPrefix}:${clientIp}`;
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    // Periodic cleanup if map grows
    if (buckets.size > 5000) {
      for (const [bKey, bVal] of buckets.entries()) {
        if (now > bVal.resetAt) buckets.delete(bKey);
      }
    }

    const remaining = Math.max(0, options.maxRequests - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > options.maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please slow down and try again shortly.',
        retryAfterSeconds: retryAfterSec,
      });
    }

    return next();
  };
}
