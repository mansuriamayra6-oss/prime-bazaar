import express from 'express';
import crypto from 'crypto';
import { requireAuth, requireRole, requireSellerOwnership } from './security.ts';
import { requirePermission, recordAuditLog } from './auditAndRbac.ts';
import { roundMoney } from './financeLedger.ts';
import {
  calculateAuthoritativeQuote,
  getCashfreeRuntimeConfig,
  getCashfreeTransport,
  initiateOrderRefund,
  payments,
  refunds,
} from './cashfreeAndPayments.ts';
import {
  dbSellers,
  dbSellerWallets,
  dbSettlements,
  dbCommissionRules,
  dbAuditLogs,
} from './v1Router.ts';
import {
  sellerKycRecords,
  sellerBankAccounts,
  sellerPickupAddresses,
  paymentTransactions,
  paymentSplits,
  sellerSettlementRecords,
  paymentWebhookLogs,
  sanitizeBankForApi,
  upsertSellerKyc,
  upsertSellerBankDetails,
  verifySellerBankByAdmin,
  upsertSellerPickupAddress,
  upsertPaymentTransaction,
  computeAndRecordPaymentSplitsForOrder,
  applyRefundToSplitsAndTcs,
  getFinanceDashboardSummary,
  getGstTcsReport,
  getCommissionReport,
  getPaymentReconciliationReport,
} from './paymentFinanceEngine.ts';

export interface FinanceAndPaymentsRouterDeps {
  getOrdersMap: () => Map<string, any>;
  getPaymentIntentsMap: () => Map<string, any>;
  getServerSellersMap: () => Map<string, any>;
}

