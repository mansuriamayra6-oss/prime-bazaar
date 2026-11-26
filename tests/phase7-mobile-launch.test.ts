import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import http from 'http';
import fs from 'fs';
import path from 'path';

process.env.PRIMEBAZAAR_TEST_MODE = '1';

const { app } = await import('../server');

let server: http.Server;
let baseUrl = '';

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Phase 7: Capacitor Mobile Apps, Deep Links, Accessibility & Launch Readiness', () => {
  test('Health check endpoint responds 200', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ONLINE');
  });

  test('Mobile device push token endpoint validates payload and registers Android & iOS tokens', async () => {
    const invalidRes = await fetch(`${baseUrl}/api/mobile/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'android', pushToken: 'bad' }),
    });
    expect(invalidRes.status).toBe(400);

    const androidRes = await fetch(`${baseUrl}/api/mobile/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'android',
        pushToken: 'fcm_phase7_android_device_token_987654',
        appVersion: '7.0.0',
        deviceModel: 'Pixel 8',
      }),
    });
    expect(androidRes.status).toBe(201);
    const androidJson = await androidRes.json();
    expect(androidJson.device.platform).toBe('android');

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
    const iosJson = await iosRes.json();
    expect(iosJson.device.platform).toBe('ios');
  });

  test('Capacitor config, Android/iOS Universal Link manifests, launch guide & zoomable viewport exist and are valid', () => {
    const root = process.cwd();

    const capConfig = fs.readFileSync(path.join(root, 'capacitor.config.ts'), 'utf8');
    expect(capConfig).toContain('in.primebazaarfashion.app');
    expect(capConfig).toContain("webDir: 'dist'");

    const assetLinksRaw = fs.readFileSync(
      path.join(root, 'public', '.well-known', 'assetlinks.json'),
      'utf8'
    );
    const assetLinks = JSON.parse(assetLinksRaw);
    expect(Array.isArray(assetLinks)).toBe(true);
    expect(assetLinks[0].relation).toContain('delegate_permission/common.handle_all_urls');

    const aasaRaw = fs.readFileSync(
      path.join(root, 'public', '.well-known', 'apple-app-site-association'),
      'utf8'
    );
    const aasa = JSON.parse(aasaRaw);
    expect(aasa.applinks).toBeDefined();
    expect(aasa.webcredentials).toBeDefined();

    const guide = fs.readFileSync(path.join(root, 'MOBILE_RELEASE_GUIDE.md'), 'utf8');
    expect(guide.length).toBeGreaterThan(200);

    const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    expect(indexHtml).toContain('viewport-fit=cover');
    expect(indexHtml).not.toContain('user-scalable=no');
    expect(indexHtml).not.toContain('maximum-scale=1.0');
  });
});
