import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { Order } from '../types';
import { 
  X, 
  Package, 
  Truck, 
  CheckCircle, 
  AlertCircle, 
  RotateCcw, 
  Receipt, 
  ChevronRight,
  Printer
} from 'lucide-react';

export const OrdersModal: React.FC = () => {
  const { isOrdersOpen, setIsOrdersOpen, orders, cancelOrder, returnOrder } = useMarketplace();
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('Size does not fit properly');

  if (!isOrdersOpen) return null;

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (returnOrderId) {
      returnOrder(returnOrderId, returnReason);
      setReturnOrderId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <Package className="w-5 h-5 text-rose-600" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
              My Orders & Live Shipment Tracking
            </h2>
          </div>
          <button
            onClick={() => setIsOrdersOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Orders List */}
        <div className="mt-6 space-y-6">
          {orders.length > 0 ? (
            orders.map(order => (
              <div
                key={order.id}
                className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-4"
              >
                {/* Order Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold font-mono text-zinc-900 dark:text-white text-sm">
                      Order #{order.id}
                    </span>
                    <span className="text-zinc-400 ml-2">
                      Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      order.status === 'delivered'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : order.status === 'cancelled'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : order.status === 'returned'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                    }`}>
                      {order.status.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => setSelectedOrderForInvoice(order)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-medium text-zinc-700 dark:text-zinc-200"
                      title="Download GST Invoice"
                    >
                      <Receipt className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Invoice</span>
                    </button>
                  </div>
                </div>

                {/* Items in order */}
                <div className="divide-y divide-zinc-200 dark:divide-zinc-700/50">
                  {order.items.map(item => (
                    <div key={item.id} className="py-2.5 flex items-center gap-3">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.title}
                        referrerPolicy="no-referrer"
                        className="w-12 h-14 object-cover rounded-lg shrink-0"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <span className="text-[10px] uppercase font-bold text-zinc-400">{item.product.brand}</span>
                        <h4 className="font-semibold text-zinc-900 dark:text-white truncate">{item.product.title}</h4>
                        <span className="text-zinc-500 text-[11px]">
                          Size: {item.selectedSize} · Color: {item.selectedColor} · Qty: {item.quantity}
                        </span>
                      </div>
                      <div className="text-right text-xs font-mono font-bold text-zinc-900 dark:text-white">
                        ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live Tracking Timeline Stepper */}
                {order.status !== 'cancelled' && (
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-3">
                      Shipment Status & Milestones
                    </span>
                    <div className="relative pl-6 space-y-4 border-l-2 border-zinc-200 dark:border-zinc-700 ml-2">
                      {order.trackingSteps.map((step, idx) => (
                        <div key={idx} className="relative">
                          {/* Dot */}
                          <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 ${
                            step.completed
                              ? 'bg-emerald-600 border-white dark:border-zinc-900 ring-2 ring-emerald-500/30'
                              : 'bg-zinc-300 dark:bg-zinc-700 border-white dark:border-zinc-900'
                          }`} />
                          <div className="text-xs">
                            <span className={`font-semibold block ${step.completed ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
                              {step.step}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">{step.timestamp}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delivery address & Actions */}
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-zinc-500">
                    <span>Delivering to: <strong>{order.shippingAddress.fullName}</strong> ({order.shippingAddress.city} - {order.shippingAddress.pinCode})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Cancellation option if not yet shipped or delivered */}
                    {(order.status === 'placed' || order.status === 'packed') && (
                      <button
                        onClick={() => cancelOrder(order.id)}
                        className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium"
                      >
                        Cancel Order
                      </button>
                    )}

                    {/* Return/Replacement option */}
                    {(order.status === 'delivered' || order.status === 'shipped') && (
                      <button
                        onClick={() => setReturnOrderId(order.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-medium"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Return / Replace</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center text-zinc-500 text-xs">
              You haven’t placed any orders yet.
            </div>
          )}
        </div>

        {/* Return modal sheet */}
        {returnOrderId && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <form onSubmit={handleReturnSubmit} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-xl border border-zinc-200 dark:border-zinc-800 text-xs">
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
                  className="px-3 py-1.5 text-zinc-600 hover:text-zinc-900"
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

        {/* GST Invoice Dialog */}
        {selectedOrderForInvoice && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white text-zinc-900 p-6 sm:p-8 rounded-3xl max-w-lg w-full space-y-4 shadow-2xl relative text-xs">
              <button
                onClick={() => setSelectedOrderForInvoice(null)}
                className="absolute top-4 right-4 p-1 rounded-full text-zinc-400 hover:text-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="px-2 py-1 rounded-xl bg-white border border-zinc-200 shadow-xs flex items-center">
                    <img
                      src="/assets/aistudio/Prime_Bazaar_Shopping_Logo_0c82d149.png"
                      alt="Prime Bazaar"
                      className="h-8 w-auto object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-display">Prime Bazaar Marketplace</h3>
                    <span className="text-[10px] text-zinc-500">GSTIN: 27AABCT9942M1ZQ</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm font-mono">INVOICE #{selectedOrderForInvoice.id}</span>
                  <span className="block text-[10px] text-zinc-500">Date: {new Date(selectedOrderForInvoice.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2 text-[11px]">
                <div>
                  <span className="font-bold text-zinc-500 block">Sold By:</span>
                  <span className="font-semibold block">{selectedOrderForInvoice.items[0]?.product.sellerName || 'Varanasi Weavers Co.'}</span>
                  <span className="text-zinc-500">Authorized Marketplace Merchant</span>
                </div>
                <div>
                  <span className="font-bold text-zinc-500 block">Billed & Shipped To:</span>
                  <span className="font-semibold block">{selectedOrderForInvoice.shippingAddress.fullName}</span>
                  <span className="text-zinc-500">{selectedOrderForInvoice.shippingAddress.street}, {selectedOrderForInvoice.shippingAddress.city}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-t border-b py-2">
                <thead>
                  <tr className="border-b text-zinc-500">
                    <th className="py-1">Description</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono">
                  {selectedOrderForInvoice.items.map(item => (
                    <tr key={item.id}>
                      <td className="py-1.5 font-sans">
                        <span className="font-semibold block">{item.product.title}</span>
                        <span className="text-[10px] text-zinc-500">Size: {item.selectedSize} | Color: {item.selectedColor}</span>
                      </td>
                      <td className="py-1.5 text-center">{item.quantity}</td>
                      <td className="py-1.5 text-right">₹{(item.product.price * item.quantity).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="space-y-1 text-right font-mono">
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
                <div className="flex justify-between font-bold text-sm pt-2 border-t text-zinc-900">
                  <span>Grand Total (Incl. 5% GST):</span>
                  <span>₹{selectedOrderForInvoice.finalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center text-zinc-400 text-[10px]">
                <span>This is a computer-generated GST tax invoice.</span>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