export function createFinanceAndPaymentsRouter(deps: FinanceAndPaymentsRouterDeps) {
  const router = express.Router();

  // =========================================================================
  // 1. SELLER KYC, BANK DETAILS, PICKUP ADDRESS & SETTLEMENTS
  // =========================================================================

  router.post(
    '/sellers/kyc',
    requireAuth,
    requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'),
    (req, res) => {
      try {
        const requestedSellerId = req.body?.sellerId ? String(req.body.sellerId) : undefined;
        if (
          req.auth!.role === 'SELLER' &&
          requestedSellerId &&
          requestedSellerId !== req.auth!.sellerId
        ) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: You may only submit KYC details for your own seller account.',
          });
        }

        const sellerId =
          req.auth!.role === 'SELLER'
            ? req.auth!.sellerId
            : requestedSellerId || 'seller-1';

        if (!sellerId) {
          return res.status(400).json({ success: false, error: 'sellerId is required.' });
        }

        const kyc = upsertSellerKyc({
          sellerId,
          panNumber: req.body?.panNumber,
          gstin: req.body?.gstin,
          aadhaarLast4: req.body?.aadhaarLast4,
          businessCategory: req.body?.businessCategory,
          panDocumentUrl: req.body?.panDocumentUrl,
          gstDocumentUrl: req.body?.gstDocumentUrl,
          chequeDocumentUrl: req.body?.chequeDocumentUrl,
          actorId: req.auth!.userId,
          actorName: req.auth!.name || 'Seller',
        });

        const serverSeller = deps.getServerSellersMap().get(sellerId);
        if (serverSeller) {
          serverSeller.panNumber = kyc.panNumber;
          if (kyc.gstin) serverSeller.gstNumber = kyc.gstin;
          serverSeller.kycDocuments = { status: kyc.kycStatus.toLowerCase() };
        }

        res.status(200).json({
          success: true,
          message: 'Seller KYC details submitted for compliance verification.',
          kyc,
        });
      } catch (err: any) {
        res.status(400).json({ success: false, error: err?.message || 'Unable to submit KYC details.' });
      }
    }
  );

  router.post(
    '/sellers/bank-details',
    requireAuth,
    requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'),
    (req, res) => {
      try {
        const requestedSellerId = req.body?.sellerId ? String(req.body.sellerId) : undefined;
        if (
          req.auth!.role === 'SELLER' &&
          requestedSellerId &&
          requestedSellerId !== req.auth!.sellerId
        ) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: You may only update bank details for your own seller account.',
          });
        }

        const sellerId =
          req.auth!.role === 'SELLER'
            ? req.auth!.sellerId
            : requestedSellerId || 'seller-1';

        if (!sellerId) {
          return res.status(400).json({ success: false, error: 'sellerId is required.' });
        }

        const bankAccount = upsertSellerBankDetails({
          sellerId,
          accountHolderName: req.body?.accountHolderName,
          accountNumber: req.body?.accountNumber,
          ifscCode: req.body?.ifscCode,
          bankName: req.body?.bankName,
          branchName: req.body?.branchName,
          accountType: req.body?.accountType,
          actorId: req.auth!.userId,
          actorName: req.auth!.name || 'Seller',
        });

        const serverSeller = deps.getServerSellersMap().get(sellerId);
        if (serverSeller) {
          serverSeller.bankAccount = bankAccount;
        }

        res.status(200).json({
          success: true,
          message: 'Bank account saved. Settlements will remain paused until Admin verifies bank details.',
          bankAccount,
        });
      } catch (err: any) {
        res.status(400).json({ success: false, error: err?.message || 'Unable to save bank details.' });
      }
    }
  );

  router.post(
    '/sellers/pickup-address',
    requireAuth,
    requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'),
    (req, res) => {
      try {
        const requestedSellerId = req.body?.sellerId ? String(req.body.sellerId) : undefined;
        if (req.auth!.role === 'SELLER' && requestedSellerId && requestedSellerId !== req.auth!.sellerId) {
          return res.status(403).json({ success: false, error: 'Forbidden.' });
        }
        const sellerId = req.auth!.role === 'SELLER' ? req.auth!.sellerId! : requestedSellerId || 'seller-1';
        const pickupAddress = upsertSellerPickupAddress({
          sellerId,
          label: req.body?.label,
          contactName: req.body?.contactName || req.auth!.name || 'Warehouse Manager',
          phone: req.body?.phone || '+91 90000 00000',
          addressLine1: req.body?.addressLine1 || req.body?.street || '',
          addressLine2: req.body?.addressLine2,
          city: req.body?.city || '',
          state: req.body?.state || '',
          pincode: req.body?.pincode || req.body?.pinCode || '',
        });
        res.status(201).json({ success: true, pickupAddress });
      } catch (err: any) {
        res.status(400).json({ success: false, error: err?.message || 'Unable to save pickup address.' });
      }
    }
  );

  router.get(
    '/sellers/settlements',
    requireAuth,
    requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'),
    requireSellerOwnership((req) => (req.query.sellerId ? String(req.query.sellerId) : undefined)),
    (req, res) => {
      const sellerId =
        req.auth!.role === 'SELLER'
          ? req.auth!.sellerId!
          : (req.query.sellerId ? String(req.query.sellerId) : 'seller-1');

      const wallet = dbSellerWallets.get(sellerId) || {
        sellerId,
        balance: 0,
        pendingSettlement: 0,
        lifetimeEarnings: 0,
        totalWithdrawn: 0,
        currency: 'INR',
      };

      const legacySettlements = dbSettlements.filter((s) => s.sellerId === sellerId);
      const ledgerSettlements = Array.from(sellerSettlementRecords.values()).filter(
        (s) => s.sellerId === sellerId
      );
      const sellerSplits = Array.from(paymentSplits.values()).filter((sp) => sp.sellerId === sellerId);

      // Merge uniquely by id
      const mergedMap = new Map<string, any>();
      for (const s of legacySettlements) mergedMap.set(s.id, s);
      for (const s of ledgerSettlements) {
        if (!mergedMap.has(s.id)) mergedMap.set(s.id, s);
      }

      res.json({
        success: true,
        sellerId,
        wallet,
        kycStatus: sellerKycRecords.get(sellerId)?.kycStatus || 'PENDING',
        bankAccount: sanitizeBankForApi(sellerBankAccounts.get(sellerId)),
        pickupAddresses: sellerPickupAddresses.get(sellerId) || [],
        settlements: Array.from(mergedMap.values()),
        splits: sellerSplits,
      });
    }
  );

  // =========================================================================
  // 2. PAYMENTS: CREATE ORDER, SERVER-SIDE SPLIT & REFUND CREATION
  // =========================================================================

  router.post('/payments/create-order', async (req, res) => {
    try {
      const {
        orderId,
        items,
        couponCode,
        giftCardCode,
        useStoreCredit = false,
        requestedStoreCreditAmount,
        coinsUsed = 0,
        customerName,
        customerPhone,
        customerEmail,
        returnUrl,
        idempotencyKey,
        paymentMethod = 'cashfree',
      } = req.body || {};

      const cleanIdemKey =
        typeof idempotencyKey === 'string' && idempotencyKey.trim()
          ? idempotencyKey.trim()
          : `pay_ord_${crypto.randomBytes(6).toString('hex')}`;

      // Replay existing pending/paid transaction for idempotency
      const existingTxn = Array.from(paymentTransactions.values()).find(
        (t) => t.idempotencyKey === cleanIdemKey
      );
      if (existingTxn) {
        return res.status(200).json({
          success: true,
          duplicate: true,
          paymentTransaction: existingTxn,
          cashfree: {
            configured: getCashfreeRuntimeConfig().configured,
            orderId: existingTxn.cashfreeOrderId,
            paymentSessionId: existingTxn.paymentSessionId,
            environment: getCashfreeRuntimeConfig().env,
          },
        });
      }

      // Compute authoritative amount from existing order OR catalog quote (NEVER trust req.body.amount)
      let authoritativeAmount = 0;
      let targetOrderId = orderId ? String(orderId).trim() : '';
      let matchedOrder: any = null;

      if (targetOrderId) {
        matchedOrder = deps.getOrdersMap().get(targetOrderId);
        if (!matchedOrder) {
          return res.status(404).json({ success: false, error: 'Referenced order not found.' });
        }
        authoritativeAmount = roundMoney(
          Number(matchedOrder.finalGatewayPayable ?? matchedOrder.totalAmount ?? 0)
        );
      } else if (Array.isArray(items) && items.length > 0) {
        const quote = calculateAuthoritativeQuote({
          items,
          couponCode,
          giftCardCode,
          useStoreCredit: Boolean(useStoreCredit),
          requestedStoreCreditAmount:
            requestedStoreCreditAmount !== undefined ? Number(requestedStoreCreditAmount) : undefined,
          userId: req.auth?.userId || 'usr_demo123',
          coinsUsed: Number(coinsUsed || 0),
        });
        authoritativeAmount = quote.finalGatewayPayable;
        targetOrderId = `ord_pending_${crypto.randomBytes(4).toString('hex')}`;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Either an existing orderId or cart items[] are required to initialize payment.',
        });
      }

      if (authoritativeAmount <= 0) {
        const txn = upsertPaymentTransaction({
          orderId: targetOrderId,
          idempotencyKey: cleanIdemKey,
          gateway: 'WALLET_ONLY',
          paymentMethod: 'WALLET_ONLY',
          amount: 0,
          status: 'PAID',
          signatureVerified: true,
          verifiedAt: new Date().toISOString(),
        });
        return res.status(201).json({
          success: true,
          paymentTransaction: txn,
          walletCovered: true,
        });
      }

      const cfConfig = getCashfreeRuntimeConfig();
      const cfOrderId = `pb_cf_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const rawPhone = String(customerPhone || matchedOrder?.shippingAddress?.phone || '9876543210').replace(/\D/g, '');
      const phone10 = rawPhone.length >= 10 ? rawPhone.slice(-10) : '9876543210';
      const fallbackOrigin = (process.env.APP_URL || 'http://localhost:3000').trim().replace(/\/+$/, '');
      const resolvedReturnUrl =
        typeof returnUrl === 'string' && /^https?:\/\//i.test(returnUrl.trim())
          ? returnUrl.trim().replace(/\{order_id\}/g, cfOrderId)
          : `${fallbackOrigin}/?cashfree_order_id=${cfOrderId}`;

      let cashfreeData: any = null;
      let gatewayError: string | null = null;
      try {
        cashfreeData = await getCashfreeTransport().createOrder({
          order_id: cfOrderId,
          order_amount: Math.max(1, authoritativeAmount),
          order_currency: 'INR',
          customer_details: {
            customer_id: `cust_${targetOrderId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)}`,
            customer_name: String(customerName || matchedOrder?.shippingAddress?.fullName || 'Prime Bazaar Shopper').trim(),
            customer_email: String(customerEmail || matchedOrder?.customerEmail || 'shopper@primebazaar.in').trim(),
            customer_phone: phone10,
          },
          order_meta: { return_url: resolvedReturnUrl },
          order_note: `Prime Bazaar Order ${targetOrderId}`,
        });
      } catch (err: any) {
        gatewayError = err?.message || 'Cashfree order creation unavailable.';
      }

      const now = new Date().toISOString();
      const payId = `pay_${crypto.randomBytes(5).toString('hex')}`;
      payments.set(payId, {
        id: payId,
        orderId: targetOrderId,
        idempotencyKey: cleanIdemKey,
        gateway: 'CASHFREE',
        gatewayReference: cfOrderId,
        cfPaymentId: cashfreeData?.cf_order_id ? String(cashfreeData.cf_order_id) : undefined,
        paymentSessionId: cashfreeData?.payment_session_id,
        paymentMethod: String(paymentMethod || 'cashfree'),
        amount: authoritativeAmount,
        status: 'PENDING',
        attemptNumber: 1,
        createdAt: now,
        updatedAt: now,
      });

      const txn = upsertPaymentTransaction({
        orderId: targetOrderId,
        paymentId: payId,
        idempotencyKey: cleanIdemKey,
        gateway: 'CASHFREE',
        cashfreeOrderId: cfOrderId,
        cfPaymentId: cashfreeData?.cf_order_id ? String(cashfreeData.cf_order_id) : undefined,
        paymentSessionId: cashfreeData?.payment_session_id,
        paymentMethod: String(paymentMethod || 'cashfree'),
        amount: authoritativeAmount,
        status: 'PENDING',
        rawGatewayPayload: cashfreeData || (gatewayError ? { error: gatewayError } : undefined),
      });

      // Keep intent store synchronized so existing verify flow can resolve it
      deps.getPaymentIntentsMap().set(txn.id, {
        intentId: txn.id,
        orderId: matchedOrder ? matchedOrder.id : undefined,
        amount: authoritativeAmount,
        currency: 'INR',
        status: 'CREATED',
        merchantUpi: 'primebazaar@icici',
        upiIntentUrl: `upi://pay?pa=primebazaar@icici&pn=Prime+Bazaar&am=${authoritativeAmount}&cu=INR&tr=${cfOrderId}`,
        gatewayReference: cfOrderId,
        cashfreeOrderId: cfOrderId,
        cashfreeCfOrderId: cashfreeData?.cf_order_id,
        paymentSessionId: cashfreeData?.payment_session_id,
        cashfreeEnv: cfConfig.env,
        createdAt: now,
      });

      res.status(201).json({
        success: true,
        orderId: targetOrderId,
        amount: authoritativeAmount,
        currency: 'INR',
        paymentTransaction: txn,
        cashfree: {
          configured: cfConfig.configured,
          orderId: cfOrderId,
          cfOrderId: cashfreeData?.cf_order_id || null,
          paymentSessionId: cashfreeData?.payment_session_id || null,
          environment: cfConfig.env,
          error: gatewayError,
        },
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message || 'Unable to initialize payment order.' });
    }
  });

  router.post('/payments/split', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
      const orderId = String(req.body?.orderId || '').trim();
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'orderId is required.' });
      }
      const order = deps.getOrdersMap().get(orderId);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found.' });
      }

      const txn = Array.from(paymentTransactions.values()).find((t) => t.orderId === order.id);
      const result = await computeAndRecordPaymentSplitsForOrder({
        order,
        transactionId: txn?.id,
        actorId: req.auth!.userId,
      });

      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message || 'Unable to compute payment split.' });
    }
  });

  router.post('/refunds/create', requireAuth, requirePermission('refunds.manage'), async (req, res) => {
    try {
      const { orderId, amount, refundMode = 'ORIGINAL_METHOD', reason, idempotencyKey, orderItemId } = req.body || {};
      const cleanOrderId = String(orderId || '').trim();
      if (!cleanOrderId || !amount || !reason) {
        return res.status(400).json({
          success: false,
          error: 'orderId, positive amount, and reason are required to create a refund.',
        });
      }

      const order = deps.getOrdersMap().get(cleanOrderId);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found.' });
      }

      const refundRes = await initiateOrderRefund({
        orderId: order.id,
        orderItemId,
        orderUserId: order.userId || 'usr_demo123',
        orderFinalPaidAmount: Number(order.finalGatewayPayable ?? order.totalAmount),
        orderTotalWithWallets: Number(order.totalAmount),
        paymentMethod: order.paymentMethod,
        amount: Number(amount),
        refundMode: refundMode === 'STORE_CREDIT' ? 'STORE_CREDIT' : 'ORIGINAL_METHOD',
        reason: String(reason),
        idempotencyKey: idempotencyKey ? String(idempotencyKey) : `rf_${order.id}_${Date.now()}`,
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Finance Admin',
        onOrderRefundStateChange: (newStatus) => {
          order.paymentStatus = newStatus;
        },
      });

      let splitAdjustments: any = { updatedSplits: [], tcsAdjustments: [] };
      if (!refundRes.duplicate) {
        splitAdjustments = applyRefundToSplitsAndTcs({
          orderId: order.id,
          refundAmount: Number(amount),
          orderTotal: Number(order.totalAmount),
          reason: String(reason),
        });
      }

      res.status(refundRes.duplicate ? 200 : 201).json({
        success: true,
        ...refundRes,
        ...splitAdjustments,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message || 'Refund creation failed.' });
    }
  });

  // =========================================================================
  // 3. ADMIN FINANCE REPORTS, RECONCILIATION, TCS, COMMISSION & CONTROLS
  // =========================================================================

  router.get('/admin/payment-reconciliation', requireAuth, requirePermission('finance.read'), (_req, res) => {
    const report = getPaymentReconciliationReport(deps.getOrdersMap());
    res.json({ success: true, ...report });
  });

  router.get('/admin/gst-tcs-report', requireAuth, requirePermission('finance.read'), (req, res) => {
    const report = getGstTcsReport({
      sellerId: req.query.sellerId ? String(req.query.sellerId) : undefined,
      filingPeriod: req.query.filingPeriod ? String(req.query.filingPeriod) : undefined,
    });
    res.json({ success: true, ...report });
  });

  router.get('/admin/commission-report', requireAuth, requirePermission('finance.read'), (req, res) => {
    const report = getCommissionReport({
      sellerId: req.query.sellerId ? String(req.query.sellerId) : undefined,
      billingPeriod: req.query.billingPeriod ? String(req.query.billingPeriod) : undefined,
    });
    res.json({ success: true, ...report });
  });

  router.get('/admin/finance/dashboard', requireAuth, requirePermission('finance.read'), (_req, res) => {
    const summary = getFinanceDashboardSummary(deps.getOrdersMap());
    const sellersList = Array.from(dbSellers.values()).map((seller) => ({
      id: seller.id,
      businessName: seller.businessName,
      sellerName: seller.sellerName,
      email: seller.email,
      gstNumber: seller.gstNumber,
      approvalStatus: seller.approvalStatus,
      kyc: sellerKycRecords.get(seller.id) || null,
      bankAccount: sanitizeBankForApi(sellerBankAccounts.get(seller.id)),
      wallet: dbSellerWallets.get(seller.id) || null,
      pickupAddressCount: (sellerPickupAddresses.get(seller.id) || []).length,
    }));

    const mergedSettlementsMap = new Map<string, any>();
    for (const s of dbSettlements) mergedSettlementsMap.set(s.id, s);
    for (const s of sellerSettlementRecords.values()) {
      if (!mergedSettlementsMap.has(s.id)) mergedSettlementsMap.set(s.id, s);
    }

    res.json({
      success: true,
      ...summary,
      splits: Array.from(paymentSplits.values()),
      sellers: sellersList,
      settlements: Array.from(mergedSettlementsMap.values()),
      refunds: Array.from(refunds.values()),
      commissionRules: Array.from(dbCommissionRules.values()),
      webhookLogs: paymentWebhookLogs.slice(0, 50),
    });
  });

  router.get('/admin/refunds', requireAuth, requirePermission('finance.read'), (_req, res) => {
    res.json({
      success: true,
      refunds: Array.from(refunds.values()),
    });
  });

  router.post(
    '/admin/sellers/:sellerId/verify-bank',
    requireAuth,
    requireRole('ADMIN', 'SUPER_ADMIN'),
    (req, res) => {
      try {
        const verified = req.body?.verified !== false;
        const bankAccount = verifySellerBankByAdmin({
          sellerId: req.params.sellerId,
          verified,
          notes: req.body?.notes,
          actorId: req.auth!.userId,
          actorName: req.auth!.name || 'Finance Admin',
        });
        res.json({
          success: true,
          message: verified ? 'Seller bank account verified.' : 'Seller bank verification rejected.',
          bankAccount,
        });
      } catch (err: any) {
        res.status(400).json({ success: false, error: err?.message || 'Unable to update bank verification.' });
      }
    }
  );

  router.patch(
    '/admin/commission-rules/:categorySlug',
    requireAuth,
    requireRole('ADMIN', 'SUPER_ADMIN'),
    (req, res) => {
      const slug = req.params.categorySlug;
      const rule = dbCommissionRules.get(slug) || Array.from(dbCommissionRules.values()).find((r) => r.id === slug);
      if (!rule) {
        return res.status(404).json({ success: false, error: 'Commission rule not found.' });
      }
      const nextPercent = Number(req.body?.commissionPercent);
      if (!Number.isFinite(nextPercent) || nextPercent < 0 || nextPercent > 45) {
        return res.status(400).json({ success: false, error: 'commissionPercent must be between 0 and 45.' });
      }

      const prevPercent = rule.commissionPercent;
      rule.commissionPercent = roundMoney(nextPercent);
      if (req.body?.minCommissionAmount !== undefined) {
        const minAmt = Number(req.body.minCommissionAmount);
        if (Number.isFinite(minAmt) && minAmt >= 0) {
          rule.minCommissionAmount = roundMoney(minAmt);
        }
      }
      rule.updatedAt = new Date().toISOString();

      recordAuditLog({
        actorType: 'ADMIN',
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Admin',
        actorRole: req.auth!.role,
        action: 'COMMISSION_RULE_UPDATED',
        entityType: 'COMMISSION_RULE',
        entityId: rule.id,
        beforeState: { commissionPercent: prevPercent },
        afterState: { commissionPercent: rule.commissionPercent, minCommissionAmount: rule.minCommissionAmount },
        details: `Updated commission rule ${rule.categoryName} (${rule.categorySlug}) from ${prevPercent}% to ${rule.commissionPercent}%.`,
        legacyAuditSink: dbAuditLogs,
      });

      res.json({ success: true, rule });
    }
  );

  return router;
}
