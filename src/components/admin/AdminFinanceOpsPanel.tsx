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
} from 'lucide-react';

interface AdminFinanceOpsPanelProps {
  orders: Order[];
  notify: (msg: string) => void;
}

type FinanceSubTab = 'giftcards' | 'refunds' | 'invoices' | 'ledger' | 'reconciliation' | 'exports';

export const AdminFinanceOpsPanel: React.FC<AdminFinanceOpsPanelProps> = ({ orders, notify }) => {
  const [subTab, setSubTab] = useState<FinanceSubTab>('giftcards');
  const [error, setError] = useState<string | null>(null);

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
  const [refundOrderId, setRefundOrderId] = useState(orders[0]?.id || '');
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

  const loadSubTab = async (tab: FinanceSubTab) => {
    setError(null);
    try {
      if (tab === 'giftcards') {
        const res = await api.adminOps.getGiftCards();
        setGiftCards(res.giftCards || []);
      } else if (tab === 'invoices') {
        const res = await api.adminOps.getInvoices();
        setInvoices(res.invoices || []);
        setCreditNotes(res.creditNotes || []);
      } else if (tab === 'ledger') {
        const res = await api.adminOps.getLedger();
        setLedgerSummary(res);
      } else if (tab === 'reconciliation') {
        const res = await api.adminOps.getReconciliationRuns();
        setReconRuns(res.runs || []);
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
      const res = await api.adminOps.initiateRefund(refundOrderId.trim(), {
        amount: Number(refundAmount),
        refundMode,
        reason: refundReason,
        idempotencyKey: `adm_rf_${refundOrderId.trim()}_${Date.now()}`,
      });
      setLastRefund(res.refund);
      notify(`Refund ${res.refund?.status} (${res.refund?.id})`);
    } catch (err: any) {
      notify(err.message || 'Refund initiation failed.');
    }
  };

  const handleSyncRefund = async () => {
    if (!lastRefund?.id) return;
    try {
      const res = await api.adminOps.syncRefund(lastRefund.id);
      setLastRefund(res.refund);
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

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
            Financial Operations, Wallets, GST & Double-Entry Ledger
          </h3>
          <p className="text-xs text-zinc-500">
            Gift cards, store credits, refunds, GST credit notes, Cashfree reconciliation & audited exports
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'giftcards', label: 'Gift Cards & Credits', icon: Gift },
            { id: 'refunds', label: 'Refunds & Sync', icon: Undo2 },
            { id: 'invoices', label: 'Invoices & Credit Notes', icon: FileText },
            { id: 'ledger', label: 'Double-Entry Ledger', icon: BookOpen },
            { id: 'reconciliation', label: 'Reconciliation', icon: Scale },
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

      {/* 1. GIFT CARDS & STORE CREDITS */}
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

      {/* 2. REFUNDS & PROVIDER SYNC */}
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
              Initiate Refund
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
                onClick={handleSyncRefund}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync with Gateway</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. GST INVOICES & CREDIT NOTES */}
      {subTab === 'invoices' && (
        <div className="space-y-4 text-xs">
          <form onSubmit={handleIssueCreditNote} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <select
              value={cnInvoiceId}
              onChange={e => setCnInvoiceId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            >
              <option value="">Select Invoice for Credit Note...</option>
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
                  <th className="p-3">Invoice #</th>
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
                      No tax invoices issued yet. Credit Notes issued: {creditNotes.length}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. DOUBLE-ENTRY LEDGER */}
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

      {/* 5. CASHFREE RECONCILIATION */}
      {subTab === 'reconciliation' && (
        <div className="space-y-4 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              Cashfree Gateway Settlement Reconciliation Runs ({reconRuns.length})
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
        </div>
      )}

      {/* 6. FORMULA-SAFE EXPORTS & AUDIT */}
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
  );
};
