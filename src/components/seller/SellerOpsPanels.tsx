import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Product, Seller } from '../../types';
import {
  Warehouse,
  ArrowLeftRight,
  Megaphone,
  Bell,
  Users,
  FileCheck2,
  Plus,
  Pause,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface SellerOpsCommonProps {
  seller: Seller;
  sellerProducts: Product[];
  notify: (msg: string) => void;
}

export const SellerWarehouseOpsPanel: React.FC<SellerOpsCommonProps> = ({
  seller,
  sellerProducts,
  notify,
}) => {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [inventoryRows, setInventoryRows] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whCity, setWhCity] = useState('');
  const [whState, setWhState] = useState('Maharashtra');
  const [whPin, setWhPin] = useState('400001');

  const [trFrom, setTrFrom] = useState('');
  const [trTo, setTrTo] = useState('');
  const [trVariant, setTrVariant] = useState('');
  const [trQty, setTrQty] = useState(5);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [wRes, invRes, trRes] = await Promise.all([
        api.warehouses.list(seller.id),
        api.warehouses.getInventory({ sellerId: seller.id }),
        api.warehouses.listTransfers(),
      ]);
      const wList = wRes.warehouses || [];
      setWarehouses(wList);
      setInventoryRows(invRes.inventory || []);
      setTransfers(trRes.transfers || []);
      if (wList.length >= 2 && !trFrom) {
        setTrFrom(wList[0].id);
        setTrTo(wList[1].id);
      }
      if ((invRes.inventory || []).length > 0 && !trVariant) {
        setTrVariant(invRes.inventory[0].variantId);
      }
    } catch (err: any) {
      setError(err.message || 'Sign in as a Seller or Admin to manage multi-warehouse inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [seller.id]);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.warehouses.create({
        sellerId: seller.id,
        name: whName,
        code: whCode || `WH-${Date.now().toString().slice(-4)}`,
        city: whCity || 'Mumbai',
        state: whState,
        pinCode: whPin,
        addressLine1: `${whCity || 'Industrial'} Hub`,
      });
      setWhName('');
      setWhCode('');
      setWhCity('');
      notify('Warehouse created successfully.');
      await loadData();
    } catch (err: any) {
      notify(err.message || 'Failed to create warehouse.');
    }
  };

  const handleAdjustStock = async (row: any, delta: number) => {
    try {
      await api.warehouses.updateInventory(row.warehouseId, {
        productId: row.productId,
        variantId: row.variantId,
        sku: row.sku,
        quantityDelta: delta,
        notes: 'Seller dashboard quick adjustment',
      });
      notify(`Updated stock for ${row.sku}`);
      await loadData();
    } catch (err: any) {
      notify(err.message || 'Unable to update warehouse stock.');
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.warehouses.createTransfer({
        fromWarehouseId: trFrom,
        toWarehouseId: trTo,
        variantId: trVariant,
        quantity: Number(trQty),
        notes: 'Seller stock rebalancing transfer',
      });
      notify('Inter-warehouse stock transfer created.');
      await loadData();
    } catch (err: any) {
      notify(err.message || 'Failed to create transfer.');
    }
  };

  const handleCompleteTransfer = async (id: string) => {
    try {
      await api.warehouses.completeTransfer(id);
      notify('Warehouse transfer completed.');
      await loadData();
    } catch (err: any) {
      notify(err.message || 'Failed to complete transfer.');
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Warehouse className="w-5 h-5 text-rose-600" />
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
              Multi-Warehouse Nodes & Stock Transfers
            </h3>
            <p className="text-xs text-zinc-500">
              Allocate regional stock by state and execute inter-warehouse transfers
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 whitespace-nowrap"
        >
          Refresh Warehouses
        </button>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="py-8 text-center text-xs text-zinc-500">Loading warehouse allocation ledger...</div>
      ) : (
        <div className="space-y-6">
          {/* Active Warehouses */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {warehouses.map(wh => (
              <div
                key={wh.id}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 dark:text-white">{wh.name}</span>
                  <span className="font-mono text-[11px] text-zinc-500">{wh.code}</span>
                </div>
                <p className="text-zinc-500">
                  {wh.city}, {wh.state} · PIN {wh.pinCode}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  {wh.isActive ? 'Operational Node' : 'Inactive'}
                </p>
              </div>
            ))}
          </div>

          {/* Add Warehouse Form */}
          <form onSubmit={handleCreateWarehouse} className="grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs">
            <input
              type="text"
              required
              placeholder="Warehouse Name"
              value={whName}
              onChange={e => setWhName(e.target.value)}
              className="sm:col-span-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
            />
            <input
              type="text"
              placeholder="Code (e.g. WH-DEL)"
              value={whCode}
              onChange={e => setWhCode(e.target.value.toUpperCase())}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
            />
            <input
              type="text"
              required
              placeholder="City"
              value={whCity}
              onChange={e => setWhCity(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
            />
            <input
              type="text"
              required
              placeholder="State"
              value={whState}
              onChange={e => setWhState(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold flex items-center justify-center gap-1 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Node</span>
            </button>
          </form>

          {/* Warehouse Stock Table */}
          {inventoryRows.length > 0 && (
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Warehouse</th>
                    <th className="p-3 text-right">On Hand</th>
                    <th className="p-3 text-right">Reserved</th>
                    <th className="p-3 text-right">Available</th>
                    <th className="p-3 text-right">Adjust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono tabular-nums">
                  {inventoryRows.slice(0, 12).map(row => (
                    <tr key={row.id}>
                      <td className="p-3 font-semibold text-zinc-900 dark:text-white">{row.sku}</td>
                      <td className="p-3 font-sans text-zinc-600 dark:text-zinc-300">
                        {warehouses.find(w => w.id === row.warehouseId)?.name || row.warehouseId}
                      </td>
                      <td className="p-3 text-right">{row.stockOnHand}</td>
                      <td className="p-3 text-right text-amber-600">{row.stockReserved}</td>
                      <td className="p-3 text-right font-bold">{row.available}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(row, 5)}
                          className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-sans font-semibold"
                        >
                          +5
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Inter-warehouse Transfers */}
          {warehouses.length >= 2 && (
            <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                <ArrowLeftRight className="w-4 h-4 text-rose-600" />
                <span>Inter-Warehouse Stock Transfer</span>
              </div>
              <form onSubmit={handleCreateTransfer} className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                <select
                  value={trFrom}
                  onChange={e => setTrFrom(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>From: {w.name}</option>
                  ))}
                </select>
                <select
                  value={trTo}
                  onChange={e => setTrTo(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>To: {w.name}</option>
                  ))}
                </select>
                <select
                  value={trVariant}
                  onChange={e => setTrVariant(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  {inventoryRows.map(r => (
                    <option key={r.id} value={r.variantId}>
                      {r.sku} ({r.available} avail)
                    </option>
                  ))}
                  {inventoryRows.length === 0 &&
                    sellerProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.sku || p.title}</option>
                    ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={trQty}
                  onChange={e => setTrQty(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono tabular-nums"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold whitespace-nowrap"
                >
                  Initiate Transfer
                </button>
              </form>

              {transfers.length > 0 && (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  {transfers.slice(0, 6).map(t => (
                    <div key={t.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-zinc-900 dark:text-white">{t.id}</span>
                        <span className="text-zinc-500 ml-2">
                          Qty {t.quantity} · Variant {t.variantId} · Status: {t.status}
                        </span>
                      </div>
                      {t.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => handleCompleteTransfer(t.id)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold whitespace-nowrap"
                        >
                          Mark Received
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const SellerSponsoredAdsPanel: React.FC<SellerOpsCommonProps> = ({
  seller,
  sellerProducts,
  notify,
}) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [campaignName, setCampaignName] = useState('');
  const [productId, setProductId] = useState(sellerProducts[0]?.id || '');
  const [budget, setBudget] = useState(1500);
  const [cpcBid, setCpcBid] = useState(12);

  const loadCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.sellerOps.getAdCampaigns(seller.id);
      setCampaigns(res.campaigns || []);
    } catch (err: any) {
      setError(err.message || 'Sign in as Seller to manage Sponsored Ad Campaigns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [seller.id]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.sellerOps.createAdCampaign({
        sellerId: seller.id,
        campaignName: campaignName || `${seller.businessName} Boost`,
        productId: productId || sellerProducts[0]?.id,
        placement: 'SEARCH_TOP',
        budget: Number(budget),
        cpcBid: Number(cpcBid),
      });
      setCampaignName('');
      notify('Sponsored campaign submitted for admin review.');
      await loadCampaigns();
    } catch (err: any) {
      notify(err.message || 'Unable to create sponsored campaign.');
    }
  };

  const handlePause = async (id: string) => {
    try {
      await api.sellerOps.pauseAdCampaign(id);
      notify('Campaign paused.');
      await loadCampaigns();
    } catch (err: any) {
      notify(err.message || 'Unable to pause campaign.');
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Megaphone className="w-5 h-5 text-rose-600" />
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
              Sponsored Product Advertising
            </h3>
            <p className="text-xs text-zinc-500">
              Launch CPC campaigns shown exclusively in labeled Sponsored Highlights slots
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
          {error}
        </div>
      ) : (
        <>
          <form onSubmit={handleCreateCampaign} className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs">
            <input
              type="text"
              required
              placeholder="Campaign Title"
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
            />
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
            >
              {sellerProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={200}
              placeholder="Budget (₹)"
              value={budget}
              onChange={e => setBudget(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono tabular-nums"
            />
            <input
              type="number"
              min={5}
              placeholder="CPC Bid (₹)"
              value={cpcBid}
              onChange={e => setCpcBid(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono tabular-nums"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold whitespace-nowrap"
            >
              Launch Campaign
            </button>
          </form>

          {loading ? (
            <div className="py-6 text-center text-xs text-zinc-500">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4">No sponsored ad campaigns created yet.</p>
          ) : (
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">Campaign</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Budget / Spent</th>
                    <th className="p-3 text-right">Impressions</th>
                    <th className="p-3 text-right">Clicks</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 tabular-nums">
                  {campaigns.map(c => (
                    <tr key={c.id}>
                      <td className="p-3 font-semibold text-zinc-900 dark:text-white">{c.campaignName}</td>
                      <td className="p-3 font-medium">{c.status}</td>
                      <td className="p-3 text-right font-mono">
                        ₹{Number(c.spent || 0).toLocaleString('en-IN')} / ₹{Number(c.budget).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right font-mono">{c.impressions || 0}</td>
                      <td className="p-3 text-right font-mono">{c.clicks || 0}</td>
                      <td className="p-3 text-right">
                        {c.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => handlePause(c.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold"
                          >
                            <Pause className="w-3 h-3" />
                            <span>Pause</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const SellerGovernancePanel: React.FC<{ seller: Seller; notify: (msg: string) => void }> = ({
  seller,
  notify,
}) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState('CATALOG_MANAGER');
  const [resubmitNotes, setResubmitNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadGovernance = async () => {
    setError(null);
    try {
      const [nRes, sRes] = await Promise.all([
        api.sellerOps.getNotifications(seller.id),
        api.sellerOps.getStaff(seller.id),
      ]);
      setNotifications(nRes.notifications || []);
      setStaff(sRes.staff || []);
    } catch (err: any) {
      setError(err.message || 'Sign in with Seller credentials to view notifications & staff.');
    }
  };

  useEffect(() => {
    loadGovernance();
  }, [seller.id]);

  const handleAcceptTerms = async () => {
    try {
      await api.sellerOps.acceptTerms(seller.id, 'v2026.2');
      notify('Seller Marketplace Agreement v2026.2 accepted.');
      await loadGovernance();
    } catch (err: any) {
      notify(err.message || 'Failed to accept terms.');
    }
  };

  const handleResubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.sellerOps.resubmitOnboarding({
        sellerId: seller.id,
        notes: resubmitNotes || 'Updated KYC verification documents',
      });
      setResubmitNotes('');
      notify('KYC dossier resubmitted for admin review.');
      await loadGovernance();
    } catch (err: any) {
      notify(err.message || 'Unable to resubmit KYC dossier.');
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.sellerOps.addStaff({
        sellerId: seller.id,
        name: staffName,
        email: staffEmail,
        staffRole,
      });
      setStaffName('');
      setStaffEmail('');
      notify('Seller staff member added.');
      await loadGovernance();
    } catch (err: any) {
      notify(err.message || 'Failed to add staff member.');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Terms & KYC Resubmission */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-rose-600" />
              <span>Agreement & KYC Resubmission</span>
            </span>
            <button
              type="button"
              onClick={handleAcceptTerms}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold whitespace-nowrap"
            >
              Accept Terms v2026.2
            </button>
          </div>
          <form onSubmit={handleResubmitKyc} className="space-y-2">
            <input
              type="text"
              placeholder="Resubmission notes / updated document reference..."
              value={resubmitNotes}
              onChange={e => setResubmitNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold whitespace-nowrap"
            >
              Resubmit KYC for Approval
            </button>
          </form>
        </div>

        {/* Notifications */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 text-xs">
          <span className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-rose-600" />
            <span>Seller Notifications ({notifications.filter(n => !n.isRead).length} unread)</span>
          </span>
          {notifications.length === 0 ? (
            <p className="text-zinc-500">No operational notifications.</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white">{n.title || n.message}</p>
                    {n.title && <p className="text-zinc-500 text-[11px]">{n.message}</p>}
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() =>
                        api.sellerOps
                          .markNotificationRead(n.id)
                          .then(loadGovernance)
                          .catch(() => undefined)
                      }
                      className="text-rose-600 font-semibold shrink-0"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Role-based Staff Directory */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4 text-xs">
        <span className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-rose-600" />
          <span>Seller Team & Staff Access ({staff.length})</span>
        </span>
        <form onSubmit={handleAddStaff} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            type="text"
            required
            placeholder="Staff Name"
            value={staffName}
            onChange={e => setStaffName(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
          />
          <input
            type="email"
            required
            placeholder="staff@store.in"
            value={staffEmail}
            onChange={e => setStaffEmail(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
          />
          <select
            value={staffRole}
            onChange={e => setStaffRole(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
          >
            <option value="MANAGER">Store Manager</option>
            <option value="CATALOG_MANAGER">Catalog Manager</option>
            <option value="FULFILLMENT_OPS">Fulfillment Operator</option>
            <option value="FINANCE_VIEWER">Finance Viewer</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold whitespace-nowrap"
          >
            Add Staff Member
          </button>
        </form>
        {staff.length > 0 && (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {staff.map(m => (
              <div key={m.id} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-zinc-900 dark:text-white">{m.name}</span>
                  <span className="text-zinc-500 ml-2">{m.email}</span>
                </div>
                <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                  {m.staffRole} · <CheckCircle2 className="w-3 h-3 inline text-emerald-600" /> Active
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const SellerCatalogOffersPanel: React.FC<{
  seller: Seller;
  allProducts: Product[];
  notify: (msg: string) => void;
}> = ({ seller, allProducts, notify }) => {
  const [offers, setOffers] = useState<any[]>([]);
  const [productId, setProductId] = useState(allProducts[0]?.id || 'prod-1');
  const [sellerSku, setSellerSku] = useState(`OFF-${seller.id.slice(-3)}-${Date.now().toString().slice(-4)}`);
  const [condition, setCondition] = useState<'NEW' | 'REFURBISHED' | 'OPEN_BOX'>('NEW');
  const [price, setPrice] = useState(1499);
  const [mrp, setMrp] = useState(2499);
  const [stock, setStock] = useState(20);
  const [deliveryDays, setDeliveryDays] = useState(3);
  const [saving, setSaving] = useState(false);

  const loadOffers = async () => {
    try {
      const res = await api.offers.listSellerOffers(seller.id);
      setOffers(res.offers || []);
    } catch {
      setOffers([]);
    }
  };

  useEffect(() => {
    loadOffers();
  }, [seller.id]);

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.offers.saveSellerOffer({
        productId,
        sellerId: seller.id,
        sellerSku: sellerSku.trim() || `SKU-${Date.now()}`,
        condition,
        price: Number(price),
        mrp: Number(mrp),
        stock: Number(stock),
        deliveryDays: Number(deliveryDays),
      });
      notify('Seller catalogue offer saved and Buy Box score updated.');
      await loadOffers();
    } catch (err: any) {
      notify(err.message || 'Unable to save offer.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateOffer = async (offerId: string) => {
    try {
      await api.offers.deleteSellerOffer(offerId);
      notify('Seller offer deactivated.');
      await loadOffers();
    } catch (err: any) {
      notify(err.message || 'Unable to deactivate offer.');
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-5">
      <div>
        <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
          Multi-Seller Catalogue Offers & Buy Box
        </h3>
        <p className="text-xs text-zinc-500">
          Attach your SKU, price, condition, and stock to shared marketplace products.
        </p>
      </div>

      <form onSubmit={handleSaveOffer} className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 text-xs">
        <select
          value={productId}
          onChange={e => setProductId(e.target.value)}
          className="sm:col-span-2 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
        >
          {allProducts.slice(0, 20).map(p => (
            <option key={p.id} value={p.id}>
              {p.title.slice(0, 40)} (Base ₹{p.price})
            </option>
          ))}
        </select>
        <input
          type="text"
          value={sellerSku}
          onChange={e => setSellerSku(e.target.value)}
          placeholder="Your Offer SKU"
          className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
        />
        <select
          value={condition}
          onChange={e => setCondition(e.target.value as any)}
          className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
        >
          <option value="NEW">New</option>
          <option value="OPEN_BOX">Open Box</option>
          <option value="REFURBISHED">Refurbished</option>
        </select>
        <input
          type="number"
          min={1}
          value={price}
          onChange={e => {
            const p = Number(e.target.value);
            setPrice(p);
            if (mrp < p) setMrp(p);
          }}
          placeholder="Offer Price ₹"
          className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
        />
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold whitespace-nowrap disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'List Offer'}
        </button>
      </form>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
        {offers.map(o => (
          <div key={o.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Product: {o.productId}</span>
                <span className="font-mono text-[11px] text-zinc-500">SKU {o.sellerSku}</span>
                {o.isDefault && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Buy Box Winner
                  </span>
                )}
              </div>
              <div className="text-[11px] text-zinc-500 tabular-nums">
                ₹{o.price} (MRP ₹{o.mrp}) · {o.condition} · Stock: {o.stock} · {o.deliveryDays}d delivery · {o.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
            {o.isActive && (
              <button
                type="button"
                onClick={() => handleDeactivateOffer(o.id)}
                className="px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-rose-600 text-[11px] font-semibold"
              >
                Deactivate
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const SellerB2BAndDigitalPanel: React.FC<{
  seller: Seller;
  allProducts: Product[];
  notify: (msg: string) => void;
}> = ({ seller, allProducts, notify }) => {
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [quoteInputs, setQuoteInputs] = useState<Record<string, number>>({});
  const [assetProductId, setAssetProductId] = useState(allProducts[0]?.id || 'prod-1');
  const [assetFileName, setAssetFileName] = useState('Care-And-Sizing-Guide.txt');
  const [assetContent, setAssetContent] = useState('Prime Bazaar Official Care Guide & Fabric Authenticity Certificate.');

  const loadRfqs = () => {
    api.phase6G
      .getRfqs()
      .then(res => setRfqs(res.rfqs || []))
      .catch(() => setRfqs([]));
  };

  useEffect(() => {
    loadRfqs();
  }, [seller.id]);

  const handleQuoteRfq = async (rfqId: string, status: 'QUOTED' | 'REJECTED') => {
    try {
      const unitPrice = quoteInputs[rfqId] || 1199;
      await api.phase6G.quoteRfq(rfqId, { quotedUnitPrice: unitPrice, status });
      notify(`RFQ ${status.toLowerCase()} successfully.`);
      loadRfqs();
    } catch (err: any) {
      notify(err?.message || 'Unable to update RFQ.');
    }
  };

  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.phase6G.registerDigitalAsset({
        productId: assetProductId,
        fileName: assetFileName,
        mimeType: 'text/plain',
        content: assetContent,
        maxDownloads: 3,
        expiryHours: 72,
      });
      notify('Digital companion asset attached to product!');
    } catch (err: any) {
      notify(err?.message || 'Unable to register digital asset.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4 text-xs">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
            B2B Wholesale Quote Requests (RFQs)
          </h3>
          <p className="text-zinc-500">Quote unit pricing or decline incoming B2B buyer bulk inquiries.</p>
        </div>

        {rfqs.length === 0 ? (
          <p className="text-zinc-500 py-4">No B2B quote requests assigned to this store yet.</p>
        ) : (
          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {rfqs.map(rfq => (
              <div key={rfq.id} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {rfq.productId} · Qty {rfq.requestedQty}
                  </span>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                    {rfq.status}
                  </span>
                </div>
                {rfq.notes && <p className="text-[11px] text-zinc-500">{rfq.notes}</p>}
                {rfq.status === 'OPEN' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      placeholder="Unit Price ₹"
                      value={quoteInputs[rfq.id] ?? rfq.targetUnitPrice ?? 1199}
                      onChange={e => setQuoteInputs(prev => ({ ...prev, [rfq.id]: Number(e.target.value) }))}
                      className="w-28 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuoteRfq(rfq.id, 'QUOTED')}
                      className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold"
                    >
                      Send Quote
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuoteRfq(rfq.id, 'REJECTED')}
                      className="px-3 py-1 rounded-lg border border-rose-300 text-rose-600 font-semibold"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={handleRegisterAsset}
        className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3 text-xs"
      >
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
            Attach Signed Digital Product Guide
          </h3>
          <p className="text-zinc-500">Auto-unlocked for buyers with HMAC-signed URLs (revoked on refund).</p>
        </div>

        <select
          value={assetProductId}
          onChange={e => setAssetProductId(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
        >
          {allProducts.slice(0, 20).map(p => (
            <option key={p.id} value={p.id}>
              {p.title.slice(0, 48)}
            </option>
          ))}
        </select>
        <input
          type="text"
          required
          value={assetFileName}
          onChange={e => setAssetFileName(e.target.value)}
          placeholder="File name (e.g. Styling-Lookbook.txt)"
          className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
        />
        <textarea
          rows={2}
          required
          value={assetContent}
          onChange={e => setAssetContent(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold"
        >
          Save Digital Asset
        </button>
      </form>
    </div>
  );
};


