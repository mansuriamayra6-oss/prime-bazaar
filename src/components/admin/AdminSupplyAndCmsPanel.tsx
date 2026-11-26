import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useMarketplace } from '../../context/MarketplaceContext';
import {
  Megaphone,
  Truck,
  KeyRound,
  Users,
  FileSearch,
  Image as ImageIcon,
  ShieldAlert,
  AlertTriangle,
  FolderTree,
  ArrowUp,
  ArrowDown,
  Globe,
} from 'lucide-react';

interface AdminSupplyAndCmsPanelProps {
  notify: (msg: string) => void;
}

type OpsSubTab = 'cms' | 'categories' | 'procurement' | 'warehouses' | 'ads' | 'staff' | 'audit' | 'intl_b2b';

function isSafeCmsUrl(url: string): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const AdminSupplyAndCmsPanel: React.FC<AdminSupplyAndCmsPanelProps> = ({ notify }) => {
  const { refreshCategories } = useMarketplace();
  const [subTab, setSubTab] = useState<OpsSubTab>('cms');
  const [error, setError] = useState<string | null>(null);

  // CMS & Moderation
  const [banners, setBanners] = useState<any[]>([]);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerImage, setBannerImage] = useState('/src/assets/images/hero_fashion_campaign_1793466539913.jpg');
  const [bannerLink, setBannerLink] = useState('/women');
  const [modQueue, setModQueue] = useState<any>({ reviews: [], questions: [] });

  // Dynamic 34+ Categories CMS
  const [cmsCategories, setCmsCategories] = useState<any[]>([]);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catSector, setCatSector] = useState('Marketplace Expansion');
  const [catSeoTitle, setCatSeoTitle] = useState('');
  const [catSeoDescription, setCatSeoDescription] = useState('');
  const [catFashionPriority, setCatFashionPriority] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Suppliers, POs, GRN
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [supName, setSupName] = useState('');
  const [supGstin, setSupGstin] = useState('');
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poWarehouseId, setPoWarehouseId] = useState('wh-mum-central');
  const [poProductId, setPoProductId] = useState('prod-1');
  const [poQty, setPoQty] = useState(20);
  const [poUnitCost, setPoUnitCost] = useState(650);

  // Warehouses & Delivery OTP Override
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [overrideShipmentId, setOverrideShipmentId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  // Sponsored Ads
  const [adCampaigns, setAdCampaigns] = useState<any[]>([]);

  // Staff & Audit Logs
  const [staffList, setStaffList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('FINANCE_ADMIN');

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEntity, setAuditEntity] = useState('');

  // Phase 6D/6F/6G: International FX, B2B Verification & Loyalty Expiry Controls
  const [intlCountries, setIntlCountries] = useState<any[]>([]);
  const [intlRates, setIntlRates] = useState<any[]>([]);
  const [fxEditCurrency, setFxEditCurrency] = useState('USD');
  const [fxEditRate, setFxEditRate] = useState(0.012);
  const [b2bAccounts, setB2bAccounts] = useState<any[]>([]);
  const [expiryResult, setExpiryResult] = useState<string | null>(null);

  const loadSubTab = async (tab: OpsSubTab) => {
    setError(null);
    try {
      if (tab === 'cms') {
        const [bRes, mRes] = await Promise.all([
          api.adminOps.getCmsBanners(),
          api.storefront.getModerationQueue(),
        ]);
        setBanners(bRes.banners || []);
        setModQueue(mRes || { reviews: [], questions: [] });
      } else if (tab === 'categories') {
        const cRes = await api.adminOps.getCmsCategories();
        setCmsCategories(cRes.categories || []);
      } else if (tab === 'procurement') {
        const [sRes, pRes, wRes] = await Promise.all([
          api.adminOps.getSuppliers(),
          api.adminOps.getPurchaseOrders(),
          api.warehouses.list(),
        ]);
        setSuppliers(sRes.suppliers || []);
        setPurchaseOrders(pRes.purchaseOrders || []);
        setWarehouses(wRes.warehouses || []);
        if ((sRes.suppliers || []).length > 0 && !poSupplierId) {
          setPoSupplierId(sRes.suppliers[0].id);
        }
      } else if (tab === 'warehouses') {
        const wRes = await api.warehouses.list();
        setWarehouses(wRes.warehouses || []);
      } else if (tab === 'ads') {
        const aRes = await api.adminOps.getAdCampaigns();
        setAdCampaigns(aRes.campaigns || []);
      } else if (tab === 'staff') {
        const [rRes, stRes] = await Promise.all([
          api.adminOps.getStaffRoles(),
          api.adminOps.getStaff(),
        ]);
        setRolesList(rRes.roles || []);
        setStaffList(stRes.staff || []);
      } else if (tab === 'audit') {
        const lRes = await api.adminOps.searchAuditLogs({
          entityType: auditEntity || undefined,
          search: auditSearch || undefined,
          limit: 40,
        });
        setAuditLogs(lRes.logs || []);
      } else if (tab === 'intl_b2b') {
        const [iRes, bRes] = await Promise.all([
          api.intl.getConfig(),
          api.phase6G.adminGetB2BAccounts(),
        ]);
        setIntlCountries(iRes.countries || []);
        setIntlRates(iRes.rates || []);
        setB2bAccounts(bRes.accounts || []);
      }
    } catch (err: any) {
      setError(err.message || 'Insufficient admin privileges for this module.');
    }
  };

  useEffect(() => {
    loadSubTab(subTab);
  }, [subTab]);

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSafeCmsUrl(bannerLink) || !isSafeCmsUrl(bannerImage)) {
      notify('Unsafe URL protocol blocked. Use http(s) or relative / paths only.');
      return;
    }
    try {
      await api.adminOps.saveCmsBanner({
        title: bannerTitle,
        imageUrl: bannerImage,
        linkUrl: bannerLink,
        placement: 'HERO',
        status: 'PUBLISHED',
        priority: banners.length + 1,
      });
      setBannerTitle('');
      await loadSubTab('cms');
      notify('CMS banner published.');
    } catch (err: any) {
      notify(err.message || 'Failed to save CMS banner.');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adminOps.saveCmsCategory({
        id: editingCatId || undefined,
        name: catName,
        slug: catSlug || undefined,
        sector: catSector,
        seoTitle: catSeoTitle || undefined,
        seoDescription: catSeoDescription || undefined,
        isFashionPriority: catFashionPriority,
        group: catFashionPriority ? 'fashion' : 'more',
      });
      setEditingCatId(null);
      setCatName('');
      setCatSlug('');
      setCatSeoTitle('');
      setCatSeoDescription('');
      await Promise.all([loadSubTab('categories'), refreshCategories()]);
      notify(editingCatId ? 'Category updated.' : 'New marketplace category added.');
    } catch (err: any) {
      notify(err.message || 'Failed to save category.');
    }
  };

  const handleToggleCategory = async (cat: any, field: 'isActive' | 'isFashionPriority') => {
    try {
      const nextVal = field === 'isActive' ? cat.isActive === false : !cat.isFashionPriority;
      await api.adminOps.saveCmsCategory({
        id: cat.id,
        [field]: nextVal,
      });
      await Promise.all([loadSubTab('categories'), refreshCategories()]);
      notify(`Updated ${cat.name}.`);
    } catch (err: any) {
      notify(err.message || 'Failed to update category.');
    }
  };

  const handleMoveCategory = async (index: number, delta: -1 | 1) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= cmsCategories.length) return;
    const next = [...cmsCategories];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    setCmsCategories(next);
    try {
      await api.adminOps.reorderCmsCategories(next.map(c => c.id));
      await refreshCategories();
      notify('Category navigation order updated.');
    } catch (err: any) {
      notify(err.message || 'Failed to reorder categories.');
    }
  };

  const handleModerateContent = async (
    targetType: 'REVIEW' | 'QUESTION',
    targetId: string,
    productId: string,
    status: string
  ) => {
    try {
      await api.adminOps.moderateContent({
        targetType,
        targetId,
        productId,
        status,
        reason: `Admin content moderation: ${status}`,
      });
      await loadSubTab('cms');
      notify(`${targetType} marked ${status}`);
    } catch (err: any) {
      notify(err.message || 'Moderation failed.');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adminOps.createSupplier({
        name: supName,
        gstin: supGstin || '27AABCS1234F1Z5',
        contactName: 'Procurement Desk',
        phone: '+91 98200 11223',
      });
      setSupName('');
      setSupGstin('');
      await loadSubTab('procurement');
      notify('Supplier created.');
    } catch (err: any) {
      notify(err.message || 'Failed to create supplier.');
    }
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adminOps.createPurchaseOrder({
        supplierId: poSupplierId,
        warehouseId: poWarehouseId,
        items: [
          {
            productId: poProductId,
            variantId: `${poProductId}-default`,
            sku: `SKU-${poProductId.toUpperCase()}`,
            title: poProductId,
            orderedQty: Number(poQty),
            unitCost: Number(poUnitCost),
          },
        ],
      });
      await loadSubTab('procurement');
      notify('Purchase Order created (draft — stock unaffected until GRN).');
    } catch (err: any) {
      notify(err.message || 'Failed to create Purchase Order.');
    }
  };

  const handleReceiveFullGrn = async (po: any) => {
    try {
      await api.adminOps.receiveGrn(po.id, {
        supplierInvoiceRef: `SINV-${Date.now().toString().slice(-5)}`,
        items: (po.items || []).map((it: any) => ({
          variantId: it.variantId,
          receivedQty: Number(it.orderedQty) - Number(it.receivedQty || 0),
          damagedQty: 0,
        })),
      });
      await loadSubTab('procurement');
      notify(`Verified GRN received for PO ${po.poNumber || po.id}; warehouse stock updated.`);
    } catch (err: any) {
      notify(err.message || 'GRN receipt failed.');
    }
  };

  const handleOverrideOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.shipments.overrideDeliveryOtp(overrideShipmentId.trim(), overrideReason.trim());
      setOverrideShipmentId('');
      setOverrideReason('');
      notify('Delivery OTP override executed and recorded in audit log.');
    } catch (err: any) {
      notify(err.message || 'Delivery OTP override failed.');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adminOps.createStaff({
        name: newStaffName,
        email: newStaffEmail,
        password: newStaffPassword,
        roleName: newStaffRole,
      });
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPassword('');
      await loadSubTab('staff');
      notify('Admin staff member created.');
    } catch (err: any) {
      notify(err.message || 'Failed to create admin staff member.');
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
            Marketplace Operations, Procurement, CMS & Governance
          </h3>
          <p className="text-xs text-zinc-500">
            CMS publishing, review/Q&A moderation, supplier PO/GRN, sponsored ads, staff RBAC & audit logs
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'cms', label: 'CMS & Content Mod', icon: ImageIcon },
            { id: 'categories', label: 'Categories (34+)', icon: FolderTree },
            { id: 'procurement', label: 'Suppliers, PO & GRN', icon: Truck },
            { id: 'warehouses', label: 'Warehouses & OTP Override', icon: KeyRound },
            { id: 'ads', label: 'Sponsored Ads', icon: Megaphone },
            { id: 'staff', label: 'Admin Staff & Roles', icon: Users },
            { id: 'intl_b2b', label: 'Intl, B2B & Loyalty', icon: Globe },
            { id: 'audit', label: 'Audit Logs', icon: FileSearch },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id as OpsSubTab)}
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

      {/* CMS & CONTENT MODERATION */}
      {subTab === 'cms' && (
        <div className="space-y-6 text-xs">
          <form onSubmit={handleSaveBanner} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input
              type="text"
              required
              placeholder="Hero Banner Headline"
              value={bannerTitle}
              onChange={e => setBannerTitle(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
            <input
              type="text"
              required
              placeholder="Image URL"
              value={bannerImage}
              onChange={e => setBannerImage(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
            />
            <input
              type="text"
              placeholder="Target Link (/... or https://...)"
              value={bannerLink}
              onChange={e => setBannerLink(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold"
            >
              Publish Hero Banner
            </button>
          </form>

          {banners.length > 0 && (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              {banners.map(b => (
                <div key={b.id} className="p-3 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-white">{b.title}</span>
                    <span className="text-zinc-500 ml-2">
                      {b.placement} · {b.status}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-400">{b.linkUrl || '/'}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
              Reported Reviews & Q&A Moderation Queue
            </span>
            {(modQueue.reviews || []).length === 0 && (modQueue.questions || []).length === 0 ? (
              <p className="text-zinc-500">No flagged customer reviews or Q&A pending moderation.</p>
            ) : (
              <div className="space-y-2">
                {(modQueue.reviews || []).map((r: any) => (
                  <div key={r.id} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-semibold text-zinc-900 dark:text-white">Review on {r.productId}</span>
                      <p className="text-zinc-600 dark:text-zinc-300">{r.comment}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleModerateContent('REVIEW', r.id, r.productId, 'APPROVED')}
                        className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModerateContent('REVIEW', r.id, r.productId, 'HIDDEN')}
                        className="px-2.5 py-1 rounded bg-rose-600 text-white font-semibold"
                      >
                        Hide
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DYNAMIC 34+ CATEGORIES TAXONOMY & SEO MANAGER */}
      {subTab === 'categories' && (
        <div className="space-y-4 text-xs">
          <form onSubmit={handleSaveCategory} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2.5 bg-zinc-50/70 dark:bg-zinc-950/40">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-900 dark:text-white">
                {editingCatId ? `Edit Category (${editingCatId})` : `Add or Edit Marketplace Category (${cmsCategories.length} configured)`}
              </span>
              {editingCatId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCatId(null);
                    setCatName('');
                    setCatSlug('');
                    setCatSeoTitle('');
                    setCatSeoDescription('');
                  }}
                  className="text-rose-600 font-semibold hover:underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder="Category Name (e.g. Grocery & Gourmet)"
                value={catName}
                onChange={e => setCatName(e.target.value)}
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
              <input
                type="text"
                placeholder="Slug (auto if blank)"
                value={catSlug}
                disabled={Boolean(editingCatId)}
                onChange={e => setCatSlug(e.target.value)}
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono disabled:opacity-60"
              />
              <input
                type="text"
                placeholder="Sector (e.g. Consumer Electronics)"
                value={catSector}
                onChange={e => setCatSector(e.target.value)}
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
              <input
                type="text"
                placeholder="SEO Title"
                value={catSeoTitle}
                onChange={e => setCatSeoTitle(e.target.value)}
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
              <input
                type="text"
                placeholder="SEO Description"
                value={catSeoDescription}
                onChange={e => setCatSeoDescription(e.target.value)}
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 sm:col-span-2"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <label className="inline-flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={catFashionPriority}
                  onChange={e => setCatFashionPriority(e.target.checked)}
                />
                <span>Show in Primary Fashion Launch Ribbon</span>
              </label>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold"
              >
                {editingCatId ? 'Update Category' : 'Add Category'}
              </button>
            </div>
          </form>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-96 overflow-y-auto">
            {cmsCategories.map((cat, idx) => (
              <div key={cat.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-zinc-400">#{idx + 1}</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{cat.name}</span>
                    <span className="font-mono text-[11px] text-zinc-500">({cat.slug})</span>
                    {cat.isFashionPriority && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                        Fashion Launch
                      </span>
                    )}
                    {cat.isActive === false && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                    {cat.sector || 'General'} · {(cat.subcategories || []).length} subcategories · {(cat.attributes || []).length} filter attributes
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label={`Move ${cat.name} up`}
                    onClick={() => handleMoveCategory(idx, -1)}
                    disabled={idx === 0}
                    className="p-1.5 rounded border border-zinc-200 dark:border-zinc-700 disabled:opacity-40"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${cat.name} down`}
                    onClick={() => handleMoveCategory(idx, 1)}
                    disabled={idx === cmsCategories.length - 1}
                    className="p-1.5 rounded border border-zinc-200 dark:border-zinc-700 disabled:opacity-40"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCatId(cat.id);
                      setCatName(cat.name);
                      setCatSlug(cat.slug);
                      setCatSector(cat.sector || 'Marketplace Expansion');
                      setCatSeoTitle(cat.seoTitle || '');
                      setCatSeoDescription(cat.seoDescription || '');
                      setCatFashionPriority(Boolean(cat.isFashionPriority));
                    }}
                    className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleCategory(cat, 'isActive')}
                    className={`px-2.5 py-1 rounded font-semibold ${
                      cat.isActive === false ? 'bg-emerald-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100'
                    }`}
                  >
                    {cat.isActive === false ? 'Enable' : 'Disable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUPPLIERS, POs & GRN */}
      {subTab === 'procurement' && (
        <div className="space-y-6 text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <form onSubmit={handleCreateSupplier} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <span className="font-bold text-zinc-900 dark:text-white block">Add Wholesale Supplier</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Supplier Name"
                  value={supName}
                  onChange={e => setSupName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                />
                <input
                  type="text"
                  placeholder="GSTIN"
                  value={supGstin}
                  onChange={e => setSupGstin(e.target.value.toUpperCase())}
                  className="w-40 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
                />
                <button type="submit" className="px-3 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold">
                  Save
                </button>
              </div>
            </form>

            <form onSubmit={handleCreatePo} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <span className="font-bold text-zinc-900 dark:text-white block">Create Purchase Order (PO)</span>
              <div className="grid grid-cols-4 gap-2">
                <select
                  value={poSupplierId}
                  onChange={e => setPoSupplierId(e.target.value)}
                  className="col-span-2 px-2 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <select
                  value={poWarehouseId}
                  onChange={e => setPoWarehouseId(e.target.value)}
                  className="col-span-2 px-2 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={poProductId}
                  onChange={e => setPoProductId(e.target.value)}
                  placeholder="Product ID"
                  className="px-2 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
                />
                <input
                  type="number"
                  min={1}
                  value={poQty}
                  onChange={e => setPoQty(Number(e.target.value))}
                  className="px-2 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono tabular-nums"
                />
                <input
                  type="number"
                  min={1}
                  value={poUnitCost}
                  onChange={e => setPoUnitCost(Number(e.target.value))}
                  className="px-2 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono tabular-nums"
                />
                <button type="submit" className="px-3 py-2 rounded-lg bg-rose-600 text-white font-semibold">
                  Create PO
                </button>
              </div>
            </form>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            {purchaseOrders.map(po => (
              <div key={po.id} className="p-3.5 flex flex-wrap items-center justify-between gap-2 tabular-nums">
                <div>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white">{po.poNumber || po.id}</span>
                  <span className="text-zinc-500 ml-2">
                    Status: {po.status} · Total: ₹{Number(po.totalCost || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex gap-2">
                  {po.status === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={() =>
                        api.adminOps
                          .updatePoStatus(po.id, 'APPROVED')
                          .then(() => loadSubTab('procurement'))
                      }
                      className="px-3 py-1 rounded bg-zinc-900 text-white font-semibold"
                    >
                      Approve PO
                    </button>
                  )}
                  {(po.status === 'APPROVED' || po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') && (
                    <button
                      type="button"
                      onClick={() => handleReceiveFullGrn(po)}
                      className="px-3 py-1 rounded bg-emerald-600 text-white font-semibold"
                    >
                      Receive Verified GRN
                    </button>
                  )}
                </div>
              </div>
            ))}
            {purchaseOrders.length === 0 && (
              <div className="p-6 text-center text-zinc-500">No purchase orders created yet.</div>
            )}
          </div>
        </div>
      )}

      {/* WAREHOUSES & DELIVERY OTP OVERRIDE */}
      {subTab === 'warehouses' && (
        <div className="space-y-4 text-xs">
          <form onSubmit={handleOverrideOtp} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
            <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Audited Delivery OTP Override</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder="Shipment ID"
                value={overrideShipmentId}
                onChange={e => setOverrideShipmentId(e.target.value)}
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
              />
              <input
                type="text"
                required
                placeholder="Mandatory Operations Reason (e.g. POD signed paper proof)"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              />
              <button type="submit" className="px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold">
                Execute Audited Override
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {warehouses.map(wh => (
              <div key={wh.id} className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="font-bold text-zinc-900 dark:text-white block">{wh.name}</span>
                <span className="font-mono text-zinc-500">
                  {wh.code} · {wh.city}, {wh.state} ({wh.pinCode})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SPONSORED ADS MODERATION */}
      {subTab === 'ads' && (
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs">
          {adCampaigns.map(c => (
            <div key={c.id} className="p-3.5 flex flex-wrap items-center justify-between gap-3 tabular-nums">
              <div>
                <span className="font-bold text-zinc-900 dark:text-white">{c.campaignName}</span>
                <span className="text-zinc-500 ml-2">
                  Seller: {c.sellerId} · Status: {c.status} · Budget: ₹{c.budget} · Spent: ₹{c.spent || 0}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    api.adminOps.moderateAdCampaign(c.id, 'APPROVE').then(() => loadSubTab('ads'))
                  }
                  className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() =>
                    api.adminOps.moderateAdCampaign(c.id, 'PAUSE', 'Paused by ad moderator').then(() => loadSubTab('ads'))
                  }
                  className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 font-semibold"
                >
                  Pause
                </button>
                <button
                  type="button"
                  onClick={() =>
                    api.adminOps.moderateAdCampaign(c.id, 'REJECT', 'Policy violation').then(() => loadSubTab('ads'))
                  }
                  className="px-2.5 py-1 rounded bg-rose-600 text-white font-semibold"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
          {adCampaigns.length === 0 && (
            <div className="p-6 text-center text-zinc-500">No sponsored ad campaigns submitted yet.</div>
          )}
        </div>
      )}

      {/* ADMIN STAFF & RBAC */}
      {subTab === 'staff' && (
        <div className="space-y-4 text-xs">
          <form onSubmit={handleCreateStaff} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            <input
              type="text"
              required
              placeholder="Staff Name"
              value={newStaffName}
              onChange={e => setNewStaffName(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
            <input
              type="email"
              required
              placeholder="staff@primebazaar.in"
              value={newStaffEmail}
              onChange={e => setNewStaffEmail(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Password (8+ chars)"
              value={newStaffPassword}
              onChange={e => setNewStaffPassword(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
            <select
              value={newStaffRole}
              onChange={e => setNewStaffRole(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            >
              {(rolesList.length > 0
                ? rolesList.map(r => r.roleName)
                : ['FINANCE_ADMIN', 'CATALOG_MODERATOR', 'OPERATIONS_ADMIN', 'SUPPORT_AGENT']
              ).map((rn: string) => (
                <option key={rn} value={rn}>{rn}</option>
              ))}
            </select>
            <button type="submit" className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold">
              Add Admin Staff
            </button>
          </form>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            {staffList.map(st => (
              <div key={st.id} className="p-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-900 dark:text-white">{st.name}</span>
                  <span className="text-zinc-500 ml-2">{st.email} · {st.roleName}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    api.adminOps.toggleStaffStatus(st.id, !st.isActive).then(() => loadSubTab('staff'))
                  }
                  className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 font-semibold"
                >
                  {st.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTERED AUDIT LOGS */}
      {subTab === 'audit' && (
        <div className="space-y-3 text-xs">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Filter entityType (e.g. GIFT_CARD, SELLER, PRODUCT)"
              value={auditEntity}
              onChange={e => setAuditEntity(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono flex-1"
            />
            <input
              type="text"
              placeholder="Search details or action..."
              value={auditSearch}
              onChange={e => setAuditSearch(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex-1"
            />
            <button
              type="button"
              onClick={() => loadSubTab('audit')}
              className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold"
            >
              Filter Logs
            </button>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800 max-h-80 overflow-y-auto">
            {auditLogs.map(log => (
              <div key={log.id} className="p-3 space-y-0.5">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {log.action} · {log.entityType}:{log.entityId}
                  </span>
                  <span className="text-zinc-400">{new Date(log.createdAt).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-300">{log.details}</p>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <div className="p-6 text-center text-zinc-500">No matching audit entries found.</div>
            )}
          </div>
        </div>
      )}

      {/* INTERNATIONAL FX, B2B GSTIN VERIFICATION & LOYALTY EXPIRY */}
      {subTab === 'intl_b2b' && (
        <div className="space-y-6 text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <span className="font-bold text-zinc-900 dark:text-white block">
                Exchange Rate Matrix ({intlRates.length} currencies)
              </span>
              <div className="flex gap-2">
                <select
                  value={fxEditCurrency}
                  onChange={e => setFxEditCurrency(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
                >
                  {['USD', 'EUR', 'GBP', 'AED', 'SGD'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.0001"
                  value={fxEditRate}
                  onChange={e => setFxEditRate(Number(e.target.value))}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.intl.adminSaveFx(fxEditCurrency, { rateFromInr: fxEditRate });
                      await loadSubTab('intl_b2b');
                      notify(`Updated ${fxEditCurrency} FX rate.`);
                    } catch (err: any) {
                      notify(err?.message || 'Failed to update FX rate.');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold"
                >
                  Update FX
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {intlCountries.map(c => (
                  <div key={c.countryCode} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                    <div className="font-bold text-zinc-900 dark:text-white">{c.countryName} ({c.countryCode})</div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      {c.currencyCode} · Duty {c.customsDutyPercent}% · VAT {c.taxPercent}% · COD: {c.codAllowed ? 'Yes' : 'No'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-zinc-900 dark:text-white">Loyalty Coin Expiry Maintenance</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await api.loyalty.adminRunExpirySweep();
                      setExpiryResult(`Swept ${res.accountsExpired || 0} accounts, expired ${res.coinsExpiredTotal || 0} coins.`);
                      notify('Loyalty coin expiry sweep completed.');
                    } catch (err: any) {
                      notify(err?.message || 'Expiry sweep failed.');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold"
                >
                  Run Coin Expiry Sweep
                </button>
              </div>
              {expiryResult && <p className="text-emerald-600 font-mono text-[11px]">{expiryResult}</p>}

              <span className="font-bold text-zinc-900 dark:text-white block pt-2 border-t border-zinc-200 dark:border-zinc-800">
                B2B GSTIN Account Verification ({b2bAccounts.length})
              </span>
              {b2bAccounts.length === 0 ? (
                <p className="text-zinc-500">No B2B accounts registered yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {b2bAccounts.map(acc => (
                    <div key={acc.userId} className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-zinc-900 dark:text-white block">{acc.companyName}</span>
                        <span className="font-mono text-[11px] text-zinc-500">{acc.gstin} · {acc.verificationStatus}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            api.phase6G.adminReviewB2BAccount(acc.userId, 'VERIFIED').then(() => loadSubTab('intl_b2b'))
                          }
                          className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold"
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            api.phase6G.adminReviewB2BAccount(acc.userId, 'REJECTED').then(() => loadSubTab('intl_b2b'))
                          }
                          className="px-2.5 py-1 rounded bg-rose-600 text-white font-semibold"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

