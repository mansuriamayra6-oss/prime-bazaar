import express from 'express';
import {
  requireAuth,
  requireRole,
  requireSellerOwnership,
} from './security.ts';

function resolveEffectiveSellerId(req: express.Request, requested?: string): string {
  if (req.auth?.role === 'SELLER' && req.auth.sellerId) {
    return req.auth.sellerId;
  }
  return (requested && requested.trim()) || req.auth?.sellerId || 'seller-1';
}
import {
  getOffersForProduct,
  getSellerOffersBySeller,
  createOrUpdateSellerOffer,
  deleteSellerOffer,
  adjustOfferInventory,
  getSellerSubordersForParentOrder,
} from './marketplaceExpansionService.ts';
import { initiateOrderRefund, payments } from './cashfreeAndPayments.ts';
import { getInvoicesForOrder, issueCreditNoteForInvoice } from './gstInvoiceService.ts';
import { roundMoney } from './financeLedger.ts';
import { recordAuditLog } from './auditAndRbac.ts';
import { dbSellerOrders } from './v1Router.ts';

export interface Phase6RouterDeps {
  getOrdersMap: () => Map<string, any>;
}

export function createPhase6Router(deps: Phase6RouterDeps) {
  const router = express.Router();

  // =========================================================================
  // STAGE 2: MULTI-SELLER OFFERS ON ONE PRODUCT + BUY BOX
  // =========================================================================

  router.get('/products/:productId/offers', (req, res) => {
    const offers = getOffersForProduct(req.params.productId);
    const activeOffers = offers.filter((o) => o.isActive);
    const defaultOffer = activeOffers.find((o) => o.isDefault) || activeOffers[0] || null;
    res.json({
      success: true,
      productId: req.params.productId,
      defaultOffer,
      offers: activeOffers,
      offerCount: activeOffers.length,
    });
  });

  router.get(
    '/seller/offers',
    requireAuth,
    requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'),
    requireSellerOwnership((req) => req.query.sellerId as string | undefined),
    (req, res) => {
      const sellerId = resolveEffectiveSellerId(req, req.query.sellerId as string | undefined);
      const offers = getSellerOffersBySeller(sellerId);
      res.json({ success: true, sellerId, offers });
    }
  );

  router.post(
    '/seller/offers',
    requireAuth,
    requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'),
    requireSellerOwnership((req) => req.body?.sellerId),
    (req, res) => {
      try {
        const sellerId = resolveEffectiveSellerId(req, req.body?.sellerId);
        const offer = createOrUpdateSellerOffer({
          productId: String(req.body?.productId || ''),
          sellerId,
          sellerSku: String(req.body?.sellerSku || ''),
          condition: req.body?.condition,
          price: Number(req.body?.price),
          mrp: req.body?.mrp !== undefined ? Number(req.body.mrp) : undefined,
          stock: Number(req.body?.stock ?? 0),
          deliveryDays: req.body?.deliveryDays !== undefined ? Number(req.body.deliveryDays) : undefined,
          shippingFee: req.body?.shippingFee !== undefined ? Number(req.body.shippingFee) : undefined,
          codAvailable: req.body?.codAvailable,
          variants: req.body?.variants,
          isActive: req.body?.isActive,
          actorId: req.auth!.userId,
          actorName: req.auth!.name || 'Seller',
          actorRole: req.auth!.role,
        });
        res.status(201).json({ success: true, offer });
      } catch (err: any) {
        res.status(err?.statusCode || 400).json({ success: false, error: err.message });
      }
    }
  );

  router.put(
    '/seller/offers/:offerId',
    requireAuth,
    requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'),
    (req, res) => {
      try {
        const sellerId = resolveEffectiveSellerId(req, req.body?.sellerId);
        const existingProductId = String(req.body?.productId || '');
        const existingOffer = existingProductId
          ? getOffersForProduct(existingProductId).find((o) => o.id === req.params.offerId)
          : undefined;
        const resolvedProductId = existingOffer?.productId || existingProductId || 'prod-1';

        const offer = createOrUpdateSellerOffer({
          offerId: req.params.offerId,
          productId: resolvedProductId,
          sellerId,
          sellerSku: String(req.body?.sellerSku || ''),
          condition: req.body?.condition,
          price: Number(req.body?.price),
          mrp: req.body?.mrp !== undefined ? Number(req.body.mrp) : undefined,
          stock: Number(req.body?.stock ?? 0),
          deliveryDays: req.body?.deliveryDays !== undefined ? Number(req.body.deliveryDays) : undefined,
          shippingFee: req.body?.shippingFee !== undefined ? Number(req.body.shippingFee) : undefined,
          codAvailable: req.body?.codAvailable,
          variants: req.body?.variants,
          isActive: req.body?.isActive,
          actorId: req.auth!.userId,
          actorName: req.auth!.name || 'Seller',
          actorRole: req.auth!.role,
        });
        res.json({ success: true, offer });
      } catch (err: any) {
        res.status(err?.statusCode || 400).json({ success: false, error: err.message });
      }
    }
  );

  router.delete(
    '/seller/offers/:offerId',
    requireAuth,
    requireRole('SELLER', 'ADMIN', 'SUPER_ADMIN'),
    (req, res) => {
      try {
        const sellerId = resolveEffectiveSellerId(req, req.query.sellerId as string | undefined);
        const offer = deleteSellerOffer({
          offerId: req.params.offerId,
          sellerId,
          actorId: req.auth!.userId,
          actorName: req.auth!.name || 'Seller',
          actorRole: req.auth!.role,
        });
        res.json({ success: true, offer });
      } catch (err: any) {
        res.status(err?.statusCode || 400).json({ success: false, error: err.message });
      }
    }
  );

  // =========================================================================
  // STAGE 3: SPLIT ORDERS & PER-SUBORDER FULFILLMENT / PARTIAL CANCELLATION
  // =========================================================================

  router.get('/orders/:orderId/suborders', requireAuth, (req, res) => {
    const order = deps.getOrdersMap().get(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }
    if (req.auth!.role === 'CUSTOMER' && order.userId && order.userId !== req.auth!.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden.' });
    }

    let suborders = getSellerSubordersForParentOrder(order.id);
    if (req.auth!.role === 'SELLER' && req.auth!.sellerId) {
      suborders = suborders.filter((so) => so.sellerId === req.auth!.sellerId);
    }

    res.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      parentStatus: order.status,
      paymentStatus: order.paymentStatus,
      suborders,
    });
  });

  router.post('/orders/:orderId/suborders/:suborderId/cancel', requireAuth, async (req, res) => {
    try {
      const order = deps.getOrdersMap().get(req.params.orderId);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found.' });
      }
      const suborder = dbSellerOrders.get(req.params.suborderId);
      if (!suborder || suborder.orderId !== order.id) {
        return res.status(404).json({ success: false, error: 'Seller suborder not found for this order.' });
      }

      if (req.auth!.role === 'CUSTOMER' && order.userId && order.userId !== req.auth!.userId) {
        return res.status(403).json({ success: false, error: 'Forbidden.' });
      }
      if (req.auth!.role === 'SELLER' && suborder.sellerId !== req.auth!.sellerId) {
        return res.status(403).json({ success: false, error: 'Forbidden: Suborder belongs to another seller.' });
      }
      if (suborder.fulfillmentStatus === 'DELIVERED') {
        return res.status(400).json({ success: false, error: 'Delivered suborder cannot be cancelled. Request a return instead.' });
      }
      if (suborder.fulfillmentStatus === 'CANCELLED') {
        return res.json({ success: true, message: 'Suborder is already cancelled.', suborder, order });
      }

      const reason = String(req.body?.reason || 'Partial cancellation of seller fulfillment group');
      suborder.fulfillmentStatus = 'CANCELLED';
      suborder.cancellationReason = reason;
      suborder.updatedAt = new Date().toISOString();

      // Restore offer stock strictly for this suborder's items
      for (const item of suborder.items || []) {
        if (item.offerId) {
          try {
            adjustOfferInventory(item.offerId, Number(item.quantity || 1));
          } catch {
            // ignore if offer deleted
          }
        }
      }

      // Compute proportional refundable amount for this suborder
      const suborderProportion = Math.min(
        1,
        roundMoney((suborder.subtotal + (suborder.shippingFee || 0)) / Math.max(1, Number(order.totalAmount || 1)))
      );
      let refundResult: any = null;
      if (order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTIAL_REFUND') {
        const requestedMode = req.body?.refundMode === 'STORE_CREDIT' ? 'STORE_CREDIT' : 'ORIGINAL_METHOD';
        const hasCashfreePaid = Array.from(payments.values()).some(
          (p) => p.orderId === order.id && p.gateway === 'CASHFREE' && p.status === 'PAID'
        );
        const refundablePool =
          requestedMode === 'STORE_CREDIT'
            ? Number(order.totalAmount || 0)
            : Number(order.finalGatewayPayable ?? order.totalAmount ?? 0);
        const subRefundAmount = roundMoney(Math.max(1, refundablePool * suborderProportion));

        if ((requestedMode === 'STORE_CREDIT' || hasCashfreePaid) && subRefundAmount > 0) {
          const invData = getInvoicesForOrder(order.id);
          const sellerInv = (invData.invoices || []).find((i: any) => i.sellerOrderId === suborder.id);

          refundResult = await initiateOrderRefund({
            orderId: order.id,
            orderUserId: order.userId || req.auth!.userId,
            orderFinalPaidAmount: Number(order.finalGatewayPayable ?? order.totalAmount ?? 0),
            orderTotalWithWallets: Number(order.totalAmount || 0),
            paymentMethod: order.paymentMethod || 'cashfree',
            amount: subRefundAmount,
            refundMode: requestedMode,
            reason: `${reason} (${suborder.suborderNumber})`,
            idempotencyKey: `subcancel_${suborder.id}`,
            invoiceId: sellerInv?.id,
            actorId: req.auth!.userId,
            actorName: req.auth!.name || 'Suborder Cancellation',
            onOrderRefundStateChange: (newStatus) => {
              order.paymentStatus = newStatus;
            },
          });
        }
      }

      const allSuborders = getSellerSubordersForParentOrder(order.id);
      const everySuborderCancelled =
        allSuborders.length > 0 && allSuborders.every((s) => s.fulfillmentStatus === 'CANCELLED');
      if (everySuborderCancelled) {
        order.status = 'cancelled';
      }

      order.trackingCheckpoints = order.trackingCheckpoints || [];
      order.trackingCheckpoints.push({
        title: `Suborder ${suborder.suborderNumber} Cancelled`,
        description: `${suborder.sellerName}: ${reason}`,
        timestamp: new Date().toLocaleTimeString(),
        done: true,
        location: suborder.sellerName,
      });

      recordAuditLog({
        actorType: req.auth!.role === 'ADMIN' || req.auth!.role === 'SUPER_ADMIN' ? 'ADMIN' : req.auth!.role === 'SELLER' ? 'SELLER' : 'CUSTOMER',
        actorId: req.auth!.userId,
        actorName: req.auth!.name || 'Customer',
        actorRole: req.auth!.role,
        action: 'SUBORDER_CANCELLED',
        entityType: 'SELLER_ORDER',
        entityId: suborder.id,
        details: `Cancelled suborder ${suborder.suborderNumber} for seller ${suborder.sellerName}. AllCancelled=${everySuborderCancelled}`,
      });

      res.json({
        success: true,
        suborder,
        order,
        allSubordersCancelled: everySuborderCancelled,
        refund: refundResult?.refund || null,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/orders/:orderId/suborders/:suborderId/return', requireAuth, (req, res) => {
    const order = deps.getOrdersMap().get(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }
    const suborder = dbSellerOrders.get(req.params.suborderId);
    if (!suborder || suborder.orderId !== order.id) {
      return res.status(404).json({ success: false, error: 'Seller suborder not found for this order.' });
    }
    if (req.auth!.role === 'CUSTOMER' && order.userId && order.userId !== req.auth!.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden.' });
    }
    if (suborder.fulfillmentStatus === 'CANCELLED') {
      return res.status(400).json({ success: false, error: 'Cannot return a cancelled suborder.' });
    }

    const reason = String(req.body?.reason || 'Item mismatch or size exchange');
    suborder.fulfillmentStatus = 'RETURNED';
    suborder.returnReason = reason;
    suborder.updatedAt = new Date().toISOString();

    order.trackingCheckpoints = order.trackingCheckpoints || [];
    order.trackingCheckpoints.push({
      title: `Return Scheduled (${suborder.suborderNumber})`,
      description: `${suborder.sellerName}: ${reason}`,
      timestamp: new Date().toLocaleTimeString(),
      done: true,
      location: 'Reverse Pickup Hub',
    });

    recordAuditLog({
      actorType: req.auth!.role === 'ADMIN' || req.auth!.role === 'SUPER_ADMIN' ? 'ADMIN' : req.auth!.role === 'SELLER' ? 'SELLER' : 'CUSTOMER',
      actorId: req.auth!.userId,
      actorName: req.auth!.name || 'Customer',
      actorRole: req.auth!.role,
      action: 'SUBORDER_RETURN_REQUESTED',
      entityType: 'SELLER_ORDER',
      entityId: suborder.id,
      details: `Return authorized for suborder ${suborder.suborderNumber}: ${reason}`,
    });

    res.json({
      success: true,
      suborder,
      order,
      message: `Return authorized strictly for ${suborder.sellerName} (${suborder.suborderNumber}).`,
    });
  });

  return router;
}
