import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Product, Order, SellerReturnRequest, SellerCoupon, SellerSupportTicket } from '../../types';
import { 
  Store, 
  LayoutDashboard,
  UserCheck,
  Package, 
  Boxes,
  ShoppingCart,
  Truck, 
  RotateCcw,
  Wallet, 
  Tag,
  BarChart3,
  HelpCircle,
  Settings,
  Plus, 
  Trash2, 
  Edit3,
  CheckCircle2, 
  ShieldCheck, 
  X, 
  Clock,
  ArrowRight,
  Printer,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  QrCode,
  DollarSign,
  TrendingUp,
  Percent,
  Search,
  Filter,
  Check,
  Ban,
  Building2,
  CreditCard,
  Send,
  MessageSquare,
  ChevronRight,
  Eye
} from 'lucide-react';
import { ShippingLabelModal } from './ShippingLabelModal';
import { ProductUploadModal } from './ProductUploadModal';
import { BulkUploadModal } from './BulkUploadModal';
import { SellerRegistrationModal } from './SellerRegistrationModal';

type SellerTab = 
  | 'dashboard'
  | 'registration'
  | 'products'
  | 'inventory'
  | 'orders'
  | 'shipping'
  | 'returns'
  | 'payments'
  | 'offers'
  | 'analytics'
  | 'support'
  | 'settings';

