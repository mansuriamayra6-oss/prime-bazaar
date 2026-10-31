import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Product } from '../../types';
import { 
  Store, 
  Package, 
  TrendingUp, 
  Wallet, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Truck, 
  ShieldCheck, 
  X, 
  Clock,
  ArrowRight
} from 'lucide-react';

export const SellerDashboard: React.FC = () => {
  const { 
    products, 
    addProduct, 
    deleteProduct, 
    orders, 
    updateOrderStatus, 
    sellers,
    notify 
  } = useMarketplace();

  const currentSeller = sellers[0]; // Varanasi Weavers Co.
  const [activeTab, setActiveTab] = useState<'overview' | 'catalog' | 'orders' | 'payouts'>('overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New product form
  const [newTitle, setNewTitle] = useState('');
  const [newBrand, setNewBrand] = useState('Anouk Heritage');
  const [newCategory, setNewCategory] = useState<'ethnic' | 'western' | 'streetwear' | 'footwear' | 'accessories' | 'beauty'>('ethnic');
  const [newPrice, setNewPrice] = useState(1499);
  const [newOriginalPrice, setNewOriginalPrice] = useState(2999);
  const [newStock, setNewStock] = useState(20);
  const [newDescription, setNewDescription] = useState('');
  const [newFabric, setNewFabric] = useState('Pure Chanderi Silk');
  const [newImageUrl, setNewImageUrl] = useState('/src/assets/images/collection_ethnic_wear_1793466539838.jpg');

  const sellerProducts = products.filter(p => p.sellerId === currentSeller.id || !p.sellerId);
  const pendingOrders = orders.filter(o => o.status === 'placed' || o.status === 'packed');

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const discount = Math.round(((newOriginalPrice - newPrice) / newOriginalPrice) * 100);

    addProduct({
      title: newTitle,
      brand: newBrand,
      category: newCategory,
      price: Number(newPrice),
      originalPrice: Number(newOriginalPrice),
      discountPercent: Math.max(0, discount),
      inStock: Number(newStock),
      images: [newImageUrl],
      colors: [
        { name: 'Classic Gold', hex: '#EAB308' },
        { name: 'Royal Crimson', hex: '#BE123C' }
      ],
      sizes: [
        { size: 'S', available: true, stockCount: Math.floor(newStock / 3) },
        { size: 'M', available: true, stockCount: Math.floor(newStock / 2) },
        { size: 'L', available: true, stockCount: Math.floor(newStock / 3) }
      ],
      description: newDescription || 'Premium handcrafted Indian attire crafted with authentic traditional weaving techniques.',
      fabric: newFabric,
      fit: 'Regular Fit',
      sellerId: currentSeller.id,
      sellerName: currentSeller.businessName,
      sellerRating: currentSeller.rating,
      codAvailable: true,
      returnPeriodDays: 7,
      isNew: true
    });

    setIsAddModalOpen(false);
    setNewTitle('');
    setNewDescription('');
  };

  const handleRequestPayout = () => {
    notify(`Payout of ₹${currentSeller.walletBalance.toLocaleString('en-IN')} initiated to Bank Account ending in 9041! 🏦`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Merchant Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white font-display">
                {currentSeller.businessName}
              </h1>
              {currentSeller.verified && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3" />
                  <span>GST Verified</span>
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Merchant ID: {currentSeller.id} · GSTIN: {currentSeller.gstNumber} · {currentSeller.location}
            </p>
          </div>
        </div>

        {/* Tab Controls & Add Product CTA */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-2 my-6 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Dashboard Overview' },
          { id: 'catalog', label: `My Catalog (${sellerProducts.length})` },
          { id: 'orders', label: `Orders to Dispatch (${pendingOrders.length})` },
          { id: 'payouts', label: 'Wallet & Settlement' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab: Key Metrics */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-semibold uppercase">Total Gross Sales</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
                ₹{currentSeller.totalRevenue.toLocaleString('en-IN')}
              </span>
              <span className="block text-[11px] text-emerald-600 mt-1 font-medium">+18.4% this month</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-semibold uppercase">Total Fulfilled Orders</span>
                <Package className="w-4 h-4 text-indigo-500" />
              </div>
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
                {currentSeller.totalOrders.toLocaleString('en-IN')}
              </span>
              <span className="block text-[11px] text-zinc-400 mt-1">99.2% on-time dispatch rate</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-semibold uppercase">Active Listings</span>
                <Store className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
                {sellerProducts.length} SKUs
              </span>
              <span className="block text-[11px] text-zinc-400 mt-1">Direct marketplace distribution</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-semibold uppercase">Settlement Wallet</span>
                <Wallet className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
                ₹{currentSeller.walletBalance.toLocaleString('en-IN')}
              </span>
              <button
                onClick={handleRequestPayout}
                className="mt-2 text-[11px] font-bold text-rose-600 hover:underline block"
              >
                Withdraw to Bank →
              </button>
            </div>
          </div>

          {/* Recent Orders quick preview */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display mb-4">
              Pending Orders Requiring Dispatch
            </h3>
            {pendingOrders.length > 0 ? (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {pendingOrders.map(order => (
                  <div key={order.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold font-mono text-zinc-900 dark:text-white">
                        Order #{order.id}
                      </span>
                      <span className="text-zinc-500 ml-2">
                        {order.items.length} items · ₹{order.finalAmount.toLocaleString('en-IN')} · COD/Prepaid
                      </span>
                      <span className="block text-zinc-400 text-[11px] mt-0.5">
                        Ship to: {order.shippingAddress.fullName}, {order.shippingAddress.city}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.status === 'placed' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'packed')}
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold"
                        >
                          Mark Packed
                        </button>
                      )}
                      {order.status === 'packed' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'shipped')}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Dispatch / Ship</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 py-4">All orders are currently dispatched!</p>
            )}
          </div>
        </div>
      )}

      {/* Catalog Tab */}
      {activeTab === 'catalog' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">
              Product Inventory & Pricing
            </span>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
            >
              + Add Product
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="p-4">Product Details</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Selling Price</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-medium">
                {sellerProducts.map(prod => (
                  <tr key={prod.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="p-4 flex items-center gap-3">
                      <img
                        src={prod.images[0]}
                        alt={prod.title}
                        referrerPolicy="no-referrer"
                        className="w-12 h-14 object-cover rounded-lg shrink-0"
                      />
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-white block">{prod.title}</span>
                        <span className="text-[10px] text-zinc-400 uppercase">{prod.brand}</span>
                      </div>
                    </td>
                    <td className="p-4 uppercase text-zinc-500 text-[11px]">{prod.category}</td>
                    <td className="p-4 font-mono font-bold text-zinc-900 dark:text-white">
                      ₹{prod.price.toLocaleString('en-IN')}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        prod.inStock <= 3
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {prod.inStock} in stock
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-amber-500">{prod.rating}★</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => deleteProduct(prod.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
            Fulfillment Queue & Shipping Management
          </h3>
          <div className="space-y-4">
            {orders.map(o => (
              <div key={o.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-zinc-900 dark:text-white text-sm">
                      #{o.id}
                    </span>
                    <span className="px-2 py-0.5 rounded uppercase font-bold text-[10px] bg-zinc-100 dark:bg-zinc-800">
                      {o.status}
                    </span>
                  </div>
                  <span className="text-zinc-500">
                    Recipient: {o.shippingAddress.fullName} ({o.shippingAddress.phone}) · {o.shippingAddress.city}
                  </span>
                  <div className="mt-1 text-zinc-600 dark:text-zinc-400 font-mono">
                    Total Invoice: ₹{o.finalAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateOrderStatus(o.id, 'packed')}
                    disabled={o.status !== 'placed'}
                    className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold disabled:opacity-40"
                  >
                    Pack
                  </button>
                  <button
                    onClick={() => updateOrderStatus(o.id, 'shipped')}
                    disabled={o.status === 'shipped' || o.status === 'delivered' || o.status === 'cancelled'}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold disabled:opacity-40"
                  >
                    Ship with Courier
                  </button>
                  <button
                    onClick={() => updateOrderStatus(o.id, 'delivered')}
                    disabled={o.status === 'delivered' || o.status === 'cancelled'}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-40"
                  >
                    Mark Delivered
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payouts Tab */}
      {activeTab === 'payouts' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
          <div className="max-w-md space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
              Settlements & Bank Account
            </h3>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Available Wallet Balance:</span>
                <span className="font-bold font-mono text-zinc-900 dark:text-white text-sm">
                  ₹{currentSeller.walletBalance.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Linked Bank Account:</span>
                <span className="font-mono">HDFC Bank (•••• 9041)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Settlement Cycle:</span>
                <span>T+2 Days (Weekly Automatic)</span>
              </div>
            </div>

            <button
              onClick={handleRequestPayout}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-md"
            >
              Request Immediate Payout
            </button>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateProduct}
            className="bg-white dark:bg-zinc-900 p-6 rounded-3xl max-w-lg w-full space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-xs"
          >
            <div className="flex items-center justify-between border-b pb-3 border-zinc-200 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                Add New Product to Catalog
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Product Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Hand-Woven Banarasi Brocade Kurti"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Brand Name</label>
                <input
                  type="text"
                  value={newBrand}
                  onChange={e => setNewBrand(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as any)}
                  className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                >
                  <option value="ethnic">Ethnic Wear</option>
                  <option value="streetwear">Streetwear</option>
                  <option value="western">Western</option>
                  <option value="footwear">Footwear</option>
                  <option value="accessories">Accessories</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Selling Price (₹)</label>
                <input
                  type="number"
                  required
                  value={newPrice}
                  onChange={e => setNewPrice(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Original Price (₹)</label>
                <input
                  type="number"
                  required
                  value={newOriginalPrice}
                  onChange={e => setNewOriginalPrice(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Stock Count</label>
                <input
                  type="number"
                  required
                  value={newStock}
                  onChange={e => setNewStock(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Image URL or Asset Path</label>
              <input
                type="text"
                value={newImageUrl}
                onChange={e => setNewImageUrl(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Fabric & Craft Description</label>
              <textarea
                rows={2}
                placeholder="Details about craftsmanship, weave, wash care..."
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-zinc-600 hover:text-zinc-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-500"
              >
                Publish Product
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
