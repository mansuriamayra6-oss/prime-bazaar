import express from 'express';
import crypto from 'crypto';
import { requireAuth, requireRole, createRateLimiter } from './security.ts';
import { requirePermission, maskBankAccountNumber, recordAuditLog } from './auditAndRbac.ts';
import {
  listGiftCards,
  createGiftCard,
  updateGiftCardStatus,
  validateGiftCardForAmount,
  getStoreCreditAccount,
  creditStoreCredit,
  getLedgerSummary,
  reverseLedgerGroup,
  runCashfreeReconciliation,
  reconciliationRuns,
  generateFinanceExport,
  financeExportAudits,
  maskCustomerContactForExport,
  createSellerSettlementRequest,
  approveSellerSettlement,
} from './financeLedger.ts';
import {
  calculateAuthoritativeQuote,
  payments,
  refunds,
  initiateOrderRefund,
  syncRefundStatusFromProvider,
  getCashfreeTransport,
  getCashfreeRuntimeConfig,
  getCapturedPaidAmountForOrder,
} from './cashfreeAndPayments.ts';
import {
  listWarehouses,
  createWarehouse,
  getWarehouseInventoryList,
  upsertWarehouseStock,
  warehouses,
  warehouseTransfers,
  createWarehouseTransfer,
  completeWarehouseTransfer,
  shipments,
  createCarrierShipment,
  syncShipmentTracking,
  markShipmentFailedOrRto,
  generateAndDispatchDeliveryOtp,
  verifyDeliveryOtp,
  adminOverrideDeliveryOtp,
} from './warehouseAndShipping.ts';
import {
  taxInvoices,
  creditNotes,
  getInvoicesForOrder,
  issueCreditNoteForInvoice,
  renderTaxInvoiceHtml,
} from './gstInvoiceService.ts';
import { dbSellerOrders, dbSettlements, dbAuditLogs } from './v1Router.ts';

export interface Phase4RouterDeps {
  getOrdersMap: () => Map<string, any>;
  getPaymentIntentsMap: () => Map<string, any>;
  sendOtpEmail?: (toEmail: string, otpCode: string, recipientName?: string) => Promise<any>;
}

const giftCardValidationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 40,
  keyPrefix: 'giftcard-validate',
});