export const SellerDashboard: React.FC = () => {
  const { 
    products, 
    addProduct, 
    updateProduct,
    deleteProduct, 
    updateProductStock,
    orders, 
    fulfillSellerOrder,
    sellers,
    currentSellerId,
    setCurrentSellerId,
    currentSeller,
    updateSeller,
    sellerReturns,
    handleSellerReturn,
    sellerPayouts,
    requestSellerPayout,
    sellerCoupons,
    createSellerCoupon,
    toggleSellerCoupon,
    sellerTickets,
    replyToSellerTicket,
    notify 
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<SellerTab>('dashboard');

  // Modals
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState<Order | null>(null);

  // Payout Modal
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmountInput, setPayoutAmountInput] = useState<number>(
    currentSeller.walletBalance > 0 ? Math.min(currentSeller.walletBalance, 25000) : 5000
  );

  // New Coupon Form state
  const [isNewCouponOpen, setIsNewCouponOpen] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState(15);
  const [newCouponMinOrder, setNewCouponMinOrder] = useState(1299);
  const [newCouponMaxDisc, setNewCouponMaxDisc] = useState(300);

  // Ticket reply state
  const [activeTicketId, setActiveTicketId] = useState<string>(sellerTickets[0]?.id || '');
  const [replyText, setReplyText] = useState('');

  // Search & Filter
  const [productSearch, setProductSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'placed' | 'packed' | 'shipped' | 'delivered' | 'cancelled'>('all');
  const [inventorySearch, setInventorySearch] = useState('');

  // Seller-specific products and orders
  const sellerProducts = products.filter(p => p.sellerId === currentSeller.id || !p.sellerId);
  const sellerOrders = orders.filter(o => 
    o.items.some(i => i.product.sellerId === currentSeller.id || (!i.product.sellerId && currentSeller.id === 'seller-1'))
  );
  const myReturns = sellerReturns.filter(r => r.sellerId === currentSeller.id);
  const myPayouts = sellerPayouts.filter(p => p.sellerId === currentSeller.id);
  const myCoupons = sellerCoupons.filter(c => c.sellerId === currentSeller.id);
  const myTickets = sellerTickets.filter(t => t.sellerId === currentSeller.id);

  // Key metrics
  const totalGrossSales = sellerOrders.reduce((sum, o) => sum + o.finalAmount, 0) + currentSeller.totalRevenue;
  const pendingOrders = sellerOrders.filter(o => o.status === 'placed' || o.status === 'packed');
  const lowStockProducts = sellerProducts.filter(p => p.inStock < 5);

  const handleSaveProduct = (data: any) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, data);
      setEditingProduct(null);
    } else {
      addProduct(data);
    }
    setIsAddProductOpen(false);
  };

  const handleCreateCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;

    createSellerCoupon({
      sellerId: currentSeller.id,
      code: newCouponCode.trim().toUpperCase(),
      discountType: 'percentage',
      discountValue: Number(newCouponDiscount),
      maxDiscount: Number(newCouponMaxDisc),
      minOrderValue: Number(newCouponMinOrder),
      validUntil: '31 Dec 2026',
      status: 'active'
    });

    setIsNewCouponOpen(false);
    setNewCouponCode('');
  };

  const handlePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestSellerPayout(currentSeller.id, Number(payoutAmountInput));
    setIsPayoutModalOpen(false);
  };

  const handleTicketReplySubmit = (ticketId: string) => {
    if (!replyText.trim()) return;
    replyToSellerTicket(ticketId, replyText.trim(), 'seller');
    setReplyText('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn">
      {/* Top Banner: Store Status, Switcher & Quick Launch CTAs */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/20 shrink-0">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white font-display">
                {currentSeller.businessName}
              </h1>
              {currentSeller.verified ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>GST Verified Merchant</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Verification in Progress</span>
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono">
              <span>Merchant ID: {currentSeller.id}</span>
              <span>·</span>
              <span>GSTIN: {currentSeller.gstNumber}</span>
              <span>·</span>
              <span>Hub: {currentSeller.location}</span>
            </p>
          </div>
        </div>

        {/* Store Switcher & Fast Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Switch Active Store */}
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <label className="text-[11px] font-semibold text-zinc-500 pl-2">Store:</label>
            <select
              value={currentSellerId}
              onChange={e => {
                if (e.target.value === 'new') {
                  setIsRegisterModalOpen(true);
                } else {
                  setCurrentSellerId(e.target.value);
                  notify(`Switched active seller to ${sellers.find(s => s.id === e.target.value)?.businessName}`);
                }
              }}
              className="text-xs font-semibold bg-transparent text-zinc-900 dark:text-white border-none focus:outline-none pr-2 py-1"
            >
              {sellers.map(s => (
                <option key={s.id} value={s.id} className="dark:bg-zinc-800">
                  {s.businessName} ({s.location.split(',')[0]})
                </option>
              ))}
              <option value="new" className="dark:bg-zinc-800 text-rose-600 font-bold">
                + Register New Seller...
              </option>
            </select>
          </div>

          <button
            onClick={() => {
              setEditingProduct(null);
              setIsAddProductOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>

          <button
            onClick={() => setIsBulkUploadOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>Bulk Excel</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar Menu (Left) + Content Stage (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 12-Item Seller Website Menu (Navigation) */}
        <div className="lg:col-span-3 space-y-1">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-3 border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-20">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 py-2 block">
              PRIME BAZAAR – SELLER PANEL
            </span>

            <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 gap-1.5 lg:gap-0 lg:space-y-0.5 no-scrollbar">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
                { id: 'registration', label: 'Seller Registration', icon: UserCheck, badge: currentSeller.verified ? 'Verified' : 'Pending' },
                { id: 'products', label: 'Products', icon: Package, badge: `${sellerProducts.length}` },
                { id: 'inventory', label: 'Inventory', icon: Boxes, badge: lowStockProducts.length > 0 ? `${lowStockProducts.length} low` : null },
                { id: 'orders', label: 'Orders', icon: ShoppingCart, badge: pendingOrders.length > 0 ? `${pendingOrders.length} new` : null },
                { id: 'shipping', label: 'Shipping & AWB', icon: Truck, badge: null },
                { id: 'returns', label: 'Returns & Refunds', icon: RotateCcw, badge: myReturns.filter(r => r.status === 'pending').length || null },
                { id: 'payments', label: 'Payments & Payouts', icon: Wallet, badge: `₹${(currentSeller.walletBalance / 1000).toFixed(0)}k` },
                { id: 'offers', label: 'Offers & Discounts', icon: Tag, badge: `${myCoupons.length}` },
                { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3, badge: '+18%' },
                { id: 'support', label: 'Customer Support', icon: HelpCircle, badge: myTickets.filter(t => t.status === 'open').length || null },
                { id: 'settings', label: 'Store Settings', icon: Settings, badge: null }
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as SellerTab)}
                    className={`shrink-0 lg:shrink lg:w-full flex items-center justify-between px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white bg-zinc-50 dark:bg-zinc-800/60 lg:bg-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : String(item.badge).includes('low') 
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content Viewport (Right 9 Cols) */}
        <div className="lg:col-span-9 space-y-6">
          {/* ============================================================== */}
          {/* 1. DASHBOARD OVERVIEW */}
          {/* ============================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 mb-2">
                    <span className="text-xs font-semibold uppercase">Total Sales Revenue</span>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
                    ₹{totalGrossSales.toLocaleString('en-IN')}
                  </span>
                  <span className="block text-[11px] text-emerald-600 mt-1 font-semibold">
                    +24.2% MoM growth rate
                  </span>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 mb-2">
                    <span className="text-xs font-semibold uppercase">Total Orders</span>
                    <ShoppingCart className="w-4 h-4 text-indigo-500" />
                  </div>
                  <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
                    {(currentSeller.totalOrders + sellerOrders.length).toLocaleString('en-IN')}
                  </span>
                  <span className="block text-[11px] text-zinc-400 mt-1">
                    99.4% on-time dispatch SLA
                  </span>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 mb-2">
                    <span className="text-xs font-semibold uppercase">Pending Dispatch</span>
                    <Package className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
                    {pendingOrders.length} Shipments
                  </span>
                  <span className="block text-[11px] text-amber-600 font-semibold mt-1">
                    Requires packing & label print
                  </span>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 mb-2">
                    <span className="text-xs font-semibold uppercase">Available Wallet Balance</span>
                    <Wallet className="w-4 h-4 text-rose-500" />
                  </div>
                  <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                    ₹{currentSeller.walletBalance.toLocaleString('en-IN')}
                  </span>
                  <button
                    onClick={() => setIsPayoutModalOpen(true)}
                    className="mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline block"
                  >
                    Withdraw to Bank Account →
                  </button>
                </div>
              </div>

              {/* Urgent Action Banner: Pending Orders */}
              <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                      Today's Orders Requiring Handover
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Pack items, generate AWB shipping labels and hand over to BlueDart courier
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    View All Orders →
                  </button>
                </div>

                {sellerOrders.length > 0 ? (
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                    {sellerOrders.slice(0, 3).map(order => (
                      <div key={order.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-zinc-900 dark:text-white">
                              #{order.id}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800">
                              {order.status}
                            </span>
                            <span className="text-zinc-400">·</span>
                            <span className="text-zinc-600 dark:text-zinc-300 font-mono">
                              ₹{order.finalAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-500 block mt-0.5">
                            Customer: {order.shippingAddress.fullName} · {order.shippingAddress.city}, {order.shippingAddress.state}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedOrderForLabel(order)}
                            className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print Label</span>
                          </button>

                          {order.status === 'placed' && (
                            <button
                              onClick={() => fulfillSellerOrder(order.id, 'pack')}
                              className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold"
                            >
                              Mark Packed
                            </button>
                          )}

                          {order.status === 'packed' && (
                            <button
                              onClick={() => fulfillSellerOrder(order.id, 'dispatch', { courierPartner: 'BlueDart Express' })}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 shadow-sm"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Dispatch Courier</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-xs py-4">No pending orders today. Catalog is ready for buyers!</p>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 2. SELLER REGISTRATION & KYC */}
          {/* ============================================================== */}
          {activeTab === 'registration' && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                    Seller Account & Regulatory Compliance
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Verify documents, GST compliance, and manage store operational status
                  </p>
                </div>
                <button
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Onboard Another Seller Profile</span>
                </button>
              </div>

              {/* Status Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 block text-sm">
                    {currentSeller.verified ? 'Verified Active Seller Studio' : 'Under Review by Admin'}
                  </span>
                  <p className="text-emerald-700 dark:text-emerald-300 mt-0.5">
                    GSTIN {currentSeller.gstNumber} verified with Government GST Portal. Bank settlement channel active.
                  </p>
                </div>
              </div>

              {/* 5-Step Process Summary Card */}
              <div className="space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-zinc-500 block">
                  Onboarding Checklist & Document Status
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white block">1. Contact Verification</span>
                      <span className="text-zinc-500 text-[11px]">Phone: {currentSeller.phone || '+91 98391 20492'} · Brevo OTP Verified</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white block">2. Business Details</span>
                      <span className="text-zinc-500 text-[11px]">{currentSeller.businessName} ({currentSeller.businessType || 'Proprietorship'})</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white block">3. Tax Verification</span>
                      <span className="text-zinc-500 text-[11px]">PAN: {currentSeller.panNumber || 'AAECV1234M'} · GST: {currentSeller.gstNumber}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white block">4. Linked Bank Account</span>
                      <span className="text-zinc-500 text-[11px]">
                        {currentSeller.bankAccount?.bankName || 'HDFC Bank'} ({currentSeller.bankAccount?.accountNumber ? `•••• ${currentSeller.bankAccount.accountNumber.slice(-4)}` : '•••• 9041'})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 3. PRODUCTS & CATALOG */}
          {/* ============================================================== */}
          {activeTab === 'products' && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
              {/* Product Controls Header */}
              <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                    Product Catalog & SKU Database ({sellerProducts.length} Listings)
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Manage prices, variants, GST slabs, and imagery
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search title or SKU..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setIsAddProductOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload Product</span>
                  </button>
                </div>
              </div>

              {/* Catalog Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-4">Product Details</th>
                      <th className="p-4">SKU Code</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Selling Price</th>
                      <th className="p-4">Tax (GST)</th>
                      <th className="p-4">Stock</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {sellerProducts
                      .filter(p => p.title.toLowerCase().includes(productSearch.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase())))
                      .map(prod => (
                        <tr key={prod.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="p-4 flex items-center gap-3">
                            <img
                              src={prod.images[0]}
                              alt={prod.title}
                              referrerPolicy="no-referrer"
                              className="w-12 h-14 object-cover rounded-xl shrink-0 border border-zinc-200 dark:border-zinc-700"
                            />
                            <div>
                              <span className="font-semibold text-zinc-900 dark:text-white block line-clamp-1">
                                {prod.title}
                              </span>
                              <span className="text-[11px] text-zinc-400">Brand: {prod.brand}</span>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-[11px] font-bold text-zinc-600 dark:text-zinc-300">
                            {prod.sku || `SKU-${prod.id.slice(-5)}`}
                          </td>
                          <td className="p-4 uppercase text-[11px] text-zinc-500">{prod.category}</td>
                          <td className="p-4 font-mono font-bold text-zinc-900 dark:text-white">
                            ₹{prod.price.toLocaleString('en-IN')}
                            <span className="text-[10px] text-zinc-400 block line-through">
                              ₹{prod.originalPrice.toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="p-4 font-mono">{prod.gstRate || 12}%</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              prod.inStock <= 3
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}>
                              {prod.inStock} in stock
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingProduct(prod);
                                  setIsAddProductOpen(true);
                                }}
                                className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                title="Edit Product"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteProduct(prod.id)}
                                className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 4. INVENTORY MANAGEMENT */}
          {/* ============================================================== */}
          {activeTab === 'inventory' && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                    Stock & SKU Inventory Control
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Real-time stock adjustments, barcode scanning, and low-inventory warnings
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search SKU..."
                      value={inventorySearch}
                      onChange={e => setInventorySearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Low Stock Warning Alert if any */}
              {lowStockProducts.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold block">
                      Low Inventory Threshold Notice ({lowStockProducts.length} items below 5 units)
                    </span>
                    <span>Replenish stock to avoid automatic catalog de-listing during peak flash sales.</span>
                  </div>
                </div>
              )}

              {/* Inventory Table with inline + / - adjuster */}
              <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-3.5">Product / Title</th>
                      <th className="p-3.5">SKU</th>
                      <th className="p-3.5">Barcode (EAN)</th>
                      <th className="p-3.5">Current Stock</th>
                      <th className="p-3.5 text-right">Quick Stock Adjust</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {sellerProducts
                      .filter(p => !inventorySearch || (p.sku && p.sku.toLowerCase().includes(inventorySearch.toLowerCase())) || p.title.toLowerCase().includes(inventorySearch.toLowerCase()))
                      .map(prod => (
                        <tr key={prod.id}>
                          <td className="p-3.5 font-medium text-zinc-900 dark:text-white max-w-xs truncate">
                            {prod.title}
                          </td>
                          <td className="p-3.5 font-mono text-[11px] font-bold text-zinc-600 dark:text-zinc-300">
                            {prod.sku || `SKU-${prod.id.slice(-5)}`}
                          </td>
                          <td className="p-3.5 font-mono text-zinc-400">
                            {prod.barcode || '8901284910284'}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full font-bold font-mono ${
                              prod.inStock < 5 
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' 
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}>
                              {prod.inStock} units
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                              <button
                                onClick={() => updateProductStock(prod.id, Math.max(0, prod.inStock - 1))}
                                className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white flex items-center justify-center font-bold hover:bg-zinc-200"
                              >
                                -
                              </button>
                              <span className="font-mono font-bold w-8 text-center text-zinc-900 dark:text-white">
                                {prod.inStock}
                              </span>
                              <button
                                onClick={() => updateProductStock(prod.id, prod.inStock + 5)}
                                className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold hover:bg-rose-500"
                                title="+5 units"
                              >
                                +
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 5. ORDERS & FULFILLMENT */}
          {/* ============================================================== */}
          {activeTab === 'orders' && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                    Order Fulfillment Queue ({sellerOrders.length} Orders)
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Accept, pack, generate shipping labels, and track customer shipments
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl overflow-x-auto text-[11px]">
                  {(['all', 'placed', 'packed', 'shipped', 'delivered', 'cancelled'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setOrderFilter(status)}
                      className={`px-3 py-1 rounded-lg font-semibold capitalize whitespace-nowrap transition-colors ${
                        orderFilter === status
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Cards */}
              <div className="space-y-4">
                {sellerOrders
                  .filter(o => orderFilter === 'all' || o.status === orderFilter)
                  .map(order => (
                    <div
                      key={order.id}
                      className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs text-xs space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-zinc-900 dark:text-white">
                            #{order.id}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full uppercase font-bold text-[10px] ${
                            order.status === 'delivered' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : order.status === 'cancelled'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}>
                            {order.status}
                          </span>
                        </div>

                        <div className="font-mono text-zinc-900 dark:text-white font-bold">
                          Invoice Total: ₹{order.finalAmount.toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Items row */}
                      <div className="space-y-2">
                        {order.items.map(item => (
                          <div key={item.id} className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                            <div className="flex items-center gap-2">
                              <img
                                src={item.product.images[0]}
                                alt={item.product.title}
                                referrerPolicy="no-referrer"
                                className="w-8 h-10 object-cover rounded"
                              />
                              <div>
                                <span className="font-semibold block">{item.product.title}</span>
                                <span className="text-[10px] text-zinc-400">
                                  Size: {item.selectedSize} · Color: {item.selectedColor} · Qty: {item.quantity}
                                </span>
                              </div>
                            </div>
                            <span className="font-mono font-bold">
                              ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Address & Actions */}
                      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-zinc-500 text-[11px]">
                          Ship to: <strong className="text-zinc-800 dark:text-zinc-200">{order.shippingAddress.fullName}</strong> ({order.shippingAddress.city}, {order.shippingAddress.pinCode})
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setSelectedOrderForLabel(order)}
                            className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Shipping Label</span>
                          </button>

                          {order.status === 'placed' && (
                            <>
                              <button
                                onClick={() => fulfillSellerOrder(order.id, 'pack')}
                                className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold"
                              >
                                Mark Packed
                              </button>
                              <button
                                onClick={() => fulfillSellerOrder(order.id, 'cancel', { cancelReason: 'Warehouse stock discrepancy' })}
                                className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 font-semibold"
                              >
                                Cancel Order
                              </button>
                            </>
                          )}

                          {order.status === 'packed' && (
                            <button
                              onClick={() => fulfillSellerOrder(order.id, 'dispatch', { courierPartner: 'BlueDart Express' })}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 shadow-sm"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Dispatch Courier (BlueDart)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 6. SHIPPING & LOGISTICS */}
          {/* ============================================================== */}
          {activeTab === 'shipping' && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                  Courier Pickup & AWB Live Tracking
                </h3>
                <p className="text-xs text-zinc-500">
                  Prime Bazaar integrated courier partners (BlueDart, Delhivery, Shiprocket)
                </p>
              </div>

              {/* Integrated Partners */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 dark:text-white">BlueDart Express</span>
                    <span className="text-[10px] font-bold text-emerald-600">Default Partner</span>
                  </div>
                  <p className="text-zinc-500 text-[11px]">Air express surface delivery within 48-72 hours across 19,000 PIN codes.</p>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 dark:text-white">Delhivery Surface</span>
                    <span className="text-[10px] font-bold text-zinc-400">Integrated</span>
                  </div>
                  <p className="text-zinc-500 text-[11px]">Heavy parcel & multi-piece shipment consolidation.</p>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 dark:text-white">Shiprocket Automated</span>
                    <span className="text-[10px] font-bold text-zinc-400">Integrated</span>
                  </div>
                  <p className="text-zinc-500 text-[11px]">Smart AI routing based on cheapest rate and lowest RTO risk.</p>
                </div>
              </div>

              {/* Dispatched Shipments Table */}
              <div className="space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-zinc-500 block">
                  Active Courier Dispatches
                </span>
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/60 font-semibold text-zinc-500">
                      <tr>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Courier Partner</th>
                        <th className="p-3">AWB Tracking Code</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Label</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {sellerOrders.map(order => (
                        <tr key={order.id}>
                          <td className="p-3 font-mono font-bold text-zinc-900 dark:text-white">#{order.id}</td>
                          <td className="p-3">{order.courierPartner || 'BlueDart Express'}</td>
                          <td className="p-3 font-mono text-[11px] text-zinc-500">
                            {order.trackingNumber || `AWB-BD-89240182`}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800">
                              {order.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedOrderForLabel(order)}
                              className="px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold"
                            >
                              Reprint
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 7. RETURNS & REFUNDS */}
          {/* ============================================================== */}
          {activeTab === 'returns' && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                  Returns & Replacement Requests ({myReturns.length})
                </h3>
                <p className="text-xs text-zinc-500">
                  Process 7-day customer return and replacement requests autonomously
                </p>
              </div>

              {myReturns.length > 0 ? (
                <div className="space-y-4">
                  {myReturns.map(ret => (
                    <div
                      key={ret.id}
                      className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-xs space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-zinc-900 dark:text-white">
                            Return #{ret.id}
                          </span>
                          <span className="text-zinc-400">·</span>
                          <span className="text-zinc-500">Order #{ret.orderId}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          ret.status === 'refund_issued'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ret.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ret.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <img
                          src={ret.productImage}
                          alt={ret.productTitle}
                          className="w-12 h-14 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700"
                        />
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-white block">{ret.productTitle}</span>
                          <span className="text-zinc-500 block mt-0.5">Customer: {ret.customerName} ({ret.customerPhone})</span>
                          <span className="text-zinc-700 dark:text-zinc-300 font-medium block mt-1">
                            Reason: "{ret.reason}"
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="font-mono font-bold text-zinc-900 dark:text-white">
                          Refund Value: ₹{ret.refundAmount.toLocaleString('en-IN')}
                        </div>

                        {ret.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSellerReturn(ret.id, 'replacement_dispatched', 'Replacement shipped via BlueDart')}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold"
                            >
                              Dispatch Replacement
                            </button>
                            <button
                              onClick={() => handleSellerReturn(ret.id, 'refund_issued', 'Doorstep pickup verified. Full refund initiated.')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold"
                            >
                              Approve & Issue Refund
                            </button>
                            <button
                              onClick={() => handleSellerReturn(ret.id, 'rejected', 'Return window expired or tags removed')}
                              className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 font-semibold"
                            >
                              Reject Request
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 text-xs py-4">No active return requests. Your return rate is a stellar 1.2%!</p>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* 8. PAYMENTS & SETTLEMENTS */}
          {/* ============================================================== */}
          {activeTab === 'payments' && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                    Earnings, Commission & Bank Settlements
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Transparent 12% marketplace commission with automated T+2 NEFT deposits
                  </p>
                </div>
                <button
                  onClick={() => setIsPayoutModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/20"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Request Bank Payout</span>
                </button>
              </div>

              {/* Settlement Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase">Available for Withdrawal</span>
                  <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-white block">
                    ₹{currentSeller.walletBalance.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Immediate NEFT transfer ready</span>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase">Pending Settlement</span>
                  <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-white block">
                    ₹{(currentSeller.pendingSettlement || 18450).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-zinc-400">Orders in transit (releases on delivery)</span>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase">Linked Bank Account</span>
                  <span className="text-sm font-bold font-mono text-zinc-900 dark:text-white block">
                    {currentSeller.bankAccount?.bankName || 'HDFC Bank'}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    A/C {currentSeller.bankAccount?.accountNumber ? `•••• ${currentSeller.bankAccount.accountNumber.slice(-4)}` : '•••• 9041'}
                  </span>
                </div>
              </div>

              {/* Commission Breakdown Explainer */}
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-2">
                <span className="font-bold text-indigo-900 dark:text-indigo-200 block">
                  Marketplace Settlement Formula
                </span>
                <p className="text-indigo-700 dark:text-indigo-300 text-[11px]">
                  Net Seller Payout = Gross Order Value – Marketplace Commission (12%) – 18% GST on Commission. No hidden listing fees or closing charges.
                </p>
              </div>

              {/* Payout History Ledger */}
              <div className="space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-zinc-500 block">
                  Settlement Transaction Ledger
                </span>
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/60 font-semibold text-zinc-500">
                      <tr>
                        <th className="p-3">Ref ID</th>
                        <th className="p-3">Requested At</th>
                        <th className="p-3">Gross Sales</th>
                        <th className="p-3">Commission (12%)</th>
                        <th className="p-3 font-mono">Net Paid to Bank</th>
                        <th className="p-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-medium">
                      {myPayouts.map(p => (
                        <tr key={p.id}>
                          <td className="p-3 font-mono text-zinc-900 dark:text-white font-bold">{p.id}</td>
                          <td className="p-3 text-zinc-500">{p.requestedAt}</td>
                          <td className="p-3 font-mono">₹{p.grossSales.toLocaleString('en-IN')}</td>
                          <td className="p-3 font-mono text-zinc-400">-₹{p.commissionDeducted.toLocaleString('en-IN')}</td>
                          <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{p.netPayout.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              p.status === 'processed' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 9. OFFERS & DISCOUNTS */}
          {/* ============================================================== */}
          {activeTab === 'offers' && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                    Seller Promotional Coupons & Campaigns
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Create discount vouchers to boost conversions during festive events
                  </p>
                </div>
                <button
                  onClick={() => setIsNewCouponOpen(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Store Coupon</span>
                </button>
              </div>

              {/* Coupons List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myCoupons.map(coupon => (
                  <div
                    key={coupon.id}
                    className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-zinc-900 dark:text-white px-2.5 py-1 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-300 dark:border-zinc-700">
                        {coupon.code}
                      </span>
                      <button
                        onClick={() => toggleSellerCoupon(coupon.id)}
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          coupon.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-zinc-200 text-zinc-700'
                        }`}
                      >
                        {coupon.status} (Click to toggle)
                      </button>
                    </div>

                    <div className="space-y-1 text-zinc-600 dark:text-zinc-300">
                      <p className="font-bold text-zinc-900 dark:text-white text-sm">
                        {coupon.discountValue}% Instant Store Discount
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Min. Order: ₹{coupon.minOrderValue} · Max Cap: ₹{coupon.maxDiscount || 'Unlimited'}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Valid Until: {coupon.validUntil} · Used by {coupon.usageCount} shoppers
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 10. ANALYTICS & REPORTS */}
          {/* ============================================================== */}
          {activeTab === 'analytics' && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                  Store Sales Intelligence & Performance
                </h3>
                <p className="text-xs text-zinc-500">
                  Data updated in real time from Prime Bazaar checkout events
                </p>
              </div>

              {/* Conversion KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 block mb-1">Conversion Rate</span>
                  <span className="text-xl font-bold font-mono text-zinc-900 dark:text-white">3.82%</span>
                  <span className="text-emerald-600 text-[10px] block mt-1">+0.4% vs platform avg</span>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 block mb-1">Average Order Value</span>
                  <span className="text-xl font-bold font-mono text-zinc-900 dark:text-white">₹1,740</span>
                  <span className="text-emerald-600 text-[10px] block mt-1">+12% basket size</span>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 block mb-1">Store Return Rate</span>
                  <span className="text-xl font-bold font-mono text-zinc-900 dark:text-white">2.1%</span>
                  <span className="text-emerald-600 text-[10px] block mt-1">Excellent quality rating</span>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 block mb-1">Customer Rating</span>
                  <span className="text-xl font-bold font-mono text-amber-500">4.9 ★</span>
                  <span className="text-zinc-400 text-[10px] block mt-1">From 1,420 reviews</span>
                </div>
              </div>

              {/* Best Selling SKUs */}
              <div className="space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-zinc-500 block">
                  Top Performing SKUs by Revenue
                </span>
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/60 font-semibold text-zinc-500">
                      <tr>
                        <th className="p-3">Rank</th>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 font-mono">Units Sold</th>
                        <th className="p-3 font-mono text-right">Gross GMV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {sellerProducts.slice(0, 5).map((p, idx) => (
                        <tr key={p.id}>
                          <td className="p-3 font-bold text-rose-600 font-mono">0{idx + 1}</td>
                          <td className="p-3 font-medium text-zinc-900 dark:text-white">{p.title}</td>
                          <td className="p-3 uppercase text-[10px] text-zinc-500">{p.category}</td>
                          <td className="p-3 font-mono">{180 - idx * 25} units</td>
                          <td className="p-3 font-mono font-bold text-right text-zinc-900 dark:text-white">
                            ₹{((180 - idx * 25) * p.price).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 11. CUSTOMER SUPPORT & TICKETS */}
          {/* ============================================================== */}
          {activeTab === 'support' && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                  Customer Inquiries & Dispute Tickets ({myTickets.length})
                </h3>
                <p className="text-xs text-zinc-500">
                  Respond directly to shoppers regarding size inquiries, wash care, and delivery status
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Tickets List (Left 5 cols) */}
                <div className="lg:col-span-5 space-y-2">
                  {myTickets.map(ticket => (
                    <button
                      key={ticket.id}
                      onClick={() => setActiveTicketId(ticket.id)}
                      className={`w-full p-4 rounded-2xl text-left border transition-all text-xs space-y-1.5 ${
                        activeTicketId === ticket.id
                          ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/40 shadow-xs'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-900 dark:text-white">{ticket.customerName}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ticket.status === 'resolved' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                      <p className="font-semibold text-zinc-700 dark:text-zinc-300 line-clamp-1">{ticket.subject}</p>
                      <span className="text-[10px] text-zinc-400 block font-mono">
                        #{ticket.id} · Order #{ticket.orderId || 'N/A'}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Active Ticket Conversation (Right 7 cols) */}
                <div className="lg:col-span-7 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between text-xs min-h-[360px]">
                  {(() => {
                    const ticket = myTickets.find(t => t.id === activeTicketId) || myTickets[0];
                    if (!ticket) return <p className="text-zinc-400">No ticket selected.</p>;

                    return (
                      <>
                        <div className="space-y-3">
                          <div className="border-b border-zinc-200 dark:border-zinc-700 pb-2">
                            <span className="font-bold text-zinc-900 dark:text-white text-sm block">
                              {ticket.subject}
                            </span>
                            <span className="text-zinc-500 text-[11px]">
                              Customer: {ticket.customerName} · Category: {ticket.category}
                            </span>
                          </div>

                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {ticket.messages.map(msg => (
                              <div
                                key={msg.id}
                                className={`p-3 rounded-xl max-w-sm ${
                                  msg.sender === 'seller'
                                    ? 'ml-auto bg-rose-600 text-white'
                                    : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700'
                                }`}
                              >
                                <span className="text-[10px] opacity-80 block font-semibold mb-0.5">
                                  {msg.senderName} ({msg.timestamp})
                                </span>
                                <p className="text-xs leading-relaxed">{msg.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Reply Form */}
                        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700 mt-4 flex gap-2">
                          <input
                            type="text"
                            placeholder="Type official merchant response..."
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleTicketReplySubmit(ticket.id);
                            }}
                            className="flex-1 p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleTicketReplySubmit(ticket.id)}
                            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1 shadow-sm shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Reply</span>
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 12. STORE SETTINGS */}
          {/* ============================================================== */}
          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                  Store Profile, Logistics & Credentials
                </h3>
                <p className="text-xs text-zinc-500">
                  Update public brand storefront information and pickup warehouse coordinates
                </p>
              </div>

              <div className="space-y-4 max-w-2xl text-xs">
                <div>
                  <label className="block font-semibold mb-1">Display Store Brand Name</label>
                  <input
                    type="text"
                    defaultValue={currentSeller.businessName}
                    onBlur={e => updateSeller(currentSeller.id, { businessName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Contact Phone</label>
                    <input
                      type="text"
                      defaultValue={currentSeller.phone || '+91 98391 20492'}
                      onBlur={e => updateSeller(currentSeller.id, { phone: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Store Email</label>
                    <input
                      type="email"
                      defaultValue={currentSeller.email || 'seller@weaverscraft.in'}
                      onBlur={e => updateSeller(currentSeller.id, { email: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Pickup Warehouse Address</label>
                  <input
                    type="text"
                    defaultValue={currentSeller.pickupAddress?.street || 'K-24, Silk Weavers Complex, Chowk Bazaar'}
                    onBlur={e => updateSeller(currentSeller.id, { 
                      pickupAddress: { ...(currentSeller.pickupAddress || {}), street: e.target.value } as any 
                    })}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => notify('Store profile and warehouse configuration updated!')}
                    className="px-6 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold shadow-sm hover:opacity-90"
                  >
                    Save Store Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODALS */}
      {/* ============================================================== */}

      {/* Shipping Label Modal */}
      {selectedOrderForLabel && (
        <ShippingLabelModal
          order={selectedOrderForLabel}
          seller={currentSeller}
          onClose={() => setSelectedOrderForLabel(null)}
        />
      )}

      {/* Product Upload / Edit Modal (14 Fields) */}
      {isAddProductOpen && (
        <ProductUploadModal
          sellerId={currentSeller.id}
          sellerName={currentSeller.businessName}
          existingProduct={editingProduct}
          onClose={() => {
            setIsAddProductOpen(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
        />
      )}

      {/* Bulk Excel Upload Modal */}
      {isBulkUploadOpen && (
        <BulkUploadModal
          sellerId={currentSeller.id}
          onClose={() => setIsBulkUploadOpen(false)}
        />
      )}

      {/* Seller Registration 5-Step Wizard Modal */}
      {isRegisterModalOpen && (
        <SellerRegistrationModal
          onClose={() => setIsRegisterModalOpen(false)}
          onSuccess={newId => {
            setCurrentSellerId(newId);
            setActiveTab('dashboard');
          }}
        />
      )}

      {/* Payout Withdrawal Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handlePayoutSubmit}
            className="bg-white dark:bg-zinc-900 p-6 rounded-3xl max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 text-xs space-y-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                Request Immediate Bank Payout
              </h3>
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Available Balance:</span>
                <span className="font-bold font-mono text-zinc-900 dark:text-white">
                  ₹{currentSeller.walletBalance.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Target Bank Account:</span>
                <span className="font-mono">{currentSeller.bankAccount?.bankName || 'HDFC Bank'} (•••• 9041)</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Enter Withdrawal Amount (₹)</label>
              <input
                type="number"
                required
                min={100}
                max={currentSeller.walletBalance}
                value={payoutAmountInput}
                onChange={e => setPayoutAmountInput(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-lg font-mono font-bold text-zinc-900 dark:text-white"
              />
            </div>

            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1">
              <div className="flex justify-between">
                <span>Commission (12%):</span>
                <span className="font-mono">-₹{Math.round(payoutAmountInput * 0.12).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>GST on Commission (18%):</span>
                <span className="font-mono">-₹{Math.round(payoutAmountInput * 0.12 * 0.18).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-indigo-200 dark:border-indigo-800 pt-1 text-xs">
                <span>Net Deposited via NEFT:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  ₹{Math.max(0, Math.round(payoutAmountInput * 0.8584)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="px-4 py-2 font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-md shadow-rose-600/20"
              >
                Confirm Payout Transfer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Coupon Modal */}
      {isNewCouponOpen && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCouponSubmit}
            className="bg-white dark:bg-zinc-900 p-6 rounded-3xl max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 text-xs space-y-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                Create Promotional Store Voucher
              </h3>
              <button
                type="button"
                onClick={() => setIsNewCouponOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block font-semibold mb-1">Coupon Promo Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. FESTIVE20"
                value={newCouponCode}
                onChange={e => setNewCouponCode(e.target.value.toUpperCase())}
                className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 uppercase font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Discount (% Off)</label>
                <input
                  type="number"
                  min={5}
                  max={70}
                  value={newCouponDiscount}
                  onChange={e => setNewCouponDiscount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Max Discount Cap (₹)</label>
                <input
                  type="number"
                  min={50}
                  value={newCouponMaxDisc}
                  onChange={e => setNewCouponMaxDisc(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Minimum Order Value (₹)</label>
              <input
                type="number"
                min={100}
                value={newCouponMinOrder}
                onChange={e => setNewCouponMinOrder(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewCouponOpen(false)}
                className="px-4 py-2 font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold"
              >
                Publish Coupon
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
