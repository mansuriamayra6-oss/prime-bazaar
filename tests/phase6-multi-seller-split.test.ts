import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import http from 'http';

process.env.PRIMEBAZAAR_TEST_MODE = '1';
process.env.CASHFREE_WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET || 'cf_test_webhook_secret_phase6';
process.env.ADMIN_ACCESS_PASS = process.env.ADMIN_ACCESS_PASS || 'AdminPhase6TestPass!9';

const { app } = await import('../server');
const { createSession } = await import('../src/server/security');
const { ensureWarehousesSeeded } = await import('../src/server/warehouseAndShipping');

let server: http.Server;
let baseUrl = '';
let seller1Token = '';
let seller2Token = '';
let customerToken = '';

async function requestJson(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
  } = {}
) {
  const headers: Record<string, string> = {};
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
  let bodyPayload: string | undefined;
  if (options.body !== undefined) {
    bodyPayload = JSON.stringify(options.body);
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: bodyPayload,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

beforeAll(async () => {
  ensureWarehousesSeeded();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  seller1Token = createSession({
    userId: 'usr_seller_1',
    role: 'SELLER',
    sellerId: 'seller-1',
    email: 'tripathi.devendra@weaverscraft.in',
    name: 'Varanasi Weavers Co.',
  }).token;

  seller2Token = createSession({
    userId: 'usr_seller_2',
    role: 'SELLER',
    sellerId: 'seller-2',
    email: 'studio@mumbaistreet.in',
    name: 'Mumbai Street Studio',
  }).token;

  const custRes = await requestJson('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Multi Seller Buyer',
      email: `buyer.multi.${Date.now()}@primebazaar.in`,
      phone: '+91 98101 77001',
      password: 'Phase6MultiSeller!9',
    },
  });
  expect(custRes.status).toBe(201);
  customerToken = custRes.json.token;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Phase 6B & 6C: Multi-Seller Offers, Buy Box & Split-Order Fulfillment', () => {
  test('Public offers API returns multiple competing seller offers sorted with Buy Box winner first', async () => {
    const res = await requestJson('/api/products/prod-1/offers');
    expect(res.status).toBe(200);
    expect(res.json.offerCount).toBeGreaterThanOrEqual(2);
    expect(res.json.defaultOffer).toBeDefined();
    expect(res.json.defaultOffer.isDefault).toBe(true);
    expect(res.json.offers[0].id).toBe(res.json.defaultOffer.id);
  });

  test('Seller ownership isolation prevents Seller 2 from mutating Seller 1 offers', async () => {
    const createRes = await requestJson('/api/v1/seller/offers', {
      method: 'POST',
      token: seller1Token,
      body: {
        productId: 'prod-4',
        sellerSku: 'S1-JWL-401',
        condition: 'NEW',
        price: 1299,
        mrp: 2499,
        stock: 15,
        deliveryDays: 2,
      },
    });
    expect(createRes.status).toBe(201);
    const offerId = createRes.json.offer.id;

    // Cross-seller update rejected with 403
    const attackUpdate = await requestJson(`/api/v1/seller/offers/${offerId}`, {
      method: 'PUT',
      token: seller2Token,
      body: {
        productId: 'prod-4',
        sellerSku: 'HACK-SKU',
        price: 1,
        mrp: 100,
        stock: 99,
      },
    });
    expect(attackUpdate.status).toBe(403);

    // Cross-seller delete rejected with 403
    const attackDelete = await requestJson(`/api/v1/seller/offers/${offerId}`, {
      method: 'DELETE',
      token: seller2Token,
    });
    expect(attackDelete.status).toBe(403);

    // Owner update succeeds
    const ownerUpdate = await requestJson(`/api/v1/seller/offers/${offerId}`, {
      method: 'PUT',
      token: seller1Token,
      body: {
        productId: 'prod-4',
        sellerSku: 'S1-JWL-401',
        price: 1249,
        mrp: 2499,
        stock: 25,
        deliveryDays: 2,
      },
    });
    expect(ownerUpdate.status).toBe(200);
    expect(ownerUpdate.json.offer.price).toBe(1249);
    expect(ownerUpdate.json.offer.stock).toBe(25);
  });

  test('Multi-seller single checkout splits into independent SellerOrders, enforces offer pricing/stock, and supports partial suborder cancellation', async () => {
    // Pick Seller 2 offer on prod-1 (1949 INR) + Seller 1 offer on prod-2 (1549 INR)
    const offersProd1 = await requestJson('/api/products/prod-1/offers');
    const seller2OfferProd1 = offersProd1.json.offers.find((o: any) => o.sellerId === 'seller-2');
    expect(seller2OfferProd1).toBeDefined();
    const initialStockOffer = seller2OfferProd1.stock;

    const offersProd2 = await requestJson('/api/products/prod-2/offers');
    const seller1OfferProd2 = offersProd2.json.offers.find((o: any) => o.sellerId === 'seller-1');
    expect(seller1OfferProd2).toBeDefined();

    // Server-authoritative quote uses offer prices ignoring tampered client price
    const quoteRes = await requestJson('/api/checkout/quote', {
      method: 'POST',
      token: customerToken,
      body: {
        items: [
          { productId: 'prod-1', offerId: seller2OfferProd1.id, selectedSize: 'M', quantity: 2, price: 1 },
          { productId: 'prod-2', offerId: seller1OfferProd2.id, selectedSize: 'L', quantity: 1, price: 1 },
        ],
      },
    });
    expect(quoteRes.status).toBe(200);
    const expectedSubtotal = seller2OfferProd1.price * 2 + seller1OfferProd2.price * 1;
    expect(quoteRes.json.quote.itemsSubtotal).toBe(expectedSubtotal);
    expect(quoteRes.json.quote.sellerGroups.length).toBe(2);

    // Place split order via UPI/Wallet-free standard flow
    const orderRes = await requestJson('/api/orders', {
      method: 'POST',
      token: customerToken,
      body: {
        items: [
          { productId: 'prod-1', offerId: seller2OfferProd1.id, selectedSize: 'M', quantity: 2 },
          { productId: 'prod-2', offerId: seller1OfferProd2.id, selectedSize: 'L', quantity: 1 },
        ],
        address: {
          fullName: 'Multi Seller Buyer',
          phone: '+91 98101 77001',
          street: '22 Park Street',
          city: 'Kolkata',
          state: 'West Bengal',
          pinCode: '700016',
        },
        paymentMethod: 'upi',
      },
    });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.json.order.id;
    expect(orderRes.json.sellerSuborders.length).toBe(2);
    expect(orderRes.json.invoices.length).toBe(2);

    // Stock decremented on Seller 2 offer
    const offersAfterCheckout = await requestJson('/api/products/prod-1/offers');
    const s2AfterCheckout = offersAfterCheckout.json.offers.find((o: any) => o.id === seller2OfferProd1.id);
    expect(s2AfterCheckout.stock).toBe(initialStockOffer - 2);

    // Seller 1 sees only Seller 1 suborder on GET /suborders
    const seller1View = await requestJson(`/api/orders/${orderId}/suborders`, {
      token: seller1Token,
    });
    expect(seller1View.status).toBe(200);
    expect(seller1View.json.suborders.length).toBe(1);
    expect(seller1View.json.suborders[0].sellerId).toBe('seller-1');

    // Customer cancels ONLY Seller 2 suborder -> Seller 1 stays NEW, parent order stays confirmed, stock restored
    const subordersAll = await requestJson(`/api/orders/${orderId}/suborders`, {
      token: customerToken,
    });
    const subSeller2 = subordersAll.json.suborders.find((s: any) => s.sellerId === 'seller-2');
    const subSeller1 = subordersAll.json.suborders.find((s: any) => s.sellerId === 'seller-1');

    const partialCancel = await requestJson(`/api/orders/${orderId}/suborders/${subSeller2.id}/cancel`, {
      method: 'POST',
      token: customerToken,
      body: { reason: 'Change of mind on kurta', refundMode: 'STORE_CREDIT' },
    });
    expect(partialCancel.status).toBe(200);
    expect(partialCancel.json.suborder.fulfillmentStatus).toBe('CANCELLED');
    expect(partialCancel.json.allSubordersCancelled).toBe(false);
    expect(partialCancel.json.order.status).not.toBe('cancelled');

    // Stock restored for Seller 2 offer
    const offersAfterCancel = await requestJson('/api/products/prod-1/offers');
    const s2AfterCancel = offersAfterCancel.json.offers.find((o: any) => o.id === seller2OfferProd1.id);
    expect(s2AfterCancel.stock).toBe(initialStockOffer);

    // Seller 1 suborder remains NEW and can be independently returned after delivery
    const subReturn = await requestJson(`/api/orders/${orderId}/suborders/${subSeller1.id}/return`, {
      method: 'POST',
      token: customerToken,
      body: { reason: 'Size M fits slightly loose' },
    });
    expect(subReturn.status).toBe(200);
    expect(subReturn.json.suborder.fulfillmentStatus).toBe('RETURNED');
  });
});
