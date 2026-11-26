import React, { useState, useEffect } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { Order, ShipmentRecord, TaxInvoiceRecord } from '../types';
import { api } from '../services/api';
import {
  X,
  Package,
  Truck,
  CheckCircle2,
  RotateCcw,
  Receipt,
  Printer,
  Download,
  RefreshCw,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';

export const OrdersModal: React.FC = () => {
  const { isOrdersOpen, setIsOrdersOpen, orders, cancelOrder, returnOrder, notify, user } =
    useMarketplace();
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
  const [invoiceRecords, setInvoiceRecords] = useState<TaxInvoiceRecord[]>([]);
  const [creditNoteRecords, setCreditNoteRecords] = useState<any[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  const [shipmentsByOrder, setShipmentsByOrder] = useState<Record<string, ShipmentRecord[]>>({});
  const [subordersByOrder, setSubordersByOrder] = useState<Record<string, any[]>>({});
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [verifyingShipmentId, setVerifyingShipmentId] = useState<string | null>(null);
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);
  const [actingSuborderId, setActingSuborderId] = useState<string | null>(null);

  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('Size does not fit properly');
  const [digitalGrants, setDigitalGrants] = useState<any[]>([]);

  useEffect(() => {
    if (!isOrdersOpen || !user?.isLoggedIn) return;
    let cancelled = false;

    api.phase6G
      .getMyDigitalDownloads()
      .then(res => {
        if (!cancelled && Array.isArray(res?.grants)) {
          setDigitalGrants(res.grants);
        }
      })
      .catch(() => {
        if (!cancelled) setDigitalGrants([]);
      });

    if (orders.length === 0) return;

    const loadShipmentsAndSuborders = async () => {
      const results = await Promise.allSettled(
        orders.slice(0, 10).map(async o => {
          const [shRes, subRes] = await Promise.all([
            api.checkout.getOrderShipments(o.id).catch(() => ({ shipments: [] })),
            api.offers.getOrderSuborders(o.id).catch(() => ({ suborders: o.sellerSuborders || [] })),
          ]);
          return {
            orderId: o.id,
            shipments: (shRes.shipments || []) as ShipmentRecord[],
            suborders: (subRes.suborders || o.sellerSuborders || []) as any[],
          };
        })
      );
      if (cancelled) return;
      const nextShipMap: Record<string, ShipmentRecord[]> = {};
      const nextSubMap: Record<string, any[]> = {};
      for (const r of results) {
        if (r.status === 'fulfilled') {
          nextShipMap[r.value.orderId] = r.value.shipments;
          nextSubMap[r.value.orderId] = r.value.suborders;
        }
      }
      setShipmentsByOrder(nextShipMap);
      setSubordersByOrder(nextSubMap);
    };

    loadShipmentsAndSuborders().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isOrdersOpen, user?.isLoggedIn, orders]);

  if (!isOrdersOpen) return null;

  const openInvoiceDialog = async (order: Order) => {
    setSelectedOrderForInvoice(order);
    setInvoiceRecords([]);
    setCreditNoteRecords([]);
    if (!user?.isLoggedIn) return;
    setIsLoadingInvoices(true);
    try {
      const res = await api.checkout.getOrderInvoices(order.id);
      setInvoiceRecords(res.invoices || []);
      setCreditNoteRecords(res.creditNotes || []);
    } catch {
      // Fallback to local order metadata if offline/demo order
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const handleDownloadHtmlInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const blob = await api.checkout.downloadInvoiceBlob(invoiceId, 'html');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber.replace(/\//g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify(`Downloaded tax invoice ${invoiceNumber}`);
    } catch (err: any) {
      notify(err.message || 'Unable to download tax invoice.');
    }
  };

  const handleVerifyDeliveryOtp = async (orderId: string, shipmentId: string) => {
    const otp = (otpInputs[shipmentId] || '').trim();
    if (!/^\d{4,8}$/.test(otp)) {
      notify('Enter the numeric Delivery OTP received via email/SMS.');
      return;
    }
    setVerifyingShipmentId(shipmentId);
    try {
      const res = await api.checkout.verifyDeliveryOtp(shipmentId, otp);
      const updated = res.shipment as ShipmentRecord;
      setShipmentsByOrder(prev => ({
        ...prev,
        [orderId]: (prev[orderId] || []).map(s => (s.id === shipmentId ? updated : s)),
      }));
      setOtpInputs(prev => ({ ...prev, [shipmentId]: '' }));
      notify('Delivery OTP verified. Shipment marked delivered.');
    } catch (err: any) {
      notify(err.message || 'Invalid or expired Delivery OTP.');
    } finally {
      setVerifyingShipmentId(null);
    }
  };

  const handleRetryPayment = async (order: Order) => {
    setRetryingOrderId(order.id);
    try {
      const returnUrl = `${window.location.origin}/?cashfree_order_id={order_id}`;
      const res = await api.checkout.retryPayment(order.id, 'cashfree', returnUrl);
      notify(
        res.cashfree?.configured
          ? `Payment retry initialized (Attempt #${res.attemptNumber}). Complete checkout in Cashfree.`
          : `Payment retry logged (Attempt #${res.attemptNumber}). Configure Cashfree keys for live gateway redirect.`
      );
    } catch (err: any) {
      notify(err.message || 'Unable to initialize payment retry.');
    } finally {
      setRetryingOrderId(null);
    }
  };

  const handleCancelSuborder = async (orderId: string, suborderId: string) => {
    setActingSuborderId(suborderId);
    try {
      const res = await api.offers.cancelSuborder(orderId, suborderId, {
        reason: 'Customer cancelled individual seller fulfillment group',
      });
      setSubordersByOrder(prev => ({
        ...prev,
        [orderId]: (prev[orderId] || []).map(so => (so.id === suborderId ? res.suborder : so)),
      }));
      notify(`Cancelled ${res.suborder?.suborderNumber || 'suborder'} and released seller inventory.`);
    } catch (err: any) {
      notify(err.message || 'Unable to cancel suborder.');
    } finally {
      setActingSuborderId(null);
    }
  };

  const handleReturnSuborder = async (orderId: string, suborderId: string) => {
    setActingSuborderId(suborderId);
    try {
      const res = await api.offers.returnSuborder(orderId, suborderId, 'Fit or preference mismatch for item group');
      setSubordersByOrder(prev => ({
        ...prev,
        [orderId]: (prev[orderId] || []).map(so => (so.id === suborderId ? res.suborder : so)),
      }));
      notify(`Return initiated for ${res.suborder?.suborderNumber || 'suborder'}.`);
    } catch (err: any) {
      notify(err.message || 'Unable to request suborder return.');
    } finally {
      setActingSuborderId(null);
    }
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (returnOrderId) {
      returnOrder(returnOrderId, returnReason);
      setReturnOrderId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
      onClick={() => setIsOrdersOpen(false)}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 sm:px-8 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <Package className="w-5 h-5 text-rose-600" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
              My Orders & Shipment Tracking
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsOrdersOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close orders"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Orders List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 space-y-6">
          {digitalGrants.length > 0 && (
            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-indigo-600" />
                  <span>Signed Digital Downloads ({digitalGrants.length})</span>
                </span>
                <span className="text-[11px] text-indigo-700 dark:text-indigo-400">
                  HMAC-verified · Revoked automatically on refund/cancel
                </span>
              </div>
              <div className="space-y-2">
                {digitalGrants.map((grant: any) => {
                  const remaining = Math.max(0, Number(grant.maxDownloads || 0) - Number(grant.downloadCount || 0));
                  return (
                    <div key={grant.id} className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-white block">
                          {grant.fileName} (Order #{grant.orderId})
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {grant.revokedAt ? 'REVOKED' : `${remaining}/${grant.maxDownloads} downloads left · Expires ${new Date(grant.expiresAt).toLocaleDateString()}`}
                        </span>
                      </div>
                      {!grant.revokedAt && remaining > 0 ? (
                        <a
                          href={grant.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1 whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      ) : (
                        <span className="px-2.5 py-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold text-[11px]">
                          {grant.revokedAt ? 'Revoked' : 'Limit Reached'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {orders.length > 0 ? (
            orders.map(order => {
              const orderShipments = shipmentsByOrder[order.id] || [];
              const canRetryPayment =
                order.paymentMethod !== 'cod' &&
                order.paymentMethod !== 'WALLET_ONLY' &&
                (order.paymentStatus === 'FAILED' || order.paymentStatus === 'PENDING') &&
                order.status !== 'cancelled' &&
                Number(order.finalGatewayPayable ?? order.finalAmount) > 0;

              return (
                <div
                  key={order.id}
                  className="p-5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-4"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold font-mono text-zinc-900 dark:text-white text-sm tabular-nums">
                        Order #{order.id}
                      </span>
                      <span className="text-zinc-400" aria-hidden="true">·</span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {order.paymentStatus && (
                        <>
                          <span className="text-zinc-400" aria-hidden="true">·</span>
                          <span
                            className={`font-semibold ${
                              order.paymentStatus === 'PAID'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : order.paymentStatus === 'FAILED'
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            Payment: {order.paymentStatus.replace('_', ' ')}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold uppercase tracking-wide ${
                          order.status === 'delivered'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : order.status === 'cancelled'
                            ? 'text-rose-700 dark:text-rose-400'
                            : order.status === 'returned'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-indigo-700 dark:text-indigo-400'
                        }`}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                      <button
                        type="button"
                        onClick={() => openInvoiceDialog(order)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-medium text-zinc-700 dark:text-zinc-200 whitespace-nowrap shrink-0"
                        title="View GST Tax Invoice"
                      >
                        <Receipt className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Invoice</span>
                      </button>
                    </div>
                  </div>

                  {/* Financial & Split Warehouse Summary */}
                  {(Number(order.taxAmount || 0) > 0 ||
                    Number(order.giftCardAmount || 0) > 0 ||
                    Number(order.storeCreditAmount || 0) > 0 ||
                    (order.splitWarehousePlan && order.splitWarehousePlan.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-600 dark:text-zinc-400 pb-2 border-b border-zinc-200 dark:border-zinc-700/60 tabular-nums">
                      {Number(order.taxAmount || 0) > 0 && (
                        <span>GST Included: ₹{Number(order.taxAmount).toLocaleString('en-IN')}</span>
                      )}
                      {Number(order.giftCardAmount || 0) > 0 && (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          Gift Card: -₹{Number(order.giftCardAmount).toLocaleString('en-IN')}
                        </span>
                      )}
                      {Number(order.storeCreditAmount || 0) > 0 && (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          Store Credit: -₹{Number(order.storeCreditAmount).toLocaleString('en-IN')}
                        </span>
                      )}
                      {order.splitWarehousePlan && order.splitWarehousePlan.length > 0 && (
                        <span>
                          Fulfillment Nodes:{' '}
                          {order.splitWarehousePlan.map(w => `${w.warehouseName} (${w.warehouseState})`).join(', ')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Items in order */}
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-700/50">
                    {order.items.map(item => (
                      <div key={item.id} className="py-2.5 flex items-center gap-3">
                        <img
                          src={item.product.images[0]}
                          alt={item.product.title}
                          referrerPolicy="no-referrer"
                          className="w-12 h-14 object-cover rounded-lg shrink-0 bg-zinc-200 dark:bg-zinc-700"
                        />
                        <div className="flex-1 min-w-0 text-xs">
                          <span className="text-[11px] uppercase font-semibold text-zinc-400">
                            {item.product.brand} {item.offerSellerName ? `· ${item.offerSellerName}` : ''}
                          </span>
                          <h4 className="font-semibold text-zinc-900 dark:text-white truncate">
                            {item.product.title}
                          </h4>
                          <span className="text-zinc-500 text-[11px]">
                            Size: {item.selectedSize} · Color: {item.selectedColor} · Qty: {item.quantity}
                          </span>
                        </div>
                        <div className="text-right text-xs font-mono font-bold text-zinc-900 dark:text-white tabular-nums">
                          ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Per-Seller Split Suborders */}
                  {(subordersByOrder[order.id] || order.sellerSuborders || []).length > 0 && (
                    <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                        Seller Fulfillment Groups ({(subordersByOrder[order.id] || order.sellerSuborders || []).length})
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(subordersByOrder[order.id] || order.sellerSuborders || []).map((so: any) => (
                          <div
                            key={so.id}
                            className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono font-bold text-zinc-900 dark:text-white">
                                {so.suborderNumber}
                              </span>
                              <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">
                                {so.fulfillmentStatus}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-600 dark:text-zinc-300">
                              Seller: <strong className="text-zinc-900 dark:text-white">{so.sellerName}</strong>
                            </div>
                            <div className="text-[11px] text-zinc-500 tabular-nums">
                              Subtotal: ₹{Number(so.subtotal || 0).toLocaleString('en-IN')} · Shipping: ₹{Number(so.shippingFee || 0)} · GST: ₹{Number(so.taxAmount || 0).toLocaleString('en-IN')}
                            </div>
                            {so.fulfillmentStatus !== 'CANCELLED' && so.fulfillmentStatus !== 'RETURNED' && (
                              <div className="flex items-center gap-2 pt-1">
                                {so.fulfillmentStatus !== 'DELIVERED' ? (
                                  <button
                                    type="button"
                                    disabled={actingSuborderId === so.id}
                                    onClick={() => handleCancelSuborder(order.id, so.id)}
                                    className="px-2.5 py-1 rounded-md border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[11px] font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50"
                                  >
                                    Cancel Suborder
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={actingSuborderId === so.id}
                                    onClick={() => handleReturnSuborder(order.id, so.id)}
                                    className="px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                                  >
                                    Return Group
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Live Carrier Shipments & Delivery OTP Verification */}
                  {orderShipments.length > 0 && (
                    <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                        Carrier Shipments & Delivery Confirmation
                      </span>
                      {orderShipments.map(sh => (
                        <div
                          key={sh.id}
                          className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 font-mono">
                              <Truck className="w-3.5 h-3.5 text-zinc-500" />
                              <span className="font-semibold text-zinc-900 dark:text-white">
                                {sh.courier || sh.providerName}
                              </span>
                              <span className="text-zinc-400" aria-hidden="true">·</span>
                              <span className="text-zinc-600 dark:text-zinc-300 tabular-nums">
                                AWB: {sh.trackingNumber || 'Pending'}
                              </span>
                            </div>
                            <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                              {sh.status}
                            </span>
                          </div>

                          {sh.failedAttempts > 0 && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                Failed delivery attempts: {sh.failedAttempts}
                                {sh.rtoReason ? ` · RTO: ${sh.rtoReason}` : ''}
                              </span>
                            </p>
                          )}

                          {sh.status === 'OUT_FOR_DELIVERY' && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <KeyRound className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="Enter 6-digit Delivery OTP"
                                value={otpInputs[sh.id] || ''}
                                onChange={e =>
                                  setOtpInputs(prev => ({
                                    ...prev,
                                    [sh.id]: e.target.value.replace(/\D/g, ''),
                                  }))
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-mono text-zinc-900 dark:text-white w-44 tabular-nums"
                              />
                              <button
                                type="button"
                                disabled={verifyingShipmentId === sh.id}
                                onClick={() => handleVerifyDeliveryOtp(order.id, sh.id)}
                                className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-xs hover:opacity-90 disabled:opacity-50 whitespace-nowrap shrink-0"
                              >
                                {verifyingShipmentId === sh.id ? 'Verifying...' : 'Confirm Delivery OTP'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tracking Timeline Stepper (Clean Dot Connector, no thick left bar) */}
                  {order.status !== 'cancelled' && (
                    <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-3">
                        Order Milestones
                      </span>
                      <div className="space-y-2.5">
                        {order.trackingSteps.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="mt-0.5 shrink-0">
                              <CheckCircle2
                                className={`w-4 h-4 ${
                                  step.completed
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-zinc-300 dark:text-zinc-600'
                                }`}
                              />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-wrap items-baseline justify-between gap-2 text-xs">
                              <span
                                className={`font-medium ${
                                  step.completed
                                    ? 'text-zinc-900 dark:text-white'
                                    : 'text-zinc-400 dark:text-zinc-500'
                                }`}
                              >
                                {step.step}
                              </span>
                              <span className="text-[11px] text-zinc-400 font-mono tabular-nums">
                                {step.timestamp}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delivery address & Actions */}
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="text-zinc-500 dark:text-zinc-400">
                      <span>
                        Delivering to: <strong className="text-zinc-800 dark:text-zinc-200">{order.shippingAddress.fullName}</strong> ({order.shippingAddress.city} - {order.shippingAddress.pinCode})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {canRetryPayment && (
                        <button
                          type="button"
                          disabled={retryingOrderId === order.id}
                          onClick={() => handleRetryPayment(order)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500 font-medium whitespace-nowrap shrink-0 disabled:opacity-50"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>{retryingOrderId === order.id ? 'Retrying...' : 'Retry Payment'}</span>
                        </button>
                      )}

                      {(order.status === 'placed' || order.status === 'packed') && (
                        <button
                          type="button"
                          onClick={() => cancelOrder(order.id)}
                          className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium whitespace-nowrap shrink-0"
                        >
                          Cancel Order
                        </button>
                      )}

                      {(order.status === 'delivered' || order.status === 'shipped') && (
                        <button
                          type="button"
                          onClick={() => setReturnOrderId(order.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-medium whitespace-nowrap shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Return / Replace</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center text-zinc-500 text-xs">
              You haven&rsquo;t placed any orders yet.
            </div>
          )}
        </div>

        {/* Return modal sheet */}
        {returnOrderId && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <form
              onSubmit={handleReturnSubmit}
              className="bg-white dark:bg-zinc-900 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-xl border border-zinc-200 dark:border-zinc-800 text-xs"
            >
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                Request Return or Exchange
              </h3>
              <p className="text-zinc-500">
                Please select the reason for returning items from Order #{returnOrderId}:
              </p>
              <select
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              >
                <option value="Size does not fit properly">Size does not fit properly</option>
                <option value="Fabric quality not as expected">Fabric quality not as expected</option>
                <option value="Received damaged or wrong item">Received damaged or wrong item</option>
                <option value="Changed my mind">Changed my mind</option>
              </select>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnOrderId(null)}
                  className="px-3 py-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-semibold"
                >
                  Confirm Return Pickup
                </button>
              </div>
            </form>
          </div>
        )}

        {/* GST Tax Invoice Dialog */}
        {selectedOrderForInvoice && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white text-zinc-900 p-6 sm:p-8 rounded-2xl max-w-xl w-full max-h-[88vh] overflow-y-auto space-y-4 shadow-2xl relative text-xs border border-zinc-200">
              <button
                type="button"
                onClick={() => setSelectedOrderForInvoice(null)}
                className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-zinc-900"
                aria-label="Close invoice"
              >
                <X className="w-5 h-5" />
              </button>

              {isLoadingInvoices ? (
                <div className="py-12 text-center text-zinc-500">Loading GST tax invoice records...</div>
              ) : invoiceRecords.length > 0 ? (
                <div className="space-y-5">
                  {invoiceRecords.map(inv => (
                    <div key={inv.id} className="space-y-3 border-b border-zinc-200 pb-4 last:border-b-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold font-display">Tax Invoice #{inv.invoiceNumber}</h3>
                          <p className="text-[11px] text-zinc-500">
                            Sold By: {inv.sellerName} · GSTIN: {inv.sellerGstin}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            Supply Type: {inv.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'} ·{' '}
                            {inv.warehouseState} → {inv.buyerState}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadHtmlInvoice(inv.id, inv.invoiceNumber)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download HTML</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-zinc-50 border border-zinc-200 font-mono tabular-nums">
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Taxable</span>
                          <span className="font-semibold">₹{inv.taxableSubtotal.toLocaleString('en-IN')}</span>
                        </div>
                        {inv.isInterState ? (
                          <div>
                            <span className="text-[10px] text-zinc-500 block">IGST</span>
                            <span className="font-semibold">₹{inv.igstAmount.toLocaleString('en-IN')}</span>
                          </div>
                        ) : (
                          <>
                            <div>
                              <span className="text-[10px] text-zinc-500 block">CGST</span>
                              <span className="font-semibold">₹{inv.cgstAmount.toLocaleString('en-IN')}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 block">SGST</span>
                              <span className="font-semibold">₹{inv.sgstAmount.toLocaleString('en-IN')}</span>
                            </div>
                          </>
                        )}
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Grand Total</span>
                          <span className="font-bold">₹{inv.grandTotal.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {creditNoteRecords.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
                      <span className="font-bold text-amber-900 block">Issued Credit Notes</span>
                      {creditNoteRecords.map((cn: any) => (
                        <div key={cn.id} className="flex justify-between font-mono text-[11px] text-amber-800 tabular-nums">
                          <span>
                            {cn.creditNoteNumber} ({cn.reason})
                          </span>
                          <span>-₹{Number(cn.totalCreditAmount).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-800 font-semibold flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print View</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h3 className="text-sm font-bold font-display">Prime Bazaar Marketplace</h3>
                      <span className="text-[11px] text-zinc-500">Order Receipt</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm font-mono tabular-nums">
                        {selectedOrderForInvoice.invoiceNumber || `INV-${selectedOrderForInvoice.id}`}
                      </span>
                      <span className="block text-[10px] text-zinc-500">
                        Date: {new Date(selectedOrderForInvoice.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <table className="w-full text-left border-t border-b py-2">
                    <thead>
                      <tr className="border-b text-zinc-500">
                        <th className="py-1.5">Description</th>
                        <th className="py-1.5 text-center">Qty</th>
                        <th className="py-1.5 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-mono tabular-nums">
                      {selectedOrderForInvoice.items.map(item => (
                        <tr key={item.id}>
                          <td className="py-1.5 font-sans">
                            <span className="font-semibold block">{item.product.title}</span>
                            <span className="text-[10px] text-zinc-500">
                              Size: {item.selectedSize} · Color: {item.selectedColor}
                            </span>
                          </td>
                          <td className="py-1.5 text-center">{item.quantity}</td>
                          <td className="py-1.5 text-right">
                            ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="space-y-1 text-right font-mono tabular-nums">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{selectedOrderForInvoice.totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                    {selectedOrderForInvoice.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount:</span>
                        <span>-₹{selectedOrderForInvoice.discountAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {Number(selectedOrderForInvoice.taxAmount || 0) > 0 && (
                      <div className="flex justify-between text-zinc-600">
                        <span>GST:</span>
                        <span>₹{Number(selectedOrderForInvoice.taxAmount).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm pt-2 border-t text-zinc-900">
                      <span>Total Payable:</span>
                      <span>₹{selectedOrderForInvoice.finalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between items-center text-zinc-500 text-[11px]">
                    <span>Computer-generated order summary.</span>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white font-semibold flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Receipt</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Sticky Bottom Footer with Close */}
        <div className="shrink-0 flex items-center justify-end px-6 sm:px-8 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/95">
          <button
            type="button"
            onClick={() => setIsOrdersOpen(false)}
            className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
