import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Order } from '../../types';
import {
  Gift,
  Coins,
  BookOpen,
  Scale,
  Download,
  RefreshCw,
  FileText,
  Undo2,
  X,
  AlertTriangle,
  Copy,
  Split,
  ReceiptIndianRupee,
  ShieldCheck,
  Landmark,
  Percent,
  CheckCircle2,
  XCircle,
  Wallet,
} from 'lucide-react';

interface AdminFinanceOpsPanelProps {
  orders: Order[];
  notify: (msg: string) => void;
}

type FinanceSubTab =
  | 'splits'
  | 'approvals'
  | 'kyc'
  | 'commissions'
  | 'settlements'
  | 'refunds'
  | 'tcs'
  | 'invoices'
  | 'reconciliation'
  | 'ledger'
  | 'giftcards'
  | 'exports';

export const AdminFinanceOpsPanel: React.FC<AdminFinanceOpsPanelProps> = ({ orders, notify }) => {
  const [subTab, setSubTab] = useState<FinanceSubTab>('splits');
  const [error, setError] = useState<string | null>(null);

  // Finance & Payments Dashboard KPIs + Core Feeds
  const [dashboardKpis, setDashboardKpis] = useState<{
    marketplaceRevenue: number;
    grossMerchandiseValue: number;
    sellerPayable: number;
    gstTcs: number;
    refunds: number;
  } | null>(null);
  const [splits, setSplits] = useState<any[]>([]);
  const [sellerProfiles, setSellerProfiles] = useState<any[]>([]);
  const [settlementsList, setSettlementsList] = useState<any[]>([]);
  const [refundsList, setRefundsList] = useState<any[]>([]);

  // Commission Management & Tax Invoices
  const [commissionReport, setCommissionReport] = useState<any>(null);
  const [editingCommissionSlug, setEditingCommissionSlug] = useState<string | null>(null);
  const [editingCommissionRate, setEditingCommissionRate] = useState<number>(12);

  // GST TCS Report
  const [gstTcsReport, setGstTcsReport] = useState<any>(null);

  // Cashfree Payment Reconciliation & Webhook Logs
  const [reconReport, setReconReport] = useState<any>(null);

  // Gift Cards
  const [giftCards, setGiftCards] = useState<any[]>([]);
  const [gcAmount, setGcAmount] = useState(1000);
  const [gcMinOrder, setGcMinOrder] = useState(500);
  const [gcExpiry, setGcExpiry] = useState('');
  const [gcNotes, setGcNotes] = useState('');
  const [issuedCodeSecret, setIssuedCodeSecret] = useState<{ code: string; amount: number } | null>(null);

  // Store Credits
  const [scUserId, setScUserId] = useState('usr_demo123');
  const [scBalance, setScBalance] = useState<number | null>(null);
  const [scAmount, setScAmount] = useState(250);
  const [scReason, setScReason] = useState('Customer goodwill credit');

  // Refunds
  const [refundOrderId, setRefundOrderId] = useState(orders[0]?.id || 'ord-101');
  const [refundAmount, setRefundAmount] = useState(500);
  const [refundMode, setRefundMode] = useState<'ORIGINAL_METHOD' | 'STORE_CREDIT'>('ORIGINAL_METHOD');
  const [refundReason, setRefundReason] = useState('Approved return refund');
  const [lastRefund, setLastRefund] = useState<any>(null);

  // Invoices & Credit Notes
  const [invoices, setInvoices] = useState<any[]>([]);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [cnInvoiceId, setCnInvoiceId] = useState('');
  const [cnAmount, setCnAmount] = useState(200);
  const [cnReason, setCnReason] = useState('GST credit note adjustment');

  // Ledger
  const [ledgerSummary, setLedgerSummary] = useState<any>(null);
  const [reverseGroupId, setReverseGroupId] = useState('');
  const [reverseReason, setReverseReason] = useState('');

  // Reconciliation & Exports
  const [reconRuns, setReconRuns] = useState<any[]>([]);
  const [exportAudits, setExportAudits] = useState<any[]>([]);

  const loadDashboardOverview = async () => {
    try {
      const dash = await api.adminOps.getFinanceDashboard();
      if (dash?.kpis) setDashboardKpis(dash.kpis);
      if (Array.isArray(dash?.splits)) setSplits(dash.splits);
      if (Array.isArray(dash?.sellers)) setSellerProfiles(dash.sellers);
      if (Array.isArray(dash?.settlements)) setSettlementsList(dash.settlements);
      if (Array.isArray(dash?.refunds)) setRefundsList(dash.refunds);
    } catch {
      // ignore if unauthenticated before sign-in; main tab loader sets error notice
    }
  };

  const loadSubTab = async (tab: FinanceSubTab) => {
    setError(null);
    try {
      await loadDashboardOverview();
      if (tab === 'commissions') {
        const res = await api.adminOps.getCommissionReport();
        setCommissionReport(res);
      } else if (tab === 'tcs') {
        const res = await api.adminOps.getGstTcsReport();
        setGstTcsReport(res);
      } else if (tab === 'refunds') {
        const res = await api.adminOps.getAdminRefunds();
        setRefundsList(res.refunds || []);
      } else if (tab === 'giftcards') {
        const res = await api.adminOps.getGiftCards();
        setGiftCards(res.giftCards || []);
      } else if (tab === 'invoices') {
        const [invRes, commRes] = await Promise.all([
          api.adminOps.getInvoices(),
          api.adminOps.getCommissionReport(),
        ]);
        setInvoices(invRes.invoices || []);
        setCreditNotes(invRes.creditNotes || []);
        setCommissionReport(commRes);
      } else if (tab === 'ledger') {
        const res = await api.adminOps.getLedger();
        setLedgerSummary(res);
      } else if (tab === 'reconciliation') {
        const [runsRes, payReconRes] = await Promise.all([
          api.adminOps.getReconciliationRuns(),
          api.adminOps.getPaymentReconciliation(),
        ]);
        setReconRuns(runsRes.runs || []);
        setReconReport(payReconRes);
      } else if (tab === 'exports') {
        const res = await api.adminOps.getExportAudits();
        setExportAudits(res.audits || []);
      }
    } catch (err: any) {
      setError(err.message || 'Admin permission required to inspect finance operations.');
    }
  };

  useEffect(() => {
    loadSubTab(subTab);
  }, [subTab]);

  const handleVerifySellerBank = async (sellerId: string, verified: boolean) => {
    try {
      await api.adminOps.verifySellerBank(
        sellerId,
        verified,
        verified ? 'Penny-drop & IFSC verified by Admin' : 'Bank verification rejected by Admin'
      );
      await loadDashboardOverview();
      notify(`Seller bank account ${verified ? 'verified' : 'rejected'}.`);
    } catch (err: any) {
      notify(err.message || 'Failed to update bank verification.');
    }
  };

  const handleReviewSellerKyc = async (sellerId: string, toStatus: 'APPROVED' | 'RESUBMISSION_REQUIRED' | 'REJECTED') => {
    try {
      await api.adminOps.reviewSeller(
        sellerId,
        toStatus,
        toStatus === 'APPROVED' ? 'PAN & GSTIN dossier verified' : `Status set to ${toStatus}`
      );
      await loadDashboardOverview();
      notify(`Vendor KYC status updated to ${toStatus}.`);
    } catch (err: any) {
      notify(err.message || 'Failed to update KYC status.');
    }
  };

  const handleDisburseSettlement = async (settlementId: string) => {
    try {
      await api.adminOps.disburseSettlement(settlementId, `UTR${Date.now().toString().slice(-8)}`);
      await loadDashboardOverview();
      notify('Settlement disbursed and double-entry ledger updated.');
    } catch (err: any) {
      notify(err.message || 'Settlement disbursement failed.');
    }
  };

  const handleSaveCommissionRate = async (categorySlug: string) => {
    try {
      await api.adminOps.updateCommissionRule(categorySlug, {
        commissionPercent: Number(editingCommissionRate),
      });
      setEditingCommissionSlug(null);
      await loadSubTab('commissions');
      notify(`Updated ${categorySlug} commission to ${editingCommissionRate}%.`);
    } catch (err: any) {
      notify(err.message || 'Failed to update commission rule.');
    }
  };

  const handleCreateGiftCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.adminOps.createGiftCard({
        initialAmount: Number(gcAmount),
        minOrderAmount: Number(gcMinOrder),
        expiresAt: gcExpiry || undefined,
        notes: gcNotes || undefined,
      });
      setIssuedCodeSecret({ code: res.code, amount: Number(gcAmount) });
      setGcNotes('');
      await loadSubTab('giftcards');
      notify('Gift card created. Copy the one-time code now.');
    } catch (err: any) {
      notify(err.message || 'Failed to create gift card.');
    }
  };

  const handleToggleGiftCard = async (id: string, isActive: boolean) => {
    try {
      await api.adminOps.toggleGiftCard(id, isActive, isActive ? 'Re-activated' : 'Deactivated by finance admin');
      await loadSubTab('giftcards');
      notify(`Gift card ${isActive ? 'activated' : 'deactivated'}.`);
    } catch (err: any) {
      notify(err.message || 'Unable to update gift card status.');
    }
  };

  const handleLookupStoreCredit = async () => {
    try {
      const res = await api.adminOps.getStoreCredit(scUserId);
      setScBalance(res.balance ?? 0);
    } catch (err: any) {
      notify(err.message || 'Unable to fetch store credit balance.');
    }
  };

  const handleIssueStoreCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.adminOps.issueStoreCredit({
        userId: scUserId,
        amount: Number(scAmount),
        reason: scReason,
      });
      setScBalance(res.balance ?? null);
      notify(`Issued ₹${scAmount} store credit to ${scUserId}`);
    } catch (err: any) {
      notify(err.message || 'Failed to issue store credit.');
    }
  };

  const handleInitiateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundOrderId.trim()) {
      notify('Select or enter an Order ID.');
      return;
    }
    try {
      const res = await api.adminOps.createRefund({
        orderId: refundOrderId.trim(),
        amount: Number(refundAmount),
        refundMode,
        reason: refundReason,
        idempotencyKey: `adm_rf_${refundOrderId.trim()}_${Date.now()}`,
      });
      setLastRefund(res.refund);
      await loadSubTab('refunds');
      notify(`Refund ${res.refund?.status} (${res.refund?.id})`);
    } catch (err: any) {
      notify(err.message || 'Refund initiation failed.');
    }
  };

  const handleSyncRefund = async (refundId?: string) => {
    const idToSync = refundId || lastRefund?.id;
    if (!idToSync) return;
    try {
      const res = await api.adminOps.syncRefund(idToSync);
      setLastRefund(res.refund);
      await loadSubTab('refunds');
      notify(`Refund synced: ${res.refund?.status}`);
    } catch (err: any) {
      notify(err.message || 'Failed to sync refund status.');
    }
  };

  const handleIssueCreditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cnInvoiceId) return;
    try {
      await api.adminOps.issueCreditNote(cnInvoiceId, {
        refundAmount: Number(cnAmount),
        reason: cnReason,
      });
      await loadSubTab('invoices');
      notify('GST Credit Note issued.');
    } catch (err: any) {
      notify(err.message || 'Failed to issue credit note.');
    }
  };

  const handleReverseLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reverseGroupId.trim() || !reverseReason.trim()) return;
    try {
      await api.adminOps.reverseLedger(reverseGroupId.trim(), reverseReason.trim());
      setReverseGroupId('');
      setReverseReason('');
      await loadSubTab('ledger');
      notify('Immutable ledger reversal entries posted.');
    } catch (err: any) {
      notify(err.message || 'Ledger reversal failed.');
    }
  };

  const handleRunReconciliation = async () => {
    try {
      await api.adminOps.runReconciliation();
      await loadSubTab('reconciliation');
      notify('Cashfree reconciliation run completed.');
    } catch (err: any) {
      notify(err.message || 'Reconciliation failed.');
    }
  };

  const handleDownloadExport = async (reportType: string, format: 'csv' | 'xlsx') => {
    try {
      const blob = await api.adminOps.downloadExport(reportType, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `primebazaar_${reportType}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      await loadSubTab('exports');
      notify(`Exported ${reportType}.${format}`);
    } catch (err: any) {
      notify(err.message || 'Export failed.');
    }
  };

  const formatInr = (val?: number | null) =>
    val === undefined || val === null ? '₹—' : `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 mt-6">
      {/* Finance & Payments Dashboard Top KPI Summary */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
              Finance &amp; Payments Dashboard
            </h3>
            <p className="text-xs text-zinc-500">
              Marketplace revenue, seller payable balances, Section 52 GST TCS &amp; refund liabilities
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadSubTab(subTab)}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Ledger</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
            <span className="text-xs font-semibold text-zinc-500 block">Marketplace revenue</span>
            <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-white mt-1 block">
              {formatInr(dashboardKpis?.marketplaceRevenue)}
            </span>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">
              GMV: {formatInr(dashboardKpis?.grossMerchandiseValue)}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
            <span className="text-xs font-semibold text-zinc-500 block">Seller payable</span>
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
              {formatInr(dashboardKpis?.sellerPayable)}
            </span>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">
              Escrow + Available Wallets
            </span>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
            <span className="text-xs font-semibold text-zinc-500 block">GST TCS</span>
            <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1 block">
              {formatInr(dashboardKpis?.gstTcs)}
            </span>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">
              Sec 52 CGST/SGST/IGST (1%)
            </span>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
            <span className="text-xs font-semibold text-zinc-500 block">Refunds</span>
            <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 block">
              {formatInr(dashboardKpis?.refunds)}
            </span>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">
              Full, Partial &amp; Cancelled
            </span>
          </div>
        </div>
      </div>

      {/* Main Finance Modules Container */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'splits', label: 'Payment Split Reports', icon: Split },
              { id: 'approvals', label: 'Seller Payment Approval', icon: Landmark },
              { id: 'kyc', label: 'Vendor KYC Status', icon: ShieldCheck },
              { id: 'commissions', label: 'Commission Management', icon: Percent },
              { id: 'settlements', label: 'Settlement Tracking', icon: Wallet },
              { id: 'refunds', label: 'Refund Approvals', icon: Undo2 },
              { id: 'tcs', label: 'GST TCS Reports', icon: ReceiptIndianRupee },
              { id: 'invoices', label: 'Commission & Tax Invoices', icon: FileText },
              { id: 'reconciliation', label: 'Cashfree Reconciliation', icon: Scale },
              { id: 'ledger', label: 'Double-Entry Ledger', icon: BookOpen },
              { id: 'giftcards', label: 'Gift Cards & Credits', icon: Gift },
              { id: 'exports', label: 'CSV / XLSX Exports', icon: Download },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSubTab(t.id as FinanceSubTab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
                    subTab === t.id
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* A. PAYMENT SPLIT REPORTS */}
        {subTab === 'splits' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                Seller &amp; Marketplace Payment Splits ({splits.length})
              </span>
            </div>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Order</th>
                    <th className="p-3">Seller</th>
                    <th className="p-3 text-right">Gross (₹)</th>
                    <th className="p-3 text-right">Commission + 18% GST</th>
                    <th className="p-3 text-right">GST TCS (1%)</th>
                    <th className="p-3 text-right">Seller Payable (₹)</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 tabular-nums">
                  {splits.map(sp => (
                    <tr key={sp.id}>
                      <td className="p-3 font-mono font-semibold text-zinc-900 dark:text-white">
                        {sp.orderNumber || sp.orderId}
                      </td>
                      <td className="p-3">{sp.sellerName}</td>
                      <td className="p-3 text-right font-mono">₹{Number(sp.grossAmount).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono text-indigo-600">
                        ₹{(Number(sp.commissionAmount) + Number(sp.gstOnCommission)).toLocaleString('en-IN')} ({sp.commissionRate}%)
                      </td>
                      <td className="p-3 text-right font-mono">₹{Number(sp.tcsAmount).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">
                        ₹{Number(sp.netSellerPayable).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-semibold uppercase text-[11px]">{sp.splitStatus}</td>
                    </tr>
                  ))}
                  {splits.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-zinc-500">
                        No payment split records generated yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* B. SELLER PAYMENT APPROVAL & BANK VERIFICATION */}
        {subTab === 'approvals' && (
          <div className="space-y-4 text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300 block">
              Seller Bank Verification &amp; Payout Approval Queue ({sellerProfiles.length})
            </span>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Seller</th>
                    <th className="p-3">Bank Account (Masked)</th>
                    <th className="p-3">IFSC</th>
                    <th className="p-3 text-right">Available Wallet (₹)</th>
                    <th className="p-3">Verification</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 tabular-nums">
                  {sellerProfiles.map(s => (
                    <tr key={s.id}>
                      <td className="p-3">
                        <span className="font-bold text-zinc-900 dark:text-white block">{s.businessName}</span>
                        <span className="text-zinc-500 text-[11px]">{s.sellerName}</span>
                      </td>
                      <td className="p-3 font-mono">
                        {s.bankAccount ? `${s.bankAccount.bankName} (${s.bankAccount.accountNumber})` : 'Not Submitted'}
                      </td>
                      <td className="p-3 font-mono">{s.bankAccount?.ifscCode || '—'}</td>
                      <td className="p-3 text-right font-mono font-bold">
                        ₹{Number(s.wallet?.balance || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-semibold">
                        {s.bankAccount?.isVerified ? (
                          <span className="text-emerald-600 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="text-amber-600 inline-flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Pending Check
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleVerifySellerBank(s.id, true)}
                          className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold"
                        >
                          Verify Bank
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifySellerBank(s.id, false)}
                          className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 font-semibold"
                        >
                          Hold
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* C. VENDOR KYC STATUS */}
        {subTab === 'kyc' && (
          <div className="space-y-4 text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300 block">
              Vendor KYC Compliance &amp; Verification Status ({sellerProfiles.length})
            </span>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Vendor</th>
                    <th className="p-3">PAN</th>
                    <th className="p-3">GSTIN</th>
                    <th className="p-3">KYC Status</th>
                    <th className="p-3 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {sellerProfiles.map(s => (
                    <tr key={s.id}>
                      <td className="p-3 font-semibold text-zinc-900 dark:text-white">{s.businessName}</td>
                      <td className="p-3 font-mono">{s.kyc?.panNumber || 'Not Submitted'}</td>
                      <td className="p-3 font-mono">{s.kyc?.gstin || s.gstNumber || 'Unregistered'}</td>
                      <td className="p-3 font-semibold uppercase text-[11px]">
                        {s.kyc?.kycStatus || s.approvalStatus}
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleReviewSellerKyc(s.id, 'APPROVED')}
                          className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewSellerKyc(s.id, 'RESUBMISSION_REQUIRED')}
                          className="px-2.5 py-1 rounded border border-amber-400 text-amber-700 dark:text-amber-300 font-semibold"
                        >
                          Resubmit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewSellerKyc(s.id, 'REJECTED')}
                          className="px-2.5 py-1 rounded bg-rose-600 text-white font-semibold"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* D. COMMISSION MANAGEMENT */}
        {subTab === 'commissions' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 block">Taxable Commission Earned</span>
                <span className="text-lg font-bold font-mono text-zinc-900 dark:text-white">
                  {formatInr(commissionReport?.totals?.taxableCommission)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 block">18% GST on Commission</span>
                <span className="text-lg font-bold font-mono text-zinc-900 dark:text-white">
                  {formatInr(commissionReport?.totals?.totalTax)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 block">Commission Invoices Issued</span>
                <span className="text-lg font-bold font-mono text-indigo-600">
                  {commissionReport?.invoiceCount ?? 0}
                </span>
              </div>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3">Slug</th>
                    <th className="p-3 text-right">Commission (%)</th>
                    <th className="p-3 text-right">Min Fee (₹)</th>
                    <th className="p-3 text-right">Update Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 tabular-nums">
                  {(commissionReport?.commissionRules || []).slice(0, 15).map((rule: any) => (
                    <tr key={rule.id}>
                      <td className="p-3 font-semibold text-zinc-900 dark:text-white">{rule.categoryName}</td>
                      <td className="p-3 font-mono text-zinc-500">{rule.categorySlug}</td>
                      <td className="p-3 text-right font-mono font-bold">
                        {editingCommissionSlug === rule.categorySlug ? (
                          <input
                            type="number"
                            min={0}
                            max={45}
                            step={0.5}
                            value={editingCommissionRate}
                            onChange={e => setEditingCommissionRate(Number(e.target.value))}
                            className="w-20 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-right font-mono"
                          />
                        ) : (
                          `${rule.commissionPercent}%`
                        )}
                      </td>
                      <td className="p-3 text-right font-mono">₹{Number(rule.minCommissionAmount).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right">
                        {editingCommissionSlug === rule.categorySlug ? (
                          <div className="space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveCommissionRate(rule.categorySlug)}
                              className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCommissionSlug(null)}
                              className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommissionSlug(rule.categorySlug);
                              setEditingCommissionRate(Number(rule.commissionPercent));
                            }}
                            className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 font-semibold"
                          >
                            Edit %
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* E. SETTLEMENT TRACKING */}
        {subTab === 'settlements' && (
          <div className="space-y-4 text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300 block">
              Seller Settlement Batches &amp; UTR Disbursements ({settlementsList.length})
            </span>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Settlement ID</th>
                    <th className="p-3">Seller</th>
                    <th className="p-3 text-right">Gross (₹)</th>
                    <th className="p-3 text-right">Net Payout (₹)</th>
                    <th className="p-3">UTR / Reference</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Disburse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 tabular-nums">
                  {settlementsList.map(st => (
                    <tr key={st.id}>
                      <td className="p-3 font-mono font-semibold text-zinc-900 dark:text-white">
                        {st.settlementNumber || st.id}
                      </td>
                      <td className="p-3">{st.sellerName}</td>
                      <td className="p-3 text-right font-mono">₹{Number(st.grossAmount).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">
                        ₹{Number(st.netPayout).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-mono">{st.utrNumber || 'Pending NEFT/IMPS'}</td>
                      <td className="p-3 font-semibold uppercase text-[11px]">{st.status}</td>
                      <td className="p-3 text-right">
                        {st.status === 'PENDING' ? (
                          <button
                            type="button"
                            onClick={() => handleDisburseSettlement(st.id)}
                            className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold"
                          >
                            Approve &amp; Pay
                          </button>
                        ) : (
                          <span className="text-zinc-400 font-mono">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {settlementsList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-zinc-500">
                        No settlement requests logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* F. GST TCS REPORTS (Section 52) */}
        {subTab === 'tcs' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 block">Taxable Supply Value</span>
                <span className="text-lg font-bold font-mono text-zinc-900 dark:text-white">
                  {formatInr(gstTcsReport?.totals?.taxableSupplyValue)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 block">CGST TCS (0.5%)</span>
                <span className="text-lg font-bold font-mono">
                  {formatInr(gstTcsReport?.totals?.cgstTcsAmount)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 block">SGST TCS (0.5%)</span>
                <span className="text-lg font-bold font-mono">
                  {formatInr(gstTcsReport?.totals?.sgstTcsAmount)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 block">IGST TCS (1.0%)</span>
                <span className="text-lg font-bold font-mono text-indigo-600">
                  {formatInr(gstTcsReport?.totals?.igstTcsAmount)}
                </span>
              </div>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Period</th>
                    <th className="p-3">Order</th>
                    <th className="p-3">Seller (GSTIN)</th>
                    <th className="p-3 text-right">Taxable Value (₹)</th>
                    <th className="p-3 text-right">TCS Collected (₹)</th>
                    <th className="p-3">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 tabular-nums">
                  {(gstTcsReport?.records || []).map((rec: any) => (
                    <tr key={rec.id}>
                      <td className="p-3 font-mono">{rec.filingPeriod}</td>
                      <td className="p-3 font-mono">{rec.orderNumber || rec.orderId}</td>
                      <td className="p-3">
                        <span className="font-semibold block">{rec.sellerName}</span>
                        <span className="font-mono text-[11px] text-zinc-500">{rec.sellerGstin || 'Unregistered'}</span>
                      </td>
                      <td className="p-3 text-right font-mono">₹{Number(rec.taxableSupplyValue).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono font-bold text-indigo-600">
                        ₹{Number(rec.totalTcsAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 uppercase text-[11px] font-semibold">{rec.recordType}</td>
                    </tr>
                  ))}
                  {(!gstTcsReport?.records || gstTcsReport.records.length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-500">
                        No Section 52 GST TCS entries recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* G. REFUNDS & APPROVALS */}
        {subTab === 'refunds' && (
          <div className="space-y-4 text-xs">
            <form onSubmit={handleInitiateRefund} className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              <input
                type="text"
                required
                placeholder="Order ID"
                value={refundOrderId}
                onChange={e => setRefundOrderId(e.target.value)}
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
              />
              <input
                type="number"
                min={1}
                required
                placeholder="Amount (₹)"
                value={refundAmount}
                onChange={e => setRefundAmount(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono tabular-nums"
              />
              <select
                value={refundMode}
                onChange={e => setRefundMode(e.target.value as any)}
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              >
                <option value="ORIGINAL_METHOD">Original Payment Method</option>
                <option value="STORE_CREDIT">Refund to Store Credit</option>
              </select>
              <input
                type="text"
                required
                placeholder="Reason"
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold whitespace-nowrap"
              >
                Approve &amp; Create Refund
              </button>
            </form>

            {lastRefund && (
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white">
                    Refund {lastRefund.id} · Order #{lastRefund.orderId}
                  </span>
                  <span className="text-zinc-500 ml-3 tabular-nums">
                    ₹{Number(lastRefund.amount).toLocaleString('en-IN')} · {lastRefund.refundMode} · Status: {lastRefund.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSyncRefund(lastRefund.id)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync with Gateway</span>
                </button>
              </div>
            )}

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Refund Ref</th>
                    <th className="p-3">Order</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 tabular-nums">
                  {refundsList.map(rf => (
                    <tr key={rf.id}>
                      <td className="p-3 font-mono font-semibold">{rf.transactionReference || rf.id}</td>
                      <td className="p-3 font-mono">{rf.orderId}</td>
                      <td className="p-3 text-right font-mono font-bold">₹{Number(rf.amount).toLocaleString('en-IN')}</td>
                      <td className="p-3">{rf.refundMode}</td>
                      <td className="p-3 font-semibold uppercase text-[11px]">{rf.status}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSyncRefund(rf.id)}
                          className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 font-semibold"
                        >
                          Sync
                        </button>
                      </td>
                    </tr>
                  ))}
                  {refundsList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-500">
                        No refund transactions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* H. COMMISSION TAX INVOICES, CUSTOMER GST INVOICES & CREDIT NOTES */}
        {subTab === 'invoices' && (
          <div className="space-y-5 text-xs">
            <div className="space-y-2">
              <span className="font-bold text-sm text-zinc-900 dark:text-white block">
                Marketplace Commission Tax Invoices ({commissionReport?.commissionInvoices?.length || 0})
              </span>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-3">Commission Invoice #</th>
                      <th className="p-3">Seller</th>
                      <th className="p-3 text-right">Taxable Commission (₹)</th>
                      <th className="p-3 text-right">18% GST (₹)</th>
                      <th className="p-3 text-right">Total (₹)</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 tabular-nums">
                    {(commissionReport?.commissionInvoices || []).map((ci: any) => (
                      <tr key={ci.id}>
                        <td className="p-3 font-mono font-semibold text-zinc-900 dark:text-white">{ci.invoiceNumber}</td>
                        <td className="p-3">{ci.sellerName}</td>
                        <td className="p-3 text-right font-mono">₹{Number(ci.taxableCommission).toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-mono">₹{Number(ci.totalTax).toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-mono font-bold">₹{Number(ci.grandTotal).toLocaleString('en-IN')}</td>
                        <td className="p-3 font-semibold uppercase text-[11px]">{ci.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <form onSubmit={handleIssueCreditNote} className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <select
                value={cnInvoiceId}
                onChange={e => setCnInvoiceId(e.target.value)}
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              >
                <option value="">Select Order Invoice for Credit Note...</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} (₹{inv.grandTotal})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={cnAmount}
                onChange={e => setCnAmount(Number(e.target.value))}
                placeholder="Credit Amount (₹)"
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono tabular-nums"
              />
              <input
                type="text"
                required
                value={cnReason}
                onChange={e => setCnReason(e.target.value)}
                placeholder="Reason"
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold whitespace-nowrap"
              >
                Issue Credit Note
              </button>
            </form>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Order Invoice #</th>
                    <th className="p-3">Order</th>
                    <th className="p-3">Supply</th>
                    <th className="p-3 text-right">Tax (₹)</th>
                    <th className="p-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 tabular-nums">
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="p-3 font-mono font-semibold text-zinc-900 dark:text-white">{inv.invoiceNumber}</td>
                      <td className="p-3 font-mono">{inv.orderId}</td>
                      <td className="p-3">{inv.isInterState ? 'IGST' : 'CGST+SGST'} ({inv.warehouseState} → {inv.buyerState})</td>
                      <td className="p-3 text-right font-mono">₹{Number(inv.totalTaxAmount).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono font-bold">₹{Number(inv.grandTotal).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-zinc-500">
                        No order tax invoices issued yet. Credit Notes issued: {creditNotes.length}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* I. CASHFREE TRANSACTION RECONCILIATION & WEBHOOK LOGS */}
        {subTab === 'reconciliation' && (
          <div className="space-y-5 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                Cashfree Transaction Reconciliation ({reconReport?.summary?.totalTransactions ?? 0} txns · Discrepancies:{' '}
                {reconReport?.summary?.discrepancyCount ?? 0})
              </span>
              <button
                type="button"
                onClick={handleRunReconciliation}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold"
              >
                Run Reconciliation Now
              </button>
            </div>

            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl tabular-nums">
              {reconRuns.map(run => (
                <div key={run.id} className="p-3.5 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">{run.id}</span>
                    <span className="text-zinc-500 ml-2">{new Date(run.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="font-mono">
                    Checked: {run.totalChecked} · Matched: {run.matchedCount} · Mismatches: {run.mismatchCount} · Unmatched: {run.unmatchedCount}
                  </div>
                </div>
              ))}
              {reconRuns.length === 0 && (
                <div className="p-6 text-center text-zinc-500">No reconciliation runs recorded yet.</div>
              )}
            </div>

            <div className="space-y-2">
              <span className="font-bold text-zinc-900 dark:text-white block">
                Immutable Payment Webhook Logs ({reconReport?.webhookLogs?.length || 0})
              </span>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-3">Event Type</th>
                      <th className="p-3">Cashfree Order</th>
                      <th className="p-3">Signature</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 tabular-nums">
                    {(reconReport?.webhookLogs || []).slice(0, 15).map((wl: any) => (
                      <tr key={wl.id}>
                        <td className="p-3 font-mono font-semibold">{wl.eventType}</td>
                        <td className="p-3 font-mono">{wl.cashfreeOrderId || '—'}</td>
                        <td className="p-3">{wl.signatureValid ? 'HMAC Verified' : 'Rejected'}</td>
                        <td className="p-3 font-semibold">{wl.processingStatus} ({wl.httpStatus})</td>
                        <td className="p-3 text-zinc-500">{new Date(wl.receivedAt).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {(!reconReport?.webhookLogs || reconReport.webhookLogs.length === 0) && (
                      <tr>
                        <td colSpan={5} className="p-5 text-center text-zinc-500">
                          No webhook events received yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* J. DOUBLE-ENTRY LEDGER */}
        {subTab === 'ledger' && (
          <div className="space-y-4 text-xs">
            {ledgerSummary && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 block">Total Debits</span>
                  <span className="text-lg font-bold font-mono text-zinc-900 dark:text-white">
                    ₹{Number(ledgerSummary.totalDebits || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 block">Total Credits</span>
                  <span className="text-lg font-bold font-mono text-zinc-900 dark:text-white">
                    ₹{Number(ledgerSummary.totalCredits || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 block">Double-Entry Trial Balance</span>
                  <span className={`text-lg font-bold ${ledgerSummary.balanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {ledgerSummary.balanced ? 'Balanced' : 'Mismatch Detected'}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleReverseLedger} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder="Entry Group ID to reverse"
                value={reverseGroupId}
                onChange={e => setReverseGroupId(e.target.value)}
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
              />
              <input
                type="text"
                required
                placeholder="Mandatory audit reversal reason"
                value={reverseReason}
                onChange={e => setReverseReason(e.target.value)}
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold whitespace-nowrap"
              >
                Post Reversal Entry
              </button>
            </form>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Group ID</th>
                    <th className="p-3">Account</th>
                    <th className="p-3">Side</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                    <th className="p-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 tabular-nums">
                  {(ledgerSummary?.entries || []).slice(0, 20).map((entry: any) => (
                    <tr key={entry.id}>
                      <td className="p-3 font-mono text-[11px]">{entry.entryGroupId}</td>
                      <td className="p-3 font-mono font-semibold">{entry.accountCode}</td>
                      <td className="p-3 font-mono">{entry.entryType}</td>
                      <td className="p-3 text-right font-mono font-bold">₹{Number(entry.amount).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-300">{entry.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* K. GIFT CARDS & STORE CREDITS */}
        {subTab === 'giftcards' && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <form onSubmit={handleCreateGiftCard} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                <span className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-rose-600" />
                  <span>Issue New Gift Card</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={50}
                    required
                    placeholder="Initial Amount (₹)"
                    value={gcAmount}
                    onChange={e => setGcAmount(Number(e.target.value))}
                    className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono tabular-nums"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Min Order (₹)"
                    value={gcMinOrder}
                    onChange={e => setGcMinOrder(Number(e.target.value))}
                    className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono tabular-nums"
                  />
                  <input
                    type="date"
                    value={gcExpiry}
                    onChange={e => setGcExpiry(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                  />
                  <input
                    type="text"
                    placeholder="Notes"
                    value={gcNotes}
                    onChange={e => setGcNotes(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                >
                  Generate Gift Card Code
                </button>
              </form>

              <form onSubmit={handleIssueStoreCredit} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    <span>Customer Store Credit Wallet</span>
                  </span>
                  {scBalance !== null && (
                    <span className="font-mono font-bold text-emerald-600 tabular-nums">
                      Balance: ₹{scBalance.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="User ID"
                    value={scUserId}
                    onChange={e => setScUserId(e.target.value)}
                    className="col-span-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleLookupStoreCredit}
                    className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold"
                  >
                    Check Balance
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min={1}
                    required
                    value={scAmount}
                    onChange={e => setScAmount(Number(e.target.value))}
                    className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono tabular-nums"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Credit reason"
                    value={scReason}
                    onChange={e => setScReason(e.target.value)}
                    className="col-span-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold"
                >
                  Issue Store Credit
                </button>
              </form>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Card Hint (Masked)</th>
                    <th className="p-3 text-right">Initial (₹)</th>
                    <th className="p-3 text-right">Remaining (₹)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 tabular-nums">
                  {giftCards.map(gc => (
                    <tr key={gc.id}>
                      <td className="p-3 font-mono font-semibold text-zinc-900 dark:text-white">{gc.codeHint}</td>
                      <td className="p-3 text-right font-mono">₹{Number(gc.initialAmount).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono font-bold">₹{Number(gc.currentBalance).toLocaleString('en-IN')}</td>
                      <td className="p-3">{gc.isActive ? 'Active' : 'Disabled'}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleGiftCard(gc.id, !gc.isActive)}
                          className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 font-semibold"
                        >
                          {gc.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {giftCards.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-zinc-500">
                        No gift cards issued yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* L. FORMULA-SAFE EXPORTS & AUDIT */}
        {subTab === 'exports' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(['ledger', 'orders', 'refunds', 'settlements'] as const).map(rt => (
                <div key={rt} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <span className="font-bold capitalize block text-zinc-900 dark:text-white">{rt} Report</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadExport(rt, 'csv')}
                      className="flex-1 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 font-semibold"
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadExport(rt, 'xlsx')}
                      className="flex-1 py-1.5 rounded bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold"
                    >
                      XLSX
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800">
              {exportAudits.slice(0, 10).map(a => (
                <div key={a.id} className="p-3 flex items-center justify-between tabular-nums">
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">
                    {a.reportType}.{a.format} ({a.rowCount} rows)
                  </span>
                  <span className="text-zinc-500">{new Date(a.createdAt).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* One-Time Gift Card Secret Modal */}
        {issuedCodeSecret && (
          <div className="fixed inset-0 z-70 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full space-y-4 border border-zinc-200 dark:border-zinc-800 shadow-2xl text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white">One-Time Gift Card Code</h4>
                <button
                  type="button"
                  onClick={() => setIssuedCodeSecret(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-zinc-500">
                Save or send this code now. For security, only the masked hint is stored in admin tables after you close this modal.
              </p>
              <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-between font-mono font-bold text-base text-zinc-900 dark:text-white">
                <span>{issuedCodeSecret.code}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(issuedCodeSecret.code);
                    notify('Gift card code copied.');
                  }}
                  className="p-1.5 text-zinc-500 hover:text-zinc-900"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIssuedCodeSecret(null)}
                className="w-full py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold"
              >
                I Have Saved This Code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
