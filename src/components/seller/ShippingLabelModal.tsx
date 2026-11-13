import React from 'react';
import { Order, Seller } from '../../types';
import { X, Printer, Download, CheckCircle2, QrCode } from 'lucide-react';

interface ShippingLabelModalProps {
  order: Order;
  seller: Seller;
  onClose: () => void;
}

export const ShippingLabelModal: React.FC<ShippingLabelModalProps> = ({ order, seller, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = order.invoiceNumber || `PB-INV-${order.id}`;
  const awbNumber = order.trackingNumber || `AWB-BD-${Math.floor(100000000 + Math.random() * 900000000)}`;
  const courier = order.courierPartner || 'BlueDart Express (Air Surface)';
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col animate-fadeIn">
        {/* Modal Top Actions */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
              Air Waybill (AWB) & GST Tax Invoice
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Order #{order.id} · Ready for dispatch handover
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-opacity"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Label</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Physical Shipping Label Card */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 text-zinc-900 dark:text-zinc-100 space-y-6">
          <div className="border-2 border-zinc-900 dark:border-zinc-300 rounded-2xl p-6 bg-white text-zinc-900 shadow-xs text-xs space-y-5">
            {/* Header row with Prime Bazaar Logo and Courier */}
            <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-4">
              <div>
                <span className="text-lg font-black tracking-tight font-display text-emerald-800">
                  PRIME BAZAAR LOGISTICS
                </span>
                <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Standard Surface Priority Delivery
                </span>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-wider">
                  {courier}
                </span>
                <span className="block font-mono text-[11px] font-bold mt-1 text-zinc-700">
                  AWB: {awbNumber}
                </span>
              </div>
            </div>

            {/* Barcode & QR Code Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Routing Barcode</span>
                <div className="font-mono text-xl sm:text-2xl tracking-[4px] sm:tracking-[6px] font-black text-zinc-900 select-all">
                  ||||| | |||| || ||||| ||||
                </div>
                <div className="font-mono text-[11px] text-zinc-600 font-bold">{awbNumber}</div>
              </div>
              <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-zinc-200 pt-3 sm:pt-0 sm:pl-4 text-center sm:text-left">
                <div className="w-16 h-16 bg-white border border-zinc-300 rounded-lg p-1.5 flex items-center justify-center">
                  <QrCode className="w-full h-full text-zinc-900" />
                </div>
                <div>
                  <span className="block font-bold text-zinc-800 text-[11px]">POD OTP Required</span>
                  <span className="text-[10px] text-zinc-500">Scan at Doorstep Delivery</span>
                </div>
              </div>
            </div>

            {/* 2-Column Addresses: Ship To vs Ship From */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-zinc-200 pb-4">
              <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50">
                <span className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">
                  DELIVERY DESTINATION (SHIP TO):
                </span>
                <p className="font-bold text-sm text-zinc-900">{order.shippingAddress.fullName}</p>
                <p className="text-zinc-600 mt-0.5">{order.shippingAddress.street}</p>
                <p className="text-zinc-600 font-semibold">
                  {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pinCode}
                </p>
                <p className="text-zinc-800 font-mono text-[11px] mt-1 font-bold">
                  Ph: {order.shippingAddress.phone}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50">
                <span className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">
                  DISPATCH WAREHOUSE (SHIP FROM):
                </span>
                <p className="font-bold text-sm text-zinc-900">{seller.businessName}</p>
                <p className="text-zinc-600 mt-0.5">
                  {seller.pickupAddress?.street || 'Central Weavers & Textiles Cluster, Godown 4'}
                </p>
                <p className="text-zinc-600 font-semibold">
                  {seller.pickupAddress?.city || seller.location} - {seller.pickupAddress?.pinCode || '221001'}
                </p>
                <p className="text-zinc-800 font-mono text-[11px] mt-1">
                  GSTIN: {seller.gstNumber} · PAN: {seller.panNumber || 'AAECV1234M'}
                </p>
              </div>
            </div>

            {/* Product Manifest & Itemized Table */}
            <div>
              <span className="text-[10px] font-bold uppercase text-zinc-500 block mb-2">
                Order Package Contents (SKU Manifest)
              </span>
              <table className="w-full text-left text-xs border border-zinc-200 rounded-lg overflow-hidden">
                <thead className="bg-zinc-100 text-zinc-700 font-semibold border-b border-zinc-200">
                  <tr>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5">SKU / Code</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Taxable (₹)</th>
                    <th className="p-2.5 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {order.items.map(item => (
                    <tr key={item.id} className="text-[11px]">
                      <td className="p-2.5 font-medium text-zinc-900">
                        {item.product.title}
                        <span className="block text-[10px] text-zinc-500">
                          Variant: {item.selectedSize} / {item.selectedColor}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-zinc-600">
                        {item.product.sku || 'SKU-PB-901'}
                      </td>
                      <td className="p-2.5 text-center font-bold text-zinc-900">{item.quantity}</td>
                      <td className="p-2.5 text-right font-mono">
                        ₹{Math.round((item.product.price * 0.88)).toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-zinc-900">
                        ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Payment Mode */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t-2 border-zinc-900">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500">Payment Collection Mode</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    order.paymentMethod === 'cod'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}>
                    {order.paymentMethod === 'cod' ? 'CASH ON DELIVERY (COLLECT CASH)' : 'PREPAID ONLINE (DO NOT COLLECT)'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">Total Invoice Amount:</span>
                <span className="block text-xl font-black font-mono text-zinc-900">
                  ₹{order.finalAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-zinc-400">Includes all applicable CGST + SGST (12%)</span>
              </div>
            </div>

            {/* Legal Footnote */}
            <div className="text-[9px] text-zinc-400 text-center pt-2 border-t border-zinc-200">
              Tax Invoice #{invoiceNumber} generated on {orderDate}. Goods once sold are subject to Prime Bazaar 7-Day Replacement Policy. Prime Bazaar Marketplace Pvt Ltd.
            </div>
          </div>
        </div>

        {/* Sticky Bottom Footer */}
        <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <button
            type="button"
            onClick={onClose}
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
