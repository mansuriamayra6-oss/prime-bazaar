import crypto from 'crypto';
import { dbSellers, dbProducts, dbAuditLogs } from './v1Router.ts';
import { INITIAL_PRODUCTS } from '../data/mockData.ts';
import { roundMoney } from './financeLedger.ts';
import { recordAuditLog } from './auditAndRbac.ts';

// =============================================================================
// INDIAN GST TAX ENGINE, SEQUENTIAL FY INVOICES & IMMUTABLE CREDIT NOTES
// =============================================================================

export interface TaxInvoiceItemSnapshot {
  id: string;
  orderItemId?: string;
  hsnCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxableValue: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
}

export interface TaxInvoiceRecord {
  id: string;
  invoiceNumber: string;
  financialYear: string;
  orderId: string;
  sellerOrderId?: string;
  sellerId: string;
  buyerUserId: string;
  sellerGstin?: string | null;
  buyerGstin?: string | null;
  sellerState: string;
  placeOfSupplyState: string;
  isInterState: boolean;
  missingGstFlag: boolean;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  shippingTaxable: number;
  shippingTax: number;
  discountTotal: number;
  grandTotal: number;
  status: 'ISSUED' | 'ADJUSTED' | 'VOID';
  sellerSnapshot: {
    businessName: string;
    gstin: string | null;
    panNumber?: string;
    address: string;
    state: string;
  };
  buyerSnapshot: {
    name: string;
    email?: string;
    phone?: string;
    gstin?: string | null;
    shippingAddress: any;
  };
  items: TaxInvoiceItemSnapshot[];
  issuedAt: string;
}

export interface CreditNoteRecord {
  id: string;
  creditNoteNumber: string;
  financialYear: string;
  invoiceId: string;
  invoiceNumber: string;
  orderId: string;
  refundId?: string;
  reason: string;
  taxableAdjustment: number;
  cgstAdjustment: number;
  sgstAdjustment: number;
  igstAdjustment: number;
  totalAdjustment: number;
  issuedBy: string;
  issuedAt: string;
}

export const taxInvoices = new Map<string, TaxInvoiceRecord>();
export const creditNotes = new Map<string, CreditNoteRecord>();
const invoiceCountersByFy = new Map<string, number>();
const creditNoteCountersByFy = new Map<string, number>();

export function getIndianFinancialYear(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // 1-12
  const startYear = month >= 4 ? year : year - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, '0');
  return `FY${String(startYear).slice(-2)}-${endYearShort}`;
}

function nextInvoiceNumber(fy: string): string {
  const next = (invoiceCountersByFy.get(fy) || 0) + 1;
  invoiceCountersByFy.set(fy, next);
  return `PB/${fy}/${String(next).padStart(5, '0')}`;
}

function nextCreditNoteNumber(fy: string): string {
  const next = (creditNoteCountersByFy.get(fy) || 0) + 1;
  creditNoteCountersByFy.set(fy, next);
  return `CN/${fy}/${String(next).padStart(5, '0')}`;
}

function resolveProductTaxMetadata(productId: string, categorySlug?: string, explicitGstRate?: number, explicitHsn?: string) {
  const dbProd = dbProducts.get(productId);
  const catalogProd = INITIAL_PRODUCTS.find((p) => p.id === productId);
  const gstRate = Number(explicitGstRate ?? dbProd?.taxGstPercent ?? catalogProd?.gstRate ?? 12);
  let hsnCode = explicitHsn;
  if (!hsnCode) {
    const cat = (categorySlug || catalogProd?.category || '').toLowerCase();
    if (cat.includes('footwear')) hsnCode = '6403';
    else if (cat.includes('beauty')) hsnCode = '3304';
    else if (cat.includes('accessor') || cat.includes('bag')) hsnCode = '4202';
    else hsnCode = '6204';
  }
  return { gstRate, hsnCode };
}

