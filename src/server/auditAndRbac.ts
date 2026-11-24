import crypto from 'crypto';
import type express from 'express';
import { hashPassword, verifyPassword, normalizeEmail, isValidEmail, isValidPasswordInput } from './security.ts';

// =============================================================================
// GRANULAR ADMIN RBAC, STAFF MANAGEMENT & APPEND-ONLY AUDIT LOGGING
// =============================================================================

export type AdminStaffRoleName =
  | 'SUPER_ADMIN'
  | 'FINANCE_ADMIN'
  | 'CATALOG_MODERATOR'
  | 'OPERATIONS_ADMIN'
  | 'SUPPORT_AGENT';

export interface AdminRoleDefinition {
  roleName: AdminStaffRoleName;
  description: string;
  permissions: string[];
  updatedAt: string;
}

export interface AdminStaffMember {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  roleName: AdminStaffRoleName;
  customPermissions?: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StructuredAuditLog {
  id: string;
  userId?: string;
  actorType: 'ADMIN' | 'SELLER' | 'CUSTOMER' | 'SYSTEM';
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  reason?: string;
  correlationId?: string;
  ipAddress?: string;
  details: string;
  timestamp: string;
}

export const roleDefinitions = new Map<AdminStaffRoleName, AdminRoleDefinition>([
  [
    'SUPER_ADMIN',
    {
      roleName: 'SUPER_ADMIN',
      description: 'Full platform control across security, finance, catalog, procurement, and operations.',
      permissions: ['*'],
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    'FINANCE_ADMIN',
    {
      roleName: 'FINANCE_ADMIN',
      description: 'Manage payments, refunds, gift cards, store credits, reconciliation, settlements, and exports.',
      permissions: [
        'finance.read',
        'finance.reconcile',
        'finance.export',
        'refunds.manage',
        'giftcards.manage',
        'storecredits.manage',
        'settlements.approve',
        'invoices.read',
        'audit.read',
      ],
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    'CATALOG_MODERATOR',
    {
      roleName: 'CATALOG_MODERATOR',
      description: 'Review seller onboarding, moderate products, reviews, Q&A, categories, brands, banners, and ads.',
      permissions: [
        'sellers.review',
        'products.moderate',
        'reviews.moderate',
        'qa.moderate',
        'cms.manage',
        'ads.moderate',
      ],
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    'OPERATIONS_ADMIN',
    {
      roleName: 'OPERATIONS_ADMIN',
      description: 'Manage warehouses, transfers, shipments, delivery OTP overrides, suppliers, and PO/GRN receiving.',
      permissions: [
        'warehouses.manage',
        'shipments.manage',
        'delivery.override',
        'suppliers.manage',
        'purchase_orders.manage',
        'grn.receive',
      ],
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    'SUPPORT_AGENT',
    {
      roleName: 'SUPPORT_AGENT',
      description: 'Read orders, shipments, and returns to resolve customer support issues.',
      permissions: ['orders.read', 'shipments.read', 'tickets.manage', 'returns.read'],
      updatedAt: new Date().toISOString(),
    },
  ],
]);

export const adminStaffMembers = new Map<string, AdminStaffMember>();
export const structuredAuditLogs: StructuredAuditLog[] = [];

// Tracks which AuthSession tokens belong to specific AdminStaffMember role/permissions
export const adminSessionPermissionMap = new Map<
  string,
  { staffId: string; roleName: AdminStaffRoleName; permissions: string[] }
>();

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'secret',
  'apikey',
  'api_key',
  'token',
  'otp',
  'otpcode',
  'rawcode',
  'giftcardcode',
  'accountnumber',
  'accountnumberencrypted',
  'clientsecret',
  'webhooksecret',
]);

export function scrubSensitiveFields(value: unknown, depth = 0): any {
  if (depth > 5 || value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => scrubSensitiveFields(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        if (k.toLowerCase() === 'accountnumber' && typeof v === 'string' && v.length >= 4) {
          out[k] = `•••• ${v.slice(-4)}`;
        } else {
          out[k] = '[REDACTED]';
        }
      } else {
        out[k] = scrubSensitiveFields(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

export function maskBankAccountNumber(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '•••• 0000';
  const trimmed = raw.trim();
  if (trimmed.startsWith('••••') || trimmed === 'Pending Verification') return trimmed;
  const digits = trimmed.replace(/\s+/g, '');
  if (digits.length < 4) return '•••• 0000';
  return `•••• ${digits.slice(-4)}`;
}

export function maskEmailAddress(raw?: string | null): string {
  if (!raw || !raw.includes('@')) return '***';
  const [local, domain] = raw.split('@');
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}***@${domain}`;
}

export function maskPhoneNumber(raw?: string | null): string {
  if (!raw) return '***';
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `******${digits.slice(-4)}`;
}

// Append-only audit trail
export function recordAuditLog(params: {
  actorType: 'ADMIN' | 'SELLER' | 'CUSTOMER' | 'SYSTEM';
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  reason?: string;
  correlationId?: string;
  ipAddress?: string;
  details: string;
  legacyAuditSink?: Array<any>;
}): StructuredAuditLog {
  const entry: StructuredAuditLog = {
    id: `aud_${crypto.randomBytes(6).toString('hex')}`,
    userId: params.actorId,
    actorType: params.actorType,
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    beforeState: params.beforeState ? scrubSensitiveFields(params.beforeState) : null,
    afterState: params.afterState ? scrubSensitiveFields(params.afterState) : null,
    reason: params.reason,
    correlationId: params.correlationId || `corr_${crypto.randomBytes(4).toString('hex')}`,
    ipAddress: params.ipAddress,
    details: params.details,
    timestamp: new Date().toISOString(),
  };

  // Append-only guarantee: freeze nested snapshot copies
  structuredAuditLogs.push(Object.freeze(entry) as StructuredAuditLog);

  if (params.legacyAuditSink) {
    params.legacyAuditSink.push({
      id: entry.id,
      actorType: entry.actorType === 'CUSTOMER' ? 'SYSTEM' : entry.actorType,
      actorId: entry.actorId,
      actorName: entry.actorName,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: entry.details,
      timestamp: entry.timestamp,
    });
  }

  return entry;
}

export function queryAuditLogs(filters: {
  entityType?: string;
  entityId?: string;
  action?: string;
  actorRole?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const fromMs = filters.fromDate ? new Date(filters.fromDate).getTime() : null;
  const toMs = filters.toDate ? new Date(filters.toDate).getTime() : null;
  const searchLower = filters.search?.trim().toLowerCase() || '';

  const filtered = structuredAuditLogs.filter((log) => {
    if (filters.entityType && log.entityType.toUpperCase() !== filters.entityType.toUpperCase()) return false;
    if (filters.entityId && log.entityId !== filters.entityId) return false;
    if (filters.action && !log.action.toUpperCase().includes(filters.action.toUpperCase())) return false;
    if (filters.actorRole && log.actorRole.toUpperCase() !== filters.actorRole.toUpperCase()) return false;
    const ts = new Date(log.timestamp).getTime();
    if (fromMs && Number.isFinite(fromMs) && ts < fromMs) return false;
    if (toMs && Number.isFinite(toMs) && ts > toMs) return false;
    if (searchLower) {
      const hay = `${log.action} ${log.entityType} ${log.entityId} ${log.actorName} ${log.details} ${log.reason || ''}`.toLowerCase();
      if (!hay.includes(searchLower)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
  const start = (page - 1) * limit;

  return {
    total: sorted.length,
    page,
    limit,
    auditLogs: sorted.slice(start, start + limit),
  };
}

export function resolveEffectivePermissions(req: express.Request): string[] {
  if (!req.auth) return [];
  const tokenMeta = adminSessionPermissionMap.get(req.auth.token);
  if (tokenMeta) {
    return tokenMeta.permissions;
  }
  if (req.auth.role === 'SUPER_ADMIN') {
    return ['*'];
  }
  if (req.auth.role === 'ADMIN') {
    return roleDefinitions.get('SUPER_ADMIN')?.permissions || ['*'];
  }
  return [];
}

export function hasPermission(granted: string[], requiredPermission: string): boolean {
  if (granted.includes('*')) return true;
  if (granted.includes(requiredPermission)) return true;
  const [prefix] = requiredPermission.split('.');
  if (prefix && granted.includes(`${prefix}.*`)) return true;
  return false;
}

export function requirePermission(...requiredPermissions: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    if (req.auth.role !== 'ADMIN' && req.auth.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: `Forbidden: ${req.auth.role} role cannot access administrative controls.`,
      });
    }

    const granted = resolveEffectivePermissions(req);
    const missing = requiredPermissions.filter((perm) => !hasPermission(granted, perm));
    if (missing.length > 0) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Missing required permission (${missing.join(', ')}).`,
      });
    }

    return next();
  };
}

export function createAdminStaffMember(params: {
  name: string;
  email: string;
  password: string;
  roleName: AdminStaffRoleName;
  customPermissions?: string[];
}): AdminStaffMember {
  const cleanEmail = normalizeEmail(params.email);
  if (!params.name.trim() || !isValidEmail(cleanEmail)) {
    throw new Error('Valid staff name and email address are required.');
  }
  if (!isValidPasswordInput(params.password)) {
    throw new Error('Staff password must be between 6 and 128 characters.');
  }
  if (!roleDefinitions.has(params.roleName)) {
    throw new Error(`Unknown admin role: ${params.roleName}`);
  }
  for (const existing of adminStaffMembers.values()) {
    if (existing.email === cleanEmail) {
      throw new Error('An admin staff member with this email already exists.');
    }
  }

  const now = new Date().toISOString();
  const member: AdminStaffMember = {
    id: `adm_staff_${crypto.randomBytes(5).toString('hex')}`,
    name: params.name.trim(),
    email: cleanEmail,
    passwordHash: hashPassword(params.password),
    roleName: params.roleName,
    customPermissions: params.customPermissions,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  adminStaffMembers.set(member.id, member);
  return member;
}

export function authenticateAdminStaff(email: string, password: string): {
  member: AdminStaffMember;
  permissions: string[];
} | null {
  const cleanEmail = normalizeEmail(email);
  for (const member of adminStaffMembers.values()) {
    if (member.email === cleanEmail) {
      if (!member.isActive) return null;
      if (!verifyPassword(password, member.passwordHash)) return null;
      member.lastLoginAt = new Date().toISOString();
      const basePerms = roleDefinitions.get(member.roleName)?.permissions || [];
      const permissions = member.customPermissions?.length
        ? member.customPermissions
        : basePerms;
      return { member, permissions };
    }
  }
  return null;
}

export function sanitizeAdminStaff(member: AdminStaffMember) {
  const { passwordHash: _ph, ...safe } = member;
  const rolePerms = roleDefinitions.get(member.roleName)?.permissions || [];
  return {
    ...safe,
    effectivePermissions: member.customPermissions?.length ? member.customPermissions : rolePerms,
  };
}