export function createPhase4Router(deps: Phase4RouterDeps) {
  const router = express.Router();

  // =========================================================================
  // 1. SERVER-AUTHORITATIVE CHECKOUT QUOTE, GIFT CARDS & STORE CREDITS
  // =========================================================================

  router.post('/checkout/quote', (req, res) => {
    try {
      const { items, couponCode, giftCardCode, useStoreCredit, requestedStoreCreditAmount, coinsUsed } = req.body || {};
      const quote = calculateAuthoritativeQuote({
        items,
        couponCode,
        giftCardCode,
        useStoreCredit: Boolean(useStoreCredit),
        requestedStoreCreditAmount:
          requestedStoreCreditAmount !== undefined ? Number(requestedStoreCreditAmount) : undefined,
        userId: req.auth?.userId || req.body?.userId,
        coinsUsed,
      });
      res.json({ success: true, quote });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/gift-cards/validate', requireAuth, giftCardValidationLimiter, (req, res) => {
    try {
      const { code, orderSubtotal = 1000 } = req.body || {};
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ success: false, error: 'Gift card code is required.' });
      }
      const result = validateGiftCardForAmount({
        code,
        orderSubtotal: Number(orderSubtotal) || 0,
        rateLimitKey: req.auth!.userId,
      });
      res.json({ success: true, giftCard: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/store-credits/me', requireAuth, (req, res) => {
    const data = getStoreCreditAccount(req.auth!.userId);
    res.json({ success: true, ...data });
  });

  // =========================================================================
  // 2. PAYMENT RETRY & STATUS VERIFICATION
  // =========================================================================

  router.post('/payments/retry', requireAuth, async (req, res) => {
    try {
      const { orderId, paymentMethod = 'cashfree', returnUrl } = req.body || {};
      const ordersMap = deps.getOrdersMap();
      const order = ordersMap.get(String(orderId || '').trim());
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found.' });
      }
      if (
        req.auth!.role === 'CUSTOMER' &&
        order.userId &&
        order.userId !== req.auth!.userId
      ) {
        return res.status(403).json({ success: false, error: 'Forbidden: Order belongs to another customer.' });
      }
      if (order.paymentStatus === 'PAID') {
        return res.status(409).json({ success: false, error: 'Order is already paid.' });
      }
      if (order.status === 'cancelled') {
        return res.status(400).json({ success: false, error: 'Cannot retry payment on a cancelled order.' });
      }

      const gatewayPayable = Number(order.finalGatewayPayable ?? order.totalAmount);
      if (gatewayPayable <= 0) {
        return res.status(400).json({ success: false, error: 'No gateway balance remains to retry.' });
      }

      const cf = getCashfreeRuntimeConfig();
      const cfOrderId = `pb_cf_retry_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
      const intentId = `pi_${crypto.randomBytes(5).toString('hex')}`;
      let cashfreeData: any = null;
      let cashfreeError: string | null = null;

      try {
        cashfreeData = await getCashfreeTransport().createOrder({
          order_id: cfOrderId,
          order_amount: gatewayPayable,
          order_currency: 'INR',
          customer_details: {
            customer_id: req.auth!.userId,
            customer_name: order.shippingAddress?.fullName || req.auth!.name || 'Prime Bazaar Shopper',
            customer_email: order.customerEmail || req.auth!.email || 'shopper@primebazaar.in',
            customer_phone: String(order.shippingAddress?.phone || '9876543210').replace(/\D/g, '').slice(-10) || '9876543210',
          },
          order_meta: {
            return_url:
              typeof returnUrl === 'string' && /^https?:\/\//i.test(returnUrl)
                ? returnUrl.replace(/\{order_id\}/g, cfOrderId)
                : `http://localhost:3000/?cashfree_order_id=${cfOrderId}`,
          },
        });
      } catch (err: any) {
        cashfreeError = err.message;
      }

      const priorAttempts = Array.from(payments.values()).filter((p) => p.orderId === order.id).length;
      const now = new Date().toISOString();
      const paymentRec = {
        id: `pay_${crypto.randomBytes(5).toString('hex')}`,
        orderId: order.id,
        gateway: 'CASHFREE' as const,
        gatewayReference: cfOrderId,
        paymentSessionId: cashfreeData?.payment_session_id,
        paymentMethod,
        amount: gatewayPayable,
        status: 'PENDING' as const,
        attemptNumber: priorAttempts + 1,
        createdAt: now,
        updatedAt: now,
      };
      payments.set(paymentRec.id, paymentRec);

      deps.getPaymentIntentsMap().set(intentId, {
        intentId,
        orderId: order.id,
        amount: gatewayPayable,
        currency: 'INR',
        status: 'CREATED',
        merchantUpi: 'primebazaar@icici',
        upiIntentUrl: `upi://pay?pa=primebazaar@icici&pn=Prime+Bazaar&am=${gatewayPayable}&cu=INR&tr=${cfOrderId}`,
        gatewayReference: cfOrderId,
        cashfreeOrderId: cfOrderId,
        cashfreeCfOrderId: cashfreeData?.cf_order_id,
        paymentSessionId: cashfreeData?.payment_session_id,
        cashfreeEnv: cf.env,
        createdAt: now,
      });

      order.paymentStatus = 'PENDING';
      res.status(201).json({
        success: true,
        intentId,
        paymentId: paymentRec.id,
        attemptNumber: paymentRec.attemptNumber,
        amount: gatewayPayable,
        cashfree: {
          configured: cf.configured,
          orderId: cfOrderId,
          paymentSessionId: cashfreeData?.payment_session_id || null,
          error: cashfreeError,
        },
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // 3. GST TAX INVOICES, CREDIT NOTES & REFUNDS
  // =========================================================================

  router.get('/orders/:orderId/invoices', requireAuth, (req, res) => {
    const order = deps.getOrdersMap().get(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
    if (req.auth!.role === 'CUSTOMER' && order.userId && order.userId !== req.auth!.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden.' });
    }
    const result = getInvoicesForOrder(order.id);
    res.json({ success: true, ...result });
  });

  router.get('/invoices/:invoiceId/download', requireAuth, (req, res) => {
    const inv = taxInvoices.get(req.params.invoiceId);
    if (!inv) return res.status(404).json({ success: false, error: 'Invoice not found.' });
    if (req.auth!.role === 'CUSTOMER' && inv.buyerUserId !== req.auth!.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden.' });
    }
    if (req.auth!.role === 'SELLER' && inv.sellerId !== req.auth!.sellerId) {
      return res.status(403).json({ success: false, error: 'Forbidden.' });
    }

    if (String(req.query.format || 'json').toLowerCase() === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${inv.invoiceNumber.replace(/\//g, '_')}.html"`);
      return res.send(renderTaxInvoiceHtml(inv));
    }
    res.json({ success: true, invoice: inv });
  });

  router.get('/orders/:orderId/shipments', requireAuth, (req, res) => {
    const order = deps.getOrdersMap().get(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
    if (req.auth!.role === 'CUSTOMER' && order.userId && order.userId !== req.auth!.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden.' });
    }
    const list = Array.from(shipments.values()).filter((s) => s.orderId === order.id);
    res.json({ success: true, shipments: list });
  });

  router.post(
    '/orders/:orderId/refunds',
    requireAuth,
    requirePermission('refunds.manage'),
    async (req, res) => {
      try {
        const order = deps.getOrdersMap().get(req.params.orderId);
        if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });

        const {
          amount,
          refundMode = 'ORIGINAL_METHOD',
          reason = 'Admin authorized refund',
          idempotencyKey,
          orderItemId,
          returnId,
        } = req.body || {};

        const result = await initiateOrderRefund({
          orderId: order.id,
          orderUserId: order.userId || 'usr_demo123',
          orderFinalPaidAmount:
            order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTIAL_REFUND'
              ? Number(order.finalGatewayPayable ?? order.totalAmount)
              : 0,
          orderTotalWithWallets: Number(order.totalAmount || 0),
          paymentMethod: order.paymentMethod || 'cashfree',
          amount: Number(amount),
          refundMode: refundMode === 'STORE_CREDIT' ? 'STORE_CREDIT' : 'ORIGINAL_METHOD',
          reason,
          idempotencyKey: idempotencyKey || `rfk_${order.id}_${Date.now()}`,
          orderItemId,
          returnId,
          actorId: req.auth!.userId,
          actorName: req.auth!.name || 'Finance Admin',
          onOrderRefundStateChange: (newStatus) => {
            order.paymentStatus = newStatus;
          },
        });

        res.status(result.duplicate ? 200 : 201).json({
          success: true,
          duplicate: result.duplicate,
          refund: result.refund,
          creditNote: result.creditNote || null,
          orderPaymentStatus: order.paymentStatus,
        });
      } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
      }
    }
  );

  router.post(
    '/refunds/:refundId/sync',
    requireAuth,
    requirePermission('refunds.manage'),
    async (req, res) => {
      try {
        const refund = refunds.get(req.params.refundId);
        if (!refund) return res.status(404).json({ success: false, error: 'Refund not found.' });
        const order = deps.getOrdersMap().get(refund.orderId);
        const maxCap = Math.max(
          getCapturedPaidAmountForOrder(refund.orderId),
          Number(order?.finalGatewayPayable ?? order?.totalAmount ?? 0)
        );
        const updated = await syncRefundStatusFromProvider({
          refundId: refund.id,
          maxCapForMode: maxCap,
          actorId: req.auth!.userId,
          actorName: req.auth!.name || 'Finance Admin',
          onOrderRefundStateChange: (newStatus) => {
            if (order) order.paymentStatus = newStatus;
          },
        });
        res.json({ success: true, refund: updated, orderPaymentStatus: order?.paymentStatus });
      } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
      }
    }
  );

  // =========================================================================
  // 4. ADMIN FINANCE: GIFT CARDS, STORE CREDITS, LEDGER, RECONCILIATION & EXPORTS
  // =========================================================================

  router.get('/admin/gift-cards', requireAuth, requirePermission('giftcards.manage'), (_req, res) => {
    res.json({ success: true, giftCards: listGiftCards() });
  });

  router.post('/admin/gift-cards', requireAuth, requirePermission('giftcards.manage'), (req, res) => {
    try {
      const { initialAmount, expiresAt, minOrderAmount, recipientEmail, notes } = req.body || {};
      const result = createGiftCard({
        initialAmount: Number(initialAmount),
        expiresAt,
        minOrderAmount: Number(minOrderAmount || 0),
        recipientEmail,
        notes,
        issuedBy: req.auth!.userId,
        actorName: req.auth!.name || 'Finance Admin',
      });
      res.status(201).json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.patch('/admin/gift-cards/:id/status', requireAuth, requirePermission('giftcards.manage'), (req, res) => {
    try {
      const card = updateGiftCardStatus({
        giftCardId: req.params.id,
        isActive: Boolean(req.body?.isActive),
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Finance Admin',
        reason: req.body?.reason,
      });
      res.json({ success: true, giftCard: card });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/admin/store-credits/:userId', requireAuth, requirePermission('storecredits.manage'), (req, res) => {
    const data = getStoreCreditAccount(req.params.userId);
    res.json({ success: true, ...data });
  });

  router.post('/admin/store-credits/issue', requireAuth, requirePermission('storecredits.manage'), async (req, res) => {
    try {
      const { userId, amount, reason } = req.body || {};
      if (!userId || !reason) {
        return res.status(400).json({ success: false, error: 'userId and reason are required.' });
      }
      const resCredit = await creditStoreCredit({
        userId: String(userId).trim(),
        amount: Number(amount),
        type: 'CREDIT_ADMIN',
        reason: String(reason),
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Finance Admin',
      });
      res.status(201).json({ success: true, ...resCredit });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/admin/ledger', requireAuth, requirePermission('finance.read'), (req, res) => {
    const summary = getLedgerSummary({
      sellerId: req.query.sellerId as string | undefined,
      orderId: req.query.orderId as string | undefined,
    });
    res.json({ success: true, ...summary });
  });

  router.post('/admin/ledger/reverse', requireAuth, requirePermission('finance.reconcile'), (req, res) => {
    try {
      const { entryGroupId, reason } = req.body || {};
      if (!entryGroupId || !reason) {
        return res.status(400).json({ success: false, error: 'entryGroupId and reason are required.' });
      }
      const entries = reverseLedgerGroup({
        originalEntryGroupId: String(entryGroupId),
        reason: String(reason),
        createdBy: req.auth!.userId,
      });
      res.status(201).json({ success: true, reversedEntries: entries });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/admin/reconciliation/run', requireAuth, requirePermission('finance.reconcile'), async (req, res) => {
    try {
      const { fromDate, toDate, providerRecords } = req.body || {};
      const internalList = Array.from(payments.values()).filter((p) => p.gateway === 'CASHFREE');

      let resolvedProvider = Array.isArray(providerRecords) ? providerRecords : [];
      if (resolvedProvider.length === 0 && getCashfreeRuntimeConfig().configured) {
        const transport = getCashfreeTransport();
        for (const p of internalList.slice(0, 25)) {
          try {
            const st = await transport.getOrderStatus(p.gatewayReference);
            resolvedProvider.push({
              cashfreeOrderId: st.order_id || p.gatewayReference,
              cashfreePaymentId: st.cf_order_id,
              amount: Number(st.order_amount || p.amount),
              status: st.order_status || 'PENDING',
            });
          } catch {
            // Unmatched if provider lookup fails
          }
        }
      }

      const run = runCashfreeReconciliation({
        fromDate: fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        toDate: toDate || new Date().toISOString(),
        runBy: req.auth!.userId,
        internalPayments: internalList,
        providerRecords: resolvedProvider,
      });

      recordAuditLog({
        actorType: 'ADMIN',
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Finance Admin',
        actorRole: 'ADMIN',
        action: 'CASHFREE_RECONCILIATION_RUN',
        entityType: 'RECONCILIATION',
        entityId: run.id,
        afterState: {
          totalChecked: run.totalChecked,
          matchedCount: run.matchedCount,
          unmatchedCount: run.unmatchedCount,
          mismatchCount: run.mismatchCount,
        },
        details: `Executed reconciliation run ${run.id}: ${run.matchedCount}/${run.totalChecked} matched.`,
        legacyAuditSink: dbAuditLogs,
      });

      res.status(201).json({ success: true, run });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/admin/reconciliation/runs', requireAuth, requirePermission('finance.read'), (_req, res) => {
    res.json({ success: true, runs: reconciliationRuns });
  });

  router.get('/admin/finance/export', requireAuth, requirePermission('finance.export'), async (req, res) => {
    try {
      const reportType = String(req.query.reportType || 'ledger').toLowerCase();
      const format = String(req.query.format || 'csv').toLowerCase() === 'xlsx' ? 'xlsx' : 'csv';
      let headers: string[] = [];
      let rows: Array<Array<any>> = [];

      if (reportType === 'orders') {
        headers = ['Order Number', 'Date', 'Customer', 'Contact', 'Status', 'Payment Status', 'Method', 'Total INR'];
        rows = Array.from(deps.getOrdersMap().values()).map((o) => {
          const masked = maskCustomerContactForExport({ email: o.customerEmail, phone: o.shippingAddress?.phone });
          return [o.orderNumber, o.date, o.shippingAddress?.fullName || 'Customer', masked.email, o.status, o.paymentStatus, o.paymentMethod, o.totalAmount];
        });
      } else if (reportType === 'reconciliation') {
        const latest = reconciliationRuns[0];
        headers = ['Run ID', 'Cashfree Order', 'Internal Amount', 'Provider Amount', 'Match Status', 'Notes'];
        rows = latest
          ? latest.items.map((it) => [latest.id, it.cashfreeOrderId || '-', it.internalAmount, it.providerAmount, it.matchStatus, it.notes])
          : [];
      } else if (reportType === 'refunds') {
        headers = ['Refund ID', 'Order ID', 'Reference', 'Mode', 'Amount INR', 'Status', 'Created At'];
        rows = Array.from(refunds.values()).map((r) => [r.id, r.orderId, r.transactionReference, r.refundMode, r.amount, r.status, r.createdAt]);
      } else if (reportType === 'settlements') {
        headers = ['Settlement ID', 'Seller', 'Bank Account', 'Net Payout INR', 'Status', 'UTR', 'Requested At'];
        rows = dbSettlements.map((s) => [s.id, s.sellerName, maskBankAccountNumber(s.bankAccount), s.netPayout, s.status, s.utrNumber || '-', s.requestedAt]);
      } else {
        const summary = getLedgerSummary();
        headers = ['Entry ID', 'Group ID', 'Account Code', 'Side', 'Amount INR', 'Order ID', 'Seller ID', 'Reference', 'Description', 'Created At'];
        rows = summary.entries.map((e) => [e.id, e.entryGroupId, e.accountCode, e.entryType, e.amount, e.orderId || '-', e.sellerId || '-', e.referenceNumber, e.description, e.createdAt]);
      }

      const exported = await generateFinanceExport({
        format,
        reportType,
        headers,
        rows,
        filters: { reportType, format },
        requestedBy: req.auth!.userId,
        actorName: req.auth!.name || 'Finance Admin',
      });

      res.setHeader('Content-Type', exported.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
      res.send(exported.buffer);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/admin/finance/export-audits', requireAuth, requirePermission('finance.read'), (_req, res) => {
    res.json({ success: true, audits: financeExportAudits });
  });

  router.post('/admin/invoices/:invoiceId/credit-note', requireAuth, requirePermission('refunds.manage'), (req, res) => {
    try {
      const { refundAmount, reason, refundId } = req.body || {};
      const cn = issueCreditNoteForInvoice({
        invoiceId: req.params.invoiceId,
        refundId,
        refundAmount: Number(refundAmount),
        reason: String(reason || 'Manual invoice credit adjustment'),
        issuedBy: req.auth!.userId,
        actorName: req.auth!.name || 'Finance Admin',
      });
      res.status(201).json({ success: true, creditNote: cn });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/admin/invoices', requireAuth, requirePermission('finance.read'), (_req, res) => {
    res.json({
      success: true,
      invoices: Array.from(taxInvoices.values()),
      creditNotes: Array.from(creditNotes.values()),
    });
  });

  router.post('/admin/settlements/:id/disburse', requireAuth, requirePermission('settlements.approve'), (req, res) => {
    try {
      const result = approveSellerSettlement({
        settlementId: req.params.id,
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Finance Admin',
        utrNumber: req.body?.utrNumber,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // 5. WAREHOUSES, MULTI-WAREHOUSE INVENTORY, TRANSFERS, SHIPMENTS & OTP
  // =========================================================================

  router.get('/warehouses', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => {
    const sellerFilter = req.auth!.role === 'SELLER' ? req.auth!.sellerId : (req.query.sellerId as string | undefined);
    res.json({ success: true, warehouses: listWarehouses(sellerFilter) });
  });

  router.post('/warehouses', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => {
    try {
      const sellerId = req.auth!.role === 'SELLER' ? req.auth!.sellerId : req.body?.sellerId || null;
      const wh = createWarehouse({
        ...req.body,
        sellerId,
        actorId: req.auth!.userId,
        actorName: req.auth!.name || req.auth!.role,
        actorRole: req.auth!.role,
      });
      res.status(201).json({ success: true, warehouse: wh });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/warehouses/inventory', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => {
    const sellerId = req.auth!.role === 'SELLER' ? req.auth!.sellerId : (req.query.sellerId as string | undefined);
    const items = getWarehouseInventoryList({
      warehouseId: req.query.warehouseId as string | undefined,
      sellerId,
      lowStockOnly: req.query.lowStockOnly === 'true',
    });
    res.json({ success: true, inventory: items });
  });

  router.put('/warehouses/:warehouseId/inventory', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
      const wh = warehouses.get(req.params.warehouseId);
      if (!wh) return res.status(404).json({ success: false, error: 'Warehouse not found.' });
      if (req.auth!.role === 'SELLER' && wh.sellerId !== req.auth!.sellerId) {
        return res.status(403).json({ success: false, error: 'Forbidden: Warehouse belongs to another seller.' });
      }
      const { variantId, sku, productId, productTitle, availableQty, quantityDelta, damagedDelta, lowStockThreshold, notes } = req.body || {};
      const updated = await upsertWarehouseStock({
        warehouseId: wh.id,
        variantId: String(variantId || productId),
        sku,
        productId: String(productId || variantId),
        productTitle: String(productTitle || variantId),
        absoluteAvailableQty: typeof availableQty === 'number' ? availableQty : undefined,
        quantityDelta: typeof quantityDelta === 'number' ? quantityDelta : undefined,
        damagedDelta: typeof damagedDelta === 'number' ? damagedDelta : undefined,
        lowStockThreshold: typeof lowStockThreshold === 'number' ? lowStockThreshold : undefined,
        movementType: 'AUDIT_CORRECTION',
        referenceId: `MANUAL_${req.auth!.userId}`,
        notes,
      });
      res.json({ success: true, item: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/warehouses/transfers', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => {
    const all = Array.from(warehouseTransfers.values());
    if (req.auth!.role === 'SELLER') {
      const myWhIds = new Set(listWarehouses(req.auth!.sellerId).map((w) => w.id));
      return res.json({
        success: true,
        transfers: all.filter((t) => myWhIds.has(t.fromWarehouseId) || myWhIds.has(t.toWarehouseId)),
      });
    }
    res.json({ success: true, transfers: all });
  });

  router.post('/warehouses/transfers', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
      const { fromWarehouseId, toWarehouseId, variantId, quantity, notes } = req.body || {};
      if (req.auth!.role === 'SELLER') {
        const fromWh = warehouses.get(fromWarehouseId);
        const toWh = warehouses.get(toWarehouseId);
        if (fromWh?.sellerId !== req.auth!.sellerId || toWh?.sellerId !== req.auth!.sellerId) {
          return res.status(403).json({ success: false, error: 'Forbidden: Sellers can only transfer between their own warehouses.' });
        }
      }
      const transfer = await createWarehouseTransfer({
        fromWarehouseId,
        toWarehouseId,
        variantId,
        quantity: Number(quantity),
        initiatedBy: req.auth!.userId,
        notes,
      });
      res.status(201).json({ success: true, transfer });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/warehouses/transfers/:id/complete', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
      const transfer = await completeWarehouseTransfer({
        transferId: req.params.id,
        actorId: req.auth!.userId,
      });
      res.json({ success: true, transfer });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/shipments/create', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
      const { suborderId, orderId, warehouseId } = req.body || {};
      const so = suborderId ? dbSellerOrders.get(suborderId) : undefined;
      const ord = deps.getOrdersMap().get(orderId || so?.orderId || '');
      if (!ord && !so) return res.status(404).json({ success: false, error: 'Order or suborder not found.' });

      const targetSellerId = so?.sellerId || req.body?.sellerId || req.auth!.sellerId || 'seller-1';
      if (req.auth!.role === 'SELLER' && targetSellerId !== req.auth!.sellerId) {
        return res.status(403).json({ success: false, error: 'Forbidden: Cannot create shipment for another seller.' });
      }

      const resolvedWhId =
        warehouseId ||
        (warehouses.has(`wh-${targetSellerId}`) ? `wh-${targetSellerId}` : 'wh-mum-central');

      const dest = so?.shippingAddress || ord?.shippingAddress;
      const shp = await createCarrierShipment({
        orderId: ord?.id || so!.orderId,
        sellerOrderId: so?.id,
        sellerId: targetSellerId,
        warehouseId: resolvedWhId,
        suborderNumber: so?.suborderNumber || ord?.orderNumber || `PB-${Date.now()}`,
        destination: {
          fullName: dest?.fullName || 'Shopper',
          phone: dest?.phone || '9876543210',
          street: dest?.street || 'Destination Street',
          city: dest?.city || 'Mumbai',
          state: dest?.state || 'Maharashtra',
          pinCode: dest?.pinCode || '400001',
        },
        items: (so?.items || ord?.items || []).map((it: any) => ({
          title: it.title || it.product?.title || 'Item',
          sku: it.sku || it.product?.sku || 'SKU',
          quantity: Number(it.quantity || 1),
          unitPrice: Number(it.unitPrice || it.priceAtPurchase || 999),
        })),
        weightGrams: 500,
        paymentMethod: ord?.paymentMethod || 'cashfree',
        orderTotal: Number(so?.subtotal || ord?.totalAmount || 999),
      });

      if (so) {
        so.trackingNumber = shp.trackingNumber;
        so.courierPartner = shp.courier;
        so.shippingLabelGenerated = true;
      }

      res.status(201).json({ success: true, shipment: shp });
    } catch (err: any) {
      const status = err.message.includes('not configured') ? 503 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  });

  router.post('/shipments/:id/sync', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
      const shp = await syncShipmentTracking(req.params.id);
      res.json({ success: true, shipment: shp });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/shipments/:id/status', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => {
    try {
      const { action, reason } = req.body || {};
      const shp = markShipmentFailedOrRto({
        shipmentId: req.params.id,
        action,
        reason: String(reason || 'Delivery exception logged'),
        actorId: req.auth!.userId,
      });
      res.json({ success: true, shipment: shp });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/shipments/:id/delivery-otp/generate', requireAuth, requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
      const shp = shipments.get(req.params.id);
      if (!shp) return res.status(404).json({ success: false, error: 'Shipment not found.' });
      const ord = deps.getOrdersMap().get(shp.orderId);
      const resOtp = await generateAndDispatchDeliveryOtp({
        shipmentId: shp.id,
        orderId: shp.orderId,
        recipientEmail: req.body?.email || ord?.customerEmail,
        recipientPhone: req.body?.phone || ord?.shippingAddress?.phone,
        actorId: req.auth!.userId,
      });
      res.status(201).json({ success: true, ...resOtp });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/shipments/:id/delivery-otp/verify', requireAuth, (req, res) => {
    try {
      const { otp } = req.body || {};
      if (!otp) return res.status(400).json({ success: false, error: 'Delivery OTP is required.' });
      const result = verifyDeliveryOtp({
        shipmentId: req.params.id,
        otp: String(otp),
        verifiedBy: req.auth!.userId,
      });
      const ord = deps.getOrdersMap().get(result.shipment.orderId);
      if (ord) ord.status = 'delivered';
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/shipments/:id/delivery-otp/override', requireAuth, requirePermission('delivery.override'), (req, res) => {
    try {
      const shp = adminOverrideDeliveryOtp({
        shipmentId: req.params.id,
        reason: String(req.body?.reason || ''),
        adminId: req.auth!.userId,
        adminName: req.auth!.name || 'Operations Admin',
      });
      const ord = deps.getOrdersMap().get(shp.orderId);
      if (ord) ord.status = 'delivered';
      res.json({ success: true, shipment: shp });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  return router;
}