export function issueTaxInvoice(params: {
  orderId: string;
  sellerOrderId?: string;
  sellerId: string;
  buyerUserId: string;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerGstin?: string;
  shippingAddress: any;
  items: Array<{
    orderItemId?: string;
    productId: string;
    title: string;
    categorySlug?: string;
    hsnCode?: string;
    gstRate?: number;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
  }>;
  shippingFee?: number;
  warehouseState?: string;
  issuedBy?: string;
}): TaxInvoiceRecord {
  // Idempotent return if already issued for same orderId + sellerOrderId
  for (const existing of taxInvoices.values()) {
    if (existing.orderId === params.orderId && (existing.sellerOrderId || null) === (params.sellerOrderId || null)) {
      return existing;
    }
  }

  const seller = dbSellers.get(params.sellerId);
  const sellerState = (
    params.warehouseState ||
    seller?.pickupAddress?.state ||
    'Maharashtra'
  ).trim();
  const placeOfSupplyState = (
    params.shippingAddress?.state ||
    sellerState
  ).trim();

  const isInterState = sellerState.toLowerCase() !== placeOfSupplyState.toLowerCase();
  const cleanSellerGstin = seller?.gstNumber && seller.gstNumber !== 'Unregistered' ? seller.gstNumber : null;
  const missingGstFlag = !cleanSellerGstin;

  let taxableValueTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let discountTotal = 0;

  const lineSnapshots: TaxInvoiceItemSnapshot[] = params.items.map((item) => {
    const { gstRate, hsnCode } = resolveProductTaxMetadata(
      item.productId,
      item.categorySlug,
      item.gstRate,
      item.hsnCode
    );
    const grossLine = roundMoney(item.unitPrice * item.quantity);
    const lineDiscount = roundMoney(Math.min(grossLine, Number(item.discountAmount || 0)));
    const netInclusive = roundMoney(grossLine - lineDiscount);

    // Inclusive GST extraction: taxable = netInclusive / (1 + gstRate/100)
    const taxableValue = roundMoney(netInclusive / (1 + gstRate / 100));
    const totalTax = roundMoney(netInclusive - taxableValue);

    const cgst = isInterState ? 0 : roundMoney(totalTax / 2);
    const sgst = isInterState ? 0 : roundMoney(totalTax - cgst);
    const igst = isInterState ? totalTax : 0;

    taxableValueTotal = roundMoney(taxableValueTotal + taxableValue);
    cgstTotal = roundMoney(cgstTotal + cgst);
    sgstTotal = roundMoney(sgstTotal + sgst);
    igstTotal = roundMoney(igstTotal + igst);
    discountTotal = roundMoney(discountTotal + lineDiscount);

    return {
      id: `tinv_item_${crypto.randomBytes(4).toString('hex')}`,
      orderItemId: item.orderItemId,
      hsnCode,
      description: item.title,
      quantity: item.quantity,
      unitPrice: roundMoney(item.unitPrice),
      discountAmount: lineDiscount,
      taxableValue,
      gstRate,
      cgst,
      sgst,
      igst,
      totalAmount: netInclusive,
    };
  });

  const shippingFee = roundMoney(params.shippingFee || 0);
  const shippingTaxable = shippingFee > 0 ? roundMoney(shippingFee / 1.18) : 0;
  const shippingTax = roundMoney(shippingFee - shippingTaxable);
  if (shippingFee > 0) {
    taxableValueTotal = roundMoney(taxableValueTotal + shippingTaxable);
    if (isInterState) {
      igstTotal = roundMoney(igstTotal + shippingTax);
    } else {
      const half = roundMoney(shippingTax / 2);
      cgstTotal = roundMoney(cgstTotal + half);
      sgstTotal = roundMoney(sgstTotal + roundMoney(shippingTax - half));
    }
  }

  const grandTotal = roundMoney(taxableValueTotal + cgstTotal + sgstTotal + igstTotal);
  const fy = getIndianFinancialYear();
  const invoiceNumber = nextInvoiceNumber(fy);

  const invoice: TaxInvoiceRecord = {
    id: `tinv_${crypto.randomBytes(5).toString('hex')}`,
    invoiceNumber,
    financialYear: fy,
    orderId: params.orderId,
    sellerOrderId: params.sellerOrderId,
    sellerId: params.sellerId,
    buyerUserId: params.buyerUserId,
    sellerGstin: cleanSellerGstin,
    buyerGstin: params.buyerGstin?.trim() || null,
    sellerState,
    placeOfSupplyState,
    isInterState,
    missingGstFlag,
    taxableValue: taxableValueTotal,
    cgstAmount: cgstTotal,
    sgstAmount: sgstTotal,
    igstAmount: igstTotal,
    shippingTaxable,
    shippingTax,
    discountTotal,
    grandTotal,
    status: 'ISSUED',
    sellerSnapshot: {
      businessName: seller?.businessName || 'Prime Bazaar Marketplace Vendor',
      gstin: cleanSellerGstin,
      panNumber: seller?.panNumber,
      address: seller?.pickupAddress
        ? `${seller.pickupAddress.street}, ${seller.pickupAddress.city}, ${seller.pickupAddress.state} ${seller.pickupAddress.pinCode}`
        : sellerState,
      state: sellerState,
    },
    buyerSnapshot: {
      name: params.buyerName,
      email: params.buyerEmail,
      phone: params.buyerPhone,
      gstin: params.buyerGstin?.trim() || null,
      shippingAddress: params.shippingAddress,
    },
    items: Object.freeze(lineSnapshots) as TaxInvoiceItemSnapshot[],
    issuedAt: new Date().toISOString(),
  };

  // Issued GST invoices are immutable snapshots; adjustments happen via Credit Notes
  taxInvoices.set(invoice.id, invoice);
  return invoice;
}

