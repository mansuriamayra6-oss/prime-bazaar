import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { api } from '../../services/api';
import { RealPlatformAnalytics } from '../../types';
const AdminFinanceOpsPanel = lazy(() =>
  import('./AdminFinanceOpsPanel').then(m => ({ default: m.AdminFinanceOpsPanel }))
);
const AdminSupplyAndCmsPanel = lazy(() =>
  import('./AdminSupplyAndCmsPanel').then(m => ({ default: m.AdminSupplyAndCmsPanel }))
);
import {
  ShieldCheck,
  TrendingUp,
  Store,
  Package,
  XCircle,
  Trash2,
  DollarSign,
  Database,
  Layers,
  Check,
  Ban,
  Download,
  Lock,
} from 'lucide-react';

type AdminTab = 'kpi' | 'sellers' | 'payouts' | 'catalog' | 'finance' | 'ops' | 'disputes' | 'settings';

export const AdminDashboard: React.FC = () => {
  const {
    sellers,
    updateSellerStatus,
    products,
    deleteProduct,
    orders,
    sellerPayouts,
    approveSellerPayout,
    sellerReturns,
    notify,
    setIsArchitectureOpen,
    setIsBlueprintOpen,
  } = useMarketplace();

  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('kpi');
  const [platformCommission, setPlatformCommission] = useState(12);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(999);
  const [selectedSellerForAudit, setSelectedSellerForAudit] = useState<any>(null);
  const [sellerReviewReason, setSellerReviewReason] = useState('');

  const [analytics, setAnalytics] = useState<RealPlatformAnalytics | null>(null);
  const [adminAuthNeeded, setAdminAuthNeeded] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const loadRealAnalytics = async () => {
    try {
      const res = await api.adminOps.getAnalytics();
      setAnalytics(res.analytics || null);
      setAdminAuthNeeded(false);
    } catch {
      setAdminAuthNeeded(true);
    }
  };

  useEffect(() => {
    loadRealAnalytics();
  }, [orders.length]);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      await api.v1.auth.adminLogin(adminPasswordInput, adminEmailInput.trim() || undefined);
      setAdminPasswordInput('');
      setAdminAuthNeeded(false);
      notify('Admin session authenticated.');
      await loadRealAnalytics();
    } catch (err: any) {
      notify(err.message || 'Invalid admin credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDownloadAnalytics = async (format: 'csv' | 'xlsx') => {
    try {
      const blob = await api.adminOps.downloadAnalyticsExport(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `primebazaar_analytics.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify(`Exported analytics.${format}`);
    } catch (err: any) {
      notify(err.message || 'Sign in as Admin to export analytics.');
    }
  };

  const handleSellerLifecycleReview = async (
    sellerId: string,
    toStatus: 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED' | 'SUSPENDED',
    localStatus: 'active' | 'rejected' | 'pending_approval' | 'suspended'
  ) => {
    try {
      await api.adminOps.reviewSeller(
        sellerId,
        toStatus,
        sellerReviewReason.trim() || `Admin review transition to ${toStatus}`
      );
      setSellerReviewReason('');
    } catch {
      // Also reflect local demo state change if preview session is unauthenticated
    }
    updateSellerStatus(sellerId, localStatus);
    setSelectedSellerForAudit(null);
  };

  const handleModerateProduct = async (productId: string, toStatus: 'APPROVED' | 'REJECTED') => {
    try {
      await api.adminOps.moderateProduct(
        productId,
        toStatus,
        toStatus === 'REJECTED' ? 'Requires updated product specifications' : 'Approved for storefront'
      );
      notify(`Product ${toStatus.toLowerCase()}.`);
    } catch (err: any) {
      notify(err.message || 'Sign in as Admin to moderate catalog listings.');
    }
  };

  const realLocalGmv = orders.reduce((sum, o) => sum + o.finalAmount, 0);
  const displayGmv = analytics ? analytics.grossMerchandiseValue : realLocalGmv;
  const displayOrdersCount = analytics ? analytics.totalOrders : orders.length;
  const displayCommissionRevenue = analytics
    ? analytics.commissionRevenue
    : Math.round((displayGmv * platformCommission) / 100);
  const displayActiveSellers = analytics
    ? analytics.activeSellers
    : sellers.filter(s => s.status === 'active').length;

  const handleSaveSettings = () => {
    notify(`Platform marketplace commission updated to ${platformCommission}%.`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Super Admin Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white font-display">
              Marketplace Operations Console
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Live order analytics, seller onboarding lifecycle, finance ledger & procurement
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsArchitectureOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            <span>Database ERD</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBlueprintOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
            <span>SRS Matrix</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 py-4 border-b border-zinc-200 dark:border-zinc-800">
        {[
          { id: 'kpi', label: 'Analytics & GMV' },
          { id: 'sellers', label: `Sellers (${sellers.length})` },
          { id: 'payouts', label: `Settlements (${sellerPayouts.filter(p => p.status === 'pending').length})` },
          { id: 'catalog', label: `Moderation (${products.length})` },
          { id: 'finance', label: 'Finance Ops' },
          { id: 'ops', label: 'CMS, Procurement & Staff' },
          { id: 'disputes', label: `Returns (${sellerReturns.length})` },
          { id: 'settings', label: 'Rules & Commission' },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveAdminTab(tab.id as AdminTab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeAdminTab === tab.id
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Inline Admin / Staff Sign-In Banner if not yet authenticated */}
      {adminAuthNeeded && (
        <form
          onSubmit={handleAdminSignIn}
          className="mt-5 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            <Lock className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              Authenticate as Super Admin or Staff to execute protected finance, KYC, and procurement operations.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              placeholder="Staff email (blank for Super Admin)"
              value={adminEmailInput}
              onChange={e => setAdminEmailInput(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 w-56"
            />
            <input
              type="password"
              required
              placeholder="Admin password"
              value={adminPasswordInput}
              onChange={e => setAdminPasswordInput(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 w-44"
            />
            <button
              type="submit"
              disabled={isLoggingIn}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold whitespace-nowrap disabled:opacity-50"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In Admin'}
            </button>
          </div>
        </form>
      )}

      {/* KPI Overview Tab (Real Computed Metrics) */}
      {activeAdminTab === 'kpi' && (
        <div className="space-y-6 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-zinc-500">
              {analytics ? 'Live Server Analytics Snapshot' : 'Current Session Orders Snapshot'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDownloadAnalytics('csv')}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadAnalytics('xlsx')}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export XLSX</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-semibold uppercase">Total Marketplace GMV</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
                ₹{displayGmv.toLocaleString('en-IN')}
              </span>
              <span className="block text-[11px] text-zinc-500 mt-1">
                AOV: ₹{(analytics?.averageOrderValue ?? (displayOrdersCount > 0 ? Math.round(displayGmv / displayOrdersCount) : 0)).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-semibold uppercase">Commission Revenue</span>
                <DollarSign className="w-4 h-4 text-indigo-500" />
              </div>
              <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                ₹{displayCommissionRevenue.toLocaleString('en-IN')}
              </span>
              <span className="block text-[11px] text-zinc-500 mt-1">
                Take Rate: {analytics?.platformTakeRate || `${platformCommission}%`}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-semibold uppercase">Active Sellers</span>
                <Store className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
                {displayActiveSellers} / {analytics?.totalSellers ?? sellers.length}
              </span>
              <span className="block text-[11px] text-zinc-500 mt-1">
                Pending KYC: {analytics?.pendingKYCSellers ?? sellers.filter(s => s.status !== 'active').length}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-semibold uppercase">Recorded Orders</span>
                <Package className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
                {displayOrdersCount.toLocaleString('en-IN')}
              </span>
              <span className="block text-[11px] text-zinc-500 mt-1">
                Fulfillment Rate: {analytics?.fulfillmentRate || '0%'}
              </span>
            </div>
          </div>

          {analytics && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs tabular-nums">
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <span className="text-zinc-500 block">Disbursed to Sellers</span>
                <span className="font-mono font-bold text-base text-zinc-900 dark:text-white">
                  ₹{analytics.disbursedToVendors.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <span className="text-zinc-500 block">Sponsored Ad Spend / Attributed GMV</span>
                <span className="font-mono font-bold text-base text-zinc-900 dark:text-white">
                  ₹{analytics.totalAdSpend.toLocaleString('en-IN')} / ₹{analytics.totalAdRevenue.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <span className="text-zinc-500 block">Double-Entry Trial Balance</span>
                <span className={`font-bold text-base ${analytics.ledgerBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {analytics.ledgerBalanced ? 'Balanced' : 'Attention Required'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sellers Onboarding Lifecycle & Verification Tab */}
      {activeAdminTab === 'sellers' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto mt-6">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase text-zinc-500 tracking-wider">
              Vendor Directory, KYC Lifecycle & Approval Controls
            </h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-4">Seller & Business Name</th>
                <th className="p-4">GSTIN</th>
                <th className="p-4">Location</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {sellers.map(s => (
                <tr key={s.id}>
                  <td className="p-4">
                    <span className="font-bold text-zinc-900 dark:text-white block">{s.businessName}</span>
                    <span className="text-zinc-400 text-[11px]">{s.name} · {s.phone || 'Contact verified'}</span>
                  </td>
                  <td className="p-4 font-mono">{s.gstNumber}</td>
                  <td className="p-4">{s.location}</td>
                  <td className="p-4 font-semibold uppercase text-[11px]">{s.status}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {s.status !== 'active' && (
                        <button
                          type="button"
                          onClick={() => handleSellerLifecycleReview(s.id, 'APPROVED', 'active')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      )}
                      {s.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => handleSellerLifecycleReview(s.id, 'SUSPENDED', 'suspended')}
                          className="px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-rose-100 hover:text-rose-700 text-zinc-700 dark:text-zinc-300 font-semibold flex items-center gap-1"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Suspend</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedSellerForAudit(s)}
                        className="px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold"
                      >
                        Inspect KYC
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Seller Payouts Management Tab */}
      {activeAdminTab === 'payouts' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 mt-6">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
            Seller Settlement Disbursements
          </h3>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs tabular-nums">
            {sellerPayouts.map(p => (
              <div key={p.id} className="py-3.5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-sm text-zinc-900 dark:text-white">#{p.id}</span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{p.sellerName}</span>
                    <span className="text-[11px] uppercase font-semibold text-zinc-500">{p.status}</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">
                    Account: {p.bankName} (•••• {String(p.accountNumber || '').slice(-4) || '9041'}) · Requested: {p.requestedAt}
                  </span>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
                    Gross: ₹{p.grossSales.toLocaleString('en-IN')} · Commission: -₹{p.commissionDeducted.toLocaleString('en-IN')} · Net: ₹{p.netPayout.toLocaleString('en-IN')}
                  </span>
                </div>

                <div>
                  {p.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => approveSellerPayout(p.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve & Disburse NEFT</span>
                    </button>
                  ) : (
                    <span className="font-mono text-emerald-600 font-bold">
                      Settled ({p.bankRefNumber || 'NEFT-DONE'})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Catalog Moderation Tab */}
      {activeAdminTab === 'catalog' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 mt-6">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
            Catalog Quality Audit & Product Approval
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(p => (
              <div key={p.id} className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex gap-3 text-xs items-center justify-between">
                <img
                  src={p.images[0]}
                  alt={p.title}
                  referrerPolicy="no-referrer"
                  className="w-12 h-14 object-cover rounded-lg shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-zinc-900 dark:text-white truncate">{p.title}</h4>
                  <span className="text-[10px] text-zinc-400 uppercase block">{p.sellerName}</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white mt-0.5 block tabular-nums">
                    ₹{p.price.toLocaleString('en-IN')} · GST: {p.gstRate || 12}%
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleModerateProduct(p.id, 'APPROVED')}
                    className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-semibold"
                    title="Approve listing"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModerateProduct(p.id, 'REJECTED')}
                    className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-[10px] font-semibold"
                    title="Reject listing"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProduct(p.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                    title="Remove from marketplace"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeAdminTab === 'finance' && (
        <Suspense fallback={<div className="p-4 text-xs text-zinc-500">Loading finance panel...</div>}>
          <AdminFinanceOpsPanel orders={orders} notify={notify} />
        </Suspense>
      )}

      {activeAdminTab === 'ops' && (
        <Suspense fallback={<div className="p-4 text-xs text-zinc-500">Loading supply &amp; CMS panel...</div>}>
          <AdminSupplyAndCmsPanel notify={notify} />
        </Suspense>
      )}

      {/* Disputes & Returns Monitor Tab */}
      {activeAdminTab === 'disputes' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 mt-6">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
            Platform Returns, Replacements & Customer Complaints
          </h3>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
            {sellerReturns.map(r => (
              <div key={r.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    Return #{r.id} ({r.productTitle})
                  </span>
                  <span className="text-zinc-500 block">
                    Customer: {r.customerName} · Reason: {r.reason}
                  </span>
                </div>
                <span className="uppercase font-semibold text-[11px] text-zinc-600 dark:text-zinc-300">
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeAdminTab === 'settings' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-lg space-y-5 mt-6">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
            Global Marketplace Policy Configuration
          </h3>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-2 tabular-nums">
              <span className="text-zinc-700 dark:text-zinc-300">Marketplace Take Rate (Commission %)</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{platformCommission}%</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              value={platformCommission}
              onChange={e => setPlatformCommission(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-2 tabular-nums">
              <span className="text-zinc-700 dark:text-zinc-300">Free Express Delivery Minimum Cart Value</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">₹{freeDeliveryThreshold}</span>
            </div>
            <input
              type="range"
              min="499"
              max="1999"
              step="100"
              value={freeDeliveryThreshold}
              onChange={e => setFreeDeliveryThreshold(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveSettings}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
          >
            Save Marketplace Policy
          </button>
        </div>
      )}

      {/* KYC Document Audit Modal */}
      {selectedSellerForAudit && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-xs animate-fadeIn">
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                KYC Dossier: {selectedSellerForAudit.businessName}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedSellerForAudit(null)}
                className="p-1 text-zinc-400"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 tabular-nums">
              <div className="flex justify-between">
                <span className="text-zinc-500">Business PAN:</span>
                <span className="font-mono font-bold">{selectedSellerForAudit.panNumber || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">GSTIN:</span>
                <span className="font-mono font-bold">{selectedSellerForAudit.gstNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Bank Account (Masked):</span>
                <span className="font-mono">
                  {selectedSellerForAudit.bankAccount?.bankName || 'Verified Bank'} (••••{' '}
                  {String(selectedSellerForAudit.bankAccount?.accountNumber || '9041').slice(-4)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Warehouse PIN:</span>
                <span className="font-mono">{selectedSellerForAudit.pickupAddress?.pinCode || 'N/A'}</span>
              </div>
            </div>

            <input
              type="text"
              placeholder="Review / Rejection / Resubmission reason..."
              value={sellerReviewReason}
              onChange={e => setSellerReviewReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSellerLifecycleReview(selectedSellerForAudit.id, 'APPROVED', 'active')}
                className="py-2 rounded-lg bg-emerald-600 text-white font-semibold"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSellerLifecycleReview(selectedSellerForAudit.id, 'RESUBMISSION_REQUIRED', 'pending_approval')
                }
                className="py-2 rounded-lg border border-amber-400 text-amber-700 dark:text-amber-300 font-semibold"
              >
                Resubmit
              </button>
              <button
                type="button"
                onClick={() => handleSellerLifecycleReview(selectedSellerForAudit.id, 'REJECTED', 'rejected')}
                className="py-2 rounded-lg bg-rose-600 text-white font-semibold"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
