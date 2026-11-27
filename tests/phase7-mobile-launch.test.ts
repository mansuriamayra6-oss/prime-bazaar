import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import http from 'http';
import fs from 'fs';
import path from 'path';

process.env.PRIMEBAZAAR_TEST_MODE = '1';

const { app } = await import('../server');
const { createSession } = await import('../src/server/security');
const { parseDeepLinkPath } = await import('../src/utils/nativeBridge');

let server: http.Server;
let baseUrl = '';
let sellerToken = '';

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  sellerToken = createSession({
    userId: 'seller-1',
    role: 'SELLER',
    sellerId: 'seller-1',
    email: 'varanasi@primebazaar.in',
    name: 'Varanasi Weavers Co.',
  }).token;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Phase 7: Capacitor Mobile Apps, Biometric Auth, Push, Barcode/Camera, Deep Links, Accessibility & CI', () => {
  test('Health check endpoint responds 200', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ONLINE');
  });

  test('Mobile device push token registration deduplicates and supports unregister', async () => {
    const invalidRes = await fetch(`${baseUrl}/api/mobile/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'android', pushToken: 'bad' }),
    });
    expect(invalidRes.status).toBe(400);

    const tokenStr = 'fcm_phase7_android_device_token_987654';
    const androidRes1 = await fetch(`${baseUrl}/api/mobile/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'android',
        pushToken: tokenStr,
        appVersion: '7.0.0',
        deviceModel: 'Pixel 8',
      }),
    });
    expect(androidRes1.status).toBe(201);
    const json1 = await androidRes1.json();
    expect(json1.device.platform).toBe('android');

    const androidRes2 = await fetch(`${baseUrl}/api/mobile/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'android',
        pushToken: tokenStr,
        appVersion: '7.0.1',
        deviceModel: 'Pixel 8 Pro',
      }),
    });
    expect(androidRes2.status).toBe(201);
    const json2 = await androidRes2.json();
    expect(json2.device.id).toBe(json1.device.id);
    expect(json2.device.appVersion).toBe('7.0.1');

    const iosRes = await fetch(`${baseUrl}/api/mobile/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'ios',
        pushToken: 'apns_phase7_ios_device_token_987654',
        appVersion: '7.0.0',
        deviceModel: 'iPhone 16',
      }),
    });
    expect(iosRes.status).toBe(201);

    const unregRes = await fetch(`${baseUrl}/api/mobile/devices/unregister`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushToken: tokenStr }),
    });
    expect(unregRes.status).toBe(200);
    const unregJson = await unregRes.json();
    expect(unregJson.unregistered).toBe(true);
  });

  test('Notification preferences & category dispatch enforce promo opt-out while delivering order updates', async () => {
    const email = `notif_${Date.now()}@primebazaar.in`;
    const reg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Notification Tester',
        email,
        phone: '9811223344',
        password: 'Password123!',
      }),
    });
    expect(reg.status).toBe(201);
    const { token } = await reg.json();

    const getPrefs = await fetch(`${baseUrl}/api/notifications/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getPrefs.status).toBe(200);
    const prefsData = await getPrefs.json();
    expect(prefsData.preferences.orderConfirmation).toBe(true);
    expect(prefsData.preferences.promotionalOffers).toBe(true);

    // Opt out of promotional notifications
    const putPrefs = await fetch(`${baseUrl}/api/notifications/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ promotionalOffers: false }),
    });
    expect(putPrefs.status).toBe(200);
    const putPrefsData = await putPrefs.json();
    expect(putPrefsData.preferences.promotionalOffers).toBe(false);

    // Promo should be suppressed while promotionalOffers=false
    const promoRes = await fetch(`${baseUrl}/api/notifications/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        category: 'promotion',
        title: 'Flash Deal Drop',
        body: 'Flat 50% off festive kurtas',
      }),
    });
    expect(promoRes.status).toBe(200);
    const promoJson = await promoRes.json();
    expect(promoJson.delivered).toBe(false);
    expect(promoJson.suppressedByPreference).toBe(true);

    // Order confirmation should be delivered
    const orderRes = await fetch(`${baseUrl}/api/notifications/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        category: 'order_confirmation',
        title: 'Order Confirmed',
        body: 'Your Prime Bazaar order #ORD-771 is confirmed.',
        deepLinkPath: '/orders',
      }),
    });
    expect(orderRes.status).toBe(201);
    const orderJson = await orderRes.json();
    expect(orderJson.delivered).toBe(true);
    expect(orderJson.notification.category).toBe('order_confirmation');

    const inboxRes = await fetch(`${baseUrl}/api/notifications/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(inboxRes.status).toBe(200);
    const inboxJson = await inboxRes.json();
    expect(inboxJson.notifications.length).toBeGreaterThanOrEqual(1);
  });

  test('Biometric enrollment, challenge, PIN fallback, lockout protection & disable flow', async () => {
    const email = `bio_${Date.now()}@primebazaar.in`;
    const reg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Biometric Tester',
        email,
        phone: '9822334455',
        password: 'Password123!',
      }),
    });
    expect(reg.status).toBe(201);
    const { token } = await reg.json();

    // Enroll biometric credential + 4-digit fallback PIN
    const enrollRes = await fetch(`${baseUrl}/api/auth/biometric/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        credentialId: 'pb_bio_credential_9876543210',
        authenticatorType: 'capacitor-biometric',
        deviceName: 'Pixel 8 Pro',
        fallbackPin: '2580',
      }),
    });
    expect(enrollRes.status).toBe(201);
    const enrollJson = await enrollRes.json();
    expect(enrollJson.enabled).toBe(true);
    expect(enrollJson.hasPinFallback).toBe(true);

    // Issue challenge
    const chRes = await fetch(`${baseUrl}/api/auth/biometric/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email }),
    });
    expect(chRes.status).toBe(200);
    const chJson = await chRes.json();
    expect(typeof chJson.challengeId).toBe('string');
    expect(chJson.challengeId.length).toBeGreaterThan(0);
    expect(chJson.allowCredentialIds).toContain('pb_bio_credential_9876543210');

    // Verify using biometric credential
    const bioLogin = await fetch(`${baseUrl}/api/auth/biometric/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: email,
        challengeId: chJson.challengeId,
        credentialId: 'pb_bio_credential_9876543210',
        fallbackMode: 'biometric',
      }),
    });
    expect(bioLogin.status).toBe(200);
    const bioLoginJson = await bioLogin.json();
    expect(typeof bioLoginJson.token).toBe('string');
    expect(bioLoginJson.token.length).toBeGreaterThan(10);

    // Wrong PIN failure tracking -> 401 then 423 lockout on 5th failure
    for (let attempt = 1; attempt <= 4; attempt++) {
      const failRes = await fetch(`${baseUrl}/api/auth/biometric/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: email,
          fallbackMode: 'pin',
          pin: '9999',
        }),
      });
      expect(failRes.status).toBe(401);
    }
    const lockedRes = await fetch(`${baseUrl}/api/auth/biometric/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: email,
        fallbackMode: 'pin',
        pin: '9999',
      }),
    });
    expect(lockedRes.status).toBe(423);

    // Disable clears credentials and lock
    const delRes = await fetch(`${baseUrl}/api/auth/biometric`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.status).toBe(200);
    const statusAfter = await fetch(`${baseUrl}/api/auth/biometric/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const statusJson = await statusAfter.json();
    expect(statusJson.enabled).toBe(false);
  });

  test('Barcode & QR lookup resolves EAN-13, product ID, and universal deep-link URLs', async () => {
    const eanRes = await fetch(`${baseUrl}/api/discovery/barcode/8901030847123`);
    expect(eanRes.status).toBe(200);
    const eanJson = await eanRes.json();
    expect(eanJson.found).toBe(true);
    expect(eanJson.product.id).toBe('prod-5');
    expect(eanJson.deepLinkPath).toBe('/product/prod-5');

    const idRes = await fetch(`${baseUrl}/api/discovery/barcode/prod-1`);
    expect(idRes.status).toBe(200);
    const idJson = await idRes.json();
    expect(idJson.found).toBe(true);
    expect(idJson.product.id).toBe('prod-1');
    expect(idJson.deepLinkPath).toBe('/product/prod-1');

    const qrEncoded = encodeURIComponent('https://primebazaarfashion.in/product/prod-2');
    const qrRes = await fetch(`${baseUrl}/api/discovery/barcode/${qrEncoded}`);
    expect(qrRes.status).toBe(200);
    const qrJson = await qrRes.json();
    expect(qrJson.found).toBe(true);
    expect(qrJson.product.id).toBe('prod-2');
  });

  test('Seller product image upload validates magic bytes and accepts valid PNG images', async () => {
    const badRes = await fetch(`${baseUrl}/api/v1/storefront/uploads/product-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sellerToken}`,
      },
      body: JSON.stringify({
        mimeType: 'image/png',
        dataBase64: Buffer.from('not-a-real-png-payload').toString('base64'),
      }),
    });
    expect(badRes.status).toBe(400);

    // Minimal valid PNG magic header + IHDR chunk bytes
    const pngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);
    const okRes = await fetch(`${baseUrl}/api/v1/storefront/uploads/product-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sellerToken}`,
      },
      body: JSON.stringify({
        mimeType: 'image/png',
        dataBase64: pngBytes.toString('base64'),
      }),
    });
    expect(okRes.status).toBe(201);
    const okJson = await okRes.json();
    expect(okJson.media.url).toContain('/api/storefront/media/');
  });

  test('Deep-link parser and .well-known Universal/App Link HTTP endpoints respond cleanly', async () => {
    expect(parseDeepLinkPath('/product/prod-1')).toEqual({ type: 'product', productId: 'prod-1' });
    expect(parseDeepLinkPath('/category/womens-fashion')).toEqual({ type: 'category', slug: 'womens-fashion' });
    expect(parseDeepLinkPath('/seller/seller-1')).toEqual({ type: 'seller', sellerId: 'seller-1' });
    expect(parseDeepLinkPath('/cart')).toEqual({ type: 'cart' });
    expect(parseDeepLinkPath('/orders')).toEqual({ type: 'orders' });
    expect(parseDeepLinkPath('/promotions')).toEqual({ type: 'promotions' });
    expect(parseDeepLinkPath('/account')).toEqual({ type: 'account' });

    const assetRes = await fetch(`${baseUrl}/.well-known/assetlinks.json`);
    expect(assetRes.status).toBe(200);
    expect(assetRes.headers.get('content-type')).toContain('application/json');
    const assetJson = await assetRes.json();
    expect(assetJson[0].target.package_name).toBe('in.primebazaarfashion.app');

    const aasaRes = await fetch(`${baseUrl}/.well-known/apple-app-site-association`);
    expect(aasaRes.status).toBe(200);
    expect(aasaRes.headers.get('content-type')).toContain('application/json');
    const aasaJson = await aasaRes.json();
    expect(aasaJson.applinks.details[0].paths).toContain('/product/*');
    expect(aasaJson.applinks.details[0].paths).toContain('/cart');
    expect(aasaJson.applinks.details[0].paths).toContain('/orders');
  });

  test('Capacitor config, accessibility viewport, and safe CI Prisma deploy workflow are valid', () => {
    const root = process.cwd();

    const capConfig = fs.readFileSync(path.join(root, 'capacitor.config.ts'), 'utf8');
    expect(capConfig).toContain('in.primebazaarfashion.app');
    expect(capConfig).toContain("webDir: 'dist'");

    const guide = fs.readFileSync(path.join(root, 'MOBILE_RELEASE_GUIDE.md'), 'utf8');
    expect(guide.length).toBeGreaterThan(200);

    const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    expect(indexHtml).toContain('viewport-fit=cover');
    expect(indexHtml).not.toContain('user-scalable=no');
    expect(indexHtml).not.toContain('maximum-scale=1.0');

    const deployYml = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy.yml'), 'utf8');
    expect(deployYml).toContain('200.97.161.238');
    expect(deployYml).toContain('systemctl restart primebazaar');

    const safeMigrateScript = fs.readFileSync(
      path.join(root, 'scripts', 'safe-deploy-migrate.sh'),
      'utf8'
    );
    expect(safeMigrateScript).toContain('prisma migrate deploy');
    expect(safeMigrateScript).toContain('pg_dump');
    expect(safeMigrateScript).not.toContain('prisma migrate reset');
    expect(safeMigrateScript).not.toContain('db push');
  });
});