export function issueCreditNoteForInvoice(params: {
  invoiceId: string;
  refundId?: string;
  refundAmount: number;
  reason: string;
  issuedBy: string;
  actorName: string;
}): CreditNoteRecord {
  const inv = taxInvoices.get(params.invoiceId);
  if (!inv) throw new Error('Original GST invoice not found.');

  const adjustmentTotal = roundMoney(params.refundAmount);
  if (!Number.isFinite(adjustmentTotal) || adjustmentTotal <= 0) {
    throw new Error('Credit note amount must be positive.');
  }

  // Prevent issuing cumulative credit notes exceeding invoice grandTotal
  const alreadyCredited = Array.from(creditNotes.values())
    .filter((cn) => cn.invoiceId === inv.id)
    .reduce((s, cn) => s + cn.totalAdjustment, 0);
  if (roundMoney(alreadyCredited + adjustmentTotal) > roundMoney(inv.grandTotal + 0.01)) {
    throw new Error(
      `Credit note adjustment ₹${adjustmentTotal} exceeds remaining invoice value ₹${roundMoney(inv.grandTotal - alreadyCredited)}.`
    );
  }

  const ratio = inv.grandTotal > 0 ? Math.min(1, adjustmentTotal / inv.grandTotal) : 1;
  const cgstAdjustment = roundMoney(inv.cgstAmount * ratio);
  const sgstAdjustment = roundMoney(inv.sgstAmount * ratio);
  const igstAdjustment = roundMoney(inv.igstAmount * ratio);
  const taxableAdjustment = roundMoney(adjustmentTotal - cgstAdjustment - sgstAdjustment - igstAdjustment);

  const fy = getIndianFinancialYear();
  const cn: CreditNoteRecord = Object.freeze({
    id: `cn_${crypto.randomBytes(5).toString('hex')}`,
    creditNoteNumber: nextCreditNoteNumber(fy),
    financialYear: fy,
    invoiceId: inv.id,
    invoiceNumber: inv.invoiceNumber,
    orderId: inv.orderId,
    refundId: params.refundId,
    reason: params.reason.trim() || 'Return / Refund adjustment',
    taxableAdjustment,
    cgstAdjustment,
    sgstAdjustment,
    igstAdjustment,
    totalAdjustment: adjustmentTotal,
    issuedBy: params.issuedBy,
    issuedAt: new Date().toISOString(),
  });

  creditNotes.set(cn.id, cn);
  inv.status = 'ADJUSTED';

  recordAuditLog({
    actorType: 'ADMIN',
    actorId: params.issuedBy,
    actorName: params.actorName,
    actorRole: 'ADMIN',
    action: 'GST_CREDIT_NOTE_ISSUED',
    entityType: 'CREDIT_NOTE',
    entityId: cn.id,
    afterState: { creditNoteNumber: cn.creditNoteNumber, invoiceNumber: inv.invoiceNumber, totalAdjustment: adjustmentTotal },
    reason: cn.reason,
    details: `Issued GST Credit Note ${cn.creditNoteNumber} against ${inv.invoiceNumber} for ₹${adjustmentTotal}.`,
    legacyAuditSink: dbAuditLogs,
  });

  return cn;
}

