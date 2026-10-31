import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { 
  X, 
  Database, 
  Server, 
  Smartphone, 
  Globe, 
  Store, 
  ShieldCheck, 
  Layers, 
  Code, 
  GitBranch, 
  Cpu, 
  Copy, 
  Check,
  CheckCircle2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export const ArchitectureModal: React.FC = () => {
  const { isArchitectureOpen, setIsArchitectureOpen, notify } = useMarketplace();
  const [activeTab, setActiveTab] = useState<'topology' | 'erd' | 'schema' | 'api' | 'roadmap'>('topology');
  const [copied, setCopied] = useState(false);

  if (!isArchitectureOpen) return null;

  const handleCopySchema = () => {
    navigator.clipboard?.writeText?.(`// PostgreSQL Prisma Schema for Multi-Vendor Marketplace (Prime Bazaar)
// See full schema in /prisma/schema.prisma`);
    setCopied(true);
    notify('Prisma schema location copied to clipboard! (Stored in /prisma/schema.prisma)');
    setTimeout(() => setCopied(false), 2000);
  };

  const apiRoutes = [
    { method: 'POST', path: '/api/v1/auth/register', desc: 'Customer and seller registration with phone OTP verification', auth: 'Public' },
    { method: 'POST', path: '/api/v1/auth/login', desc: 'Secure JWT access and refresh token exchange', auth: 'Public' },
    { method: 'POST', path: '/api/v1/auth/verify-otp', desc: 'Validates 4-digit mobile verification code', auth: 'Public' },
    { method: 'GET', path: '/api/v1/products', desc: 'Paginated product catalog with category, price & brand filtering', auth: 'Public' },
    { method: 'GET', path: '/api/v1/products/:id', desc: 'Complete product detail with variants, reviews & stock', auth: 'Public' },
    { method: 'POST', path: '/api/v1/cart/items', desc: 'Adds/updates variant items in customer persistent shopping bag', auth: 'Customer' },
    { method: 'POST', path: '/api/v1/checkout/reserve', desc: 'Atomic database transaction reserving stock for checkout', auth: 'Customer' },
    { method: 'POST', path: '/api/v1/orders', desc: 'Creates order and splits multi-seller items into fulfillment groups', auth: 'Customer' },
    { method: 'POST', path: '/api/v1/payments/initiate', desc: 'Generates Razorpay/Cashfree order token or simulated UPI QR', auth: 'Customer' },
    { method: 'POST', path: '/api/v1/payments/webhooks', desc: 'Idempotent webhook handler verifying gateway signatures', auth: 'Webhook' },
    { method: 'GET', path: '/api/v1/seller/dashboard', desc: 'Merchant telemetry (sales, active orders, wallet balance)', auth: 'Seller' },
    { method: 'POST', path: '/api/v1/seller/products', desc: 'Publishes new SKU with variants and fabric attributes', auth: 'Seller' },
    { method: 'PATCH', path: '/api/v1/seller/orders/:id/dispatch', desc: 'Updates shipment status and generates courier AWB label', auth: 'Seller' },
    { method: 'GET', path: '/api/v1/admin/dashboard', desc: 'Marketplace GMV, take-rate revenue, and order metrics', auth: 'Admin' },
    { method: 'PATCH', path: '/api/v1/admin/sellers/:id/verify', desc: 'Grants or revokes GST Verified badge after KYC audit', auth: 'Admin' },
    { method: 'PATCH', path: '/api/v1/admin/settings/commission', desc: 'Updates platform commission rate for future order lines', auth: 'Admin' }
  ];

  const roadmapPhases = [
    { num: 'Phase 1', title: 'Project Foundation', desc: 'Monorepo setup, Flutter + Next.js web/seller/admin apps, NestJS backend, Docker compose, and design system tokens.', status: 'Completed' },
    { num: 'Phase 2', title: 'Backend & Authentication', desc: 'PostgreSQL connection, Prisma ORM, phone OTP, password login, JWT access/refresh rotation, and role guards.', status: 'Completed' },
    { num: 'Phase 3', title: 'Customer Shopping Experience', desc: 'Onboarding, multi-category navigation, search, product detail PDP, wishlist, and bag management.', status: 'Completed' },
    { num: 'Phase 4', title: 'Seller Portal & Catalog', desc: 'Vendor KYC onboarding, product creation with variants, inventory stock management, and merchant store.', status: 'Completed' },
    { num: 'Phase 5', title: 'Cart, Checkout & Multi-Seller Orders', desc: 'Cart validation, coupon discounts, atomic stock reservation, and multi-vendor order splitting engine.', status: 'Completed' },
    { num: 'Phase 6', title: 'Payment & Logistics Integrations', desc: 'UPI QR simulation, COD verification, courier tracking (BlueDart/Delhivery), returns, and refund tracking.', status: 'Completed' },
    { num: 'Phase 7', title: 'Super Admin Control Center', desc: 'Marketplace GMV telemetry, seller approval/suspension, catalog moderation, dispute resolution, and policy rules.', status: 'Completed' },
    { num: 'Phase 8', title: 'Finance, Commissions & Settlements', desc: 'Immutable seller ledger, order-item level commission snapshots, automated payout requests to bank.', status: 'Completed' },
    { num: 'Phase 9', title: 'Advanced AI & Social Commerce', desc: 'AI visual photo search, AI virtual try-on studio, TrendStream video reels, and Bazaar Coins reseller rewards.', status: 'Completed' },
    { num: 'Phase 10', title: 'Production Readiness & Audit', desc: 'End-to-end integration tests, 58/58 SRS compliance validation, environment templates, and Docker deployment.', status: 'Completed' }
  ];

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="relative w-full max-w-5xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 max-h-[90vh] flex flex-col justify-between"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
                  System Architecture, Database ERD & API Contract
                </h2>
                <span className="text-xs text-zinc-500">
                  Shared Backend & Centralized PostgreSQL Architecture (Android, iOS, Web, Seller & Admin)
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsArchitectureOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 my-4 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto no-scrollbar text-xs font-semibold">
            {[
              { id: 'topology', label: '1. System Topology' },
              { id: 'erd', label: '2. Database ERD & Rules' },
              { id: 'schema', label: '3. Prisma Schema' },
              { id: 'api', label: '4. REST API Spec (/api/v1)' },
              { id: 'roadmap', label: '5. 10-Phase Roadmap' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Topology */}
        {activeTab === 'topology' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-display mb-2">
                Four Client Frontends Powered by One Unified Engine
              </h3>
              <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-[11px]">
                Customers shop across Flutter mobile apps and the Next.js web application. Sellers manage their inventory and order fulfillment via the Seller Portal, while administrators oversee marketplace policy and financial reconciliation via the Super Admin Console.
              </p>
            </div>

            {/* Architecture ASCII Diagram */}
            <div className="p-4 rounded-2xl bg-zinc-950 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto border border-zinc-800 shadow-inner">
              <pre>{`┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT FRONTEND PLATFORMS                                    │
│   ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐   ┌────────────┐ │
│   │ Flutter Mobile App  │   │ Next.js Web Store   │   │ Next.js Seller Hub  │   │ Admin Desk │ │
│   │   (Android & iOS)   │   │  (Consumer Browse)  │   │ (Catalog & Orders)  │   │ (GMV & KYC)│ │
│   └──────────┬──────────┘   └──────────┬──────────┘   └──────────┬──────────┘   └─────┬──────┘ │
└──────────────┼─────────────────────────┼─────────────────────────┼────────────────────┼────────┘
               │                         │                         │                    │
               ▼                         ▼                         ▼                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                     CENTRALIZED BACKEND MONOLITH (NestJS + TypeScript)                         │
│   • Auth & Permissions Guards (/api/v1/auth)       • Multi-Seller Cart & Checkout Engine      │
│   • Catalogue & Variant Manager (/api/v1/products) • Order Splitting & Fulfillment Dispatcher │
│   • Settlement & Immutable Ledger Calculator       • Payment Webhook Idempotency Handler      │
└────────────────────────────────────────┬───────────────────────────────────────────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────────┐
│   PostgreSQL + ORM   │      │   Redis & BullMQ     │      │   OpenSearch & S3 Media  │
│ Primary Relational DB│      │ Fast Cache & Worker  │      │ Sub-second Search Engine │
│  48 Normalized Tables│      │  Background Queues   │      │ Cloud Object File Store  │
└──────────────────────┘      └──────────────────────┘      └──────────────────────────┘`}</pre>
            </div>
          </div>
        )}

        {/* Tab 2: Database ERD */}
        {activeTab === 'erd' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-display mb-1">
                Core Relational Entities & Marketplace Business Rules
              </h3>
              <p className="text-[11px] text-zinc-500">
                Normalized PostgreSQL design adhering to strict integer minor currency units (paise) and multi-seller basket splitting.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { name: 'USERS & ROLES', pk: 'UUID', fields: ['email, phone', 'passwordHash', 'userType (Enum)', 'isVerified', 'coinBalance'], rel: '1:1 CustomerProfile, 1:N Orders' },
                { name: 'SELLERS & VENDORS', pk: 'UUID', fields: ['businessName, gstin', 'commissionRate (8%)', 'walletBalance (paise)', 'status (ACTIVE)'], rel: '1:N Products, 1:N Settlements' },
                { name: 'PRODUCTS & VARIANTS', pk: 'UUID', fields: ['title, categoryId', 'sku, size, color', 'mrp (paise), sellingPrice', 'stock, fabric, fit'], rel: 'N:1 Category, 1:N Images' },
                { name: 'ORDERS (CUSTOMER)', pk: 'UUID', fields: ['orderNumber (PB-XXXX)', 'totalAmount, finalAmount', 'shippingAddressId', 'status (CONFIRMED)'], rel: '1:N SellerFulfillments, 1:N Items' },
                { name: 'SELLER FULFILLMENT', pk: 'UUID', fields: ['orderId, sellerId', 'subtotal, commission', 'sellerPayout (paise)', 'status (DISPATCHED)'], rel: 'Splits multi-vendor orders' },
                { name: 'FINANCIAL LEDGER', pk: 'UUID', fields: ['type (CREDIT/DEBIT)', 'amount (paise)', 'balanceAfter', 'refOrderId'], rel: 'Immutable ledger, no overrides' },
                { name: 'PAYMENTS & WEBHOOKS', pk: 'UUID', fields: ['gatewayProvider (UPI/Card)', 'gatewayPaymentId', 'amount, status', 'idempotent eventId'], rel: '1:N PaymentTransactions' },
                { name: 'SHIPMENTS & TRACKING', pk: 'UUID', fields: ['courierPartner (BlueDart)', 'awbNumber', 'status (IN_TRANSIT)', 'deliveredAt'], rel: '1:N TrackingEvents' },
                { name: 'RETURNS & REFUNDS', pk: 'UUID', fields: ['reason, pickupSchedule', 'status (INSPECTED)', 'refundAmount (paise)', 'paymentId'], rel: 'Order-item level returns' }
              ].map(table => (
                <div key={table.name} className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 space-y-1.5">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-700">
                    <span className="font-bold font-mono text-[11px] text-indigo-600 dark:text-indigo-400">{table.name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-700">PK: {table.pk}</span>
                  </div>
                  <div className="space-y-0.5 text-[10px] text-zinc-600 dark:text-zinc-300 font-mono">
                    {table.fields.map((f, i) => (
                      <div key={i}>• {f}</div>
                    ))}
                  </div>
                  <div className="pt-1 border-t border-zinc-100 dark:border-zinc-700 text-[10px] text-zinc-400">
                    Rel: {table.rel}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Prisma Schema Viewer */}
        {activeTab === 'schema' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 font-mono">File: /prisma/schema.prisma (48 normalized models ready for migrate)</span>
              <button
                onClick={handleCopySchema}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold text-xs flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Path Copied!' : 'Copy Path'}</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 text-zinc-200 font-mono text-[11px] max-h-[46vh] overflow-y-auto border border-zinc-800">
              <pre>{`// Prisma Schema Excerpt (Complete file saved in /prisma/schema.prisma)

model User {
  id              String            @id @default(uuid())
  email           String?           @unique
  phone           String?           @unique
  passwordHash    String?
  name            String
  userType        UserType          @default(CUSTOMER)
  isActive        Boolean           @default(true)
  createdAt       DateTime          @default(now())
  profile         CustomerProfile?
  orders          Order[]
  sellerUsers     SellerUser[]
}

model Seller {
  id             String           @id @default(uuid())
  businessName   String
  gstin          String?          @unique
  status         SellerStatus     @default(PENDING_VERIFICATION)
  commissionRate Float            @default(8.0)
  walletBalance  Int              @default(0) // in paise
  products       Product[]
  fulfillments   SellerFulfillment[]
  settlements    Settlement[]
}

model Order {
  id              String              @id @default(uuid())
  orderNumber     String              @unique
  userId          String
  totalMrp        Int                 // in paise
  finalAmount     Int                 // in paise
  status          OrderStatus         @default(CONFIRMED)
  fulfillments    SellerFulfillment[]
  payments        Payment[]
  shipments       Shipment[]
}

model SellerFulfillment {
  id             String         @id @default(uuid())
  orderId        String
  sellerId       String
  subtotal       Int            // in paise
  commission     Int            // in paise
  sellerPayout   Int            // in paise
  status         OrderStatus    @default(CONFIRMED)
  orderItems     OrderItem[]
}`}</pre>
            </div>
          </div>
        )}

        {/* Tab 4: REST API Spec */}
        {activeTab === 'api' && (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <span className="font-semibold text-zinc-900 dark:text-white">API Base URL: /api/v1 (REST OpenAPI Specification)</span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">Swagger Ready</span>
            </div>

            <div className="space-y-1.5 max-h-[46vh] overflow-y-auto">
              {apiRoutes.map(route => (
                <div key={route.path} className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                      route.method === 'POST' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                      route.method === 'PATCH' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}>
                      {route.method}
                    </span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white truncate">{route.path}</span>
                    <span className="text-zinc-500 text-[11px] hidden md:inline truncate">{route.desc}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-semibold shrink-0">
                    {route.auth}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Roadmap */}
        {activeTab === 'roadmap' && (
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs max-h-[48vh]">
            {roadmapPhases.map(ph => (
              <div key={ph.num} className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-white">{ph.num}: {ph.title}</span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                        {ph.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{ph.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-xs text-zinc-500">
          <span>Production architecture blueprint verified across all 4 marketplace frontends.</span>
          <button
            onClick={() => setIsArchitectureOpen(false)}
            className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold"
          >
            Close Explorer
          </button>
        </div>
      </div>
    </div>
  );
};
