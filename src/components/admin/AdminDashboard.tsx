import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Store, 
  Package, 
  Percent, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Sliders,
  DollarSign,
  Database,
  Layers,
  FileText,
  AlertTriangle,
  RotateCcw,
  Check,
  Ban,
  Clock,
  Eye,
  Wallet
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { 
    sellers, 
    updateSellerStatus,
    toggleSellerVerification, 
    products, 
    updateProduct,
    deleteProduct, 
    orders, 
    availableCoupons, 
    sellerPayouts,
    approveSellerPayout,
    sellerReturns,
    sellerTickets,
    notify,
    setIsArchitectureOpen,
    setIsBlueprintOpen
  } = useMarketplace();

  const [activeAdminTab, setActiveAdminTab] = useState<'kpi' | 'sellers' | 'payouts' | 'catalog' | 'disputes' | 'settings'>('kpi');
  const [platformCommission, setPlatformCommission] = useState(12); // 12% take rate
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(999);
  const [selectedSellerForAudit, setSelectedSellerForAudit] = useState<any>(null);

  const totalGMV = orders.reduce((sum, o) => sum + o.finalAmount, 0) + 7960000;
  const platformRevenue = Math.round((totalGMV * platformCommission) / 100);

  const handleSaveSettings = () => {
    notify(`Platform marketplace commission updated to ${platformCommission}%!`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Super Admin Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white font-display">
                Super Admin Marketplace Operations
              </h1>
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                Root Controller
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Live multi-vendor platform telemetry, seller audit, and dispute resolution
            </p>
          </div>
        </div>

        {/* Tab Switcher & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsArchitectureOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
            title="Open PostgreSQL Database ERD & Architecture Schema"
          >
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            <span>Database ERD</span>
          </button>

          <button
            onClick={() => setIsBlueprintOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
            title="Inspect 58-Feature SRS Matrix"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
            <span>SRS Matrix</span>
          </button>

          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block" />

          {[
            { id: 'kpi', label: 'Platform GMV' },
            { id: 'sellers', label: `Sellers (${sellers.length})` },
            { id: 'payouts', label: `Payouts (${sellerPayouts.filter(p => p.status === 'pending').length} Pending)` },
            { id: 'catalog', label: `Moderation (${products.length})` },
            { id: 'disputes', label: `Returns & Disputes (${sellerReturns.length})` },
            { id: 'settings', label: 'Rules & Commission' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeAdminTab === tab.id
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Overview Tab */}
      {activeAdminTab === 'kpi' && (
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-semibold uppercase">Total Marketplace GMV</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
                ₹{totalGMV.toLocaleString('en-IN')}
              </span>
              <span className="block text-[11px] text-emerald-600 mt-1 font-medium">+24.8% YoY growth</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-semibold uppercase">Platform Take Rate ({platformCommission}%)</span>
                <DollarSign className="w-4 h-4 text-indigo-500" />
              </div>
              <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                ₹{platformRevenue.toLocaleString('en-IN')}
              </span>
              <span className="block text-[11px] text-zinc-400 mt-1">Net platform commission</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-semibold uppercase">Registered Sellers</span>
                <Store className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
                {sellers.length} Active Vendors
              </span>
              <span className="block text-[11px] text-emerald-600 mt-1 font-medium">Autonomous Seller Studio</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-semibold uppercase">Lifetime Orders</span>
                <Package className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
                {(9330 + orders.length).toLocaleString('en-IN')}
              </span>
              <span className="block text-[11px] text-zinc-400 mt-1">98.6% delivered without dispute</span>
            </div>
          </div>
        </div>
      )}

      {/* Sellers Audit & Document Verification Tab */}
      {activeAdminTab === 'sellers' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mt-6 shadow-xs">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase text-zinc-500 tracking-wider">
              Vendor Directory, Document Audit & Approval Controls
            </h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-4">Seller & Business Name</th>
                <th className="p-4">GST Number</th>
                <th className="p-4">Location</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {sellers.map(s => (
                <tr key={s.id}>
                  <td className="p-4">
                    <span className="font-bold text-zinc-900 dark:text-white block">{s.businessName}</span>
                    <span className="text-zinc-400 text-[11px]">{s.name} · {s.phone || 'Phone verified'}</span>
                  </td>
                  <td className="p-4 font-mono">{s.gstNumber}</td>
                  <td className="p-4">{s.location}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      s.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : s.status === 'suspended'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {s.status !== 'active' && (
                        <button
                          onClick={() => updateSellerStatus(s.id, 'active')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Seller</span>
                        </button>
                      )}
                      {s.status === 'active' && (
                        <button
                          onClick={() => updateSellerStatus(s.id, 'suspended')}
                          className="px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-rose-100 hover:text-rose-700 text-zinc-700 dark:text-zinc-300 font-semibold flex items-center gap-1"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Suspend</span>
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedSellerForAudit(s)}
                        className="px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 font-semibold"
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
            Manage Seller Payout Requests & NEFT Settlements
          </h3>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
            {sellerPayouts.map(p => (
              <div key={p.id} className="py-3.5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-sm text-zinc-900 dark:text-white">
                      #{p.id}
                    </span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{p.sellerName}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      p.status === 'processed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">
                    Account: {p.bankName} ({p.accountNumber}) · Requested: {p.requestedAt}
                  </span>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
                    Gross: ₹{p.grossSales.toLocaleString('en-IN')} · Commission: -₹{p.commissionDeducted.toLocaleString('en-IN')} · Net: ₹{p.netPayout.toLocaleString('en-IN')}
                  </span>
                </div>

                <div>
                  {p.status === 'pending' ? (
                    <button
                      onClick={() => approveSellerPayout(p.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve & Transfer NEFT</span>
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
                  <span className="font-mono font-bold text-zinc-900 dark:text-white mt-0.5 block">
                    ₹{p.price.toLocaleString('en-IN')} · GST: {p.gstRate || 12}%
                  </span>
                </div>
                <button
                  onClick={() => deleteProduct(p.id)}
                  className="p-2 text-zinc-400 hover:text-rose-600 transition-colors"
                  title="Remove from marketplace"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
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
                  <span className="font-bold text-zinc-900 dark:text-white">Return #{r.id} ({r.productTitle})</span>
                  <span className="text-zinc-500 block">Customer: {r.customerName} · Reason: {r.reason}</span>
                </div>
                <span className="px-2 py-0.5 rounded uppercase font-bold text-[10px] bg-zinc-100 dark:bg-zinc-800">
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Tab: Commission Configuration */}
      {activeAdminTab === 'settings' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-lg space-y-5 mt-6">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
            Global Marketplace Policy Configuration
          </h3>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-2">
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
            <div className="flex justify-between text-xs font-semibold mb-2">
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
            onClick={handleSaveSettings}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-md"
          >
            Save Marketplace Policy
          </button>
        </div>
      )}

      {/* KYC Document Audit Drawer/Modal */}
      {selectedSellerForAudit && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-xs animate-fadeIn">
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                KYC Dossier: {selectedSellerForAudit.businessName}
              </h3>
              <button onClick={() => setSelectedSellerForAudit(null)} className="p-1 text-zinc-400">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Business PAN:</span>
                <span className="font-mono font-bold">{selectedSellerForAudit.panNumber || 'AAECV1234M'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">GSTIN:</span>
                <span className="font-mono font-bold">{selectedSellerForAudit.gstNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Bank Account:</span>
                <span className="font-mono">{selectedSellerForAudit.bankAccount?.bankName || 'HDFC Bank'} (•••• 9041)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Warehouse PIN:</span>
                <span className="font-mono">{selectedSellerForAudit.pickupAddress?.pinCode || '221001'}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  updateSellerStatus(selectedSellerForAudit.id, 'active');
                  setSelectedSellerForAudit(null);
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold"
              >
                Approve & Grant Verified Badge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