export function getInvoicesForOrder(orderId: string) {
  const invs = Array.from(taxInvoices.values()).filter((i) => i.orderId === orderId);
  const cns = Array.from(creditNotes.values()).filter((c) => c.orderId === orderId);
  return { invoices: invs, creditNotes: cns };
}

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderTaxInvoiceHtml(inv: TaxInvoiceRecord): string {
  const rowsHtml = inv.items
    .map(
      (item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(item.description)}</td>
        <td>${escapeHtml(item.hsnCode)}</td>
        <td>${item.quantity}</td>
        <td>₹${item.taxableValue.toFixed(2)}</td>
        <td>${item.gstRate}%</td>
        <td>${inv.isInterState ? `IGST ₹${item.igst.toFixed(2)}` : `CGST ₹${item.cgst.toFixed(2)} + SGST ₹${item.sgst.toFixed(2)}`}</td>
        <td>₹${item.totalAmount.toFixed(2)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Tax Invoice ${escapeHtml(inv.invoiceNumber)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; color: #18181b; margin: 32px; }
  .head { display: flex; justify-content: space-between; border-bottom: 2px solid #047857; padding-bottom: 16px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
  th, td { border: 1px solid #e4e4e7; padding: 8px 10px; text-align: left; }
  th { background: #f4f4f5; }
  .totals { margin-top: 20px; text-align: right; font-size: 14px; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <h2>PRIME BAZAAR TAX INVOICE</h2>
      <div><strong>Invoice No:</strong> ${escapeHtml(inv.invoiceNumber)} (${escapeHtml(inv.financialYear)})</div>
      <div><strong>Issued At:</strong> ${escapeHtml(inv.issuedAt)}</div>
      <div><strong>Supply Type:</strong> ${inv.isInterState ? 'Interstate (IGST)' : 'Intrastate (CGST + SGST)'}</div>
    </div>
    <div>
      <div><strong>Sold By:</strong> ${escapeHtml(inv.sellerSnapshot.businessName)}</div>
      <div><strong>Seller GSTIN:</strong> ${escapeHtml(inv.sellerGstin || 'UNREGISTERED (Flagged)')}</div>
      <div><strong>Origin State:</strong> ${escapeHtml(inv.sellerState)}</div>
      <div><strong>Place of Supply:</strong> ${escapeHtml(inv.placeOfSupplyState)}</div>
    </div>
  </div>
  <div>
    <strong>Bill To / Ship To:</strong> ${escapeHtml(inv.buyerSnapshot.name)}
    ${inv.buyerGstin ? `| <strong>Buyer GSTIN:</strong> ${escapeHtml(inv.buyerGstin)}` : ''}
  </div>
  <table>
    <thead>
      <tr><th>#</th><th>Item Description</th><th>HSN</th><th>Qty</th><th>Taxable Value</th><th>GST %</th><th>Tax Split</th><th>Total</th></tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="totals">
    <div>Taxable Value: ₹${inv.taxableValue.toFixed(2)}</div>
    ${inv.isInterState ? `<div>IGST: ₹${inv.igstAmount.toFixed(2)}</div>` : `<div>CGST: ₹${inv.cgstAmount.toFixed(2)} | SGST: ₹${inv.sgstAmount.toFixed(2)}</div>`}
    <div><strong>Grand Total: ₹${inv.grandTotal.toFixed(2)} INR</strong></div>
  </div>
</body>
</html>`;
}
